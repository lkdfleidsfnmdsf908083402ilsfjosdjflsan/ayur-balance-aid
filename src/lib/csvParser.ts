import { RawSaldenliste, Konto, SaldoMonat, UploadedFile } from '@/types/finance';
import { mapBereich, mapKostenarttTyp, mapKpiKategorie } from './bereichMapping';

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
      kpiKategorie: mapKpiKategorie(kontonummer, bezeichnung),
    });
  }
  
  return Array.from(kontenMap.values());
}

export function extractSalden(data: RawSaldenliste[], jahr: number, monat: number): SaldoMonat[] {
  const salden: SaldoMonat[] = [];
  
  // Erstelle Monat/Jahr Pattern für die Spaltensuche
  // Format: "MM/YY" oder "M/YY" (z.B. "10/24" oder "1/25")
  const jahrKurz = String(jahr).slice(-2);
  const monatPattern1 = `${monat}/${jahrKurz}`;  // z.B. "10/24"
  const monatPattern2 = `${String(monat).padStart(2, '0')}/${jahrKurz}`; // z.B. "01/25"
  
  for (const row of data) {
    const kontonummer = String(row.KontoNr || '').trim();
    if (!kontonummer) continue;
    
    let saldoSollMonat = 0;
    let saldoHabenMonat = 0;
    let foundSpecificMonth = false;
    
    // Suche nach "Saldo Soll" und "Saldo Haben" Spalten für den spezifischen Monat
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase().trim();
      
      // Prüfe ob die Spalte zum gesuchten Monat/Jahr gehört
      const matchesMonth = key.includes(monatPattern1) || key.includes(monatPattern2);
      
      // Saldo Soll Spalte (z.B. "Saldo Soll 10 - 10/24")
      if (lowerKey.startsWith('saldo soll')) {
        const val = row[key];
        if (typeof val === 'number') {
          if (matchesMonth) {
            saldoSollMonat = val;
            foundSpecificMonth = true;
          } else if (!foundSpecificMonth && saldoSollMonat === 0) {
            // Fallback: nimm erste Spalte wenn kein spezifischer Monat gefunden
            saldoSollMonat = val;
          }
        }
      }
      
      // Saldo Haben Spalte (z.B. "Saldo Haben 10 - 10/24")
      if (lowerKey.startsWith('saldo haben')) {
        const val = row[key];
        if (typeof val === 'number') {
          if (matchesMonth) {
            saldoHabenMonat = val;
          } else if (!foundSpecificMonth && saldoHabenMonat === 0) {
            // Fallback: nimm erste Spalte wenn kein spezifischer Monat gefunden
            saldoHabenMonat = val;
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
