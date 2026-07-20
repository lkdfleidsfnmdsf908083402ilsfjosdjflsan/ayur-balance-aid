/**
 * socialAgent.ts
 *
 * Datenzugriff für den Social-Media-Agent — kapselt alle Supabase-Aufrufe
 * (Tabellen + Edge Functions), damit die View keine Query-Details kennt.
 *
 * Kette: Quellen-Scan (social-trend-scan) → Themen (social_topics) →
 * Entwürfe (social-generate-post) → menschliche Freigabe (social_posts).
 *
 * Zwei Konstruktionsregeln aus dem Prototyp-Review, die hier durchgereicht werden:
 *  1. LEERDATEN-SPERRE: Ein Scan kann ehrlich mit status 'keine_daten' enden —
 *     das ist ein gültiges Ergebnis, kein Fehler. Die View zeigt es als Warnung.
 *  2. KEIN AUTO-PUBLISH: gibPostFrei() verlangt zwingend die Nutzer-ID; das
 *     Schema (Constraint post_freigabe_vollstaendig) erzwingt freigegeben_von
 *     UND freigegeben_am für jeden freigegebenen Post.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Typen (passend zum Schema in 20260719_social_agent.sql) ───

export type ScanStatus = 'laeuft' | 'erfolg' | 'keine_daten' | 'fehler';
export type TopicStatus = 'vorgeschlagen' | 'geplant' | 'bespielt' | 'verworfen';
export type PostStatus = 'entwurf' | 'freigegeben' | 'abgelehnt' | 'veroeffentlicht';
export type Quelle = 'google_news' | 'pubmed' | 'reddit';
export type ZeitplanStatus = 'geplant' | 'ausgespielt' | 'fehlgeschlagen' | 'abgebrochen';

export interface SocialScan {
  id: string;
  gestartet_am: string;
  beendet_am: string | null;
  status: ScanStatus;
  ausgeloest_von: 'zeitplan' | 'manuell';
  quellen_stats: Record<string, number>;
  neue_artikel: number;
  neue_themen: number;
  fehlermeldung: string | null;
}

export interface SocialTrendItem {
  id: string;
  scan_id: string | null;
  quelle: Quelle;
  quelle_label: string | null;
  titel: string;
  url: string;
  zusammenfassung: string | null;
  veroeffentlicht_am: string | null;
  abgerufen_am: string;
}

export interface SocialTopic {
  id: string;
  scan_id: string | null;
  thema: string;
  aufhaenger: string | null;
  kategorie: string | null;
  relevanz: 'hoch' | 'mittel' | 'niedrig';
  status: TopicStatus;
  erstellt_am: string;
}

export interface SocialPost {
  id: string;
  topic_id: string | null;
  plattform: string;
  tonalitaet: string | null;
  inhalt: string;
  quellen_urls: string[];
  status: PostStatus;
  modell: string | null;
  erstellt_von: string | null;
  erstellt_am: string;
  freigegeben_von: string | null;
  freigegeben_am: string | null;
  ablehnungsgrund: string | null;
  veroeffentlicht_am: string | null;
  geplant_fuer: string | null;
}

/** Zeile aus der View v_social_posts_review (Post + Thema + hat_quellenbeleg). */
export interface SocialPostReview {
  id: string;
  plattform: string;
  tonalitaet: string | null;
  inhalt: string;
  status: PostStatus;
  quellen_urls: string[];
  geplant_fuer: string | null;
  erstellt_am: string;
  freigegeben_am: string | null;
  thema: string | null;
  aufhaenger: string | null;
  kategorie: string | null;
  relevanz: string | null;
  hat_quellenbeleg: boolean;
}

/** Antwort der Edge Function social-trend-scan. */
export interface TrendScanErgebnis {
  scan_id: string;
  status: ScanStatus;
  quellen_stats: Record<string, number>;
  neue_artikel: number;
  neue_themen: number;
  fehlermeldung?: string;
  themen?: Pick<SocialTopic, 'id' | 'thema' | 'aufhaenger' | 'kategorie' | 'relevanz'>[];
}

