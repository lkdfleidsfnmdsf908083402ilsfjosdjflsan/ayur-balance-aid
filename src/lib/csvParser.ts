import { RawSaldenliste, Konto, SaldoMonat } from '@/types/finance';
import { mapBereich, mapKostenarttTyp, mapKpiKategorie } from './bereichMapping';

export function preprocessCSV(csvText: string): {
  normalizedCSV: string;
  detectedMonth: number | null;
  detectedYear: number | null;
} {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { normalizedCSV: csvText, detectedMonth: null, detectedYear: null };

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const rawHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

  let detectedMonth: number | null = null;
  let detectedYear: number | null = null;

  const monthNames: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, mai: 5, may: 5,
    jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dez: 12, dec: 12
  };

  for (const h of rawHeaders) {
    const lower = h.toLowerCase().replace(/\s+/g, ' ');
    const m1 = lower.match(/(\d{1,2})\/(\d{2,4})/);
    if (m1) {
      detectedMonth = parseInt(m1[1]);
      const yr = parseInt(m1[2]);
      detectedYear = yr < 100 ? 2000 + yr : yr;
      break;
    }
    for (const [name, num] of Object.entries(monthNames)) {
      const regex = new RegExp(name + '\\s+(\\d{2,4})');
      const m2 = lower.match(regex);
      if (m2) {
        detectedMonth = num;
        const yr = parseInt(m2[1]);
        detectedYear = yr < 100 ? 2000 + yr : yr;
        break;
      }
    }
    if (detectedMonth) break;
  }

  let monatSollIdx = -1;
  let monatHabenIdx = -1;
  let saldoSollIdx = -1;
  let saldoHabenIdx = -1;
  let kontoklasseIdx = -1;
  let kontonrIdx = -1;
  let kontobezeichnungIdx = -1;

  rawHeaders.forEach((h, i) => {
    const lower = h.toLowerCase().replace(/\s+/g, ' ').trim();
    if (lower === 'kontoklasse') kontoklasseIdx = i;
    if (lower === 'kontonr') kontonrIdx = i;
    if (lower === 'kontobezeichnung') kontobezeichnungIdx = i;
    if (lower.startsWith('monat-soll') || lower.startsWith('monat soll')) monatSollIdx = i;
    if (lower.startsWith('monat-haben') || lower.startsWith('monat haben')) monatHabenIdx = i;
    if (lower.startsWith('saldo soll') && !lower.includes('lfd')) saldoSollIdx = i;
    if (lower.startsWith('saldo haben') && !lower.includes('lfd')) saldoHabenIdx = i;
  });

  const useSollIdx = monatSollIdx >= 0 ? monatSollIdx : saldoSollIdx;
  const useHabenIdx = monatHabenIdx >= 0 ? monatHabenIdx : saldoHabenIdx;

  const monatJahrStr = detectedMonth && detectedYear
    ? `${detectedMonth}/${String(detectedYear).slice(-2)}`
    : 'XX/XX';

  const finalHeaders = ['Kontoklasse', 'KontoNr', 'Kontobezeichnung', `Saldo Soll ${monatJahrStr}`, `Saldo Haben ${monatJahrStr}`];
  const resultLines: string[] = [finalHeaders.join(';')];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) continue;
    const kontoNr = kontonrIdx >= 0 ? cols[kontonrIdx] : '';
    if (!kontoNr) continue;
    const kontoklasse = kontoklasseIdx >= 0 ? cols[kontoklasseIdx] : '';
    const bezeichnung = kontobezeichnungIdx >= 0 ? cols[kontobezeichnungIdx].replace(/%/g, 'Prozent').replace(/&/g, 'und') : '';
    const soll = useSollIdx >= 0 ? cols[useSollIdx] || '0' : '0';
    const haben = useHabenIdx >= 0 ? cols[useHabenIdx] || '0' : '0';
    resultLines.push([kontoklasse, kontoNr, bezeichnung, soll, haben].join(';'));
  }

  return { normalizedCSV: resultLines.join('\n'), detectedMonth, detectedYear };
}

