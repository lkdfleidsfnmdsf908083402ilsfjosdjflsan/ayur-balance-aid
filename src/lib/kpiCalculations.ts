import { Konto, SaldoMonat, AbteilungKpi, Bereich, KpiKategorie } from '@/types/finance';
import { operativeAbteilungen, serviceAbteilungen } from './bereichMapping';

/**
 * Berechnet die Abteilungs-KPIs für einen bestimmten Monat
 * 
 * Für operative Abteilungen (Logis, F&B, Spa, Ärztin, Shop):
 * - Umsatz: Summe aller Erlöskonten
 * - Wareneinsatz: Summe aller Wareneinsatzkonten
 * - Personal: Summe aller Personalkonten
 * - DB I = Umsatz - Wareneinsatz
 * - DB II = DB I - Personal
 * 
 * Für Service-Abteilungen (Verwaltung, Technik, Energie, Marketing, Personal):
 * - Kostenorientierte Darstellung
 */
export function calculateAbteilungKpis(
  konten: Konto[],
  salden: SaldoMonat[],
  jahr: number,
  monat: number
): AbteilungKpi[] {
  // Erstelle Maps für schnellen Zugriff
  const kontenMap = new Map(konten.map(k => [k.kontonummer, k]));
  
  // Filtere Salden für aktuellen und Vorjahresmonat
  const currentSalden = salden.filter(s => s.jahr === jahr && s.monat === monat);
  const vorjahrSalden = salden.filter(s => s.jahr === jahr - 1 && s.monat === monat);
  
  // Gruppiere nach Abteilung
  const allAbteilungen: Bereich[] = [...operativeAbteilungen, ...serviceAbteilungen];
  const kpis: AbteilungKpi[] = [];

  for (const abteilung of allAbteilungen) {
    // Sammle alle Konten für diese Abteilung
    const abteilungKonten = konten.filter(k => k.bereich === abteilung);
    
    // Berechne KPIs für aktuellen Monat
    const kpiValues = calculateKpiForPeriod(abteilungKonten, currentSalden, kontenMap);
    const vorjahrValues = calculateKpiForPeriod(abteilungKonten, vorjahrSalden, kontenMap);
    
    // Berechne Deckungsbeiträge
    const db1 = kpiValues.umsatz - kpiValues.wareneinsatz;
    const db2 = db1 - kpiValues.personal;
    
    const db1Vorjahr = vorjahrValues.umsatz - vorjahrValues.wareneinsatz;
    const db2Vorjahr = db1Vorjahr - vorjahrValues.personal;
    
    kpis.push({
      abteilung,
      jahr,
      monat,
      
      // Operative KPIs (Erlöse als positive Werte)
      umsatz: Math.abs(kpiValues.umsatz),
      wareneinsatz: Math.abs(kpiValues.wareneinsatz),
      personal: Math.abs(kpiValues.personal),
      
      // Deckungsbeiträge
      db1: Math.abs(kpiValues.umsatz) - Math.abs(kpiValues.wareneinsatz),
      db2: Math.abs(kpiValues.umsatz) - Math.abs(kpiValues.wareneinsatz) - Math.abs(kpiValues.personal),
      
      // Kostenarten
      energie: Math.abs(kpiValues.energie),
      marketing: Math.abs(kpiValues.marketing),
      betriebsaufwand: Math.abs(kpiValues.betriebsaufwand),
      abschreibung: Math.abs(kpiValues.abschreibung),
      zins: Math.abs(kpiValues.zins),
      
      // Vorjahresvergleich
      umsatzVorjahr: vorjahrValues.umsatz !== 0 ? Math.abs(vorjahrValues.umsatz) : null,
      umsatzDiff: vorjahrValues.umsatz !== 0 
        ? Math.abs(kpiValues.umsatz) - Math.abs(vorjahrValues.umsatz) 
        : null,
      umsatzDiffProzent: vorjahrValues.umsatz !== 0 
        ? ((Math.abs(kpiValues.umsatz) - Math.abs(vorjahrValues.umsatz)) / Math.abs(vorjahrValues.umsatz)) * 100 
        : null,
        
      db1Vorjahr: vorjahrValues.umsatz !== 0 ? Math.abs(vorjahrValues.umsatz) - Math.abs(vorjahrValues.wareneinsatz) : null,
      db1Diff: vorjahrValues.umsatz !== 0 
        ? (Math.abs(kpiValues.umsatz) - Math.abs(kpiValues.wareneinsatz)) - (Math.abs(vorjahrValues.umsatz) - Math.abs(vorjahrValues.wareneinsatz))
        : null,
      db1DiffProzent: vorjahrValues.umsatz !== 0 && (Math.abs(vorjahrValues.umsatz) - Math.abs(vorjahrValues.wareneinsatz)) !== 0
        ? (((Math.abs(kpiValues.umsatz) - Math.abs(kpiValues.wareneinsatz)) - (Math.abs(vorjahrValues.umsatz) - Math.abs(vorjahrValues.wareneinsatz))) / Math.abs(Math.abs(vorjahrValues.umsatz) - Math.abs(vorjahrValues.wareneinsatz))) * 100
        : null,
        
      db2Vorjahr: vorjahrValues.umsatz !== 0 
        ? Math.abs(vorjahrValues.umsatz) - Math.abs(vorjahrValues.wareneinsatz) - Math.abs(vorjahrValues.personal)
        : null,
      db2Diff: vorjahrValues.umsatz !== 0 
        ? (Math.abs(kpiValues.umsatz) - Math.abs(kpiValues.wareneinsatz) - Math.abs(kpiValues.personal)) 
          - (Math.abs(vorjahrValues.umsatz) - Math.abs(vorjahrValues.wareneinsatz) - Math.abs(vorjahrValues.personal))
        : null,
      db2DiffProzent: null, // Zu komplex für Prozentberechnung wenn nahe 0
    });
  }
  
  return kpis;
}