/** Antwort der Edge Function social-generate-post. */
export interface GenerierteEntwuerfe {
  posts: { id: string; plattform: string; inhalt: string; quellen_urls: string[]; modell: string }[];
  fehler: { plattform: string; meldung: string }[];
}

// ─── Ausspielung (Schema in 20260719_social_kanaele.sql) ───

/** Ein Plattform-Kanal. verbunden=false heißt: Ausspielen nicht möglich, die View sagt das ehrlich. */
export interface SocialChannel {
  id: string;
  plattform: string;
  anzeigename: string | null;
  konto_id: string | null;
  verbunden: boolean;
  token_secret_name: string | null;
  token_gueltig_bis: string | null;
  letzter_check: string | null;
  letzter_fehler: string | null;
  erstellt_am: string;
  aktualisiert_am: string;
}

/** Ein protokollierter Ausspielversuch — erfolgreich oder nicht. */
export interface SocialPublishAttempt {
  id: string;
  post_id: string;
  plattform: string;
  versucht_am: string;
  /** Aus dem JWT verifizierte Nutzer-ID des Auslösers; null bei Zeitplan-Auslösung. */
  ausgeloest_von: string | null;
  ausloeser_art: 'manuell' | 'zeitplan';
  erfolg: boolean;
  externe_id: string | null;
  externe_url: string | null;
  http_status: number | null;
  fehlermeldung: string | null;
  antwort_auszug: string | null;
}

// ─── Zeitplan (Schema in 20260719_social_zeitplan.sql) ───

/**
 * Ein geplanter Ausspiel-Zeitpunkt. status='ausgespielt' setzt ausschließlich
 * die Edge Function social-publish nach bestätigter Antwort der Plattform —
 * angestossen_marker gesetzt bei status='geplant' heißt: angestoßen, aber
 * unbestätigt. versuch_id verweist auf den echten Eintrag im Ausspiel-Protokoll
 * (social_publish_attempts), sobald social-publish geantwortet hat.
 */
export interface SocialZeitplanEintrag {
  id: string;
  post_id: string;
  geplant_fuer: string;
  plattform: string | null;
  status: ZeitplanStatus;
  angestossen_marker: string | null;
  versuch_id: string | null;
  erstellt_am: string;
  /** Eingebetteter Post (für Kalender-Anzeige); null, wenn der Post gelöscht wurde. */
  post: { id: string; plattform: string; status: PostStatus; inhalt: string } | null;
}

/** Antwort der Edge Function social-publish. */
export interface AusspielErgebnis {
  erfolg: boolean;
  grund?:
    | 'nicht_freigegeben'
    | 'bereits_in_arbeit'
    | 'kanal_nicht_verbunden'
    | 'token_fehlt'
    | 'medium_fehlt'
    | 'medium_nicht_ladbar'
    | 'plattform_nicht_implementiert'
    | 'plattform_fehler';
  meldung: string;
  externe_url?: string;
  versuch_id?: string | null;
}

// ─── Plattformen & Tonalitäten (Spiegel der Edge-Function-Konfiguration) ───

export const SOCIAL_PLATTFORMEN: { id: string; label: string; maxChars: number }[] = [
  { id: 'linkedin', label: 'LinkedIn', maxChars: 3000 },
  { id: 'instagram', label: 'Instagram', maxChars: 2200 },
  { id: 'facebook', label: 'Facebook', maxChars: 63206 },
  { id: 'youtube', label: 'YouTube', maxChars: 5000 },
  { id: 'tiktok', label: 'TikTok', maxChars: 2200 },
  { id: 'threads', label: 'Threads', maxChars: 500 },
];

/**
 * Gute Sendezeiten je Plattform — Erfahrungswerte aus dem Prototyp.
 * Reine Vorschläge für den Einplanen-Dialog, kein Zwang.
 */
