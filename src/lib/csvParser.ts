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
    const bereich = mapBereich(kontonummer, bezeichnung);
    
    kontenMap.set(kontonummer, {
      kontonummer,
      kontobezeichnung: bezeichnung,
      kontoklasse,
      bereich,
      kostenarttTyp: mapKostenarttTyp(kontonummer, bereich),
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
    
    // Mögliche Soll-Spalten (erweitert für verschiedene CSV-Formate)
    const possibleSollKeys = [
      `${monatStr}-Soll`,
      `Monat-Soll`,
      `${monat}-Soll`,
      'Saldo Soll',
      'SaldoSoll',
      'Soll',
      'Monat Soll',
      'Soll Monat',
      'saldo_soll',
      'soll',
    ];
    
    // Mögliche Haben-Spalten
    const possibleHabenKeys = [
      `${monatStr}-Haben`,
      `Monat-Haben`,
      `${monat}-Haben`,
      'Saldo Haben',
      'SaldoHaben',
      'Haben',
      'Monat Haben',
      'Haben Monat',
      'saldo_haben',
      'haben',
    ];
    
    // Mögliche Netto-Saldo-Spalten (falls direkt vorhanden)
    const possibleSaldoKeys = [
      `${monatStr}-Saldo`,
      'Monat-Saldo',
      `${monat}-Saldo`,
      'Saldo',
      'Saldo Monat',
      'SaldoMonat',
      'Netto',
      'saldo',
      'saldo_monat',
    ];
    
    // Durchsuche alle Schlüssel in der Zeile nach passenden Spalten
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      
      // Prüfe auf Soll-Spalten
      if (saldoSollMonat === 0) {
        for (const sollKey of possibleSollKeys) {
          if (lowerKey === sollKey.toLowerCase() || key === sollKey) {
            const val = row[key];
            if (typeof val === 'number') {
              saldoSollMonat = val;
              break;
            }
          }
        }
      }
      
      // Prüfe auf Haben-Spalten
      if (saldoHabenMonat === 0) {
        for (const habenKey of possibleHabenKeys) {
          if (lowerKey === habenKey.toLowerCase() || key === habenKey) {
            const val = row[key];
            if (typeof val === 'number') {
              saldoHabenMonat = val;
              break;
            }
          }
        }
      }
    }
    
    // Berechne Netto-Saldo (Soll - Haben)
    let saldoMonat = saldoSollMonat - saldoHabenMonat;
    
    // Falls kein Soll/Haben gefunden, prüfe auf direkten Saldo
    if (saldoSollMonat === 0 && saldoHabenMonat === 0) {
      for (const key of Object.keys(row)) {
        const lowerKey = key.toLowerCase();
        for (const saldoKey of possibleSaldoKeys) {
          if (lowerKey === saldoKey.toLowerCase() || key === saldoKey) {
            const val = row[key];
            if (typeof val === 'number') {
              saldoMonat = val;
              break;
            }
          }
        }
        if (saldoMonat !== 0) break;
      }
    }
    
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
