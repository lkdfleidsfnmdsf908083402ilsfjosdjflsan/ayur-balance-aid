/**
 * csvImport.ts
 *
 * Robust CSV-Parser + Vivino-spezifische Spalten-Erkennung.
 * Vivino-Cellar-Exports kommen in mehreren Varianten (verschiedene Sprachen,
 * verschiedene Versionen). Wir erkennen Spalten flexibel über Synonyme.
 */

/** Parst eine CSV in 2D-String-Array. Handhabt Quotes, escaped Quotes, BOM, CRLF/LF. */
export function parseCsv(text: string): string[][] {
  // BOM entfernen
  let src = text.replace(/^﻿/, '');
  // Trennzeichen erkennen (Komma vs. Semikolon — bei DE-Excel-Exporten oft Semikolon)
  const delim = detectDelimiter(src);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          // Escaped quote inside quoted cell
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }

    // Outside quotes
    if (c === '"' && cell.length === 0) {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delim) {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (c === '\n' || c === '\r') {
      // EOL
      row.push(cell);
      cell = '';
      // Nur nicht-leere Zeilen
      if (row.length > 1 || row[0]?.length > 0) {
        rows.push(row);
      }
      row = [];
      // CRLF: zwei Zeichen überspringen
      if (c === '\r' && src[i + 1] === '\n') i++;
      i++;
      continue;
    }
    cell += c;
    i++;
  }

  // Last cell + row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0]?.length > 0) {
      rows.push(row);
    }
  }
  return rows;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

/** Vivino-Katalog-Eintrag aus einer Zeile. */
export interface VivinoCellarRow {
  name: string;
  weingut: string;
  jahrgang: string;
  rebsorte?: string;
  region?: string;
  land?: string;
  beschreibung?: string;
  vivino_id?: string;
}

/** Spalten-Synonyme für die wichtigsten Felder (DE/EN). */
const COLUMN_SYNONYMS: Record<keyof VivinoCellarRow, string[]> = {
  name: ['wine name', 'wine', 'name', 'wein', 'weinname'],
  weingut: ['winery', 'producer', 'weingut', 'produzent', 'erzeuger'],
  jahrgang: ['vintage', 'year', 'jahrgang', 'jahr'],
  rebsorte: ['grapes', 'grape variety', 'varietal', 'rebsorte', 'rebsorten', 'traube'],
  region: ['region', 'appellation', 'gebiet', 'anbaugebiet'],
  land: ['country', 'land'],
  beschreibung: ['notes', 'description', 'tasting notes', 'notiz', 'notizen', 'beschreibung'],
  vivino_id: ['wine id', 'vivino id', 'id', 'wine_id'],
};

/** Mapping: Header-Index pro Feld. -1 wenn nicht vorhanden. */
type HeaderMap = Record<keyof VivinoCellarRow, number>;

function buildHeaderMap(headerRow: string[]): HeaderMap {
  const norm = headerRow.map((h) =>
    h.toLowerCase().trim().replace(/[_\-\s]+/g, ' ')
  );
  const map: HeaderMap = {
    name: -1,
    weingut: -1,
    jahrgang: -1,
    rebsorte: -1,
    region: -1,
    land: -1,
    beschreibung: -1,
    vivino_id: -1,
  };
  for (const key of Object.keys(map) as (keyof HeaderMap)[]) {
    for (const syn of COLUMN_SYNONYMS[key]) {
      const idx = norm.indexOf(syn);
      if (idx >= 0) {
        map[key] = idx;
        break;
      }
    }
  }
  return map;
}

export interface VivinoImportResult {
  rows: VivinoCellarRow[];
  warnings: string[];
  detectedColumns: Partial<Record<keyof VivinoCellarRow, string>>;
  unmappedHeaders: string[];
}

/**
 * Parst eine Vivino-CSV und extrahiert Wein-Stammdaten.
 * Ignoriert leere Zeilen, behandelt fehlende optionale Spalten gnädig.
 */
export function parseVivinoCsv(csvText: string): VivinoImportResult {
  const warnings: string[] = [];
  const grid = parseCsv(csvText);

  if (grid.length === 0) {
    return { rows: [], warnings: ['Datei ist leer.'], detectedColumns: {}, unmappedHeaders: [] };
  }

  const headerRow = grid[0];
  const map = buildHeaderMap(headerRow);
  const detectedColumns: Partial<Record<keyof VivinoCellarRow, string>> = {};
  for (const k of Object.keys(map) as (keyof HeaderMap)[]) {
    if (map[k] >= 0) detectedColumns[k] = headerRow[map[k]];
  }

  if (map.name === -1) {
    warnings.push(
      'Keine "Wine Name"-Spalte gefunden. Überprüfe ob es ein Vivino-Export ist.'
    );
  }
  if (map.weingut === -1) {
    warnings.push('Keine "Winery"-Spalte gefunden — Weingut bleibt leer.');
  }

  const mappedIndices = Object.values(map).filter((v) => v >= 0);
  const unmappedHeaders = headerRow.filter((_, i) => !mappedIndices.includes(i));

  const rows: VivinoCellarRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const r = grid[i];
    const name = map.name >= 0 ? r[map.name]?.trim() : '';
    if (!name) continue;

    rows.push({
      name,
      weingut: (map.weingut >= 0 ? r[map.weingut] : '')?.trim() || '',
      jahrgang: (map.jahrgang >= 0 ? r[map.jahrgang] : '')?.trim() || '',
      rebsorte: (map.rebsorte >= 0 ? r[map.rebsorte] : '')?.trim() || undefined,
      region: (map.region >= 0 ? r[map.region] : '')?.trim() || undefined,
      land: (map.land >= 0 ? r[map.land] : '')?.trim() || undefined,
      beschreibung: (map.beschreibung >= 0 ? r[map.beschreibung] : '')?.trim() || undefined,
      vivino_id: (map.vivino_id >= 0 ? r[map.vivino_id] : '')?.trim() || undefined,
    });
  }

  if (rows.length === 0 && grid.length > 1) {
    warnings.push(
      'Datei enthält Zeilen, aber keine konnte gelesen werden. Überprüfe das Format.'
    );
  }

  return { rows, warnings, detectedColumns, unmappedHeaders };
}
