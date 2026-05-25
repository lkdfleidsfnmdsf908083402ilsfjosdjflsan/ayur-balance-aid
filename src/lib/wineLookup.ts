/**
 * wineLookup.ts
 *
 * Lookup-Kette für Wein-Erkennung — nach Trefferwahrscheinlichkeit sortiert:
 *
 *  Bei Barcode:
 *   1. lookupBarcodeInCache    – eigene wein_lager-Tabelle (instant, garantierter Hit für Wiederholungen)
 *   2. lookupBarcodeInOFF      – Open Food Facts (selten erfolgreich, aber kostenlos)
 *   3. searchVivino(barcode)   – Vivino-Volltext mit Barcode als Query (Long-Shot, ~10-15% extra)
 *   → wenn alle fehlschlagen: Foto-Pfad vorschlagen
 *
 *  Bei Foto:
 *   1. recognizeWithClaude(image) – Claude Vision (Anthropic) über Edge Function
 *   2. searchVivino(name)         – Anreicherung wenn Name-Similarität ausreichend
 */

import { supabase } from '@/integrations/supabase/client';

export interface WineInfo {
  name: string;
  weingut?: string;
  jahrgang?: string;
  rebsorte?: string;
  region?: string;
  beschreibung?: string;
  bildUrl?: string;
  barcode?: string;
  katalogId?: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'cache' | 'katalog' | 'barcode_off' | 'vivino' | 'claude' | 'manual';
}

// ─── EAN-13 / EAN-8 / UPC-A Prüfziffer ───
export function isValidBarcode(code: string): boolean {
  const c = code.trim();
  if (!/^\d+$/.test(c)) return false;
  if (![8, 12, 13, 14].includes(c.length)) return false;

  const digits = c.split('').map(Number);
  const check = digits.pop()!;
  digits.reverse();
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  const expected = (10 - (sum % 10)) % 10;
  return expected === check;
}

// ─── 1a. Cache-Lookup: eigene wein_lager-Tabelle (Inventar) ───
// Gibt den Wein zurück, der unter diesem Barcode bereits eingelagert wurde.
// Wenn mehrere Treffer: der zuletzt erfasste (Annahme: aktuellster Jahrgang).
export async function lookupBarcodeInCache(barcode: string): Promise<WineInfo | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('wein_lager')
      .select('name, weingut, jahrgang, rebsorte, region, barcode')
      .eq('barcode', barcode.trim())
      .order('erfasst_am', { ascending: false })
      .limit(1);
    if (error) {
      console.warn('[wineLookup] cache lookup error:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    const row = data[0];
    return {
      name: row.name,
      weingut: row.weingut || undefined,
      jahrgang: row.jahrgang || undefined,
      rebsorte: row.rebsorte || undefined,
      region: row.region || undefined,
      barcode: row.barcode || barcode,
      confidence: 'high',
      source: 'cache',
    };
  } catch (e) {
    console.warn('[wineLookup] cache lookup threw:', e);
    return null;
  }
}

// ─── 1b. Katalog-Lookup über Barcode (Stammdaten) ───
// Trifft dann zu, wenn der Barcode beim CSV-Import noch nicht bekannt war,
// aber vorher mal einem Katalog-Eintrag zugeordnet wurde (siehe attachBarcodeToKatalog).
export async function lookupBarcodeInKatalog(barcode: string): Promise<WineInfo | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('wein_katalog')
      .select('id, name, weingut, jahrgang, rebsorte, region, beschreibung, bild_url, barcode')
      .eq('barcode', barcode.trim())
      .limit(1);
    if (error) {
      console.warn('[wineLookup] katalog barcode lookup error:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    const row = data[0];
    return {
      name: row.name,
      weingut: row.weingut || undefined,
      jahrgang: row.jahrgang || undefined,
      rebsorte: row.rebsorte || undefined,
      region: row.region || undefined,
      beschreibung: row.beschreibung || undefined,
      bildUrl: row.bild_url || undefined,
      barcode: row.barcode || barcode,
      katalogId: row.id,
      confidence: 'high',
      source: 'katalog',
    };
  } catch (e) {
    console.warn('[wineLookup] katalog barcode lookup threw:', e);
    return null;
  }
}

