/**
 * Supabase Edge Function: social-publish
 *
 * Spielt einen FREIGEGEBENEN Post auf seiner Plattform aus — mit echter
 * Erfolgsprüfung. Jeder Versuch (auch erwartete Abbrüche wie "Kanal nicht
 * verbunden") landet im Protokoll social_publish_attempts.
 *
 * KERNREGEL: Niemals einen Post ausspielen, der nicht status='freigegeben' hat.
 * Die Freigabe ist der einzige Weg nach draußen (Vier-Augen-Prinzip aus
 * 20260719_social_agent.sql).
 *
 * ERFOLGSREGEL: Ein Versuch gilt NUR dann als Erfolg, wenn die Plattform mit
 * HTTP 2xx UND einer Post-ID geantwortet hat. Alles andere — Timeout, 2xx ohne
 * ID, Fehlerstatus — bleibt ein protokollierter Fehlschlag, der Post bleibt
 * 'freigegeben'. Kein Status "veröffentlicht" ohne bestätigte Gegenstelle.
 *
 * Tokens liegen AUSSCHLIESSLICH als Supabase-Secrets; social_channels kennt nur
 * den Secret-Namen. Einrichtung der Plattform-Zugänge: siehe EINRICHTUNG.md.
 *
 * Setup:
 *   supabase functions deploy social-publish
 *   (Secrets je Kanal, z.B.: supabase secrets set META_PAGE_TOKEN=...)
 *
 * Aufrufer-Prüfung: WER ausgelöst hat, wird NIE aus dem Body übernommen.
 *   Manuell: Nutzer-JWT im Authorization-Header → auth.getUser() (sonst 401),
 *   Rolle 'admin' aus user_profiles (sonst 403); die verifizierte ID landet als
 *   ausgeloest_von/ausloeser_art='manuell' in social_publish_attempts.
 *   Zeitplan (Cron-Worker aus 20260719_social_zeitplan.sql): erkennbar am
 *   Service-Role-Key als Authorization-Token; ausgeloest_von=null,
 *   ausloeser_art='zeitplan' — die Freigabe-Identität steckt dann bereits in
 *   social_posts.freigegeben_von.
 * Request-Body:  { "post_id": "<uuid>" } — manuell.
 *   Zeitplan zusätzlich: { "zeitplan_id": "<uuid>" } (nur mit Service-Role-Token wirksam).
 *   Das bestätigte Ergebnis wird in social_zeitplan zurückgeschrieben
 *   ('ausgespielt'/'fehlgeschlagen' + echte versuch_id); ohne Ergebnis bleibt
 *   der Eintrag 'geplant'.
 * Response:      { erfolg, grund?, meldung, externe_url?, versuch_id? }
 *   grund bei erwartetem Abbruch: 'nicht_freigegeben' | 'kanal_nicht_verbunden'
 *     | 'token_fehlt' | 'medium_fehlt' | 'medium_nicht_ladbar'
 *     | 'plattform_nicht_implementiert' | 'plattform_fehler'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { pruefeAufrufer } from '../_shared/aufrufer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GRAPH_API = 'https://graph.facebook.com/v21.0';

// Instagram-Video-Verarbeitung: so lange pollen wir maximal auf FINISHED.
const IG_POLL_INTERVALL_MS = 3000;
const IG_POLL_MAX_VERSUCHE = 40; // ~2 Minuten

interface PostRow {
  id: string;
  plattform: string;
  inhalt: string;
  status: string;
}

interface KanalRow {
  id: string;
  plattform: string;
  konto_id: string | null;
  verbunden: boolean;
  token_secret_name: string | null;
}

/** Ergebnis eines Plattform-Aufrufs — vor der Erfolgsprüfung. */
interface PlattformErgebnis {
  httpStatus: number | null;
  externeId: string | null;
  externeUrl: string | null;
  antwortAuszug: string;
  fehlermeldung: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Kürzt eine Rohantwort auf ~500 Zeichen fürs Protokoll. */
function auszug(text: string): string {
  return text.length > 500 ? text.slice(0, 500) + '…' : text;
}

/** Protokolliert einen Versuch — IMMER, egal ob Erfolg, Plattform-Fehler oder erwarteter Abbruch. */
async function protokolliereVersuch(
  supabase: SupabaseClient,
  eintrag: {
    post_id: string;
    plattform: string;
    erfolg: boolean;
    // Wer/was hat ausgelöst — ausgeloest_von ist die aus dem JWT VERIFIZIERTE
    // Nutzer-ID (nie ein Body-Parameter), bei Zeitplan-Auslösung null.
    ausgeloest_von: string | null;
    ausloeser_art: 'manuell' | 'zeitplan';
    externe_id?: string | null;
    externe_url?: string | null;
    http_status?: number | null;
    fehlermeldung?: string | null;
    antwort_auszug?: string | null;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('social_publish_attempts')
    .insert(eintrag)
    .select('id')
    .single();
  if (error) {
    console.error('Protokoll-Eintrag fehlgeschlagen:', error.message);
    return null;
  }
  return data.id as string;
}

// ─── Plattform-Aufrufe ───────────────────────────────────────────────────────
// Jede Funktion liefert das Roh-Ergebnis; die Erfolgsprüfung (2xx UND Post-ID)
// passiert zentral im Handler.

/** Facebook-Seite: ein Feed-Post mit Text. */
async function publiziereFacebook(
  pageId: string,
  token: string,
  inhalt: string,
): Promise<PlattformErgebnis> {
  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: inhalt, access_token: token }),
  });
  const text = await res.text();
  let id: string | null = null;
  try {
    id = JSON.parse(text)?.id ?? null;
  } catch { /* keine JSON-Antwort — bleibt ohne ID und damit Fehlschlag */ }
  return {
    httpStatus: res.status,
    externeId: id,
    externeUrl: id ? `https://www.facebook.com/${id}` : null,
    antwortAuszug: auszug(text),
    fehlermeldung: res.ok ? (id ? null : 'Antwort ohne Post-ID') : `Graph API ${res.status}`,
  };
}