export function parseCSV(csvText: string): RawSaldenliste[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);
  const data: RawSaldenliste[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length < 3) continue;
    const row: RawSaldenliste = {} as RawSaldenliste;
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      const numericValue = parseGermanNumber(value);
      row[header] = isNaN(numericValue) ? value : numericValue;
    });
    if (row.KontoNr || row.Kontoklasse) data.push(row);
  }
  return data;
}

function detectDelimiter(headerLine: string): ';' | ',' {
  let semicolons = 0, commas = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (char === ';') semicolons++;
      if (char === ',') commas++;
    }
  }
  if (semicolons === 0 && commas === 0) return ';';
  if (semicolons === 0) return ',';
  if (commas === 0) return ';';
  return semicolons >= commas ? ';' : ',';
}

function parseCSVLine(line: string, delimiter: ';' | ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseGermanNumber(value: string): number {
  if (!value || value.trim() === '') return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  return parseFloat(cleaned);
}

export function extractKonten(data: RawSaldenliste[]): Konto[] {
  const kontenMap = new Map<string, Konto>();
  for (const row of data) {
    const kontonummer = String(row.KontoNr || '').trim();
    if (!kontonummer || kontenMap.has(kontonummer)) continue;
    const bezeichnung = String(row.Kontobezeichnung || '').trim();
    const kontoklasse = String(row.Kontoklasse || '').trim();
    const bereich = mapBereich(kontonummer, bezeichnung);
    kontenMap.set(kontonummer, {
      kontonummer,
      kontobezeichnung: bezeichnung,
      kontoklasse,
      bereich,
      kostenarttTyp: mapKostenarttTyp(kontonummer, bereich),
      kpiKategorie: mapKpiKategorie(kontonummer, bezeichnung),
    });
  }
  return Array.from(kontenMap.values());
}

export function extractSalden(data: RawSaldenliste[], jahr: number, monat: number): SaldoMonat[] {
  const salden: SaldoMonat[] = [];
  const jahrKurz = String(jahr).slice(-2);
  const monatStr = String(monat);
  const sollPatterns = [
    `saldo soll ${monatStr}/${jahrKurz}`,
    `saldo soll ${monatStr}/${jahr}`,
    `saldo soll`,
  ];
  const habenPatterns = [
    `saldo haben ${monatStr}/${jahrKurz}`,
    `saldo haben ${monatStr}/${jahr}`,
    `saldo haben`,
  ];
  for (const row of data) {
    const kontonummer = String(row.KontoNr || '').trim();
    if (!kontonummer) continue;
    let saldoSollMonat = 0, saldoHabenMonat = 0;
    let foundSoll = false, foundHaben = false;
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase().trim().replace(/\s+/g, ' ');
      if (!foundSoll) {
        for (const pattern of sollPatterns) {
          if (lowerKey === pattern || lowerKey.startsWith(pattern)) {
            const val = row[key];
            if (typeof val === 'number') { saldoSollMonat = val; foundSoll = true; break; }
          }
        }
      }
      if (!foundHaben) {
        for (const pattern of habenPatterns) {
          if (lowerKey === pattern || lowerKey.startsWith(pattern)) {
            const val = row[key];
            if (typeof val === 'number') { saldoHabenMonat = val; foundHaben = true; break; }
          }
        }
      }
    }
    salden.push({ kontonummer, jahr, monat, saldoSollMonat, saldoHabenMonat, saldoMonat: saldoSollMonat - saldoHabenMonat });
  }
  return salden;
}

export function parseFileName(fileName: string): { year: number; month: number } | null {
  const clean = fileName.replace(/[_\s]+/g, '-').replace(/--+/g, '-');
  const match = clean.match(/Saldenliste-(\d{2})-(\d{4})/i);
  if (match) return { month: parseInt(match[1]), year: parseInt(match[2]) };
  const match2 = clean.match(/Saldenliste-(\d{2})-(\d{2})/i);
  if (match2) {
    const yr = parseInt(match2[2]);
    return { month: parseInt(match2[1]), year: yr < 50 ? 2000 + yr : 1900 + yr };
  }
  return null;
}
