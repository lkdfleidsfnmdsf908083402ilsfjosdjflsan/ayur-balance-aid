import { Konto, SaldoMonat, AbteilungKpi, Bereich } from '@/types/finance';
import { operativeAbteilungen, serviceAbteilungen } from './bereichMapping';

export function calculateAbteilungKpis(
  konten: Konto[],
  salden: SaldoMonat[],
  jahr: number,
  monat: number
): AbteilungKpi[] {
  const kontenMap = new Map(konten.map(k => [k.kontonummer, k]));
  const currentSalden = salden.filter(s => s.jahr === jahr && s.monat === monat);
  const vorjahrSalden = salden.filter(s => s.jahr === jahr - 1 && s.monat === monat);
  const allAbteilungen: Bereich[] = [...operativeAbteilungen, ...serviceAbteilungen];
  const kpis: AbteilungKpi[] = [];

  for (const abteilung of allAbteilungen) {
    const abteilungKonten = konten.filter(k => k.bereich === abteilung);
    const v = calculateKpiForPeriod(abteilungKonten, currentSalden, kontenMap);
    const vj = calculateKpiForPeriod(abteilungKonten, vorjahrSalden, kontenMap);

    const umsatz = Math.abs(v.umsatz);
    const wareneinsatz = Math.abs(v.wareneinsatz);
    const personal = Math.abs(v.personal);
    const db1 = umsatz - wareneinsatz;
    const db2 = db1 - personal;

    const umsatzVJ = Math.abs(vj.umsatz);
    const wareneinsatzVJ = Math.abs(vj.wareneinsatz);
    const personalVJ = Math.abs(vj.personal);
    const db1VJ = umsatzVJ - wareneinsatzVJ;
    const db2VJ = db1VJ - personalVJ;

    kpis.push({
      abteilung, jahr, monat,
      umsatz, wareneinsatz, personal,
      db1, db2,
      energie: Math.abs(v.energie),
      marketing: Math.abs(v.marketing),
      betriebsaufwand: Math.abs(v.betriebsaufwand),
      abschreibung: Math.abs(v.abschreibung),
      zins: Math.abs(v.zins),
      umsatzVorjahr: umsatzVJ !== 0 ? umsatzVJ : null,
      umsatzDiff: umsatzVJ !== 0 ? umsatz - umsatzVJ : null,
      umsatzDiffProzent: umsatzVJ !== 0 ? ((umsatz - umsatzVJ) / umsatzVJ) * 100 : null,
      db1Vorjahr: umsatzVJ !== 0 ? db1VJ : null,
      db1Diff: umsatzVJ !== 0 ? db1 - db1VJ : null,
      db1DiffProzent: umsatzVJ !== 0 && db1VJ !== 0 ? ((db1 - db1VJ) / Math.abs(db1VJ)) * 100 : null,
      db2Vorjahr: umsatzVJ !== 0 ? db2VJ : null,
      db2Diff: umsatzVJ !== 0 ? db2 - db2VJ : null,
      db2DiffProzent: umsatzVJ !== 0 && db2VJ !== 0 ? ((db2 - db2VJ) / Math.abs(db2VJ)) * 100 : null,
    });
  }
  return kpis;
}

interface KpiValues {
  umsatz: number; wareneinsatz: number; personal: number;
  energie: number; marketing: number; betriebsaufwand: number;
  abschreibung: number; zins: number;
}

function calculateKpiForPeriod(
  abteilungKonten: Konto[],
  periodSalden: SaldoMonat[],
  kontenMap: Map<string, Konto>
): KpiValues {
  const v: KpiValues = {
    umsatz: 0, wareneinsatz: 0, personal: 0,
    energie: 0, marketing: 0, betriebsaufwand: 0,
    abschreibung: 0, zins: 0,
  };
  for (const konto of abteilungKonten) {
    const saldo = periodSalden.find(s => s.kontonummer === konto.kontonummer);
    if (!saldo) continue;
    const b = saldo.saldoMonat;
    switch (konto.kpiKategorie) {
      case 'Erlös': v.umsatz += b; break;
      case 'Wareneinsatz': v.wareneinsatz += b; break;
      case 'Personal': v.personal += b; break;
      case 'Energie': v.energie += b; break;
      case 'Marketing': v.marketing += b; break;
      case 'Betriebsaufwand': v.betriebsaufwand += b; break;
      case 'Abschreibung': v.abschreibung += b; break;
      case 'Zins': v.zins += b; break;
    }
  }
  return v;
}

export interface GesamtKpis {
  // Umsatz & Kosten
  gesamtUmsatz: number;
  gesamtWareneinsatz: number;
  gesamtPersonal: number;
  gesamtEnergie: number;
  gesamtMarketing: number;
  gesamtBetriebsaufwand: number;
  gesamtAbschreibung: number;
  // Deckungsbeiträge (Abteilungsebene)
  gesamtDB1: number;
  gesamtDB2: number;
  // GOP (Gesamthausebene - USALI)
  // GOP I  = Σ DB II aller operativen Abteilungen
  // GOP II = GOP I - Energie - Marketing - Verwaltung - Technik (Service-Kosten)
  // EBITDA = GOP II + Abschreibungen
  gop1: number;
  gop2: number;
  ebitda: number;
  gop1Marge: number;
  gop2Marge: number;
}

export function calculateGesamtKpis(abteilungKpis: AbteilungKpi[]): GesamtKpis {
  const operativ = abteilungKpis.filter(k => operativeAbteilungen.includes(k.abteilung));
  const alle = abteilungKpis;

  const gesamtUmsatz = operativ.reduce((sum, k) => sum + k.umsatz, 0);
  const gesamtWareneinsatz = operativ.reduce((sum, k) => sum + k.wareneinsatz, 0);
  const gesamtPersonal = operativ.reduce((sum, k) => sum + k.personal, 0);
  const gesamtDB1 = operativ.reduce((sum, k) => sum + k.db1, 0);
  const gesamtDB2 = operativ.reduce((sum, k) => sum + k.db2, 0);

  // Service-Kosten (Energie, Marketing, Verwaltung, Technik)
  const gesamtEnergie = alle.reduce((sum, k) => sum + k.energie, 0);
  const gesamtMarketing = alle.reduce((sum, k) => sum + k.marketing, 0);
  const gesamtBetriebsaufwand = alle.reduce((sum, k) => sum + k.betriebsaufwand, 0);
  const gesamtAbschreibung = alle.reduce((sum, k) => sum + k.abschreibung, 0);

  // GOP Berechnung (Gesamthaus)
  const gop1 = gesamtDB2; // GOP I = Summe aller DB II
  const gop2 = gop1 - gesamtEnergie - gesamtMarketing - gesamtBetriebsaufwand;
  const ebitda = gop2 + gesamtAbschreibung;
  const gop1Marge = gesamtUmsatz > 0 ? (gop1 / gesamtUmsatz) * 100 : 0;
  const gop2Marge = gesamtUmsatz > 0 ? (gop2 / gesamtUmsatz) * 100 : 0;

  return {
    gesamtUmsatz, gesamtWareneinsatz, gesamtPersonal,
    gesamtEnergie, gesamtMarketing, gesamtBetriebsaufwand, gesamtAbschreibung,
    gesamtDB1, gesamtDB2,
    gop1, gop2, ebitda,
    gop1Marge, gop2Marge,
  };
}