/**
 * Instagram: zweistufig — erst Media-Container anlegen, dann veröffentlichen.
 * Bei Video muss der Container-Status bis FINISHED gepollt werden.
 */
async function publiziereInstagram(
  igUserId: string,
  token: string,
  caption: string,
  medienUrl: string,
  istVideo: boolean,
): Promise<PlattformErgebnis> {
  // Stufe 1: Container anlegen
  const containerBody: Record<string, string> = { caption, access_token: token };
  if (istVideo) {
    containerBody.video_url = medienUrl;
    containerBody.media_type = 'REELS';
  } else {
    containerBody.image_url = medienUrl;
  }
  const containerRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerBody),
  });
  const containerText = await containerRes.text();
  let creationId: string | null = null;
  try {
    creationId = JSON.parse(containerText)?.id ?? null;
  } catch { /* s.o. */ }
  if (!containerRes.ok || !creationId) {
    return {
      httpStatus: containerRes.status,
      externeId: null,
      externeUrl: null,
      antwortAuszug: auszug(containerText),
      fehlermeldung: `Media-Container fehlgeschlagen (HTTP ${containerRes.status})`,
    };
  }

  // Bei Video: Verarbeitung pollen, bis FINISHED — mit Zeitlimit, Abbruch bei ERROR.
  if (istVideo) {
    let fertig = false;
    for (let i = 0; i < IG_POLL_MAX_VERSUCHE; i++) {
      await new Promise((r) => setTimeout(r, IG_POLL_INTERVALL_MS));
      const statusRes = await fetch(
        `${GRAPH_API}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`,
      );
      const statusText = await statusRes.text();
      let statusCode: string | null = null;
      try {
        statusCode = JSON.parse(statusText)?.status_code ?? null;
      } catch { /* s.o. */ }
      if (statusCode === 'FINISHED') { fertig = true; break; }
      if (statusCode === 'ERROR') {
        return {
          httpStatus: statusRes.status,
          externeId: null,
          externeUrl: null,
          antwortAuszug: auszug(statusText),
          fehlermeldung: 'Instagram-Videoverarbeitung mit ERROR abgebrochen',
        };
      }
    }
    if (!fertig) {
      return {
        httpStatus: null,
        externeId: null,
        externeUrl: null,
        antwortAuszug: `creation_id ${creationId}: nach ${IG_POLL_MAX_VERSUCHE} Abfragen nicht FINISHED`,
        fehlermeldung: 'Zeitlimit bei der Instagram-Videoverarbeitung überschritten',
      };
    }
  }

  // Stufe 2: veröffentlichen
  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });
  const publishText = await publishRes.text();
  let mediaId: string | null = null;
  try {
    mediaId = JSON.parse(publishText)?.id ?? null;
  } catch { /* s.o. */ }
  return {
    httpStatus: publishRes.status,
    externeId: mediaId,
    // Der Permalink müsste separat abgefragt werden; die Media-ID reicht als Beleg.
    externeUrl: null,
    antwortAuszug: auszug(publishText),
    fehlermeldung: publishRes.ok
      ? (mediaId ? null : 'media_publish-Antwort ohne Media-ID')
      : `media_publish fehlgeschlagen (HTTP ${publishRes.status})`,
  };
}

