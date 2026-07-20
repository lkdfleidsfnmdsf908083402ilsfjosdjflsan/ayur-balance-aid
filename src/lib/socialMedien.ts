/**
 * socialMedien.ts
 *
 * Datenzugriff für die Medien-Bibliothek — wiederverwendbare Video-Clips und
 * Bilder im privaten Storage-Bucket 'social-medien' (Schema: 20260719_social_medien.sql).
 *
 * Konstruktionsregeln:
 *  - Der Bucket ist PRIVAT: Anzeige läuft ausschließlich über signierte URLs.
 *  - Kein Löschen aus der Oberfläche, nur Deaktivieren — Zuordnungen bleiben nachvollziehbar.
 *  - vorschlageAssets() ist eine reine Sortier-Heuristik ohne KI-Aufruf:
 *    erklärbar, kostenlos, deterministisch.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Typen (passend zum Schema) ───

export type AssetTyp = 'video' | 'bild';
export type AssetFormat = 'hochkant' | 'quer' | 'quadrat';

export interface SocialAsset {
  id: string;
  dateiname: string;
  storage_pfad: string;
  typ: AssetTyp;
  mime_type: string;
  groesse_bytes: number;
  dauer_sekunden: number | null;
  breite: number | null;
  hoehe: number | null;
  titel: string;
  beschreibung: string | null;
  outfit: string | null;
  kulisse: string | null;
  themen: string[];
  format: AssetFormat | null;
  verwendet_zaehler: number;
  hochgeladen_von: string | null;
  erstellt_am: string;
  aktiv: boolean;
}

/** Metadaten beim Upload bzw. beim Bearbeiten eines Assets. */
export interface AssetMeta {
  titel: string;
  beschreibung?: string | null;
  outfit?: string | null;
  kulisse?: string | null;
  themen?: string[];
  format?: AssetFormat | null;
  typ: AssetTyp;
  dauer_sekunden?: number | null;
  breite?: number | null;
  hoehe?: number | null;
  hochgeladen_von?: string | null;
}

const BUCKET = 'social-medien';

// Die social_*-Tabellen sind noch nicht in den generierten Supabase-Typen —
// gleicher Umweg wie in socialAgent.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Laden & Filtern ───

export async function ladeAssets(filter?: {
  typ?: AssetTyp;
  format?: AssetFormat;
  thema?: string;
}): Promise<SocialAsset[]> {
  let query = db
    .from('social_assets')
    .select('*')
    .eq('aktiv', true)
    .order('erstellt_am', { ascending: false });
  if (filter?.typ) query = query.eq('typ', filter.typ);
  if (filter?.format) query = query.eq('format', filter.format);
  if (filter?.thema) query = query.contains('themen', [filter.thema]);
  const { data, error } = await query;
  if (error) throw error;
  return (data as SocialAsset[]) ?? [];
}

export async function ladeAsset(id: string): Promise<SocialAsset | null> {
  const { data, error } = await db
    .from('social_assets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as SocialAsset | null) ?? null;
}

// ─── Upload ───

/**
 * Lädt eine Datei in den privaten Bucket und legt die Metadaten-Zeile an.
 * Schlägt der DB-Insert fehl, wird die Datei wieder entfernt —
 * es bleiben keine Waisen im Bucket liegen.
 */
export async function assetHochladen(datei: File, meta: AssetMeta): Promise<SocialAsset> {
  // Eindeutiger Pfad; Sonderzeichen raus, sonst lehnt Storage den Key ab.
  const sicherName = datei.name.replace(/[^A-Za-z0-9._-]+/g, '_');
  const storagePfad = `${crypto.randomUUID()}/${sicherName}`;

  const { error: uploadFehler } = await supabase.storage
    .from(BUCKET)
    .upload(storagePfad, datei, { contentType: datei.type, upsert: false });
  if (uploadFehler) throw uploadFehler;

  const { data, error: insertFehler } = await db
    .from('social_assets')
    .insert({
      dateiname: datei.name,
      storage_pfad: storagePfad,
      typ: meta.typ,
      mime_type: datei.type || 'application/octet-stream',
      groesse_bytes: datei.size,
      dauer_sekunden: meta.dauer_sekunden ?? null,
      breite: meta.breite ?? null,
      hoehe: meta.hoehe ?? null,
      titel: meta.titel,
      beschreibung: meta.beschreibung ?? null,
      outfit: meta.outfit ?? null,
      kulisse: meta.kulisse ?? null,
      themen: meta.themen ?? [],
      format: meta.format ?? null,
      hochgeladen_von: meta.hochgeladen_von ?? null,
    })
    .select()
    .single();

  if (insertFehler) {
    // Aufräumen, damit keine Datei ohne DB-Zeile zurückbleibt.
    await supabase.storage.from(BUCKET).remove([storagePfad]);
    throw insertFehler;
  }
  return data as SocialAsset;
}

// ─── Pflege ───

export async function assetAktualisieren(
  id: string,
  meta: Partial<Omit<AssetMeta, 'typ' | 'hochgeladen_von'>>,
): Promise<void> {
  const { error } = await db.from('social_assets').update(meta).eq('id', id);
  if (error) throw error;
}

/** Deaktiviert statt zu löschen — Datei und Post-Zuordnungen bleiben erhalten. */
export async function assetDeaktivieren(id: string): Promise<void> {
  const { error } = await db.from('social_assets').update({ aktiv: false }).eq('id', id);
  if (error) throw error;
}

// ─── Auslieferung (Bucket ist privat) ───

export async function signierteUrl(storagePfad: string, sekunden = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePfad, sekunden);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Keine signierte URL erhalten.');
  return data.signedUrl;
}