export const SOCIAL_SENDEZEITEN: Record<string, { zeiten: string[]; tage: string[] }> = {
  linkedin: { zeiten: ['08:00', '12:00', '17:00'], tage: ['Di', 'Mi', 'Do'] },
  instagram: { zeiten: ['09:00', '12:00', '19:00'], tage: ['Mo', 'Do', 'Fr'] },
  facebook: { zeiten: ['09:00', '13:00', '20:00'], tage: ['Mo', 'Mi', 'Fr'] },
  youtube: { zeiten: ['15:00', '18:00'], tage: ['Fr', 'Sa', 'So'] },
  tiktok: { zeiten: ['19:00', '21:00'], tage: ['Di', 'Do', 'Fr', 'Sa'] },
  threads: { zeiten: ['09:00', '13:00', '20:00'], tage: ['Mo', 'Di', 'Mi', 'Do', 'Fr'] },
};

export const SOCIAL_TONALITAETEN: { id: string; label: string }[] = [
  { id: 'reflective', label: 'Tiefgründig & reflektiv' },
  { id: 'inspiring', label: 'Inspirierend & bewegend' },
  { id: 'educational', label: 'Wissensvermittelnd' },
  { id: 'personal', label: 'Persönlich & herzlich' },
  { id: 'provocative', label: 'Aufmerksamkeitsstark' },
];

// Die social_*-Tabellen sind noch nicht in den generierten Supabase-Typen —
// gleicher Umweg wie in wineLookup.ts für wein_lager/wein_katalog.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Scan ───

/**
 * Stößt einen manuellen Quellen-Scan an. 'keine_daten' ist eine gültige Antwort.
 *
 * WER ausgelöst hat, verifiziert die Edge Function serverseitig aus dem JWT
 * (invoke sendet das Session-Token mit) — ein ausgeloest_von im Body würde
 * ungeprüft bleiben und wird deshalb bewusst nicht übertragen.
 */
export async function starteTrendScan(): Promise<TrendScanErgebnis> {
  const { data, error } = await supabase.functions.invoke('social-trend-scan', {
    body: {},
  });
  if (error) throw error;
  return data as TrendScanErgebnis;
}

/** Jüngster Scan-Lauf (oder null, wenn noch nie gescannt wurde). */
export async function ladeLetztenScan(): Promise<SocialScan | null> {
  const { data, error } = await db
    .from('social_scans')
    .select('*')
    .order('gestartet_am', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SocialScan | null) ?? null;
}

// ─── Themen ───

export async function ladeThemen(status?: TopicStatus): Promise<SocialTopic[]> {
  let query = db
    .from('social_topics')
    .select('id, scan_id, thema, aufhaenger, kategorie, relevanz, status, erstellt_am')
    .order('erstellt_am', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data as SocialTopic[]) ?? [];
}

/** Quell-Artikel eines Themas (die Provenienz-Kette). Leeres Array = Thema ohne Quellenbeleg. */
export async function ladeQuellenZuThema(topicId: string): Promise<SocialTrendItem[]> {
  const { data, error } = await db
    .from('social_topic_sources')
    .select('social_trend_items ( id, scan_id, quelle, quelle_label, titel, url, zusammenfassung, veroeffentlicht_am, abgerufen_am )')
    .eq('topic_id', topicId);
  if (error) throw error;
  return ((data ?? []) as { social_trend_items: SocialTrendItem | null }[])
    .map((r) => r.social_trend_items)
    .filter((s): s is SocialTrendItem => !!s);
}

export async function verwerfeThema(topicId: string): Promise<void> {
  const { error } = await db
    .from('social_topics')
    .update({ status: 'verworfen' })
    .eq('id', topicId);
  if (error) throw error;
}

// ─── Entwürfe ───

/**
 * Erzeugt Post-Entwürfe zu einem Thema. social_posts.erstellt_von setzt die
 * Edge Function aus der serverseitig verifizierten JWT-Identität (invoke sendet
 * das Session-Token mit) — eine Nutzer-ID im Body würde ungeprüft bleiben und
 * wird deshalb bewusst nicht übertragen.
 */
