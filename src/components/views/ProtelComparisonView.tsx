import { useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';

const EXCLUDE_FROM_REVENUE = ['4999', '4280', '4861'];
const OPERATIVE_KLASSEN = ['5', '6', '8'];

function formatEuro(val: number) {
  return val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
function formatPct(val: number) {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

const ABTEILUNGEN = ['Logis', 'F&B', 'Spa', 'Rezeption', 'Küche', 'Service', 'Technik', 'Verwaltung'];

interface AbteilungKpi {
  abteilung: string;
  umsatz: number;
  wareneinsatz: number;
  personal: number;
  energie: number;
  marketing: number;
  betriebsaufwand: number;
  db1: number;
  db2: number;
}

interface ComparisonRow {
  label: string;
  protel: number;
  manuell: number;
  delta: number;
  deltaPct: number;
  field: string;
}

export function ProtelComparisonView() {
  const { vergleiche, konten, selectedYear, selectedMonth } = useFinanceStore();
  const { t } = useLanguage();
  const [manuellData, setManuellData] = useState<AbteilungKpi[]>([]);
  const [selectedAbteilung, setSelectedAbteilung] = useState<string>('alle');
  const [loading, setLoading] = useState(true);

  const kontenMap = useMemo(() => new Map(konten.map(k => [k.kontonummer, k])), [konten]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('abteilung_kpi_monat')
        .select('*')
        .eq('jahr', selectedYear)
        .eq('monat', selectedMonth);
      setManuellData((data || []).map(d => ({
        abteilung: d.abteilung,
        umsatz: d.umsatz || 0,
        wareneinsatz: d.wareneinsatz || 0,
        personal: d.personal || 0,
        energie: d.energie || 0,
        marketing: d.marketing || 0,
        betriebsaufwand: d.betriebsaufwand || 0,
        db1: d.db1 || 0,
        db2: d.db2 || 0,
      })));
      setLoading(false);
    };
    load();
  }, [selectedYear, selectedMonth]);

  // Protel-Daten aus Supabase (salden/vergleiche)
  const protelNachBereich = useMemo(() => {
    const bereiche: Record<string, { umsatz: number; wareneinsatz: number; personal: number; energie: number; marketing: number; betriebsaufwand: number }> = {};

    vergleiche.forEach(v => {
      const konto = kontenMap.get(v.kontonummer);
      if (!konto) return;
      const b = konto.bereich || 'Sonstiges';
      if (!bereiche[b]) bereiche[b] = { umsatz: 0, wareneinsatz: 0, personal: 0, energie: 0, marketing: 0, betriebsaufwand: 0 };

      if (konto.kostenarttTyp === 'Erlös' && !EXCLUDE_FROM_REVENUE.includes(v.kontonummer)) {
        bereiche[b].umsatz += Math.abs(v.saldoAktuell);
      } else if (konto.kontoklasse === '5') {
        bereiche[b].wareneinsatz += Math.abs(v.saldoAktuell);
      } else if (konto.kontoklasse === '6') {
        bereiche[b].personal += Math.abs(v.saldoAktuell);
      } else if (konto.kpiKategorie === 'Energie') {
        bereiche[b].energie += Math.abs(v.saldoAktuell);
      } else if (konto.kpiKategorie === 'Marketing') {
        bereiche[b].marketing += Math.abs(v.saldoAktuell);
      } else if (OPERATIVE_KLASSEN.includes(konto.kontoklasse)) {
        bereiche[b].betriebsaufwand += Math.abs(v.saldoAktuell);
      }
    });
    return bereiche;
  }, [vergleiche, kontenMap]);

  // Gesamt-Protel
  const protelGesamt = useMemo(() => {
    const sum = { umsatz: 0, wareneinsatz: 0, personal: 0, energie: 0, marketing: 0, betriebsaufwand: 0 };
    Object.values(protelNachBereich).forEach(b => {
      sum.umsatz += b.umsatz;
      sum.wareneinsatz += b.wareneinsatz;
      sum.personal += b.personal;
      sum.energie += b.energie;
      sum.marketing += b.marketing;
      sum.betriebsaufwand += b.betriebsaufwand;
    });
    return sum;
  }, [protelNachBereich]);

  // Gesamt-Manuell
  const manuellGesamt = useMemo(() => {
    const sum = { umsatz: 0, wareneinsatz: 0, personal: 0, energie: 0, marketing: 0, betriebsaufwand: 0, db1: 0, db2: 0 };
    manuellData.forEach(d => {
      sum.umsatz += d.umsatz;
      sum.wareneinsatz += d.wareneinsatz;
      sum.personal += d.personal;
      sum.energie += d.energie;
      sum.marketing += d.marketing;
      sum.betriebsaufwand += d.betriebsaufwand;
      sum.db1 += d.db1;
      sum.db2 += d.db2;
    });
    return sum;
  }, [manuellData]);

  const buildRows = (protel: typeof protelGesamt, manuell: typeof manuellGesamt): ComparisonRow[] => {
    const fields: { label: string; field: keyof typeof protelGesamt }[] = [
      { label: 'Umsatz', field: 'umsatz' },
      { label: 'Wareneinsatz', field: 'wareneinsatz' },
      { label: 'Personal', field: 'personal' },
      { label: 'Energie', field: 'energie' },
      { label: 'Marketing', field: 'marketing' },
      { label: 'Betriebsaufwand', field: 'betriebsaufwand' },
    ];
    return fields.map(({ label, field }) => {
      const p = protel[field];
      const m = (manuell as any)[field];
      const delta = m - p;
      const deltaPct = p !== 0 ? (delta / p) * 100 : 0;
      return { label, protel: p, manuell: m, delta, deltaPct, field };
    });
  };

  const rows = useMemo(() => {
    if (selectedAbteilung === 'alle') {
      return buildRows(protelGesamt, manuellGesamt);
    }
    const protelB = protelNachBereich[selectedAbteilung] || { umsatz: 0, wareneinsatz: 0, personal: 0, energie: 0, marketing: 0, betriebsaufwand: 0 };
    const manuellB = manuellData.find(d => d.abteilung === selectedAbteilung) || { umsatz: 0, wareneinsatz: 0, personal: 0, energie: 0, marketing: 0, betriebsaufwand: 0, db1: 0, db2: 0 };
    return buildRows(protelB, manuellB);
  }, [selectedAbteilung, protelGesamt, manuellGesamt, protelNachBereich, manuellData]);

  const monthNames = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const DeltaIcon = ({ pct, field }: { pct: number; field: string }) => {
    const isRevenue = field === 'umsatz';
    const isGood = isRevenue ? pct > 0 : pct < 0;
    const abs = Math.abs(pct);
    if (abs < 2) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (isGood) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (abs > 10) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    return isRevenue
      ? <TrendingDown className="h-4 w-4 text-orange-500" />
      : <TrendingUp className="h-4 w-4 text-orange-500" />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Protel-Abweichungen"
        description={`Soll (Protel) vs. Ist (Abteilungsleiter) — ${monthNames[selectedMonth]} ${selectedYear}`}
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Info Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Admin-Ansicht:</strong> Diese Seite ist nur für Andreas Drexler sichtbar. 
            Soll = Protel-Buchhaltungsdaten, Ist = manuelle Eingaben der Abteilungsleiter.
          </div>
        </div>

        {/* Abteilung Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedAbteilung('alle')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedAbteilung === 'alle'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            Gesamt
          </button>
          {[...new Set([...Object.keys(protelNachBereich), ...manuellData.map(d => d.abteilung)])].map(abt => (
            <button
              key={abt}
              onClick={() => setSelectedAbteilung(abt)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAbteilung === abt
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {abt}
            </button>
          ))}
        </div>

        {/* Vergleichstabelle */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-base font-semibold">
              {selectedAbteilung === 'alle' ? 'Gesamtübersicht' : selectedAbteilung} — Soll vs. Ist
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Lade Daten...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Kennzahl</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">SOLL (Protel)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">IST (Abteilungsleiter)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Differenz</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Abweichung %</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(row => {
                    const absPct = Math.abs(row.deltaPct);
                    const rowBg = absPct > 10
                      ? 'bg-destructive/5'
                      : absPct > 5
                      ? 'bg-orange-50 dark:bg-orange-950/10'
                      : '';
                    return (
                      <tr key={row.field} className={`hover:bg-muted/30 ${rowBg}`}>
                        <td className="px-4 py-3 text-sm font-medium">{row.label}</td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums text-muted-foreground">
                          {formatEuro(row.protel)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums font-medium">
                          {formatEuro(row.manuell)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right tabular-nums ${
                          row.delta > 0 ? 'text-green-600' : row.delta < 0 ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {formatEuro(row.delta)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right tabular-nums font-semibold ${
                          absPct > 10 ? 'text-destructive' : absPct > 5 ? 'text-orange-500' : 'text-muted-foreground'
                        }`}>
                          {formatPct(row.deltaPct)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <DeltaIcon pct={row.deltaPct} field={row.field} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Manuell-Eingaben Übersicht */}
        {manuellData.length === 0 && !loading && (
          <div className="bg-muted/30 border rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Keine manuellen KPI-Eingaben für {monthNames[selectedMonth]} {selectedYear} vorhanden.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Abteilungsleiter können ihre KPIs im Abteilungsleiter-Dashboard eingeben.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