/** LinkedIn: ugcPost im Namen der Organisation (author = URN aus konto_id). */
async function publiziereLinkedIn(
  authorUrn: string,
  token: string,
  inhalt: string,
): Promise<PlattformErgebnis> {
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: inhalt },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  const text = await res.text();
  // LinkedIn liefert die Post-URN im Body (id) und im Header X-RestLi-Id.
  let urn: string | null = res.headers.get('x-restli-id');
  if (!urn) {
    try {
      urn = JSON.parse(text)?.id ?? null;
    } catch { /* s.o. */ }
  }
  return {
    httpStatus: res.status,
    externeId: urn,
    externeUrl: urn ? `https://www.linkedin.com/feed/update/${urn}/` : null,
    antwortAuszug: auszug(text),
    fehlermeldung: res.ok ? (urn ? null : 'Antwort ohne Post-URN') : `LinkedIn API ${res.status}`,
  };
}

/**
 * Sucht das dem Post zugeordnete Medien-Asset (social_post_assets → social_assets)
 * und erzeugt eine zeitlich begrenzte signierte URL aus dem privaten Bucket —
 * Instagram lädt das Medium von dieser URL.
 *
 * Drei ehrlich getrennte Ausgänge: 'gefunden', 'kein_asset' (nachweislich nichts
 * zugeordnet) und 'fehler' (Abfrage oder Signierung scheiterte — das ist ein
 * Infrastrukturproblem, KEIN fehlendes Asset).
 */
type MediumErgebnis =
  | { status: 'gefunden'; url: string; istVideo: boolean }
  | { status: 'kein_asset' }
  | { status: 'fehler'; meldung: string };

