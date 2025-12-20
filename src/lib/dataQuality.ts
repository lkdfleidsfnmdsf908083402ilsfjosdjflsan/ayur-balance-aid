import { Konto, SaldoMonat, UploadedFile } from '@/types/finance';

export interface KontoOhneBereich {
  kontonummer: string;
  kontobezeichnung: string;
  kontoklasse: string;
}

export interface KontoklassenAbstimmung {
  kontoklasse: string;
  anzahlKonten: number;
  summeSaldoSoll: number;
  summeSaldoHaben: number;
  summeSaldo: number;
}

export interface FehlendePeriode {
  jahr: number;
  monat: number;
  erwartet: boolean;
  vorhanden: boolean;
}

export interface DataQualityReport {
  kontenOhneBereich: KontoOhneBereich[];
  kontenOhneKostenarttTyp: Konto[];
  kontoklassenAbstimmung: KontoklassenAbstimmung[];
  fehlendePerioden: FehlendePeriode[];
  gesamtKonten: number;
  gesamtSalden: number;
  vorhandenePerioden: { jahr: number; monat: number }[];
}

export function analyzeDataQuality(
  konten: Konto[],
  salden: SaldoMonat[],
  uploadedFiles: UploadedFile[]
): DataQualityReport {
  // 1. Konten ohne Bereich (als "Sonstiges" markiert)
  const kontenOhneBereich: KontoOhneBereich[] = konten
    .filter(k => k.bereich === 'Sonstiges')
    .map(k => ({
      kontonummer: k.kontonummer,
      kontobezeichnung: k.kontobezeichnung,
      kontoklasse: k.kontoklasse,
    }));

  // 2. Konten ohne Kostenartt-Typ (als "Neutral" markiert)
  const kontenOhneKostenarttTyp = konten.filter(k => k.kostenarttTyp === 'Neutral');

  // 3. Summenabstimmung pro Kontoklasse
  const kontoklassenMap = new Map<string, KontoklassenAbstimmung>();
  
  for (const saldo of salden) {
    const konto = konten.find(k => k.kontonummer === saldo.kontonummer);
    const kontoklasse = konto?.kontoklasse || 'Unbekannt';
    
    if (!kontoklassenMap.has(kontoklasse)) {
      kontoklassenMap.set(kontoklasse, {
        kontoklasse,
        anzahlKonten: 0,
        summeSaldoSoll: 0,
        summeSaldoHaben: 0,
        summeSaldo: 0,
      });
    }
    
    const entry = kontoklassenMap.get(kontoklasse)!;
    entry.anzahlKonten++;
    entry.summeSaldoSoll += saldo.saldoSollMonat;
    entry.summeSaldoHaben += saldo.saldoHabenMonat;
    entry.summeSaldo += saldo.saldoMonat;
  }
  
  const kontoklassenAbstimmung = Array.from(kontoklassenMap.values())
    .sort((a, b) => a.kontoklasse.localeCompare(b.kontoklasse));

  // 4. Vorhandene Perioden ermitteln
  const vorhandenePerioden = uploadedFiles
    .map(f => ({ jahr: f.year, monat: f.month }))
    .sort((a, b) => (a.jahr * 100 + a.monat) - (b.jahr * 100 + b.monat));

  // 5. Fehlende Perioden ermitteln
  const fehlendePerioden: FehlendePeriode[] = [];
  
  if (vorhandenePerioden.length > 0) {
    const erste = vorhandenePerioden[0];
    const letzte = vorhandenePerioden[vorhandenePerioden.length - 1];
    
    // Erwartete Perioden zwischen erster und letzter
    let aktuell = { jahr: erste.jahr, monat: erste.monat };
    
    while (
      aktuell.jahr < letzte.jahr || 
      (aktuell.jahr === letzte.jahr && aktuell.monat <= letzte.monat)
    ) {
      const vorhanden = vorhandenePerioden.some(
        p => p.jahr === aktuell.jahr && p.monat === aktuell.monat
      );
      
      fehlendePerioden.push({
        jahr: aktuell.jahr,
        monat: aktuell.monat,
        erwartet: true,
        vorhanden,
      });
      
      // Nächster Monat
      if (aktuell.monat === 12) {
        aktuell = { jahr: aktuell.jahr + 1, monat: 1 };
      } else {
        aktuell = { jahr: aktuell.jahr, monat: aktuell.monat + 1 };
      }
    }
  }

  return {
    kontenOhneBereich,
    kontenOhneKostenarttTyp,
    kontoklassenAbstimmung,
    fehlendePerioden,
    gesamtKonten: konten.length,
    gesamtSalden: salden.length,
    vorhandenePerioden,
  };
}

export function getMonthName(monat: number): string {
  const monate = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  return monate[monat - 1] || `Monat ${monat}`;
}