interface KpiValues {
  umsatz: number;
  wareneinsatz: number;
  personal: number;
  energie: number;
  marketing: number;
  betriebsaufwand: number;
  abschreibung: number;
  zins: number;
}

function calculateKpiForPeriod(
  abteilungKonten: Konto[],
  periodSalden: SaldoMonat[],
  kontenMap: Map<string, Konto>
): KpiValues {
  const values: KpiValues = {
    umsatz: 0,
    wareneinsatz: 0,
    personal: 0,
    energie: 0,
    marketing: 0,
    betriebsaufwand: 0,
    abschreibung: 0,
    zins: 0,
  };
  
  for (const konto of abteilungKonten) {
    const saldo = periodSalden.find(s => s.kontonummer === konto.kontonummer);
    if (!saldo) continue;
    
    const betrag = saldo.saldoMonat;
    
    switch (konto.kpiKategorie) {
      case 'Erlös':
        values.umsatz += betrag;
        break;
      case 'Wareneinsatz':
        values.wareneinsatz += betrag;
        break;
      case 'Personal':
        values.personal += betrag;
        break;
      case 'Energie':
        values.energie += betrag;
        break;
      case 'Marketing':
        values.marketing += betrag;
        break;
      case 'Betriebsaufwand':
        values.betriebsaufwand += betrag;
        break;
      case 'Abschreibung':
        values.abschreibung += betrag;
        break;
      case 'Zins':
        values.zins += betrag;
        break;
    }
  }
  
  return values;
}

/**
 * Berechnet Gesamt-KPIs über alle operativen Abteilungen
 */
export function calculateGesamtKpis(abteilungKpis: AbteilungKpi[]): {
  gesamtUmsatz: number;
  gesamtWareneinsatz: number;
  gesamtPersonal: number;
  gesamtDB1: number;
  gesamtDB2: number;
  gesamtEnergie: number;
  gesamtMarketing: number;
} {
  const operativ = abteilungKpis.filter(k => operativeAbteilungen.includes(k.abteilung));
  
  return {
    gesamtUmsatz: operativ.reduce((sum, k) => sum + k.umsatz, 0),
    gesamtWareneinsatz: operativ.reduce((sum, k) => sum + k.wareneinsatz, 0),
    gesamtPersonal: operativ.reduce((sum, k) => sum + k.personal, 0),
    gesamtDB1: operativ.reduce((sum, k) => sum + k.db1, 0),
    gesamtDB2: operativ.reduce((sum, k) => sum + k.db2, 0),
    gesamtEnergie: abteilungKpis.reduce((sum, k) => sum + k.energie, 0),
    gesamtMarketing: abteilungKpis.reduce((sum, k) => sum + k.marketing, 0),
  };
}
