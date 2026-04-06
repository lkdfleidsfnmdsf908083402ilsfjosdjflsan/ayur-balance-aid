/**
 * RevenueIntelligenceView.tsx
 * Modul A — Revenue Intelligence · Mandira Ayurveda Hotel
 *
 * Datenquellen (Supabase):
 *  - protel_kpi_tag        → tägliche OCC / ARR / RevPAR / Logis
 *  - v_revenue_monat       → monatliche Revenue bereinigt + brutto
 *  - v_revpar_by_roomtype  → ARR/OCC pro Zimmertyp
 *  - v_saison_kpi          → KPIs mit Saison-Tag + Vorjahresvergleich
 *  - revenue_ziele         → Budget 2026 + Ist 2024/2025
 *  - revenue_supplement    → Supplement-Grid (editierbar)
 *  - revenue_saison        → Saisonklassifikation
 *  - revenue_config        → Globale Parameter
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw,
  Hotel, BarChart3, Layers, Calendar, Target,
  Sliders, AlertTriangle, Info, ChevronUp, ChevronDown
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Konstanten
// ─────────────────────────────────────────────────────────────────────────────

const VERKAUFS_ZIMMER = 60;
const YEARS = [2022, 2023, 2024, 2025, 2026];
const MONTHS = [
  'Jän','Feb','Mär','Apr','Mai','Jun',
  'Jul','Aug','Sep','Okt','Nov','Dez'
];

const SAISON_COLOR: Record<string, string> = {
  high:     '#10b981',
  shoulder: '#f59e0b',
  summer:   '#3b82f6',
};

const ZIMMERTYP_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e',
  '#f97316','#eab308','#22c55e',
];

// ─────────────────────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────────────────────

interface KpiTag {
  datum: string;
  auslastung_pct: number | null;
  adr: number | null;          // heißt adr, nicht arr
  revpar: number | null;
  logis_netto: number | null;  // heißt logis_netto, nicht logis_umsatz
  zimmer_belegt: number | null; // heißt zimmer_belegt, nicht belegte_zimmer
  ankuenfte: number | null;
  abreisen: number | null;
}

interface RevenuMonat {
  jahr: number;
  monat_nr: number;
  monat_name: string;
  saison: string;
  gewicht_pct: number;
  logis_bereinigt: number;
  fnb_bereinigt: number;
  therapie_bereinigt: number;
  extras_bereinigt: number;
  gesamt_bereinigt: number;
  logis_brutto: number;
  gesamt_brutto: number;
}

interface RevparRoomtype {
  datum: string;
  zimmer_typ: string;
  tier: number;
  fluegel: string;
  zimmer_belegt: number;
  gaeste_naechte: number;
  logis_umsatz_netto: number;
  arr_netto: number | null;
  revpar_netto: number | null;
  saison: string;
}

interface SaisonKpi {
  datum: string;
  jahr: number;
  monat_nr: number;
  saison: string;
  auslastung_pct: number | null;
  arr: number | null;
  revpar: number | null;
  vj_auslastung_pct: number | null;
  vj_arr: number | null;
  vj_revpar: number | null;
  arr_delta_pct: number | null;
  revpar_delta_pct: number | null;
}

interface RevenueZiel {
  jahr: number;
  monat_nr: number | null;
  kategorie: string;
  betrag: number;
  quelle: string;
}

interface Supplement {
  id: number;
  zimmer_typ: string;
  tier: number;
  saison: string;
  belegung: string;
  supplement: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hilfs-Formatter
// ─────────────────────────────────────────────────────────────────────────────

const fmtEur = (n: number | null | undefined, short = false) => {
  if (n == null) return '—';
  if (short && Math.abs(n) >= 1_000_000)
    return `€ ${(n / 1_000_000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
  if (short && Math.abs(n) >= 1_000)
    return `€ ${(n / 1_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} k`;
  return `€ ${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtPct = (n: number | null | undefined, decimals = 1) =>
  n != null ? `${n.toFixed(decimals)} %` : '—';

const fmtNum = (n: number | null | undefined, decimals = 0) =>
  n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

function deltaColor(v: number | null): string {
  if (v == null) return 'text-muted-foreground';
  return v > 0 ? 'text-emerald-500' : v < 0 ? 'text-red-500' : 'text-muted-foreground';
}

function DeltaBadge({ val, suffix = '%' }: { val: number | null; suffix?: string }) {
  if (val == null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${deltaColor(val)}`}>
      {val > 0 ? <ChevronUp className="h-3 w-3" /> : val < 0 ? <ChevronDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {Math.abs(val).toFixed(1)} {suffix}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI-Kachel
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  delta?: number | null;
  deltaLabel?: string;
  ziel?: string;
  tooltip?: string;
  highlight?: boolean;
}

function KpiCard({ title, value, sub, delta, deltaLabel, ziel, tooltip, highlight }: KpiCardProps) {
  return (
    <Card className={`glass-card border-border ${highlight ? 'border-emerald-500/30' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm text-muted-foreground leading-tight">{title}</p>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/40 hover:text-muted-foreground cursor-help shrink-0 mt-0.5" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs whitespace-pre-line">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-2xl font-semibold font-mono text-foreground mb-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        <div className="flex items-center justify-between mt-2">
          {delta !== undefined ? (
            <DeltaBadge val={delta} />
          ) : <span />}
          {ziel && <span className="text-xs text-muted-foreground">{ziel}</span>}
        </div>
        {deltaLabel && delta !== undefined && delta !== null && (
          <p className="text-xs text-muted-foreground/60 mt-0.5">{deltaLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Abschnitt-Header
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Recharts Tooltip
// ─────────────────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">
            {typeof p.value === 'number'
              ? p.value > 1000
                ? fmtEur(p.value)
                : p.name?.includes('%') ? fmtPct(p.value) : fmtNum(p.value, 2)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Haupt-Component
// ─────────────────────────────────────────────────────────────────────────────

export function RevenueIntelligenceView() {
  // Filter-State
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState<number | null>(null); // null = ganzes Jahr

  // Daten-State
  const [kpiTage, setKpiTage] = useState<KpiTag[]>([]);
  const [revMonat, setRevMonat] = useState<RevenuMonat[]>([]);
  const [roomtypeData, setRoomtypeData] = useState<RevparRoomtype[]>([]);
  const [saisonKpi, setSaisonKpi] = useState<SaisonKpi[]>([]);
  const [ziele, setZiele] = useState<RevenueZiel[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Supplement-Simulator
  const [simSupplements, setSimSupplements] = useState<Record<string, number>>({});
  const [simDirty, setSimDirty] = useState(false);

  // ── Daten laden ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Datumsbereich bestimmen
      const dateFrom = selMonth
        ? `${selYear}-${String(selMonth).padStart(2,'0')}-01`
        : `${selYear}-01-01`;
      const dateTo = selMonth
        ? new Date(selYear, selMonth, 0).toISOString().split('T')[0]
        : `${selYear}-12-31`;

      const [
        kpiRes, revRes, roomRes, saisonRes, zieleRes, suppRes
      ] = await Promise.all([
        supabase
          .from('protel_kpi_tag')
          .select('datum,auslastung_pct,adr,revpar,logis_netto,zimmer_belegt,ankuenfte,abreisen')
          .gte('datum', dateFrom).lte('datum', dateTo)
          .order('datum'),
        supabase
          .from('v_revenue_monat')
          .select('*')
          .eq('jahr', selYear)
          .order('monat_nr'),
        supabase
          .from('v_revpar_by_roomtype')
          .select('datum,zimmer_typ,tier,fluegel,zimmer_belegt,gaeste_naechte,logis_umsatz_netto,arr_netto,revpar_netto,saison')
          .gte('datum', dateFrom).lte('datum', dateTo),
        supabase
          .from('v_saison_kpi')
          .select('datum,jahr,monat_nr,saison,auslastung_pct,arr,revpar,vj_auslastung_pct,vj_arr,vj_revpar,arr_delta_pct,revpar_delta_pct')
          .gte('jahr', selYear - 2)
          .lte('jahr', selYear)
          .order('datum'),
        supabase
          .from('revenue_ziele')
          .select('*'),
        supabase
          .from('revenue_supplement')
          .select('*')
          .order('tier').order('saison').order('belegung'),
      ]);

      if (kpiRes.error) throw kpiRes.error;
      if (revRes.error) throw revRes.error;
      if (zieleRes.error) throw zieleRes.error;
      if (suppRes.error) throw suppRes.error;

      setKpiTage((kpiRes.data as KpiTag[]) || []);
      setRevMonat((revRes.data as RevenuMonat[]) || []);
      setRoomtypeData((roomRes.data as RevparRoomtype[]) || []);
      setSaisonKpi((saisonRes.data as SaisonKpi[]) || []);
      setZiele((zieleRes.data as RevenueZiel[]) || []);

      const suppData = (suppRes.data as Supplement[]) || [];
      setSupplements(suppData);

      // Simulator mit aktuellen Werten initialisieren
      const simInit: Record<string, number> = {};
      suppData.forEach(s => {
        simInit[`${s.zimmer_typ}|${s.saison}|${s.belegung}`] = s.supplement;
      });
      setSimSupplements(simInit);
      setSimDirty(false);

      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [selYear, selMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Berechnungen ─────────────────────────────────────────────────────────

  // KPI-Übersicht: Durchschnitte/Summen für den gewählten Zeitraum
  const kpiSummary = useMemo(() => {
    if (!kpiTage.length) return null;
    const valid = kpiTage.filter(k => k.adr != null);
    const avgArr = valid.length ? valid.reduce((s, k) => s + (k.adr ?? 0), 0) / valid.length : null;
    const avgOcc = valid.length ? valid.reduce((s, k) => s + (k.auslastung_pct ?? 0), 0) / valid.length : null;
    const avgRevpar = valid.length ? valid.reduce((s, k) => s + (k.revpar ?? 0), 0) / valid.length : null;
    const sumLogis = kpiTage.reduce((s, k) => s + (k.logis_netto ?? 0), 0);
    return { avgArr, avgOcc, avgRevpar, sumLogis };
  }, [kpiTage]);

  // Vorjahresdaten aus v_saison_kpi
  const vjSummary = useMemo(() => {
    if (!saisonKpi.length) return null;
    const valid = saisonKpi.filter(k => k.vj_arr != null);
    if (!valid.length) return null;
    const avgArr = valid.reduce((s, k) => s + (k.vj_arr ?? 0), 0) / valid.length;
    const avgOcc = valid.reduce((s, k) => s + (k.vj_auslastung_pct ?? 0), 0) / valid.length;
    const avgRevpar = valid.reduce((s, k) => s + (k.vj_revpar ?? 0), 0) / valid.length;
    return { avgArr, avgOcc, avgRevpar };
  }, [saisonKpi]);

  // Budget-Ziele
  const budgetZiele = useMemo(() => {
    const logisZiel = ziele.find(z => z.jahr === 2026 && z.monat_nr == null && z.kategorie === 'logis' && z.quelle === 'budget');
    const gesamtZiel = ziele.find(z => z.jahr === 2026 && z.monat_nr == null && z.kategorie === 'gesamt_bereinigt' && z.quelle === 'budget');
    return { logis: logisZiel?.betrag ?? null, gesamt: gesamtZiel?.betrag ?? null };
  }, [ziele]);

  // Monatschart-Daten (Dual Revenue)
  const dualRevenueChart = useMemo(() => {
    return revMonat.map(m => ({
      monat: MONTHS[m.monat_nr - 1],
      monat_nr: m.monat_nr,
      bereinigt: Math.round(m.gesamt_bereinigt),
      brutto: Math.round(m.gesamt_brutto),
      logis: Math.round(m.logis_bereinigt),
      saison: m.saison,
    }));
  }, [revMonat]);

  // Zimmertyp-Aggregation
  const roomtypeAgg = useMemo(() => {
    const map = new Map<string, { typ: string; tier: number; fluegel: string; naechte: number; umsatz: number; tage: Set<string> }>();
    roomtypeData.forEach(r => {
      const key = r.zimmer_typ;
      const existing = map.get(key) || { typ: r.zimmer_typ, tier: r.tier, fluegel: r.fluegel, naechte: 0, umsatz: 0, tage: new Set() };
      existing.naechte += r.zimmer_belegt || 0;
      existing.umsatz  += r.logis_umsatz_netto || 0;
      existing.tage.add(r.datum);
      map.set(key, existing);
    });
    return Array.from(map.values())
      .map(r => ({
        ...r,
        arr: r.naechte > 0 ? r.umsatz / r.naechte : 0,
        anzTage: r.tage.size,
      }))
      .sort((a, b) => a.tier - b.tier);
  }, [roomtypeData]);

  // Heatmap-Daten: Auslastung 12 Monate × 3 Jahre
  const heatmapData = useMemo(() => {
    const jahre = [selYear - 2, selYear - 1, selYear];
    return MONTHS.map((monat, idx) => {
      const monat_nr = idx + 1;
      const row: Record<string, any> = { monat };
      jahre.forEach(j => {
        const rows = saisonKpi.filter(k => k.monat_nr === monat_nr && k.jahr === j);
        const vjRows = saisonKpi.filter(k => k.monat_nr === monat_nr);
        // Wenn selYear gewählt: VJ aus view; sonst direkt
        const occ = rows.length
          ? rows.reduce((s, k) => s + (k.auslastung_pct ?? 0), 0) / rows.length
          : null;
        row[`occ_${j}`] = occ ? Math.round(occ * 10) / 10 : null;
      });
      // Saison-Farbe aus erster Zeile
      const saisonRow = saisonKpi.find(k => k.monat_nr === monat_nr);
      row.saison = saisonRow?.saison ?? null;
      return row;
    });
  }, [saisonKpi, selYear]);

  // Supplement-Simulator: Umsatzlift berechnen
  const simResult = useMemo(() => {
    if (!supplements.length) return null;
    const BASE_ARR = 180;
    const BELEGTE_ZIMMER_PRO_TYP = 8; // Schätzung
    const TAGE_PRO_SAISON = { high: 120, shoulder: 60, summer: 150 };

    let lift = 0;
    supplements.forEach(s => {
      const key = `${s.zimmer_typ}|${s.saison}|${s.belegung}`;
      const simVal = simSupplements[key] ?? s.supplement;
      const diff = simVal - s.supplement;
      const tage = TAGE_PRO_SAISON[s.saison as keyof typeof TAGE_PRO_SAISON] ?? 90;
      lift += diff * BELEGTE_ZIMMER_PRO_TYP * tage;
    });

    return { lift, pct: lift / (BASE_ARR * VERKAUFS_ZIMMER * 365) * 100 };
  }, [supplements, simSupplements]);

  // Budget vs. Actual
  const budgetActual = useMemo(() => {
    return MONTHS.map((monat, idx) => {
      const monat_nr = idx + 1;
      const actual = revMonat.find(r => r.monat_nr === monat_nr);
      const budgetZiel = ziele.find(z =>
        z.jahr === selYear && z.monat_nr === monat_nr && z.kategorie === 'gesamt_bereinigt' && z.quelle === 'budget'
      );
      const logisZiel = ziele.find(z =>
        z.jahr === selYear && z.monat_nr === monat_nr && z.kategorie === 'logis' && z.quelle === 'budget'
      );
      return {
        monat,
        monat_nr,
        actual_gesamt: actual ? Math.round(actual.gesamt_bereinigt) : null,
        actual_logis:  actual ? Math.round(actual.logis_bereinigt) : null,
        budget_gesamt: budgetZiel ? Math.round(budgetZiel.betrag) : null,
        budget_logis:  logisZiel  ? Math.round(logisZiel.betrag) : null,
      };
    });
  }, [revMonat, ziele, selYear]);

  // ── Supplement-Simulator Speichern ───────────────────────────────────────

  const saveSupplements = async () => {
    const updates = supplements.map(s => ({
      ...s,
      supplement: simSupplements[`${s.zimmer_typ}|${s.saison}|${s.belegung}`] ?? s.supplement,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('revenue_supplement')
      .upsert(updates, { onConflict: 'zimmer_typ,saison,belegung' });
    if (!error) {
      setSimDirty(false);
      await loadData();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Revenue Intelligence wird geladen…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {error}
        <Button variant="ghost" size="sm" onClick={loadData} className="ml-auto">Retry</Button>
      </div>
    );
  }

  const arrDelta = kpiSummary && vjSummary
    ? ((kpiSummary.avgArr ?? 0) - vjSummary.avgArr) / vjSummary.avgArr * 100
    : null;
  const occDelta = kpiSummary && vjSummary
    ? ((kpiSummary.avgOcc ?? 0) - vjSummary.avgOcc) / vjSummary.avgOcc * 100
    : null;
  const revparDelta = kpiSummary && vjSummary
    ? ((kpiSummary.avgRevpar ?? 0) - vjSummary.avgRevpar) / vjSummary.avgRevpar * 100
    : null;
  const logisVsZiel = kpiSummary && budgetZiele.logis
    ? (kpiSummary.sumLogis / budgetZiele.logis) * 100
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6 space-y-8 animate-slide-up">

      {/* ── Header + Filter ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            Revenue Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modul A · Protel-Echtdaten · {lastUpdated ? `Stand: ${lastUpdated.toLocaleTimeString('de-DE')}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Jahr-Picker */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {YEARS.map(y => (
              <button
                key={y}
                onClick={() => setSelYear(y)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  selYear === y
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Monat-Picker */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setSelMonth(null)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                selMonth === null
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Gesamt
            </button>
            {MONTHS.map((m, i) => (
              <button
                key={i}
                onClick={() => setSelMonth(i + 1)}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                  selMonth === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon" onClick={loadData} className="h-8 w-8">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 1 — KPI-Übersicht
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={BarChart3}
          title="KPI-Übersicht"
          sub={`${selMonth ? MONTHS[selMonth - 1] + ' ' : ''}${selYear} · Protel-Echtdaten vs. Vorjahr vs. Budget 2026`}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Ø ARR (Logis)"
            value={fmtEur(kpiSummary?.avgArr)}
            sub="Average Room Rate"
            delta={arrDelta}
            deltaLabel="ggü. Vorjahr"
            ziel={vjSummary ? `VJ: ${fmtEur(vjSummary.avgArr)}` : undefined}
            tooltip="ARR = Logiserlös ÷ belegte Zimmer\nBasis: protel_kpi_tag · nur Logis (hauptgrp = 1)"
            highlight={(arrDelta ?? 0) > 0}
          />
          <KpiCard
            title="Auslastung"
            value={fmtPct(kpiSummary?.avgOcc)}
            sub={`${VERKAUFS_ZIMMER} Verkaufszimmer`}
            delta={occDelta}
            deltaLabel="ggü. Vorjahr"
            ziel={vjSummary ? `VJ: ${fmtPct(vjSummary.avgOcc)}` : undefined}
            tooltip="Auslastung = belegte Zimmer ÷ 60 Verkaufszimmer × 100\n⚠ Ohne: 101,102,103,105,214,401"
          />
          <KpiCard
            title="RevPAR"
            value={fmtEur(kpiSummary?.avgRevpar)}
            sub="Revenue per Available Room"
            delta={revparDelta}
            deltaLabel="ggü. Vorjahr"
            ziel={vjSummary ? `VJ: ${fmtEur(vjSummary.avgRevpar)}` : undefined}
            tooltip="RevPAR = Logiserlös ÷ 60 Verkaufszimmer\nNUR Logis — nicht Gesamtumsatz!"
            highlight={(revparDelta ?? 0) > 0}
          />
          <KpiCard
            title="Logis-Umsatz"
            value={fmtEur(kpiSummary?.sumLogis, true)}
            sub={logisVsZiel != null ? `${logisVsZiel.toFixed(1)} % des Jahresziels` : 'Budget 2026: € 2.250.000'}
            ziel={budgetZiele.logis ? `Ziel: ${fmtEur(budgetZiele.logis, true)}` : undefined}
            tooltip="Summe Logis-Netto im gewählten Zeitraum\nBudget 2026: € 2.250.000"
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 2 — Zimmertyp-Performance
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={Hotel}
          title="Zimmertyp-Performance"
          sub="ARR und Auslastung pro Zimmertyp · aus Protel-Belegungsdaten"
        />
        {roomtypeAgg.length === 0 ? (
          <Card className="glass-card border-border">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              Keine Zimmertyp-Daten für diesen Zeitraum
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tabelle */}
            <Card className="glass-card border-border">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Zimmertyp</th>
                      <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Ø ARR</th>
                      <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Nächte</th>
                      <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Umsatz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomtypeAgg.map((r, i) => (
                      <tr key={r.typ} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ background: ZIMMERTYP_COLORS[i % ZIMMERTYP_COLORS.length] }}
                            />
                            <div>
                              <p className="text-xs font-medium text-foreground leading-tight">{r.typ}</p>
                              <p className="text-xs text-muted-foreground capitalize">{r.fluegel}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-medium text-foreground">
                          {fmtEur(r.arr)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {fmtNum(r.naechte)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-medium text-foreground">
                          {fmtEur(r.umsatz, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Bar-Chart ARR */}
            <Card className="glass-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium">Ø ARR pro Zimmertyp</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={roomtypeAgg.map((r, i) => ({
                      name: r.typ.replace(' with Balcony', ' +Blk').replace('Vintage', 'Vtg').replace('Ayurveda', 'Ayv'),
                      arr: Math.round(r.arr),
                      color: ZIMMERTYP_COLORS[i % ZIMMERTYP_COLORS.length],
                    }))}
                    margin={{ top: 4, right: 8, bottom: 40, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${v}`} />
                    <ReTooltip content={<ChartTooltip />} />
                    <Bar dataKey="arr" name="ARR" radius={[4,4,0,0]}>
                      {roomtypeAgg.map((_, i) => (
                        <Cell key={i} fill={ZIMMERTYP_COLORS[i % ZIMMERTYP_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 3 — Dual Revenue Chart
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={BarChart3}
          title="Dual Revenue"
          sub="Protel bereinigt (ohne 4999/4280/4861) vs. Excel brutto · monatlich"
        />
        {dualRevenueChart.length === 0 ? (
          <Card className="glass-card border-border">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              Keine Monatsdaten für {selYear}
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-border">
            <CardContent className="pt-4">
              {/* Jahres-Summen */}
              <div className="flex items-center gap-6 mb-4 px-2">
                {[
                  { label: 'Gesamt bereinigt', val: revMonat.reduce((s,r) => s + r.gesamt_bereinigt, 0), color: '#6366f1' },
                  { label: 'Gesamt brutto', val: revMonat.reduce((s,r) => s + r.gesamt_brutto, 0), color: '#94a3b8' },
                  { label: 'Logis', val: revMonat.reduce((s,r) => s + r.logis_bereinigt, 0), color: '#10b981' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="h-2 w-4 rounded-full" style={{ background: item.color }} />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold font-mono text-foreground">{fmtEur(item.val, true)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dualRevenueChart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradBereinigt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradBrutto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLogis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="monat" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                  <ReTooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="brutto"    name="Brutto (Excel)"    stroke="#94a3b8" fill="url(#gradBrutto)"    strokeWidth={1.5} strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="bereinigt" name="Bereinigt (App)"   stroke="#6366f1" fill="url(#gradBereinigt)" strokeWidth={2} />
                  <Area type="monotone" dataKey="logis"     name="Logis bereinigt"   stroke="#10b981" fill="url(#gradLogis)"     strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>

              <p className="text-xs text-muted-foreground/60 mt-2 px-2">
                Differenz bereinigt vs. brutto = Durchlaufkonten (4999/4280/4861). Logis ist in beiden Linien identisch.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 4 — Saison-Heatmap
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={Calendar}
          title="Saison-Heatmap"
          sub={`Auslastung 12 Monate · ${selYear-2} / ${selYear-1} / ${selYear}`}
        />
        <Card className="glass-card border-border">
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-muted-foreground font-medium px-3 py-2 w-24">Monat</th>
                    <th className="text-left text-muted-foreground font-medium px-3 py-2 w-20">Saison</th>
                    {[selYear-2, selYear-1, selYear].map(y => (
                      <th key={y} className="text-center text-muted-foreground font-medium px-3 py-2">{y}</th>
                    ))}
                    <th className="text-center text-muted-foreground font-medium px-3 py-2">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, i) => {
                    const occ2 = row[`occ_${selYear-2}`];
                    const occ1 = row[`occ_${selYear-1}`];
                    const occ0 = row[`occ_${selYear}`];
                    const trend = occ0 != null && occ1 != null ? occ0 - occ1 : null;
                    const occColor = (v: number | null) => {
                      if (v == null) return 'bg-muted/30 text-muted-foreground';
                      if (v >= 80) return 'bg-emerald-500/20 text-emerald-400 font-semibold';
                      if (v >= 60) return 'bg-amber-500/20 text-amber-400';
                      if (v >= 40) return 'bg-orange-500/20 text-orange-400';
                      return 'bg-red-500/10 text-red-400';
                    };
                    return (
                      <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 font-medium text-foreground">{row.monat}</td>
                        <td className="px-3 py-2">
                          {row.saison && (
                            <span
                              className="px-1.5 py-0.5 rounded text-xs font-medium"
                              style={{
                                background: SAISON_COLOR[row.saison] + '25',
                                color: SAISON_COLOR[row.saison],
                              }}
                            >
                              {row.saison}
                            </span>
                          )}
                        </td>
                        {[selYear-2, selYear-1, selYear].map(y => {
                          const v = row[`occ_${y}`];
                          return (
                            <td key={y} className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded ${occColor(v)}`}>
                                {v != null ? `${v.toFixed(1)} %` : '—'}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center">
                          <DeltaBadge val={trend} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-4 mt-3 px-3">
              {Object.entries(SAISON_COLOR).map(([saison, color]) => (
                <div key={saison} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-muted-foreground capitalize">{saison}</span>
                </div>
              ))}
              <span className="text-xs text-muted-foreground ml-4">⚠ Juni 2024: −21 Tage · Juli 2025: −15 Tage Betriebsschluss</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 5 — Supplement-Simulator
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            icon={Sliders}
            title="Supplement-Simulator"
            sub="Supplements anpassen → Umsatzlift live berechnen"
          />
          {simDirty && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400">Ungespeicherte Änderungen</span>
              <Button size="sm" onClick={saveSupplements} className="h-7 text-xs">
                Speichern
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                const init: Record<string, number> = {};
                supplements.forEach(s => { init[`${s.zimmer_typ}|${s.saison}|${s.belegung}`] = s.supplement; });
                setSimSupplements(init);
                setSimDirty(false);
              }}>
                Zurücksetzen
              </Button>
            </div>
          )}
        </div>

        {/* Lift-Anzeige */}
        {simResult && (
          <div className={`flex items-center gap-4 p-4 rounded-lg border mb-4 ${
            simResult.lift > 0 ? 'bg-emerald-500/10 border-emerald-500/20' :
            simResult.lift < 0 ? 'bg-red-500/10 border-red-500/20' :
            'bg-muted/30 border-border'
          }`}>
            <div>
              <p className="text-xs text-muted-foreground">Simulierter Jahres-Umsatzlift</p>
              <p className={`text-2xl font-semibold font-mono ${simResult.lift > 0 ? 'text-emerald-400' : simResult.lift < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                {simResult.lift > 0 ? '+' : ''}{fmtEur(simResult.lift, true)}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>{simResult.pct > 0 ? '+' : ''}{simResult.pct.toFixed(2)} % Logis-Revenue</p>
              <p className="mt-0.5 opacity-60">Basis: 8 Zimmer/Typ · Saison-Tage lt. Gewichtung</p>
            </div>
          </div>
        )}

        {supplements.length === 0 ? (
          <Card className="glass-card border-border">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              Keine Supplement-Daten geladen
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-border">
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-muted-foreground font-medium px-4 py-3">Zimmertyp</th>
                    {['high','shoulder','summer'].flatMap(s => [`${s} single`, `${s} double`]).map(k => (
                      <th key={k} className="text-center text-muted-foreground font-medium px-2 py-3 whitespace-nowrap">
                        <span
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{
                            background: SAISON_COLOR[k.split(' ')[0]] + '25',
                            color: SAISON_COLOR[k.split(' ')[0]],
                          }}
                        >
                          {k}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Zeilen: eine pro Zimmertyp */}
                  {Array.from(new Set(supplements.map(s => s.zimmer_typ)))
                    .sort((a, b) => {
                      const ta = supplements.find(s => s.zimmer_typ === a)?.tier ?? 0;
                      const tb = supplements.find(s => s.zimmer_typ === b)?.tier ?? 0;
                      return ta - tb;
                    })
                    .map((typ, ti) => (
                    <tr key={typ} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{typ}</td>
                      {['high','shoulder','summer'].flatMap(saison => ['single','double']).map((belegung, bi) => {
                        const saison = ['high','high','shoulder','shoulder','summer','summer'][bi];
                        const key = `${typ}|${saison}|${belegung}`;
                        const orig = supplements.find(s => s.zimmer_typ === typ && s.saison === saison && s.belegung === belegung);
                        const val  = simSupplements[key] ?? orig?.supplement ?? 0;
                        const changed = orig && val !== orig.supplement;
                        return (
                          <td key={bi} className="px-2 py-2 text-center">
                            <div className="relative inline-flex items-center">
                              <span className="text-muted-foreground text-xs mr-0.5">€</span>
                              <input
                                type="number"
                                value={val}
                                min={0}
                                max={500}
                                step={5}
                                onChange={e => {
                                  const newVal = Number(e.target.value);
                                  setSimSupplements(prev => ({ ...prev, [key]: newVal }));
                                  setSimDirty(true);
                                }}
                                className={`w-14 text-center text-xs rounded border px-1 py-0.5 font-mono bg-background focus:outline-none focus:ring-1 focus:ring-primary ${
                                  changed ? 'border-amber-400 text-amber-400' : 'border-border text-foreground'
                                }`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 6 — Budget vs. Actual
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={Target}
          title="Budget vs. Actual"
          sub={`${selYear} · Monatlich aus revenue_ziele vs. protel_kpi_tag`}
        />

        {budgetActual.every(b => b.actual_gesamt == null && b.budget_gesamt == null) ? (
          <Card className="glass-card border-border border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Keine Budget-Ziele für {selYear} hinterlegt.
              <br />
              <span className="text-xs opacity-60">Monatliche Budgets können in revenue_ziele erfasst werden.</span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <Card className="glass-card border-border">
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={budgetActual} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="monat" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                    <ReTooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="budget_gesamt" name="Budget Gesamt" fill="#6366f1" opacity={0.4} radius={[2,2,0,0]} />
                    <Bar dataKey="actual_gesamt" name="Ist Gesamt"    fill="#6366f1"             radius={[2,2,0,0]} />
                    <Bar dataKey="budget_logis"  name="Budget Logis"  fill="#10b981" opacity={0.4} radius={[2,2,0,0]} />
                    <Bar dataKey="actual_logis"  name="Ist Logis"     fill="#10b981"             radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tabelle */}
            <Card className="glass-card border-border">
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">Monat</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Budget Gesamt</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Ist Gesamt</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Abweichung</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Budget Logis</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Ist Logis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetActual.map((row, i) => {
                      const abw = row.actual_gesamt != null && row.budget_gesamt != null
                        ? row.actual_gesamt - row.budget_gesamt : null;
                      const abwPct = abw != null && row.budget_gesamt
                        ? abw / row.budget_gesamt * 100 : null;
                      return (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-foreground">{row.monat}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                            {row.budget_gesamt != null ? fmtEur(row.budget_gesamt) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-foreground font-medium">
                            {row.actual_gesamt != null ? fmtEur(row.actual_gesamt) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {abw != null ? (
                              <span className={abw >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {abw >= 0 ? '+' : ''}{fmtEur(abw, true)}
                                {abwPct != null && <span className="text-xs opacity-70 ml-1">({abwPct.toFixed(1)} %)</span>}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                            {row.budget_logis != null ? fmtEur(row.budget_logis) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-foreground font-medium">
                            {row.actual_logis != null ? fmtEur(row.actual_logis) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Jahres-Summe */}
                    <tr className="border-t border-border bg-muted/20">
                      <td className="px-4 py-2.5 font-semibold text-foreground">Gesamt</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-muted-foreground">
                        {fmtEur(budgetActual.reduce((s,r) => s + (r.budget_gesamt ?? 0), 0), true)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground">
                        {fmtEur(budgetActual.reduce((s,r) => s + (r.actual_gesamt ?? 0), 0), true)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {(() => {
                          const tot_a = budgetActual.reduce((s,r) => s + (r.actual_gesamt ?? 0), 0);
                          const tot_b = budgetActual.reduce((s,r) => s + (r.budget_gesamt ?? 0), 0);
                          if (!tot_b) return '—';
                          const diff = tot_a - tot_b;
                          return (
                            <span className={diff >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                              {diff >= 0 ? '+' : ''}{fmtEur(diff, true)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-muted-foreground">
                        {fmtEur(budgetActual.reduce((s,r) => s + (r.budget_logis ?? 0), 0), true)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground">
                        {fmtEur(budgetActual.reduce((s,r) => s + (r.actual_logis ?? 0), 0), true)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      </div>
    </div>
  );
}
