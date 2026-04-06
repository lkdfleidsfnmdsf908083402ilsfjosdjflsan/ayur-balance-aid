import React, { useMemo, useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, Building2, BarChart3, Calculator } from 'lucide-react';
import { calculateAbteilungKpis, calculateGesamtKpis } from '@/lib/kpiCalculations';

function formatEuro(val: number) {
  return val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
function formatPct(val: number) {
  return val.toFixed(1) + ' %';
}

interface YearKpis {
  label: string;
  umsatz: number;
  wareneinsatz: number;
  personal: number;
  energie: number;
  marketing: number;
  betriebsaufwand: number;
  abschreibung: number;
  db1: number;
  db2: number;
  gop1: number;
  gop2: number;
  gop1Marge: number;
  gop2Marge: number;
  ebitda: number;
}

export function EnterpriseValueView() {
  const { salden, konten, selectedYear } = useFinanceStore();
  const { t } = useLanguage();
  const [multiple, setMultiple] = useState(6.5);
  const [zinssatz, setZinssatz] = useState(7);

  const calcYear = (jahr: number): YearKpis => {
    // Alle 12 Monate summieren
    let combined = null as ReturnType<typeof calculateGesamtKpis> | null;
    for (let m = 1; m <= 12; m++) {
      const abtKpis = calculateAbteilungKpis(konten, salden, jahr, m);
      const g = calculateGesamtKpis(abtKpis);
      if (!combined) {
        combined = { ...g };
      } else {
        combined.gesamtUmsatz += g.gesamtUmsatz;
        combined.gesamtWareneinsatz += g.gesamtWareneinsatz;
        combined.gesamtPersonal += g.gesamtPersonal;
        combined.gesamtEnergie += g.gesamtEnergie;
        combined.gesamtMarketing += g.gesamtMarketing;
        combined.gesamtBetriebsaufwand += g.gesamtBetriebsaufwand;
        combined.gesamtAbschreibung += g.gesamtAbschreibung;
        combined.gesamtDB1 += g.gesamtDB1;
        combined.gesamtDB2 += g.gesamtDB2;
        combined.gop1 += g.gop1;
        combined.gop2 += g.gop2;
        combined.ebitda += g.ebitda;
      }
    }

    const c = combined!;
    const gop1Marge = c.gesamtUmsatz > 0 ? (c.gop1 / c.gesamtUmsatz) * 100 : 0;
    const gop2Marge = c.gesamtUmsatz > 0 ? (c.gop2 / c.gesamtUmsatz) * 100 : 0;

    return {
      label: String(jahr),
      umsatz: c.gesamtUmsatz,
      wareneinsatz: c.gesamtWareneinsatz,
      personal: c.gesamtPersonal,
      energie: c.gesamtEnergie,
      marketing: c.gesamtMarketing,
      betriebsaufwand: c.gesamtBetriebsaufwand,
      abschreibung: c.gesamtAbschreibung,
      db1: c.gesamtDB1,
      db2: c.gesamtDB2,
      gop1: c.gop1,
      gop2: c.gop2,
      gop1Marge,
      gop2Marge,
      ebitda: c.ebitda,
    };
  };

  const years = useMemo(() => [
    calcYear(selectedYear),
    calcYear(selectedYear - 1),
    calcYear(selectedYear - 2),
  ], [salden, konten, selectedYear]);

  const currentYear = years[0];
  const evMultiple = currentYear.ebitda * multiple;
  const evErtrag = currentYear.gop2 / (zinssatz / 100);

  const KpiRow = ({ label, values, format, highlight, indent, tooltip }: {
    label: string;
    values: number[];
    format: (v: number) => string;
    highlight?: boolean;
    indent?: boolean;
    tooltip?: string;
  }) => (
    <tr className={highlight ? 'bg-primary/5 font-semibold' : 'hover:bg-muted/30'}>
      <td className={`px-4 py-3 text-sm ${indent ? 'pl-8 text-muted-foreground' : 'text-muted-foreground'}`} title={tooltip}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={`px-4 py-3 text-sm text-right tabular-nums ${
          highlight ? 'text-foreground font-bold' :
          v < 0 ? 'text-destructive' : 'text-foreground'
        }`}>
          {format(v)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title={t('ev.title') || 'Unternehmenswert'}
        description={t('ev.description') || 'GOP I, GOP II & Unternehmensbewertung'}
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'GOP I (aktuell)', value: formatEuro(currentYear.gop1), sub: formatPct(currentYear.gop1Marge) + ' Marge', icon: TrendingUp, color: currentYear.gop1 > 0 ? 'text-green-600' : 'text-destructive' },
            { label: 'GOP II (aktuell)', value: formatEuro(currentYear.gop2), sub: formatPct(currentYear.gop2Marge) + ' Marge', icon: BarChart3, color: currentYear.gop2 > 0 ? 'text-blue-600' : 'text-destructive' },
            { label: 'EV (EBITDA-Multiple)', value: formatEuro(evMultiple), sub: `${multiple}x Multiple`, icon: Building2, color: 'text-purple-600' },
            { label: 'EV (Ertragswert)', value: formatEuro(evErtrag), sub: `${zinssatz}% Zinssatz`, icon: Calculator, color: 'text-orange-600' },
          ].map((card, i) => (
            <div key={i} className="bg-card border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* 3-Jahres Tabelle */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              GOP & EBITDA — 3-Jahresvergleich (Jahreswerte)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Kennzahl</th>
                  {years.map(y => (
                    <th key={y.label} className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">{y.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <KpiRow label="Gesamtumsatz" values={years.map(y => y.umsatz)} format={formatEuro} highlight />
                <KpiRow label="− Wareneinsatz" values={years.map(y => y.wareneinsatz)} format={formatEuro} indent />
                <KpiRow label="= DB I (Rohertrag)" values={years.map(y => y.db1)} format={formatEuro} />
                <KpiRow label="− Personal" values={years.map(y => y.personal)} format={formatEuro} indent />
                <KpiRow label="= DB II / GOP I" values={years.map(y => y.gop1)} format={formatEuro} highlight tooltip="Summe DB II aller operativen Abteilungen" />
                <KpiRow label="GOP I Marge %" values={years.map(y => y.gop1Marge)} format={formatPct} />
                <KpiRow label="− Energie" values={years.map(y => y.energie)} format={formatEuro} indent />
                <KpiRow label="− Marketing" values={years.map(y => y.marketing)} format={formatEuro} indent />
                <KpiRow label="− Betriebsaufwand" values={years.map(y => y.betriebsaufwand)} format={formatEuro} indent />
                <KpiRow label="= GOP II" values={years.map(y => y.gop2)} format={formatEuro} highlight tooltip="GOP I minus Energie, Marketing, Betriebsaufwand" />
                <KpiRow label="GOP II Marge %" values={years.map(y => y.gop2Marge)} format={formatPct} highlight />
                <KpiRow label="+ Abschreibungen (AfA)" values={years.map(y => y.abschreibung)} format={formatEuro} indent tooltip="Non-cash Kosten werden wieder addiert" />
                <KpiRow label="= EBITDA" values={years.map(y => y.ebitda)} format={formatEuro} highlight tooltip="GOP II + Abschreibungen" />
              </tbody>
            </table>
          </div>
        </div>

        {/* Unternehmenswert Kalkulator */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Unternehmenswert-Kalkulator
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              EBITDA: {formatEuro(currentYear.ebitda)} | GOP II: {formatEuro(currentYear.gop2)}
            </p>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                Methode 1: EBITDA-Multiple
              </h3>
              <p className="text-xs text-muted-foreground">Branchenmultiple Wellness-Hotels DE: 5–8x</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Multiple: <strong>{multiple}x</strong></span>
                  <span>4x — 10x</span>
                </div>
                <input type="range" min={4} max={10} step={0.5} value={multiple}
                  onChange={e => setMultiple(Number(e.target.value))}
                  className="w-full accent-purple-600" />
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4">
                <div className="text-xs text-muted-foreground">EBITDA × {multiple}x =</div>
                <div className="text-2xl font-bold text-purple-600">{formatEuro(evMultiple)}</div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-orange-600" />
                Methode 2: Ertragswert (IDW S1)
              </h3>
              <p className="text-xs text-muted-foreground">Kapitalisierungszinssatz: 6–8% (risikobereinigt)</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Zinssatz: <strong>{zinssatz}%</strong></span>
                  <span>4% — 12%</span>
                </div>
                <input type="range" min={4} max={12} step={0.5} value={zinssatz}
                  onChange={e => setZinssatz(Number(e.target.value))}
                  className="w-full accent-orange-600" />
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4">
                <div className="text-xs text-muted-foreground">GOP II ÷ {zinssatz}% =</div>
                <div className="text-2xl font-bold text-orange-600">{formatEuro(evErtrag)}</div>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Bewertungsbandbreite (Ø beider Methoden)</div>
              <div className="text-xl font-bold text-foreground">
                {formatEuro(Math.min(evMultiple, evErtrag))} — {formatEuro(Math.max(evMultiple, evErtrag))}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Ø {formatEuro((evMultiple + evErtrag) / 2)}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