// ─── 1c. Katalog-Lookup über Name (für Foto-Erkennung) ───
// Wird nach erfolgreicher Claude-Vision-Erkennung aufgerufen: prüft ob der
// erkannte Wein bereits im Katalog steht. Wenn ja: nimm die strukturierten
// Katalog-Daten statt der Claude-Halluzination.
export async function lookupNameInKatalog(
  name: string,
  weingut?: string
): Promise<WineInfo | null> {
  const cleanName = name.trim();
  if (cleanName.length < 4) return null;

  try {
    // Fuzzy-Match: name ilike + weingut ilike falls vorhanden
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = (supabase as any)
      .from('wein_katalog')
      .select('id, name, weingut, jahrgang, rebsorte, region, beschreibung, bild_url, barcode');

    // ilike funktioniert mit '%token%' für jeden signifikanten Token
    const tokens = cleanName.split(/\s+/).filter((t) => t.length >= 4);
    if (tokens.length === 0) return null;
    query = query.ilike('name', `%${tokens[0]}%`).limit(20);

    const { data, error } = await query;
    if (error) {
      console.warn('[wineLookup] katalog name lookup error:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    // Beste Übereinstimmung nach Token-Similarity
    type Row = {
      id: string;
      name: string;
      weingut: string | null;
      jahrgang: string | null;
      rebsorte: string | null;
      region: string | null;
      beschreibung: string | null;
      bild_url: string | null;
      barcode: string | null;
    };
    let best: Row | null = null;
    let bestScore = 0;
    for (const row of data as Row[]) {
      let score = nameSimilarity(cleanName, row.name);
      if (weingut && row.weingut) {
        score = score * 0.7 + nameSimilarity(weingut, row.weingut) * 0.3;
      }
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }

    if (!best || bestScore < 0.5) return null;

    return {
      name: best.name,
      weingut: best.weingut || undefined,
      jahrgang: best.jahrgang || undefined,
      rebsorte: best.rebsorte || undefined,
      region: best.region || undefined,
      beschreibung: best.beschreibung || undefined,
      bildUrl: best.bild_url || undefined,
      barcode: best.barcode || undefined,
      katalogId: best.id,
      confidence: bestScore > 0.75 ? 'high' : 'medium',
      source: 'katalog',
    };
  } catch (e) {
    console.warn('[wineLookup] katalog name lookup threw:', e);
    return null;
  }
}

// ─── Hilfsfunktion: Barcode an Katalog-Eintrag zurückschreiben ───
// Wenn ein bisher nur per Name bekannter Katalog-Eintrag jetzt einen Barcode
// dazubekommt (z.B. nach erfolgreicher Foto-Erkennung), speichern wir den.
export async function attachBarcodeToKatalog(
  katalogId: string,
  barcode: string
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('wein_katalog')
      .update({ barcode })
      .eq('id', katalogId)
      .is('barcode', null); // nur überschreiben wenn noch leer
  } catch (e) {
    console.warn('[wineLookup] attachBarcodeToKatalog threw:', e);
  }
}

// ─── 2. Open Food Facts ───
export async function lookupBarcodeInOFF(barcode: string): Promise<WineInfo | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      barcode
    )}.json?fields=product_name,brands,categories,image_url,quantity,labels`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product?.product_name) return null;
    const p = data.product;
    return {
      name: String(p.product_name).trim(),
      weingut: p.brands || undefined,
      beschreibung: p.quantity || undefined,
      bildUrl: p.image_url || undefined,
      barcode,
      confidence: 'high',
      source: 'barcode_off',
    };
  } catch {
    return null;
  }
}

// ─── 3. Vivino-Suche (über Edge Function) ───
// Nutzt Vivinos öffentliche Volltext-Suche. Bei einem Barcode als Query findet
// sie den Wein dann, wenn der Barcode irgendwo in Wein-Notes auftaucht. Long-Shot,
// aber kostenlos und ohne Risiko gegenüber einem inoffiziellen Barcode-Endpoint.
export async function searchVivino(query: string): Promise<WineInfo | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  try {
    const { data, error } = await supabase.functions.invoke('vivino-search', {
      body: { query: q },
    });
    if (error || !data || data.found !== true) return null;
    return {
      name: data.name,
      weingut: data.weingut || undefined,
      jahrgang: data.jahrgang || undefined,
      rebsorte: data.rebsorte || undefined,
      region: data.region || undefined,
      bildUrl: data.bildUrl || undefined,
      confidence: 'medium',
      source: 'vivino',
    };
  } catch {
    return null;
  }
}

// ─── 4. Claude Vision (über Edge Function) ───
export async function recognizeWithClaude(base64: string): Promise<WineInfo> {
  const { data, error } = await supabase.functions.invoke('recognize-wine', {
    body: { image: base64 },
  });
  if (error) {
    throw new Error(error.message || 'Bilderkennung fehlgeschlagen');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Leere Antwort vom Erkennungsdienst');
  }
  return {
    name: data.name || 'Nicht erkannt',
    weingut: data.weingut || undefined,
    jahrgang: data.jahrgang || undefined,
    rebsorte: data.rebsorte || undefined,
    region: data.region || undefined,
    confidence: data.confidence || 'low',
    source: 'claude',
  };
}

// ─── Token-basierter Similarity-Check ───
// Verhindert dass ein zufälliger Vivino-Treffer korrekt erkannte Claude-Daten überschreibt.
export function nameSimilarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  const tokensA = new Set(norm(a).split(' ').filter((t) => t.length > 2));
  const tokensB = new Set(norm(b).split(' ').filter((t) => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let common = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t)) common++;
  });
  return common / Math.min(tokensA.size, tokensB.size);
}

// ─── Orchestrator: vollständige Barcode-Lookup-Kette ───
// Liefert das beste Ergebnis und einen Hinweis welche Quelle es war.
export interface BarcodeLookupResult {
  info: WineInfo | null;
  triedSources: string[];
}

export async function lookupBarcode(
  barcode: string,
  onProgress?: (status: string) => void
): Promise<BarcodeLookupResult> {
  const tried: string[] = [];

  onProgress?.('Eigener Bestand …');
  tried.push('cache');
  const cacheHit = await lookupBarcodeInCache(barcode);
  if (cacheHit) return { info: cacheHit, triedSources: tried };

  onProgress?.('Wein-Katalog …');
  tried.push('katalog');
  const katalogHit = await lookupBarcodeInKatalog(barcode);
  if (katalogHit) return { info: katalogHit, triedSources: tried };

  onProgress?.('Open Food Facts …');
  tried.push('off');
  const offHit = await lookupBarcodeInOFF(barcode);
  if (offHit) return { info: offHit, triedSources: tried };

  onProgress?.('Vivino …');
  tried.push('vivino');
  const vivinoHit = await searchVivino(barcode);
  if (vivinoHit) return { info: { ...vivinoHit, barcode }, triedSources: tried };

  return { info: null, triedSources: tried };
}