// ─── Post-Zuordnung ───

export async function assetZuPostZuordnen(postId: string, assetId: string): Promise<void> {
  const { error } = await db
    .from('social_post_assets')
    .insert({ post_id: postId, asset_id: assetId });
  if (error) throw error;
  const { error: zaehlerFehler } = await db.rpc('social_asset_verwendung', {
    p_asset_id: assetId,
    p_delta: 1,
  });
  if (zaehlerFehler) throw zaehlerFehler;
}

export async function assetVonPostLoesen(postId: string, assetId: string): Promise<void> {
  const { error } = await db
    .from('social_post_assets')
    .delete()
    .eq('post_id', postId)
    .eq('asset_id', assetId);
  if (error) throw error;
  const { error: zaehlerFehler } = await db.rpc('social_asset_verwendung', {
    p_asset_id: assetId,
    p_delta: -1,
  });
  if (zaehlerFehler) throw zaehlerFehler;
}

export async function ladeAssetsZuPost(postId: string): Promise<SocialAsset[]> {
  const { data, error } = await db
    .from('social_post_assets')
    .select('social_assets ( * )')
    .eq('post_id', postId);
  if (error) throw error;
  return ((data ?? []) as { social_assets: SocialAsset | null }[])
    .map((r) => r.social_assets)
    .filter((a): a is SocialAsset => !!a);
}

// ─── Vorschlags-Heuristik (bewusst KEIN KI-Aufruf) ───

/** Das Nötigste eines Posts für die Vorschlagsberechnung. */
export interface PostFuerVorschlag {
  plattform: string;
  kategorie?: string | null;
  thema?: string | null;
}

/** Welches Format zur Plattform passt (Instagram/TikTok hochkant, LinkedIn/Facebook quer). */
export function passendesFormat(plattform: string): AssetFormat | null {
  if (plattform === 'instagram' || plattform === 'tiktok' || plattform === 'threads') return 'hochkant';
  if (plattform === 'linkedin' || plattform === 'facebook' || plattform === 'youtube') return 'quer';
  return null;
}

/**
 * Schlägt Assets für einen Post vor — reine, erklärbare Sortierung:
 *  1. Schlagwort-Überschneidung mit Kategorie/Thema des Posts (mehr Treffer = besser)
 *  2. Format passend zur Plattform vor unpassendem
 *  3. aufsteigend nach verwendet_zaehler, damit nicht immer derselbe Clip kommt
 */
export async function vorschlageAssets(
  post: PostFuerVorschlag,
  limit = 6,
): Promise<SocialAsset[]> {
  const assets = await ladeAssets();
  if (assets.length === 0) return [];

  const zielFormat = passendesFormat(post.plattform);
  // Suchbegriffe aus Kategorie + Thema-Wörtern (ab 4 Zeichen, sonst zu viel Rauschen)
  const begriffe = new Set<string>();
  if (post.kategorie) begriffe.add(post.kategorie.toLowerCase());
  for (const wort of (post.thema ?? '').toLowerCase().split(/[^a-zäöüß0-9]+/i)) {
    if (wort.length >= 4) begriffe.add(wort);
  }

  const bewertet = assets.map((asset) => {
    let ueberschneidung = 0;
    for (const schlagwort of asset.themen) {
      const s = schlagwort.toLowerCase();
      for (const b of begriffe) {
        if (s === b || s.includes(b) || b.includes(s)) {
          ueberschneidung++;
          break;
        }
      }
    }
    const formatPasst = zielFormat !== null && asset.format === zielFormat ? 1 : 0;
    return { asset, ueberschneidung, formatPasst };
  });

  bewertet.sort((a, b) =>
    b.ueberschneidung - a.ueberschneidung
    || b.formatPasst - a.formatPasst
    || a.asset.verwendet_zaehler - b.asset.verwendet_zaehler,
  );

  return bewertet.slice(0, limit).map((b) => b.asset);
}