export async function generierePosts(
  topicId: string,
  plattformen: string[],
  tonalitaet: string,
): Promise<GenerierteEntwuerfe> {
  const { data, error } = await supabase.functions.invoke('social-generate-post', {
    body: {
      topic_id: topicId,
      plattformen,
      tonalitaet,
    },
  });
  if (error) throw error;
  return data as GenerierteEntwuerfe;
}

/** Alle Posts aus der Review-View (Entwürfe, Freigegebene, Abgelehnte, Veröffentlichte). */
export async function ladePostsZurPruefung(): Promise<SocialPostReview[]> {
  const { data, error } = await db
    .from('v_social_posts_review')
    .select('*')
    .order('erstellt_am', { ascending: false });
  if (error) throw error;
  return (data as SocialPostReview[]) ?? [];
}

// ─── Freigabe (Vier-Augen-Prinzip) ───

/**
 * Gibt einen Post frei.
 *
 * Wer freigibt und wann, setzt bewusst NICHT das Frontend, sondern der Trigger
 * social_posts_status_wache: er stempelt freigegeben_von = auth.uid() und
 * freigegeben_am = now() und weist die Freigabe zurück, wenn der Aufrufer kein
 * Admin ist. Eine hier mitgegebene Nutzer-ID wäre eine unbelegte Behauptung —
 * deshalb schicken wir gar keine. Die Datenbank weiß ohnehin besser, wer gerade
 * angemeldet ist.
 */
export async function gibPostFrei(postId: string): Promise<void> {
  const { error } = await db
    .from('social_posts')
    .update({ status: 'freigegeben' })
    .eq('id', postId);
  if (error) throw error;
}

export async function lehnePostAb(postId: string, grund: string): Promise<void> {
  const { error } = await db
    .from('social_posts')
    .update({ status: 'abgelehnt', ablehnungsgrund: grund || null })
    .eq('id', postId);
  if (error) throw error;
}

// ─── Ausspielung ───

/** Alle sechs Plattform-Kanäle mit Verbindungsstatus. */
export async function ladeKanaele(): Promise<SocialChannel[]> {
  const { data, error } = await db
    .from('social_channels')
    .select('*')
    .order('plattform');
  if (error) throw error;
  return (data as SocialChannel[]) ?? [];
}

/** Setzt den Verbindungsstatus eines Kanals (z.B. nach Einrichtung oder Token-Ablauf). */
export async function kanalStatusSetzen(
  kanalId: string,
  verbunden: boolean,
  fehler?: string | null,
): Promise<void> {
  const { error } = await db
    .from('social_channels')
    .update({
      verbunden,
      letzter_check: new Date().toISOString(),
      letzter_fehler: fehler ?? null,
      aktualisiert_am: new Date().toISOString(),
    })
    .eq('id', kanalId);
  if (error) throw error;
}

/**
 * Spielt einen freigegebenen Post über die Edge Function social-publish aus.
 * Die Function prüft den Erfolg echt (HTTP 2xx + Post-ID der Plattform) und
 * protokolliert jeden Versuch — auch erwartete Abbrüche wie 'kanal_nicht_verbunden'
 * kommen als erfolg=false mit klarer Meldung zurück, nicht als Exception.
 *
 * WER ausgelöst hat, wird serverseitig aus dem JWT verifiziert (invoke sendet
 * das Session-Token mit) — eine Nutzer-ID im Body würde ungeprüft bleiben und
 * wird deshalb bewusst nicht übertragen.
 */
export async function postAusspielen(postId: string): Promise<AusspielErgebnis> {
  const { data, error } = await supabase.functions.invoke('social-publish', {
    body: { post_id: postId },
  });
  if (error) throw error;
  return data as AusspielErgebnis;
}

