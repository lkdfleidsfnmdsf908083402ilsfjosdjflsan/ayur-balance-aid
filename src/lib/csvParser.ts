import { RawSaldenliste, Konto, SaldoMonat, UploadedFile } from '@/types/finance';
import { mapBereich, mapKostenarttTyp } from './bereichMapping';

export function parseCSV(csvText: string): RawSaldenliste[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Erste Zeile = Header
  const headers = parseCSVLine(lines[0]);
  
  const data: RawSaldenliste[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
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

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ';' || char === ',') && !inQuotes) {
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
    
    kontenMap.set(kontonummer, {
      kontonummer,
      kontobezeichnung: bezeichnung,
      kontoklasse,
      bereich: mapBereich(kontonummer, bezeichnung),
      kostenarttTyp: mapKostenarttTyp(kontonummer),
    });
  }
  
  return Array.from(kontenMap.values());
}

export function extractSalden(data: RawSaldenliste[], jahr: number, monat: number): SaldoMonat[] {
  const salden: SaldoMonat[] = [];
  
  for (const row of data) {
    const kontonummer = String(row.KontoNr || '').trim();
    if (!kontonummer) continue;
    
    // Suche nach Monats-Soll/Haben-Spalten
    let saldoSollMonat = 0;
    let saldoHabenMonat = 0;
    
    // Versuche verschiedene Spaltenbezeichnungen
    const monatStr = monat.toString().padStart(2, '0');
    const possibleSollKeys = [
      `${monatStr}-Soll`,
      `Monat-Soll`,
      `${monat}-Soll`,
      'Saldo Soll',
    ];
    const possibleHabenKeys = [
      `${monatStr}-Haben`,
      `Monat-Haben`,
      `${monat}-Haben`,
      'Saldo Haben',
    ];
    
    for (const key of possibleSollKeys) {
      if (key in row && typeof row[key] === 'number') {
        saldoSollMonat = row[key] as number;
        break;
      }
    }
    
    for (const key of possibleHabenKeys) {
      if (key in row && typeof row[key] === 'number') {
        saldoHabenMonat = row[key] as number;
        break;
      }
    }
    
    // Berechne Netto-Saldo (Soll - Haben für Aufwand, Haben - Soll für Erlöse)
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