async function ladePostMedium(
  supabase: SupabaseClient,
  postId: string,
): Promise<MediumErgebnis> {
  const { data, error } = await supabase
    .from('social_post_assets')
    .select('social_assets ( storage_pfad, typ, aktiv )')
    .eq('post_id', postId)
    .limit(1)
    .maybeSingle();
  if (error) {
    return { status: 'fehler', meldung: `Medien-Zuordnung konnte nicht abgefragt werden: ${error.message}` };
  }
  const asset = (data as { social_assets?: { storage_pfad: string; typ: string; aktiv: boolean } } | null)
    ?.social_assets;
  if (!asset || !asset.aktiv) return { status: 'kein_asset' };
  const { data: signed, error: signError } = await supabase.storage
    .from('social-medien')
    .createSignedUrl(asset.storage_pfad, 3600);
  if (signError || !signed?.signedUrl) {
    return {
      status: 'fehler',
      meldung: `Signierte URL für '${asset.storage_pfad}' fehlgeschlagen: ${signError?.message ?? 'keine URL erhalten'}`,
    };
  }
  return { status: 'gefunden', url: signed.signedUrl, istVideo: asset.typ === 'video' };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST erforderlich' }, 405);
  }

  // Ausserhalb des try, damit der catch-Block die Ausspiel-Reservierung auch dann
  // loesen kann, wenn es unterwegs kracht. Wird weiter unten gesetzt, sobald der
  // Supabase-Client existiert und tatsaechlich reserviert wurde.
  let aufraeumen: (() => Promise<void>) | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return jsonResponse({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY nicht konfiguriert' }, 500);
    }

    // ── Aufrufer-Prüfung — VOR jeder Arbeit mit der Service-Role ──
    // Gemeinsame Logik in _shared/aufrufer.ts: Zeitplan-Worker am Service-Role-Key
    // erkennen (ausgeloest_von bleibt null; die Freigabe-Identität steht bereits in
    // social_posts.freigegeben_von), sonst Nutzer per auth.getUser() auflösen (401)
    // und die Admin-Rolle aus user_profiles prüfen (403).
    const aufrufer = await pruefeAufrufer(req, {
      supabaseUrl,
      serviceKey,
      anonKey,
      aktion: 'Ausspielen',
      adminAktion: 'Posts ausspielen',
    });
    if (!aufrufer.ok) {
      return jsonResponse({ error: aufrufer.fehler }, aufrufer.status);
    }
    const { istZeitplanAufruf, ausgeloestVon, ausloeserArt } = aufrufer;

    // Erst nach bestandener Aufrufer-Prüfung: Service-Role-Client für die Arbeit.
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => null);
    const postId: unknown = body?.post_id;
    const zeitplanIdRoh: unknown = body?.zeitplan_id;
    // zeitplan_id zählt NUR beim echten Zeitplan-Aufruf — aus einem Nutzer-Request
    // übernommen könnte sie fremde Planungen kippen.
    const zeitplanId = istZeitplanAufruf && typeof zeitplanIdRoh === 'string' ? zeitplanIdRoh : null;
    if (!postId || typeof postId !== 'string') {
      return jsonResponse({ error: 'post_id erforderlich' }, 400);
    }

    /** Protokoll-Eintrag inklusive des verifizierten Auslösers. */
    const protokolliere = (eintrag: {
      post_id: string;
      plattform: string;
      erfolg: boolean;
      externe_id?: string | null;
      externe_url?: string | null;
      http_status?: number | null;
      fehlermeldung?: string | null;
      antwort_auszug?: string | null;
    }) =>
      protokolliereVersuch(supabase, {
        ...eintrag,
        ausgeloest_von: ausgeloestVon,
        ausloeser_art: ausloeserArt,
      });

    // ── Zeitplan-Bezug prüfen: der Eintrag muss zu GENAU diesem Post gehören ──
    // Sonst könnte ein Aufruf mit Service-Role-Rechten fremde Planungen kippen.
    if (zeitplanId) {
      const { data: zeitplanRow, error: zeitplanError } = await supabase
        .from('social_zeitplan')
        .select('id, post_id')
        .eq('id', zeitplanId)
        .maybeSingle<{ id: string; post_id: string }>();
      if (zeitplanError) {
        return jsonResponse({ error: `Zeitplan-Eintrag laden fehlgeschlagen: ${zeitplanError.message}` }, 500);
      }
      if (!zeitplanRow) {
        return jsonResponse({ error: 'Zeitplan-Eintrag nicht gefunden' }, 404);
      }
      if (zeitplanRow.post_id !== postId) {
        return jsonResponse({ error: 'zeitplan_id gehört nicht zu diesem Post — Abbruch.' }, 400);
      }
    }

    /**
     * Antwortet UND schreibt bei Zeitplan-Auslösung das bestätigte Ergebnis in
     * social_zeitplan zurück — Status plus die ECHTE versuch_id aus
     * social_publish_attempts. Nur diese beiden Endzustände existieren:
     * 'ausgespielt' (Plattform hat bestätigt) oder 'fehlgeschlagen'. Bricht die
     * Function vorher ab (Validierungsfehler, Crash), bleibt der Eintrag
     * 'geplant' mit gesetztem angestossen_marker — sichtbar als "angestoßen,
     * unbestätigt".
     */
    // Wird gesetzt, sobald die Ausspielung reserviert ist (siehe a2). Jeder Ausgang
    // loest die Reservierung wieder — zentral hier, damit kein Pfad sie vergisst.
    let reservierterPost: string | null = null;
    const loeseReservierung = async () => {
      if (!reservierterPost) return;
      const id = reservierterPost;
      reservierterPost = null;
      const { error } = await supabase
        .from('social_posts')
        .update({ ausspielung_laeuft_seit: null })
        .eq('id', id);
      if (error) console.error('Reservierung loesen fehlgeschlagen:', error.message);
    };
    aufraeumen = loeseReservierung;

    const antworte = async (
      ergebnisBody: { erfolg: boolean; versuch_id?: string | null; [k: string]: unknown },
    ) => {
      await loeseReservierung();
      if (zeitplanId) {
        const { error } = await supabase
          .from('social_zeitplan')
          .update({
            status: ergebnisBody.erfolg ? 'ausgespielt' : 'fehlgeschlagen',
            // Verknüpfung zum Protokoll — null bleibt null, wenn schon der
            // Protokoll-Eintrag scheiterte (keine erfundene ID).
            versuch_id: ergebnisBody.versuch_id ?? null,
          })
          .eq('id', zeitplanId)
          .eq('post_id', postId) // nie fremde Planungen kippen
          .eq('status', 'geplant');
        if (error) console.error('Zeitplan-Rückmeldung fehlgeschlagen:', error.message);
      }
      return jsonResponse(ergebnisBody);
    };

    // ── a) Post laden — KERNREGEL: nur freigegebene Posts verlassen das Haus ──
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('id, plattform, inhalt, status')
      .eq('id', postId)
      .maybeSingle<PostRow>();
    if (postError) {
      return jsonResponse({ error: `Post laden fehlgeschlagen: ${postError.message}` }, 500);
    }
    if (!post) {
      return jsonResponse({ error: 'Post nicht gefunden' }, 404);
    }
    if (post.status !== 'freigegeben') {
      const meldung = post.status === 'veroeffentlicht'
        ? 'Dieser Post ist bereits veröffentlicht.'
        : `Nur freigegebene Posts dürfen ausgespielt werden — dieser hat Status '${post.status}'.`;
      const versuchId = await protokolliere({
        post_id: post.id,
        plattform: post.plattform,
        erfolg: false,
        fehlermeldung: meldung,
      });
      return antworte({ erfolg: false, grund: 'nicht_freigegeben', meldung, versuch_id: versuchId });
    }

    // ── a2) Reservierung gegen doppelte Ausspielung ──
    // Manueller Klick und faelliger Zeitplan-Eintrag koennen denselben Post gleichzeitig
    // treffen. Wer die Reservierung gewinnt, spielt aus; der andere bricht ab, BEVOR die
    // Plattform kontaktiert wird. Die Bedingung im Update ist der eigentliche Schutz —
    // eine vorherige Abfrage waere ein Rennen und kein Riegel.
    // Eine aeltere Reservierung als 10 Minuten gilt als verwaist (abgestuerzte Function)
    // und darf uebernommen werden, sonst waere ein Post nach einem Absturz fuer immer blockiert.
    const verwaistAb = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: reserviert, error: reservierError } = await supabase
      .from('social_posts')
      .update({ ausspielung_laeuft_seit: new Date().toISOString() })
      .eq('id', post.id)
      .eq('status', 'freigegeben')
      .or(`ausspielung_laeuft_seit.is.null,ausspielung_laeuft_seit.lt.${verwaistAb}`)
      .select('id');
    if (reservierError) {
      return jsonResponse({ error: `Reservierung fehlgeschlagen: ${reservierError.message}` }, 500);
    }
    if (!reserviert || reserviert.length === 0) {
      const meldung = 'Dieser Post wird gerade bereits ausgespielt — vermutlich zeitgleich über den Kalender. Die doppelte Veröffentlichung wurde verhindert.';
      const versuchId = await protokolliere({
        post_id: post.id,
        plattform: post.plattform,
        erfolg: false,
        fehlermeldung: meldung,
      });
      return antworte({ erfolg: false, grund: 'bereits_in_arbeit', meldung, versuch_id: versuchId });
    }

    reservierterPost = post.id;

    // ── b) Kanal laden — nicht verbunden ist ein ERWARTETER Zustand (HTTP 200) ──
    const { data: kanal, error: kanalError } = await supabase
      .from('social_channels')
      .select('id, plattform, konto_id, verbunden, token_secret_name')
      .eq('plattform', post.plattform)
      .maybeSingle<KanalRow>();
    if (kanalError) {
      await loeseReservierung();
      return jsonResponse({ error: `Kanal laden fehlgeschlagen: ${kanalError.message}` }, 500);
    }
    if (!kanal || !kanal.verbunden || !kanal.konto_id) {
      const meldung = `Der Kanal '${post.plattform}' ist nicht verbunden. Der Text kann bis zur Einrichtung nur kopiert und manuell gepostet werden (siehe EINRICHTUNG.md).`;
      const versuchId = await protokolliere({
        post_id: post.id,
        plattform: post.plattform,
        erfolg: false,
        fehlermeldung: meldung,
      });
      return antworte({ erfolg: false, grund: 'kanal_nicht_verbunden', meldung, versuch_id: versuchId });
    }

    // ── c) Token aus den Edge-Function-Secrets — nie aus der Datenbank ──
    const token = kanal.token_secret_name ? Deno.env.get(kanal.token_secret_name) : undefined;
    if (!token) {
      const meldung = `Das Zugangstoken fehlt: Supabase-Secret '${kanal.token_secret_name ?? '(kein Name hinterlegt)'}' ist nicht gesetzt.`;
      const versuchId = await protokolliere({
        post_id: post.id,
        plattform: post.plattform,
        erfolg: false,
        fehlermeldung: meldung,
      });
      return antworte({ erfolg: false, grund: 'token_fehlt', meldung, versuch_id: versuchId });
    }

    // ── d) Ausspielen ──
    let ergebnis: PlattformErgebnis;
    if (post.plattform === 'facebook') {
      ergebnis = await publiziereFacebook(kanal.konto_id, token, post.inhalt);
    } else if (post.plattform === 'instagram') {
      // Instagram verlangt zwingend ein Medium. Drei Fälle sauber getrennt:
      // nachweislich kein Asset ('medium_fehlt') ist ein Sachzustand, ein
      // Abfrage-/Signierfehler ('medium_nicht_ladbar') ein Infrastrukturproblem —
      // letzterer wird NIE als "kein Asset zugeordnet" ausgegeben.
      const medium = await ladePostMedium(supabase, post.id);
      if (medium.status !== 'gefunden') {
        const meldung = medium.status === 'kein_asset'
          ? 'Instagram braucht ein Bild oder Video. Diesem Post ist kein Medien-Asset zugeordnet.'
          : `Das Medien-Asset konnte nicht geladen werden — ob eines zugeordnet ist, ließ sich nicht feststellen. ${medium.meldung}`;
        const versuchId = await protokolliere({
          post_id: post.id,
          plattform: post.plattform,
          erfolg: false,
          fehlermeldung: meldung,
        });
        return antworte({
          erfolg: false,
          grund: medium.status === 'kein_asset' ? 'medium_fehlt' : 'medium_nicht_ladbar',
          meldung,
          versuch_id: versuchId,
        });
      }
      ergebnis = await publiziereInstagram(kanal.konto_id, token, post.inhalt, medium.url, medium.istVideo);
    } else if (post.plattform === 'linkedin') {
      ergebnis = await publiziereLinkedIn(kanal.konto_id, token, post.inhalt);
    } else {
      // youtube, tiktok, threads: noch nicht implementiert — sauberer Abbruch,
      // kein Platzhalter, der Erfolg vortäuscht.
      const meldung = `Ausspielen auf '${post.plattform}' ist noch nicht implementiert.`;
      const versuchId = await protokolliere({
        post_id: post.id,
        plattform: post.plattform,
        erfolg: false,
        fehlermeldung: meldung,
      });
      return antworte({ erfolg: false, grund: 'plattform_nicht_implementiert', meldung, versuch_id: versuchId });
    }

    // ── e) ERFOLGSPRÜFUNG ──
    // Erfolg NUR bei HTTP 2xx UND einer von der Plattform gelieferten Post-ID.
    // In jedem anderen Fall bleibt der Post 'freigegeben' und der Versuch wird
    // als Fehlschlag protokolliert — kein Status 'veröffentlicht' ohne
    // bestätigte Antwort der Gegenstelle.
    const istErfolg =
      ergebnis.httpStatus !== null &&
      ergebnis.httpStatus >= 200 &&
      ergebnis.httpStatus < 300 &&
      !!ergebnis.externeId;

    // ── f) Versuch IMMER protokollieren ──
    const versuchId = await protokolliere({
      post_id: post.id,
      plattform: post.plattform,
      erfolg: istErfolg,
      externe_id: ergebnis.externeId,
      externe_url: ergebnis.externeUrl,
      http_status: ergebnis.httpStatus,
      fehlermeldung: istErfolg ? null : (ergebnis.fehlermeldung ?? 'Unbekannter Plattform-Fehler'),
      antwort_auszug: ergebnis.antwortAuszug,
    });

    if (!istErfolg) {
      return antworte({
        erfolg: false,
        grund: 'plattform_fehler',
        meldung: `${ergebnis.fehlermeldung ?? 'Plattform-Fehler'}${ergebnis.httpStatus ? ` (HTTP ${ergebnis.httpStatus})` : ''}`,
        versuch_id: versuchId,
      });
    }

    const { error: updateError } = await supabase
      .from('social_posts')
      .update({ status: 'veroeffentlicht', veroeffentlicht_am: new Date().toISOString() })
      .eq('id', post.id);
    if (updateError) {
      // Der Post IST draußen (bestätigte ID), nur der Status-Schreib schlug fehl —
      // das ehrlich zurückmelden statt zu verschweigen.
      return antworte({
        erfolg: true,
        meldung: `Veröffentlicht (ID ${ergebnis.externeId}), aber der Status konnte nicht gespeichert werden: ${updateError.message}`,
        externe_url: ergebnis.externeUrl ?? undefined,
        versuch_id: versuchId,
      });
    }

    return antworte({
      erfolg: true,
      meldung: `Erfolgreich auf ${post.plattform} veröffentlicht (ID ${ergebnis.externeId}).`,
      externe_url: ergebnis.externeUrl ?? undefined,
      versuch_id: versuchId,
    });
  } catch (e) {
    // Reservierung auch im Absturzfall loesen, damit der Post nicht bis zum
    // Verwaisungs-Zeitfenster (10 Min) blockiert bleibt.
    try {
      if (aufraeumen) await aufraeumen();
    } catch (_) { /* Aufraeumen darf den eigentlichen Fehler nicht verdecken */ }
    const message = e instanceof Error ? e.message : 'Interner Fehler';
    return jsonResponse({ error: message }, 500);
  }
});
