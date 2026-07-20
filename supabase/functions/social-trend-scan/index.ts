/**
 * Supabase Edge Function: social-trend-scan
 *
 * Holt echte Artikel aus Google News (RSS), PubMed (eutils) und Reddit,
 * speichert sie als Rohartikel (social_trend_items, URL = Duplikatsschutz)
 * und destilliert daraus per Claude Themenvorschläge (social_topics) mit
 * Provenienz-Verknüpfung (social_topic_sources). Jeder Lauf wird in
 * social_scans protokolliert.
 *
 * LEERDATEN-SPERRE (Konstruktionsregel aus dem Prototyp-Review):
 * Liefern ALLE Quellen zusammen 0 Artikel, wird bewusst NICHT destilliert —
 * der Scan endet mit status='keine_daten' und einer Fehlermeldung, welche
 * Quelle warum leer war. Das ist ein gültiges Ergebnis (HTTP 200), kein
 * Fehler. Mandira ist ein medizinisches Haus: erfundene Studien sind ein
 * Haftungsrisiko. Zweite Verteidigungslinie: Themen ohne gültige
 * quell_nummern werden verworfen, nicht gespeichert.
 *
 * Setup:
 *   1. supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *      (SUPABASE_SERVICE_ROLE_KEY ist in Edge Functions automatisch gesetzt)
 *   2. supabase functions deploy social-trend-scan
 *
 * Aufrufer-Prüfung (gemeinsame Logik in _shared/aufrufer.ts): verify_jwt=true
 * allein genügt nicht — der öffentliche Anon-Key ist selbst ein gültiges JWT.
 * Zugelassen sind nur (a) der Cron-Worker mit Service-Role-Key als
 * Authorization-Token → ausgeloest_von='zeitplan' und (b) ein angemeldeter
 * Nutzer mit Rolle 'admin' → ausgeloest_von='manuell' (sonst 401/403).
 * Die Herkunft wird aus der VERIFIZIERTEN Identität abgeleitet — ein
 * ausgeloest_von-Feld im Request-Body wird bewusst ignoriert, sonst könnte
 * sich ein manueller Aufruf als Zeitplan tarnen.
 *
 * Request-Body:  keiner erforderlich (Body-Felder werden ignoriert)
 * Response:      { scan_id, status, quellen_stats, neue_artikel, neue_themen, themen: [...] }
 *                bzw. { scan_id, status: 'keine_daten', quellen_stats, fehlermeldung }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { pruefeAufrufer } from '../_shared/aufrufer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Quellen-Konfiguration (aus dem Prototyp übernommen) ─────────────────────

const GOOGLE_NEWS_FEEDS = [
  { url: 'https://news.google.com/rss/search?q=ayurveda&hl=de&gl=DE&ceid=DE:de', label: 'Ayurveda DE' },
  { url: 'https://news.google.com/rss/search?q=longevity+gesundheit&hl=de', label: 'Longevity DE' },
  { url: 'https://news.google.com/rss/search?q=ayurveda+wellness&hl=en', label: 'Ayurveda EN' },
  { url: 'https://news.google.com/rss/search?q=panchakarma&hl=de', label: 'Panchakarma' },
  { url: 'https://news.google.com/rss/search?q=mikrobiom+gesundheit&hl=de', label: 'Mikrobiom' },
];

const REDDIT_COMMUNITIES = [
  'Ayurveda', 'longevity', 'nutrition', 'holistichealth',
  'meditation', 'yoga', 'intermittentfasting',
];

const PUBMED_SEARCHES = [
  { term: 'ayurveda', label: 'Ayurveda' },
  { term: 'panchakarma', label: 'Panchakarma' },
  { term: 'rasayana', label: 'Rasayana' },
  { term: 'longevity+microbiome', label: 'Longevity' },
  { term: 'ayurvedic+medicine+clinical+trial', label: 'Clinical Trials' },
];

// Reddit blockt Requests ohne aussagekräftigen User-Agent mit 403.
const REDDIT_USER_AGENT = 'mandira-kpi-app/1.0 (social-trend-scan edge function)';

// ─── Typen & Helfer ──────────────────────────────────────────────────────────

interface RohArtikel {
  quelle: 'google_news' | 'pubmed' | 'reddit';
  quelle_label: string;
  titel: string;
  url: string;
  zusammenfassung: string | null;
  veroeffentlicht_am: string | null;
}

interface ThemaKandidat {
  thema: string;
  aufhaenger: string | null;
  kategorie: string | null;
  relevanz: string;
  quell_nummern: number[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Kein DOMParser in Deno Deploy — RSS wird per Regex über die <item>-Blöcke
// geparst, CDATA und die gängigen Entities werden aufgelöst.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  const inner = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // HTML-Reste (Google News packt Markup in die description)
  return decodeEntities(inner.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseDatum(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// dedup_key: kleingeschrieben, Umlaute normalisiert, alles außer [a-z0-9]
// zu Bindestrich, Mehrfach-Bindestriche zusammengefasst.
function dedupKey(thema: string): string {
  return thema
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Quellen-Abrufe (jede Quelle einzeln abgesichert, Fehler werden gesammelt) ─

async function fetchGoogleNews(fehler: string[]): Promise<RohArtikel[]> {
  const artikel: RohArtikel[] = [];
  for (const feed of GOOGLE_NEWS_FEEDS) {
    try {
      const res = await fetch(feed.url);
      if (!res.ok) {
        fehler.push(`Google News "${feed.label}": HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const block of items.slice(0, 10)) {
        const titel = extractTag(block, 'title');
        const url = extractTag(block, 'link');
        if (!titel || !url) continue;
        artikel.push({
          quelle: 'google_news',
          quelle_label: feed.label,
          titel,
          url,
          zusammenfassung: extractTag(block, 'description') || null,
          veroeffentlicht_am: parseDatum(extractTag(block, 'pubDate')),
        });
      }
    } catch (e) {
      fehler.push(`Google News "${feed.label}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return artikel;
}

async function fetchPubMed(fehler: string[]): Promise<RohArtikel[]> {
  const artikel: RohArtikel[] = [];
  for (const suche of PUBMED_SEARCHES) {
    try {
      const searchRes = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${suche.term}&sort=date&retmax=3&retmode=json`,
      );
      if (!searchRes.ok) {
        fehler.push(`PubMed "${suche.label}": esearch HTTP ${searchRes.status}`);
        continue;
      }
      const searchJson = await searchRes.json();
      const ids: string[] = searchJson?.esearchresult?.idlist || [];
      if (ids.length === 0) continue;

      const summaryRes = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`,
      );
      if (!summaryRes.ok) {
        fehler.push(`PubMed "${suche.label}": esummary HTTP ${summaryRes.status}`);
        continue;
      }
      const summaryJson = await summaryRes.json();
      for (const uid of summaryJson?.result?.uids || []) {
        const item = summaryJson.result[uid];
        if (!item?.title) continue;
        const journal = item.fulljournalname || item.source || '';
        artikel.push({
          quelle: 'pubmed',
          quelle_label: suche.label,
          titel: decodeEntities(String(item.title)).trim(),
          url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
          zusammenfassung: [journal, item.pubdate].filter(Boolean).join(', ') || null,
          veroeffentlicht_am: parseDatum(item.pubdate),
        });
      }
    } catch (e) {
      fehler.push(`PubMed "${suche.label}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return artikel;
}

async function fetchReddit(fehler: string[]): Promise<RohArtikel[]> {
  const artikel: RohArtikel[] = [];
  for (const sub of REDDIT_COMMUNITIES) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=5`, {
        headers: { 'User-Agent': REDDIT_USER_AGENT },
      });
      if (!res.ok) {
        // Reddit blockt Rechenzentrums-IPs gern mit 403 — sauber protokollieren, nicht crashen.
        fehler.push(`Reddit r/${sub}: HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      for (const kind of (json?.data?.children || []).slice(0, 3)) {
        const post = kind?.data;
        if (!post?.title || post.over_18) continue;
        artikel.push({
          quelle: 'reddit',
          quelle_label: `r/${sub}`,
          titel: String(post.title).trim(),
          url: `https://reddit.com${post.permalink}`,
          zusammenfassung: post.selftext
            ? String(post.selftext).slice(0, 500)
            : `${post.score ?? 0} Upvotes, ${post.num_comments ?? 0} Kommentare`,
          veroeffentlicht_am: post.created_utc
            ? new Date(post.created_utc * 1000).toISOString()
            : null,
        });
      }
    } catch (e) {
      fehler.push(`Reddit r/${sub}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return artikel;
}

// ─── Destillation per Claude ─────────────────────────────────────────────────

function baueDestillationsPrompt(
  artikel: { nr: number; quelle: string; quelle_label: string | null; titel: string; zusammenfassung: string | null }[],
  bekannteThemen: string[],
): string {
  const artikelListe = artikel
    .map((a) =>
      `${a.nr}. [${a.quelle}${a.quelle_label ? ` / ${a.quelle_label}` : ''}] ${a.titel}` +
      (a.zusammenfassung ? `\n   Zusammenfassung: ${a.zusammenfassung}` : ''),
    )
    .join('\n');

  const bespielt = bekannteThemen.length > 0
    ? `\nDiese Themen sind bereits bespielt — schlage sie NICHT erneut vor:\n${bekannteThemen.map((t) => `- ${t}`).join('\n')}\n`
    : '';

  return `Du bist Content-Stratege für das Mandira Ayurveda Resort (medizinisch fundiertes Ayurveda-Haus in Österreich). Destilliere aus den folgenden echten Artikeln konkrete Social-Media-Themenvorschläge.

WICHTIG — harte Regeln:
- Jedes Thema MUSS sich auf mindestens einen der nummerierten Artikel stützen. quell_nummern ist Pflicht und darf nur Nummern aus der Liste unten enthalten.
- Erfinde KEINE Themen ohne Quellbezug und KEINE Studien oder Quellen, die nicht in der Liste stehen. Themen ohne belegbare Quelle werden verworfen.
- Maximal 8 Themen, nur wirklich tragfähige.

Artikel (letzte 14 Tage):
${artikelListe}
${bespielt}
Antworte AUSSCHLIESSLICH mit einem JSON-Array ohne Markdown, ohne Backticks, ohne Text davor oder danach. Format:
[{"thema":"Kurzer Themen-Titel","aufhaenger":"Warum jetzt relevant, 1-2 Sätze","kategorie":"ayurveda|longevity|mental|nutrition|hormones|sleep|thermal|detox","relevanz":"hoch|mittel|niedrig","quell_nummern":[1,4,7]}]`;
}

async function destilliereThemen(
  apiKey: string,
  prompt: string,
): Promise<ThemaKandidat[]> {
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!claudeRes.ok) {
    const detail = await claudeRes.text();
    throw new Error(`Claude API ${claudeRes.status}: ${detail.slice(0, 300)}`);
  }

  const data = await claudeRes.json();
  const text: string = (data.content || [])
    .map((c: { text?: string }) => c.text || '')
    .join('')
    .trim();

  const clean = text.replace(/```json|```/g, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Destillat nicht parsebar: ${clean.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Destillat ist kein JSON-Array');
  }

  return parsed
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((t) => ({
      thema: String(t.thema || '').trim(),
      aufhaenger: t.aufhaenger ? String(t.aufhaenger) : null,
      kategorie: t.kategorie ? String(t.kategorie) : null,
      relevanz: ['hoch', 'mittel', 'niedrig'].includes(String(t.relevanz))
        ? String(t.relevanz)
        : 'mittel',
      quell_nummern: Array.isArray(t.quell_nummern)
        ? t.quell_nummern.map(Number).filter((n) => Number.isInteger(n))
        : [],
    }))
    .filter((t) => t.thema.length > 0);
}

// ─── Hauptablauf ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST erforderlich' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY nicht konfiguriert' }, 500);
  }
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY nicht konfiguriert (supabase secrets set ANTHROPIC_API_KEY=...)' }, 500);
  }

  // ── Aufrufer-Prüfung — VOR jeder Arbeit mit der Service-Role und vor jedem
  // Claude-Aufruf. Die Herkunft ('zeitplan' | 'manuell') kommt AUSSCHLIESSLICH
  // aus der verifizierten Identität, nie aus dem Request-Body.
  const aufrufer = await pruefeAufrufer(req, {
    supabaseUrl,
    serviceKey,
    anonKey,
    aktion: 'Der Quellen-Scan',
    adminAktion: 'den Quellen-Scan starten',
  });
  if (!aufrufer.ok) {
    return jsonResponse({ error: aufrufer.fehler }, aufrufer.status);
  }
  const ausgeloestVon = aufrufer.ausloeserArt;

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Scan-Protokoll anlegen
  const { data: scan, error: scanErr } = await supabase
    .from('social_scans')
    .insert({ status: 'laeuft', ausgeloest_von: ausgeloestVon })
    .select('id')
    .single();
  if (scanErr || !scan) {
    return jsonResponse({ error: `Scan konnte nicht angelegt werden: ${scanErr?.message}` }, 500);
  }
  const scanId: string = scan.id;

  try {
    // 2. Quellen serverseitig abrufen — Fehler pro Quelle sammeln, nicht verschlucken
    const fehler: string[] = [];
    const [google, pubmed, reddit] = await Promise.all([
      fetchGoogleNews(fehler),
      fetchPubMed(fehler),
      fetchReddit(fehler),
    ]);
    const quellenStats = {
      google_news: google.length,
      pubmed: pubmed.length,
      reddit: reddit.length,
    };
    const alleArtikel = [...google, ...pubmed, ...reddit];

    // 4. LEERDATEN-SPERRE: ohne echte Artikel wird nicht destilliert
    if (alleArtikel.length === 0) {
      const meldung =
        'Alle Quellen leer, Destillation bewusst übersprungen. ' +
        (fehler.length > 0 ? `Ursachen: ${fehler.join('; ')}` : 'Keine Quellenfehler protokolliert — Feeds lieferten schlicht keine Einträge.');
      await supabase
        .from('social_scans')
        .update({
          status: 'keine_daten',
          beendet_am: new Date().toISOString(),
          quellen_stats: quellenStats,
          fehlermeldung: meldung,
        })
        .eq('id', scanId);
      return jsonResponse({
        scan_id: scanId,
        status: 'keine_daten',
        quellen_stats: quellenStats,
        neue_artikel: 0,
        neue_themen: 0,
        fehlermeldung: meldung,
      });
    }

    // 3. Rohartikel speichern — URL ist der Duplikatsschutz
    const seen = new Set<string>();
    const artikelRows = alleArtikel
      .filter((a) => !seen.has(a.url) && seen.add(a.url))
      .map((a) => ({ ...a, scan_id: scanId }));

    const { data: eingefuegt, error: itemErr } = await supabase
      .from('social_trend_items')
      .upsert(artikelRows, { onConflict: 'url', ignoreDuplicates: true })
      .select('id');
    if (itemErr) throw new Error(`Rohartikel-Insert fehlgeschlagen: ${itemErr.message}`);
    const neueArtikel = eingefuegt?.length ?? 0;

    // 5. Destillations-Eingabe: Artikel der letzten 14 Tage (nummeriert, mit Quelle
    //    und Zusammenfassung, damit das Modell Themen belegen kann)
    const seit14Tagen = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: fenster, error: fensterErr } = await supabase
      .from('social_trend_items')
      .select('id, quelle, quelle_label, titel, zusammenfassung')
      .gte('abgerufen_am', seit14Tagen)
      .order('abgerufen_am', { ascending: false })
      .limit(120);
    if (fensterErr) throw new Error(`Artikel-Fenster nicht ladbar: ${fensterErr.message}`);

    const nummeriert = (fenster || []).map((a, i) => ({ nr: i + 1, ...a }));
    const nrZuItemId = new Map(nummeriert.map((a) => [a.nr, a.id as string]));

    const seit90Tagen = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: bekannt } = await supabase
      .from('social_topics')
      .select('thema')
      .gte('erstellt_am', seit90Tagen);

    const kandidaten = await destilliereThemen(
      anthropicKey,
      baueDestillationsPrompt(nummeriert, (bekannt || []).map((t) => t.thema)),
    );

    // 6. Zweite Verteidigungslinie: nur Themen mit real existierenden Quell-Nummern
    const belegte = kandidaten
      .map((k) => ({
        ...k,
        quellIds: k.quell_nummern
          .map((n) => nrZuItemId.get(n))
          .filter((id): id is string => !!id),
      }))
      .filter((k) => k.quellIds.length > 0);

    const dedupSeen = new Set<string>();
    const topicRows = belegte
      .map((k) => ({ kandidat: k, key: dedupKey(k.thema) }))
      .filter(({ key }) => key.length > 0 && !dedupSeen.has(key) && dedupSeen.add(key));

    const { data: neueTopics, error: topicErr } = await supabase
      .from('social_topics')
      .upsert(
        topicRows.map(({ kandidat, key }) => ({
          scan_id: scanId,
          thema: kandidat.thema,
          aufhaenger: kandidat.aufhaenger,
          kategorie: kandidat.kategorie,
          relevanz: kandidat.relevanz,
          dedup_key: key,
        })),
        { onConflict: 'dedup_key', ignoreDuplicates: true },
      )
      .select('id, thema, aufhaenger, kategorie, relevanz, dedup_key');
    if (topicErr) throw new Error(`Themen-Insert fehlgeschlagen: ${topicErr.message}`);

    // 7. Provenienz-Kette: Thema <-> Quell-Artikel
    const keyZuQuellIds = new Map(topicRows.map(({ kandidat, key }) => [key, kandidat.quellIds]));
    const quellRows = (neueTopics || []).flatMap((t) =>
      (keyZuQuellIds.get(t.dedup_key) || []).map((itemId) => ({
        topic_id: t.id,
        trend_item_id: itemId,
      })),
    );
    if (quellRows.length > 0) {
      const { error: linkErr } = await supabase
        .from('social_topic_sources')
        .upsert(quellRows, { onConflict: 'topic_id,trend_item_id', ignoreDuplicates: true });
      if (linkErr) throw new Error(`Quell-Verknüpfung fehlgeschlagen: ${linkErr.message}`);
    }

    // 8. Scan abschließen
    const neueThemen = neueTopics?.length ?? 0;
    await supabase
      .from('social_scans')
      .update({
        status: 'erfolg',
        beendet_am: new Date().toISOString(),
        quellen_stats: quellenStats,
        neue_artikel: neueArtikel,
        neue_themen: neueThemen,
        fehlermeldung: fehler.length > 0 ? fehler.join('; ') : null,
      })
      .eq('id', scanId);

    return jsonResponse({
      scan_id: scanId,
      status: 'erfolg',
      quellen_stats: quellenStats,
      neue_artikel: neueArtikel,
      neue_themen: neueThemen,
      themen: (neueTopics || []).map(({ dedup_key: _dk, ...rest }) => rest),
    });
  } catch (e) {
    // Kein Scan bleibt ewig auf 'laeuft' stehen
    const message = e instanceof Error ? e.message : 'Interner Fehler';
    await supabase
      .from('social_scans')
      .update({ status: 'fehler', beendet_am: new Date().toISOString(), fehlermeldung: message })
      .eq('id', scanId)
      .then(() => {}, () => {});
    return jsonResponse({ scan_id: scanId, status: 'fehler', error: message }, 500);
  }
});
