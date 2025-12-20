import { Konto, SaldoMonat, SaldoVergleich, BereichAggregation, Bereich } from '@/types/finance';

export function calculateVergleich(
  konten: Konto[],
  salden: SaldoMonat[],
  jahr: number,
  monat: number
): SaldoVergleich[] {
  const kontenMap = new Map(konten.map(k => [k.kontonummer, k]));
  
  // Berechne Vormonat und Vorjahr
  const vormonat = monat === 1 ? 12 : monat - 1;
  const vormonatJahr = monat === 1 ? jahr - 1 : jahr;
  const vorjahr = jahr - 1;
  
  // Gruppiere Salden nach Kontonummer, Jahr, Monat
  const saldenMap = new Map<string, SaldoMonat>();
  for (const saldo of salden) {
    const key = `${saldo.kontonummer}-${saldo.jahr}-${saldo.monat}`;
    saldenMap.set(key, saldo);
  }
  
  const vergleiche: SaldoVergleich[] = [];
  
  for (const konto of konten) {
    const aktuellKey = `${konto.kontonummer}-${jahr}-${monat}`;
    const vormonatKey = `${konto.kontonummer}-${vormonatJahr}-${vormonat}`;
    const vorjahrKey = `${konto.kontonummer}-${vorjahr}-${monat}`;
    
    const aktuell = saldenMap.get(aktuellKey);
    const vormonatSaldo = saldenMap.get(vormonatKey);
    const vorjahrSaldo = saldenMap.get(vorjahrKey);
    
    if (!aktuell) continue;
    
    const saldoAktuell = aktuell.saldoMonat;
    const saldoVormonat = vormonatSaldo?.saldoMonat ?? null;
    const saldoVorjahr = vorjahrSaldo?.saldoMonat ?? null;
    
    vergleiche.push({
      kontonummer: konto.kontonummer,
      kontobezeichnung: konto.kontobezeichnung,
      bereich: konto.bereich,
      kostenarttTyp: konto.kostenarttTyp,
      jahr,
      monat,
      saldoAktuell,
      saldoVormonat,
      saldoVorjahr,
      saldoVormonatDiff: saldoVormonat !== null ? saldoAktuell - saldoVormonat : null,
      saldoVormonatDiffProzent: saldoVormonat !== null && saldoVormonat !== 0 
        ? ((saldoAktuell - saldoVormonat) / Math.abs(saldoVormonat)) * 100 
        : null,
      saldoVorjahrDiff: saldoVorjahr !== null ? saldoAktuell - saldoVorjahr : null,
      saldoVorjahrDiffProzent: saldoVorjahr !== null && saldoVorjahr !== 0
        ? ((saldoAktuell - saldoVorjahr) / Math.abs(saldoVorjahr)) * 100
        : null,
    });
  }
  
  return vergleiche;
}

export function aggregateByBereich(vergleiche: SaldoVergleich[]): BereichAggregation[] {
  const grouped = new Map<string, SaldoVergleich[]>();
  
  for (const v of vergleiche) {
    const key = `${v.bereich}-${v.kostenarttTyp}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(v);
  }
  
  const aggregations: BereichAggregation[] = [];
  
  for (const [key, items] of grouped) {
    const [bereich, kostenarttTyp] = key.split('-') as [Bereich, string];
    
    const saldoAktuell = items.reduce((sum, i) => sum + i.saldoAktuell, 0);
    const saldoVormonat = items.every(i => i.saldoVormonat !== null)
      ? items.reduce((sum, i) => sum + (i.saldoVormonat ?? 0), 0)
      : null;
    const saldoVorjahr = items.every(i => i.saldoVorjahr !== null)
      ? items.reduce((sum, i) => sum + (i.saldoVorjahr ?? 0), 0)
      : null;
    
    aggregations.push({
      bereich,
      kostenarttTyp: kostenarttTyp as 'Erlös' | 'Einkauf' | 'Neutral',
      saldoAktuell,
      saldoVormonat,
      saldoVorjahr,
      saldoVormonatDiff: saldoVormonat !== null ? saldoAktuell - saldoVormonat : null,
      saldoVormonatDiffProzent: saldoVormonat !== null && saldoVormonat !== 0
        ? ((saldoAktuell - saldoVormonat) / Math.abs(saldoVormonat)) * 100
        : null,
      saldoVorjahrDiff: saldoVorjahr !== null ? saldoAktuell - saldoVorjahr : null,
      saldoVorjahrDiffProzent: saldoVorjahr !== null && saldoVorjahr !== 0
        ? ((saldoAktuell - saldoVorjahr) / Math.abs(saldoVorjahr)) * 100
        : null,
    });
  }
  
  return aggregations.sort((a, b) => a.bereich.localeCompare(b.bereich));
}

export function formatCurrency(value: number | null): string {
  if (value === null) return '–';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return '–';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDiff(value: number | null): string {
  if (value === null) return '–';
  return formatCurrency(value);
}