/** Ausspiel-Protokoll eines Posts, neueste zuerst. */
export async function ladeAusspielVersuche(postId: string): Promise<SocialPublishAttempt[]> {
  const { data, error } = await db
    .from('social_publish_attempts')
    .select('*')
    .eq('post_id', postId)
    .order('versucht_am', { ascending: false });
  if (error) throw error;
  return (data as SocialPublishAttempt[]) ?? [];
}

// ─── Zeitplan ───

/** Alle Zeitplan-Einträge mit eingebettetem Post, früheste zuerst. */
export async function ladeZeitplan(): Promise<SocialZeitplanEintrag[]> {
  const { data, error } = await db
    .from('social_zeitplan')
    .select('id, post_id, geplant_fuer, plattform, status, angestossen_marker, versuch_id, erstellt_am, social_posts ( id, plattform, status, inhalt )')
    .order('geplant_fuer', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as (Omit<SocialZeitplanEintrag, 'post'> & {
    social_posts: SocialZeitplanEintrag['post'];
  })[]).map(({ social_posts, ...rest }) => ({ ...rest, post: social_posts ?? null }));
}

/**
 * Plant einen Post zur automatischen Ausspielung ein. Dieselbe Regel wie im
 * Cron-Worker: nur Posts mit status 'freigegeben' — alles andere wird hier
 * abgewiesen, bevor überhaupt ein Zeitplan-Eintrag entsteht.
 *
 * DOPPEL-SPERRE: Pro Post darf höchstens EIN Eintrag mit status 'geplant'
 * existieren — sonst würde derselbe Post zweimal veröffentlicht, wenn beide
 * Einträge im selben Worker-Lauf fällig werden. Die Prüfung hier fängt den
 * Normalfall ab; das echte Rennen (zwei Tabs, zwei Admins gleichzeitig) fängt
 * der partielle Unique-Index aus 20260720_social_nachtrag_zeitplan_unique.sql
 * serverseitig ab (Fehlercode 23505, hier verständlich übersetzt).
 */
export async function postEinplanen(postId: string, zeitpunkt: Date): Promise<void> {
  if (zeitpunkt.getTime() <= Date.now()) {
    throw new Error('Der Zeitpunkt muss in der Zukunft liegen.');
  }
  const { data: post, error: postError } = await db
    .from('social_posts')
    .select('status, plattform')
    .eq('id', postId)
    .maybeSingle();
  if (postError) throw postError;
  if (!post) throw new Error('Post nicht gefunden.');
  if (post.status !== 'freigegeben') {
    throw new Error(`Nur freigegebene Posts können eingeplant werden (Status: '${post.status}').`);
  }
  const { data: bestehend, error: bestehendError } = await db
    .from('social_zeitplan')
    .select('id, geplant_fuer')
    .eq('post_id', postId)
    .eq('status', 'geplant')
    .limit(1)
    .maybeSingle();
  if (bestehendError) throw bestehendError;
  if (bestehend) {
    throw new Error(
      `Dieser Post ist bereits eingeplant (${new Date(bestehend.geplant_fuer).toLocaleString('de-AT')}). ` +
        'Bitte zuerst die bestehende Planung abbrechen, um doppeltes Veröffentlichen zu verhindern.',
    );
  }
  const { error } = await db.from('social_zeitplan').insert({
    post_id: postId,
    geplant_fuer: zeitpunkt.toISOString(),
    plattform: post.plattform,
  });
  if (error) {
    // 23505 = Unique-Index verletzt: jemand anderes hat denselben Post soeben eingeplant.
    if ((error as { code?: string }).code === '23505') {
      throw new Error(
        'Dieser Post wurde soeben von anderer Stelle eingeplant. Die doppelte Planung wurde verhindert.',
      );
    }
    throw error;
  }
}

/** Bricht einen noch nicht angestoßenen Zeitplan-Eintrag ab. */
export async function planungAbbrechen(id: string): Promise<void> {
  const { error } = await db
    .from('social_zeitplan')
    .update({ status: 'abgebrochen' })
    .eq('id', id)
    .eq('status', 'geplant');
  if (error) throw error;
}
