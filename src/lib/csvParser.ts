import { RawSaldenliste, Konto, SaldoMonat, UploadedFile } from '@/types/finance';
import { mapBereich, mapKostenarttTyp, mapKpiKategorie } from './bereichMapping';

export function parseCSV(csvText: string): RawSaldenliste[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Erste Zeile = Header
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);

  const data: RawSaldenliste[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length < headers.length) continue;

    const row: RawSaldenliste = {} as RawSaldenliste;
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      // Versuche numerische Werte zu parsen
      const numericValue = parseGermanNumber(value);
      row[header] = isNaN(numericValue) ? value : numericValue;
    });

    if (row.KontoNr || row.Kontoklasse) {
      data.push(row);
    }
  }

  return data;
}

function detectDelimiter(headerLine: string): ';' | ',' {
  // Wichtig: Deutsche Zahlen nutzen Komma als Dezimaltrennzeichen.
  // Daher NIE blind auf ',' splitten, wenn ';' der eigentliche CSV-Separator ist.
  let semicolons = 0;
  let commas = 0;
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
  // Deutsche Zahlenformatierung: 1.234,56 -> 1234.56
  const cleaned = value
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
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
  
  // Format: "Saldo Soll 1/25" oder "Saldo Haben 1/25"
  // Suche nach Spalten die zum Monat passen
  const jahrKurz = String(jahr).slice(-2); // 2025 -> "25"
  const monatStr = String(monat);
  
  // Mögliche Spaltenmuster
  const sollPatterns = [
    `saldo soll ${monatStr}/${jahrKurz}`,      // "saldo soll 1/25"
    `saldo soll ${monatStr}/${jahr}`,          // "saldo soll 1/2025"
    `saldo soll ${monatStr} -`,                // "saldo soll 1 - ..." (altes Format)
  ];
  const habenPatterns = [
    `saldo haben ${monatStr}/${jahrKurz}`,
    `saldo haben ${monatStr}/${jahr}`,
    `saldo haben ${monatStr} -`,
  ];
  
  for (const row of data) {
    const kontonummer = String(row.KontoNr || '').trim();
    if (!kontonummer) continue;
    
    let saldoSollMonat = 0;
    let saldoHabenMonat = 0;
    let foundSoll = false;
    let foundHaben = false;
    
    // Suche nach passenden Spalten
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase().trim();
      
      // Saldo Soll
      if (!foundSoll) {
        for (const pattern of sollPatterns) {
          if (lowerKey === pattern || lowerKey.startsWith(pattern)) {
            const val = row[key];
            if (typeof val === 'number') {
              saldoSollMonat = val;
              foundSoll = true;
              break;
            }
          }
        }
      }
      
      // Saldo Haben
      if (!foundHaben) {
        for (const pattern of habenPatterns) {
          if (lowerKey === pattern || lowerKey.startsWith(pattern)) {
            const val = row[key];
            if (typeof val === 'number') {
              saldoHabenMonat = val;
              foundHaben = true;
              break;
            }
          }
        }
      }
    }
    
    // Fallback: Erste Saldo-Spalten nehmen wenn nichts gefunden
    if (!foundSoll || !foundHaben) {
      for (const key of Object.keys(row)) {
        const lowerKey = key.toLowerCase().trim();
        
        if (!foundSoll && lowerKey.startsWith('saldo soll')) {
          const val = row[key];
          if (typeof val === 'number') {
            saldoSollMonat = val;
            foundSoll = true;
          }
        }
        
        if (!foundHaben && lowerKey.startsWith('saldo haben')) {
          const val = row[key];
          if (typeof val === 'number') {
            saldoHabenMonat = val;
            foundHaben = true;
          }
        }
      }
    }
    
    // Berechne Netto-Saldo (Soll - Haben)
    const saldoMonat = saldoSollMonat - saldoHabenMonat;
    
    salden.push({
      kontonummer,
      jahr,
      monat,
      saldoSollMonat,
      saldoHabenMonat,
      saldoMonat,
    });
  }
  
  return salden;
}

export function parseFileName(fileName: string): { year: number; month: number } | null {
  // Erwartetes Format: Saldenliste-MM-YYYY.csv
  const match = fileName.match(/Saldenliste-(\d{2})-(\d{4})/i);
  if (match) {
    return {
      month: parseInt(match[1]),
      year: parseInt(match[2]),
    };
  }
  return null;
}
