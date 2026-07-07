/**
 * SpaKpiView — Spa & Behandlungs-Intelligence
 * Mandira Ayurveda Hotel
 *
 * Datenquellen (alle live via Supabase Sync):
 *   - v_spa_therapeuten_performance  → Therapeuten-KPIs
 *   - v_spa_behandlungen_ranking     → Behandlungs-Ranking
 *   - v_spa_therapeut_behandlungen   → Therapeut × Behandlung Matrix
 *   - v_behandlungen_top             → inkl. Kategorie
 *   - tac_kpi_tag                    → Tages-KPIs für Schnellübersicht
 *   - tac_behandlungen               → VJ-Vergleich direkt
 *   - employees                      → Lohnkosten
 *
 * Verbesserungen v2:
 *   - Monatsfilter zusätzlich zum Jahresfilter
 *   - Kategorie-Tab (Ayurveda/Massage/Kosmetik/Infusionen)
 *   - VJ-Vergleich direkt aus tac_behandlungen (kein RPC nötig)
 *   - Tages-Schnellübersicht aus tac_kpi_tag
 *   - Error-Handling sichtbar
 *   - Summary unabhängig vom Therapeuten-Filter
 *   - Refresh-Button
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock, Euro, TrendingUp, TrendingDown, Users, Activity,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
  Minus, RefreshCw, AlertTriangle, Leaf, Sparkles, Zap
} from 'lucide-react';

// ─── Typen ──────────────────────────────────────────────────────────────────

interface TherapeutPerformance {
  articleid: number;
  therapeut_name: string;
  therapeut_label: string;
  gender: number | null;
  jahr: number;
  anzahl_behandlungen: number;
  total_minuten: number | null;
  total_stunden: number | null;
  sum_umsatz: number;
  avg_preis_pro_behandlung: number;
  umsatz_pro_stunde: number | null;
  avg_dauer_minuten: number | null;
  // Berechnet im Frontend:
  lohnkosten_monat?: number | null;
  lohnkosten_jahr?: number | null;
  deckungsbeitrag?: number | null;
  db_prozent?: number | null;
}

interface BehandlungRanking {
  behandlung_name: string;
  jahr: number;
  anzahl: number;
  sum_umsatz: number;
  avg_preis: number;
  avg_dauer_minuten: number | null;
  umsatz_pro_stunde: number | null;
  kategorie?: string | null;
}

interface TherapeutBehandlung {
  articleid: number;
  therapeut_label: string;
  behandlung_name: string;
  jahr: number;
  anzahl: number;
  sum_umsatz: number;
  avg_preis: number;
  total_minuten: number;
}

interface Employee {
  vorname: string;
  nachname: string;
  brutto_monat: number | null;
  abteilung: string;
  position: string;
}

interface TacKpiTag {
  datum: string;
  behandlungen_anzahl: number | null;
  behandlungen_umsatz: number | null;
  euro_pro_stunde: number | null;
  behandlungen_stunden: number | null;
}

interface VJData {
  behandlungen: number;
  umsatz: number;
  total_minuten: number;
  stunden: number;
  avgUmsatzProStd: number;
}

// ─── Formatierung ────────────────────────────────────────────────────────────

const fmtEur = (n: number | null | undefined, compact = false): string => {
  if (n == null) return '—';
  if (compact && Math.abs(n) >= 1000) return `€${(n / 1000).toFixed(1)}k`;
  return `€${n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const fmtNum = (n: number | null | undefined, decimals = 0): string => {
  if (n == null) return '—';
  return n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const fmtPct = (n: number | null | undefined): string => {
  if (n == null) return '—';
  return `${n.toFixed(1)}%`;
};

const pctChange = (curr: number, prev: number): string => {
  if (!prev) return '';
  const pct = ((curr - prev) / prev) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
};

const MONATE = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

// ─── Rollen ──────────────────────────────────────────────────────────────────

type PersonRole = 'therapeut' | 'arzt' | 'pflege' | 'leitung' | 'kosmetik' | 'yoga' | 'spa_rezeption' | 'sonstige';

const ROLE_MAP: Record<number, PersonRole> = {
  272: 'arzt', 221: 'arzt',
  315: 'leitung', 18: 'leitung',
  354: 'kosmetik', 367: 'kosmetik',
  357: 'yoga',
  360: 'spa_rezeption',
  195: 'pflege',
  114: 'sonstige',
};

const ROLE_LABELS: Record<PersonRole, string> = {
  therapeut: 'Therapeut', arzt: 'Arzt', pflege: 'Pflege',
  leitung: 'Leitung', kosmetik: 'Kosmetik', yoga: 'Yoga',
  spa_rezeption: 'Spa-Rezi', sonstige: 'Sonstige',
};

const ROLE_COLORS: Record<PersonRole, string> = {
  therapeut: 'bg-emerald-500/10 text-emerald-500',
  arzt: 'bg-blue-500/10 text-blue-500',
  pflege: 'bg-purple-500/10 text-purple-500',
  leitung: 'bg-amber-500/10 text-amber-500',
  kosmetik: 'bg-pink-500/10 text-pink-500',
  yoga: 'bg-cyan-500/10 text-cyan-500',
  spa_rezeption: 'bg-orange-500/10 text-orange-500',
  sonstige: 'bg-gray-500/10 text-gray-400',
};

function getRole(articleid: number): PersonRole {
  return ROLE_MAP[articleid] || 'therapeut';
}

function isEchterTherapeut(articleid: number): boolean {
  return getRole(articleid) === 'therapeut';
}

// ─── Lohn-Mapping ────────────────────────────────────────────────────────────

const LABEL_TO_EMPLOYEE: Record<number, { vorname: string; nachname: string }> = {
  12:  { vorname: 'Sebastian', nachname: 'Anish' },
  263: { vorname: 'Don Indunil', nachname: 'Addarage' },
  258: { vorname: 'Supun Tharuka', nachname: 'Asurumuni' },
  16:  { vorname: 'Gramya', nachname: 'Binson' },
  107: { vorname: 'Deity', nachname: 'George' },
  15:  { vorname: 'Joby', nachname: 'George' },
  362: { vorname: 'Oana Alexandra', nachname: 'Dale' },
  354: { vorname: 'Birgit', nachname: 'Kainer' },
  339: { vorname: 'Mintumol', nachname: 'Joseph' },
  108: { vorname: 'Jürgen', nachname: 'Lassinger' },
  360: { vorname: 'Lisa-Maria', nachname: 'Greßler' },
  312: { vorname: 'Anjana', nachname: 'Akhil' },
  272: { vorname: 'Dr. Akhil', nachname: 'Balachandran' },
  313: { vorname: 'Sarah', nachname: '' },
  208: { vorname: 'Shiny', nachname: '' },
  357: { vorname: 'Raj', nachname: '' },
  124: { vorname: 'Randika', nachname: '' },
  310: { vorname: 'Anjana', nachname: 'Akhil' },
};

function matchTherapeutToEmployee(articleid: number, label: string, employees: Employee[]): Employee | null {
  const mapped = LABEL_TO_EMPLOYEE[articleid];
  if (mapped) {
    const match = employees.find(e =>
      e.vorname?.toLowerCase() === mapped.vorname.toLowerCase() &&
      (mapped.nachname === '' || e.nachname?.toLowerCase() === mapped.nachname.toLowerCase())
    );
    if (match) return match;
  }
  const byVorname = employees.find(e =>
    e.vorname?.toLowerCase() === label.toLowerCase() ||
    label.toLowerCase().includes(e.vorname?.toLowerCase() || '###')
  );
  return byVorname || null;
}

// ─── Kategorie-Farben ─────────────────────────────────────────────────────────

const KATEGORIE_COLORS: Record<string, string> = {
  'Ayurveda Kern': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Massage': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Kosmetik': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Infusionen': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Yoga': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

const KATEGORIE_ICONS: Record<string, any> = {
  'Ayurveda Kern': Leaf,
  'Massage': Activity,
  'Kosmetik': Sparkles,
  'Infusionen': Zap,
};

// ─── KPI-Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, trend, vjValue, tooltip, highlight = false }: {
  label: string; value: string; sub?: string; icon: any;
  trend?: 'up' | 'down' | 'neutral'; vjValue?: string | null;
  tooltip?: string; highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-colors group relative ${
        highlight
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-border/40 bg-card/50 backdrop-blur-sm hover:border-border/60'
      }`}
      title={tooltip}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon className={`h-4 w-4 ${highlight ? 'text-emerald-500/60' : 'text-muted-foreground/40'}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-semibold font-mono ${highlight ? 'text-emerald-500' : 'text-foreground'}`}>
          {value}
        </p>
        {trend && (
          <span className={`flex items-center text-xs ${
            trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> :
             trend === 'down' ? <ArrowDownRight className="h-3 w-3" /> :
             <Minus className="h-3 w-3" />}
          </span>
        )}
      </div>
      {vjValue && (
        <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">VJ: {vjValue}</p>
      )}
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ─── Heute-Banner ─────────────────────────────────────────────────────────────

function HeuteBanner({ kpiTag }: { kpiTag: TacKpiTag | null }) {
  if (!kpiTag) return null;
  const datum = new Date(kpiTag.datum).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="rounded-xl border border-border/30 bg-muted/20 px-5 py-3 flex flex-wrap gap-6 items-center">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-medium text-muted-foreground">{datum}</span>
      </div>
      <div className="flex gap-6 flex-wrap">
        <div>
          <span className="text-xs text-muted-foreground">Behandlungen</span>
          <span className="ml-2 font-mono font-semibold text-foreground">{kpiTag.behandlungen_anzahl ?? '—'}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Umsatz</span>
          <span className="ml-2 font-mono font-semibold text-emerald-500">{fmtEur(kpiTag.behandlungen_umsatz)}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">€/Stunde</span>
          <span className="ml-2 font-mono font-semibold text-foreground">{fmtEur(kpiTag.euro_pro_stunde)}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Stunden</span>
          <span className="ml-2 font-mono text-foreground">{kpiTag.behandlungen_stunden ? fmtNum(kpiTag.behandlungen_stunden, 1) : '—'}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export function SpaKpiView() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState<number | null>(null); // null = ganzes Jahr
  const [activeTab, setActiveTab] = useState<'therapeuten' | 'behandlungen' | 'kategorien' | 'detail'>('therapeuten');
  const [selectedTherapeut, setSelectedTherapeut] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>('sum_umsatz');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterEchte, setFilterEchte] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Daten
  const [therapeuten, setTherapeuten] = useState<TherapeutPerformance[]>([]);
  const [behandlungen, setBehandlungen] = useState<BehandlungRanking[]>([]);
  const [behandlungenTop, setBehandlungenTop] = useState<BehandlungRanking[]>([]);
  const [therapeutBehandlungen, setTherapeutBehandlungen] = useState<TherapeutBehandlung[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [heuteKpi, setHeuteKpi] = useState<TacKpiTag | null>(null);
  const [vjAktuell, setVjAktuell] = useState<VJData | null>(null);
  const [vjVorjahr, setVjVorjahr] = useState<VJData | null>(null);

  // ─── Datumsgrenzen berechnen ───────────────────────────────────────────────

  const { dateFrom, dateTo, vjFrom, vjTo } = useMemo(() => {
    if (selMonth !== null) {
      const m = String(selMonth).padStart(2, '0');
      const lastDay = new Date(selYear, selMonth, 0).getDate();
      return {
        dateFrom: `${selYear}-${m}-01`,
        dateTo: `${selYear}-${m}-${lastDay}`,
        vjFrom: `${selYear - 1}-${m}-01`,
        vjTo: `${selYear - 1}-${m}-${lastDay}`,
      };
    }
    // Ganzes Jahr bis heute (Stichtag-Vergleich)
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const cutoff = selYear === currentYear ? `${selYear}-${mm}-${dd}` : `${selYear}-12-31`;
    const vjCutoff = `${selYear - 1}-${mm}-${dd}`;
    return {
      dateFrom: `${selYear}-01-01`,
      dateTo: cutoff,
      vjFrom: `${selYear - 1}-01-01`,
      vjTo: vjCutoff,
    };
  }, [selYear, selMonth, currentYear]);

  // ─── Hauptdaten laden ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [thRes, behRes, topRes, tbRes, empRes, heuteRes] = await Promise.all([
        supabase.from('v_spa_therapeuten_performance')
          .select('*').eq('jahr', selYear).order('sum_umsatz', { ascending: false }),
        supabase.from('v_spa_behandlungen_ranking')
          .select('*').eq('jahr', selYear).order('sum_umsatz', { ascending: false }),
        supabase.from('v_behandlungen_top')
          .select('*').eq('jahr', selYear).order('sum_umsatz', { ascending: false }),
        supabase.from('v_spa_therapeut_behandlungen')
          .select('*').eq('jahr', selYear).order('sum_umsatz', { ascending: false }),
        supabase.from('employees')
          .select('vorname, nachname, brutto_monat, abteilung, position')
          .or('abteilung.ilike.%wellness%,abteilung.ilike.%ayurveda%,abteilung.ilike.%spa%,position.ilike.%therapeut%,position.ilike.%masseur%'),
        supabase.from('tac_kpi_tag')
          .select('datum, behandlungen_anzahl, behandlungen_umsatz, euro_pro_stunde, behandlungen_stunden')
          .order('datum', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (thRes.error) throw thRes.error;
      if (behRes.error) throw behRes.error;

      const emps = empRes.data || [];
      setEmployees(emps);

      const enriched = (thRes.data || []).map(t => {
        const emp = matchTherapeutToEmployee(t.articleid, t.therapeut_label, emps);
        const lohnMonat = emp?.brutto_monat || null;
        const lohnJahr = lohnMonat ? lohnMonat * 14 : null;
        const db = lohnJahr ? t.sum_umsatz - lohnJahr : null;
        const dbPct = db != null && t.sum_umsatz > 0 ? (db / t.sum_umsatz) * 100 : null;
        return { ...t, lohnkosten_monat: lohnMonat, lohnkosten_jahr: lohnJahr, deckungsbeitrag: db, db_prozent: dbPct };
      });

      setTherapeuten(enriched);
      setBehandlungen(behRes.data || []);
      setBehandlungenTop(topRes.data || []);
      setTherapeutBehandlungen(tbRes.data || []);
      setHeuteKpi(heuteRes.data || null);

      // ─── VJ-Vergleich direkt aus tac_behandlungen ────────────────────────
      const [aktuellRes, vjRes] = await Promise.all([
        supabase.from('tac_behandlungen')
          .select('preis, dauer_minuten')
          .gte('datum', dateFrom).lte('datum', dateTo)
          .eq('storno', false),
        supabase.from('tac_behandlungen')
          .select('preis, dauer_minuten')
          .gte('datum', vjFrom).lte('datum', vjTo)
          .eq('storno', false),
      ]);

      const calcVJ = (rows: { preis: number; dauer_minuten: number | null }[]): VJData => {
        const behandlungen = rows.length;
        const umsatz = rows.reduce((s, r) => s + (r.preis || 0), 0);
        const total_minuten = rows.reduce((s, r) => s + (r.dauer_minuten || 0), 0);
        const stunden = total_minuten / 60;
        const avgUmsatzProStd = stunden > 0 ? umsatz / stunden : 0;
        return { behandlungen, umsatz, total_minuten, stunden, avgUmsatzProStd };
      };

      if (aktuellRes.data) setVjAktuell(calcVJ(aktuellRes.data));
      if (vjRes.data) setVjVorjahr(calcVJ(vjRes.data));

    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden der Spa-Daten');
    } finally {
      setLoading(false);
    }
  }, [selYear, dateFrom, dateTo, vjFrom, vjTo]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Monatsfilter: nur verfügbare Monate für selYear ─────────────────────

  const availableMonths = useMemo(() => {
    if (selYear < currentYear) return Array.from({ length: 12 }, (_, i) => i + 1);
    return Array.from({ length: currentMonth }, (_, i) => i + 1);
  }, [selYear, currentYear, currentMonth]);

  // ─── Gefilterte Therapeuten (nach Filter-Toggle) ───────────────────────────

  const filteredTherapeuten = useMemo(() => {
    let list = filterEchte ? therapeuten.filter(t => isEchterTherapeut(t.articleid)) : therapeuten;
    list = [...list].sort((a, b) => {
      const aVal = (a as any)[sortField] ?? 0;
      const bVal = (b as any)[sortField] ?? 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return list;
  }, [therapeuten, filterEchte, sortField, sortDir]);

  // ─── Summary immer über ALLE (nicht gefiltert) ────────────────────────────

  const summary = useMemo(() => {
    const t = therapeuten; // bewusst ungefiltert
    const totalUmsatz = t.reduce((s, x) => s + (x.sum_umsatz || 0), 0);
    const totalMin = t.reduce((s, x) => s + (x.total_minuten || 0), 0);
    const totalBeh = t.reduce((s, x) => s + x.anzahl_behandlungen, 0);
    const totalLohn = t.filter(x => isEchterTherapeut(x.articleid)).reduce((s, x) => s + (x.lohnkosten_jahr || 0), 0);
    const avgUmsatzProStd = totalMin > 0 ? totalUmsatz / (totalMin / 60) : 0;
    const gesamtDB = totalLohn > 0 ? totalUmsatz - totalLohn : null;
    return {
      therapeutenCount: t.filter(x => isEchterTherapeut(x.articleid)).length,
      totalUmsatz, totalStunden: totalMin / 60, totalBeh, avgUmsatzProStd, totalLohn, gesamtDB,
    };
  }, [therapeuten]);

  // ─── Kategorien-Aggregation ────────────────────────────────────────────────

  const kategorienData = useMemo(() => {
    const map = new Map<string, { anzahl: number; umsatz: number; stunden: number }>();
    for (const b of behandlungenTop) {
      const kat = (b as any).kategorie || 'Sonstige';
      const existing = map.get(kat) || { anzahl: 0, umsatz: 0, stunden: 0 };
      map.set(kat, {
        anzahl: existing.anzahl + (b.anzahl || 0),
        umsatz: existing.umsatz + (b.sum_umsatz || 0),
        stunden: existing.stunden + ((b.avg_dauer_minuten || 0) * (b.anzahl || 0)) / 60,
      });
    }
    return Array.from(map.entries())
      .map(([kategorie, data]) => ({
        kategorie,
        ...data,
        umsatz_pro_stunde: data.stunden > 0 ? data.umsatz / data.stunden : null,
        anteil_umsatz: 0, // wird unten berechnet
      }))
      .sort((a, b) => b.umsatz - a.umsatz)
      .map((k, _, arr) => {
        const total = arr.reduce((s, x) => s + x.umsatz, 0);
        return { ...k, anteil_umsatz: total > 0 ? (k.umsatz / total) * 100 : 0 };
      });
  }, [behandlungenTop]);

  // ─── Detail-Daten ─────────────────────────────────────────────────────────

  const detailData = useMemo(() => {
    if (!selectedTherapeut) return [];
    return therapeutBehandlungen
      .filter(tb => tb.articleid === selectedTherapeut)
      .sort((a, b) => b.sum_umsatz - a.sum_umsatz);
  }, [selectedTherapeut, therapeutBehandlungen]);

  const selectedTherapeutInfo = therapeuten.find(t => t.articleid === selectedTherapeut);

  // ─── Sort Handler ─────────────────────────────────────────────────────────

  function handleSort(field: string) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 inline ml-0.5 opacity-20" />;
    return sortDir === 'desc'
      ? <ChevronDown className="h-3 w-3 inline ml-0.5" />
      : <ChevronUp className="h-3 w-3 inline ml-0.5" />;
  }

  // ─── Render: Loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Spa-Daten werden geladen...</span>
        </div>
      </div>
    );
  }

  // ─── Render: Hauptansicht ─────────────────────────────────────────────────

  return (
    <div className="space-y-5 p-1">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Spa & Behandlungen</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Therapeuten-Performance · Behandlungs-Ranking · Kategorien · Deckungsbeitrag
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter: Nur echte Therapeuten */}
          <button
            onClick={() => setFilterEchte(!filterEchte)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filterEchte
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {filterEchte ? '✓ Nur Therapeuten' : 'Alle Personen'}
          </button>

          {/* Refresh */}
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Daten neu laden"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {/* Jahresfilter */}
          <div className="flex bg-muted/50 rounded-lg p-0.5 gap-0.5">
            {[2022, 2023, 2024, 2025, 2026].map(y => (
              <button
                key={y}
                onClick={() => { setSelYear(y); setSelMonth(null); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selYear === y
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Monatsfilter ── */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setSelMonth(null)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            selMonth === null
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground bg-muted/30'
          }`}
        >
          Gesamt
        </button>
        {availableMonths.map(m => (
          <button
            key={m}
            onClick={() => setSelMonth(m)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selMonth === m
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground bg-muted/30'
            }`}
          >
            {MONATE[m - 1]}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Heute Banner ── */}
      <HeuteBanner kpiTag={heuteKpi} />

      {/* ── Summary KPI Cards ── */}
      {(() => {
        const stichtag = selMonth !== null
          ? `${MONATE[selMonth - 1]} ${selYear}`
          : selYear === currentYear
            ? `01.01.–heute ${selYear}`
            : `Gesamt ${selYear}`;

        const vjLabel = selMonth !== null
          ? `${MONATE[selMonth - 1]} ${selYear - 1}`
          : `gleicher Zeitraum ${selYear - 1}`;

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Therapeuten"
              value={String(summary.therapeutenCount)}
              sub="aktiv im Zeitraum"
              icon={Users}
              vjValue={vjVorjahr ? `${vjVorjahr.behandlungen > 0 ? '—' : '—'}` : null}
              tooltip={`Echte Therapeuten mit mind. 1 Behandlung. Zeitraum: ${stichtag}`}
            />
            <KpiCard
              label="Behandlungen"
              value={fmtNum(vjAktuell?.behandlungen ?? summary.totalBeh)}
              sub={`Ø ${fmtNum((vjAktuell?.behandlungen ?? summary.totalBeh) / Math.max(summary.therapeutenCount, 1))} pro Therapeut`}
              icon={Activity}
              vjValue={vjVorjahr ? `${fmtNum(vjVorjahr.behandlungen)} (${pctChange(vjAktuell?.behandlungen ?? 0, vjVorjahr.behandlungen)})` : null}
              trend={vjVorjahr && vjAktuell ? (vjAktuell.behandlungen > vjVorjahr.behandlungen ? 'up' : vjAktuell.behandlungen < vjVorjahr.behandlungen ? 'down' : 'neutral') : undefined}
              tooltip={`Nicht-stornierte Behandlungen. VJ: ${vjLabel}`}
            />
            <KpiCard
              label="Spa-Umsatz"
              value={fmtEur(vjAktuell?.umsatz ?? summary.totalUmsatz, true)}
              sub={`${fmtNum(vjAktuell?.stunden ?? summary.totalStunden, 0)} Stunden`}
              icon={Euro}
              vjValue={vjVorjahr ? `${fmtEur(vjVorjahr.umsatz, true)} (${pctChange(vjAktuell?.umsatz ?? 0, vjVorjahr.umsatz)})` : null}
              trend={vjVorjahr && vjAktuell ? (vjAktuell.umsatz > vjVorjahr.umsatz ? 'up' : 'down') : undefined}
              highlight
              tooltip={`Summe aller Behandlungspreise. VJ-Vergleich: ${vjLabel}`}
            />
            <KpiCard
              label="Ø €/Stunde"
              value={fmtEur(vjAktuell?.avgUmsatzProStd ?? summary.avgUmsatzProStd)}
              sub="über alle Therapeuten"
              icon={TrendingUp}
              vjValue={vjVorjahr ? `${fmtEur(vjVorjahr.avgUmsatzProStd)} (${pctChange(vjAktuell?.avgUmsatzProStd ?? 0, vjVorjahr.avgUmsatzProStd)})` : null}
              trend={vjVorjahr && vjAktuell ? (vjAktuell.avgUmsatzProStd > vjVorjahr.avgUmsatzProStd ? 'up' : 'down') : undefined}
              tooltip="Gesamtumsatz ÷ Gesamtstunden. Misst Produktivität."
            />
            <KpiCard
              label="Lohnkosten"
              value={summary.totalLohn > 0 ? fmtEur(summary.totalLohn, true) : '—'}
              sub="Brutto × 14 (nur Therapeuten)"
              icon={Euro}
              tooltip="Jahres-Bruttolohn (Monatsgehalt × 14) der echten Therapeuten."
            />
            <KpiCard
              label="Deckungsbeitrag"
              value={summary.gesamtDB != null ? fmtEur(summary.gesamtDB, true) : '—'}
              sub={summary.gesamtDB != null && summary.totalUmsatz > 0
                ? `${((summary.gesamtDB / summary.totalUmsatz) * 100).toFixed(1)}% vom Umsatz`
                : 'Lohndaten fehlen'}
              icon={summary.gesamtDB != null && summary.gesamtDB > 0 ? TrendingUp : TrendingDown}
              trend={summary.gesamtDB != null ? (summary.gesamtDB > 0 ? 'up' : 'down') : undefined}
              tooltip="Spa-Umsatz minus Lohnkosten der Therapeuten."
            />
          </div>
        );
      })()}

      {/* ── Tabs ── */}
      <div className="flex gap-0.5 border-b border-border/40">
        {[
          { id: 'therapeuten' as const, label: 'Therapeuten', icon: Users },
          { id: 'behandlungen' as const, label: 'Behandlungen', icon: Activity },
          { id: 'kategorien' as const, label: 'Kategorien', icon: Leaf },
          { id: 'detail' as const, label: selectedTherapeutInfo ? `↳ ${selectedTherapeutInfo.therapeut_label}` : 'Detail', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={tab.id === 'detail' && !selectedTherapeut}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Therapeuten ═══ */}
      {activeTab === 'therapeuten' && (
        <div className="overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                {[
                  { label: 'Therapeut', field: null },
                  { label: 'Behandlungen', field: 'anzahl_behandlungen' },
                  { label: 'Stunden', field: 'total_stunden' },
                  { label: 'Umsatz', field: 'sum_umsatz' },
                  { label: '€/Stunde', field: 'umsatz_pro_stunde' },
                  { label: 'Ø Preis', field: 'avg_preis_pro_behandlung' },
                  { label: 'Ø Dauer', field: 'avg_dauer_minuten' },
                  { label: 'Lohn/Jahr', field: null },
                  { label: 'DB', field: 'deckungsbeitrag' },
                  { label: 'DB%', field: 'db_prozent' },
                ].map(col => (
                  <th
                    key={col.label}
                    className={`px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                      col.field ? 'cursor-pointer hover:text-foreground' : ''
                    } ${col.label === 'Therapeut' ? 'text-left' : 'text-right'}`}
                    onClick={() => col.field && handleSort(col.field)}
                  >
                    {col.label}
                    {col.field && <SortIcon field={col.field} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTherapeuten.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-sm">Keine Daten für diesen Zeitraum</td></tr>
              ) : filteredTherapeuten.map((t, i) => {
                const role = getRole(t.articleid);
                return (
                  <tr
                    key={t.articleid}
                    className={`border-b border-border/20 hover:bg-primary/5 cursor-pointer transition-colors ${
                      i % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                    } ${selectedTherapeut === t.articleid ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                    onClick={() => { setSelectedTherapeut(t.articleid); setActiveTab('detail'); }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{t.therapeut_label}</span>
                        {role !== 'therapeut' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${ROLE_COLORS[role]}`}>
                            {ROLE_LABELS[role]}
                          </span>
                        )}
                        {t.lohnkosten_monat && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Lohn ✓</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmtNum(t.anzahl_behandlungen)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{t.total_stunden ? fmtNum(t.total_stunden, 1) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-emerald-500">{fmtEur(t.sum_umsatz)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{t.umsatz_pro_stunde ? fmtEur(t.umsatz_pro_stunde) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{fmtEur(t.avg_preis_pro_behandlung)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{t.avg_dauer_minuten ? `${fmtNum(t.avg_dauer_minuten, 0)}′` : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{t.lohnkosten_jahr ? fmtEur(t.lohnkosten_jahr, true) : '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-medium ${
                      t.deckungsbeitrag != null ? (t.deckungsbeitrag > 0 ? 'text-emerald-500' : 'text-red-400') : 'text-muted-foreground'
                    }`}>
                      {t.deckungsbeitrag != null ? fmtEur(t.deckungsbeitrag, true) : '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono text-sm ${
                      t.db_prozent != null ? (t.db_prozent > 0 ? 'text-emerald-500' : 'text-red-400') : 'text-muted-foreground'
                    }`}>
                      {t.db_prozent != null ? fmtPct(t.db_prozent) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ Tab: Behandlungen ═══ */}
      {activeTab === 'behandlungen' && (() => {
        const totalUmsatz = behandlungen.reduce((s, b) => s + b.sum_umsatz, 0);
        const maxScore = Math.max(...behandlungen.map(b => {
          const normAnz = b.anzahl / Math.max(...behandlungen.map(x => x.anzahl), 1);
          const normUph = (b.umsatz_pro_stunde || 0) / Math.max(...behandlungen.map(x => x.umsatz_pro_stunde || 0), 1);
          return normAnz * 0.4 + normUph * 0.6;
        }), 1);

        return (
          <div className="overflow-x-auto rounded-xl border border-border/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Behandlung</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Anzahl</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Umsatz</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ø Preis</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ø Min</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">€/Stunde</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Anteil</th>
                </tr>
              </thead>
              <tbody>
                {behandlungen.map((b, i) => {
                  const normAnz = b.anzahl / Math.max(...behandlungen.map(x => x.anzahl), 1);
                  const normUph = (b.umsatz_pro_stunde || 0) / Math.max(...behandlungen.map(x => x.umsatz_pro_stunde || 0), 1);
                  const score = normAnz * 0.4 + normUph * 0.6;
                  const scoreNorm = score / maxScore;
                  const scoreColor = scoreNorm > 0.7 ? 'text-emerald-500' : scoreNorm > 0.4 ? 'text-amber-500' : 'text-red-400';
                  const scoreBg = scoreNorm > 0.7 ? 'bg-emerald-500' : scoreNorm > 0.4 ? 'bg-amber-500' : 'bg-red-400';
                  const anteil = totalUmsatz > 0 ? (b.sum_umsatz / totalUmsatz) * 100 : 0;
                  return (
                    <tr key={b.behandlung_name} className={`border-b border-border/20 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scoreBg}`} />
                          <span className="font-medium text-foreground">{b.behandlung_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmtNum(b.anzahl)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-500">{fmtEur(b.sum_umsatz)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{fmtEur(b.avg_preis)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{b.avg_dauer_minuten ? `${fmtNum(b.avg_dauer_minuten, 0)}′` : '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-medium ${scoreColor}`}>{b.umsatz_pro_stunde ? fmtEur(b.umsatz_pro_stunde) : '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${scoreBg}`} style={{ width: `${Math.round(scoreNorm * 100)}%` }} />
                          </div>
                          <span className={`font-mono text-xs w-8 text-right ${scoreColor}`}>{Math.round(score * 100)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{fmtPct(anteil)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ═══ Tab: Kategorien ═══ */}
      {activeTab === 'kategorien' && (
        <div className="space-y-4">
          {/* Kategorie-Übersicht Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kategorienData.map(kat => {
              const Icon = KATEGORIE_ICONS[kat.kategorie] || Activity;
              const colorClass = KATEGORIE_COLORS[kat.kategorie] || 'bg-muted/20 text-muted-foreground border-border/30';
              return (
                <div key={kat.kategorie} className={`rounded-xl border p-5 ${colorClass}`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-semibold">{kat.kategorie}</span>
                    <Icon className="h-4 w-4 opacity-60" />
                  </div>
                  <p className="text-2xl font-bold font-mono">{fmtEur(kat.umsatz, true)}</p>
                  <p className="text-xs opacity-70 mt-1">{fmtNum(kat.anzahl)} Behandlungen</p>
                  <div className="mt-3 flex justify-between text-xs">
                    <span className="opacity-70">€/Std</span>
                    <span className="font-mono font-semibold">{fmtEur(kat.umsatz_pro_stunde)}</span>
                  </div>
                  {/* Anteil-Balken */}
                  <div className="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-current opacity-40 rounded-full" style={{ width: `${kat.anteil_umsatz}%` }} />
                  </div>
                  <p className="text-xs opacity-60 mt-1">{fmtPct(kat.anteil_umsatz)} vom Gesamt</p>
                </div>
              );
            })}
          </div>

          {/* Top-Behandlungen pro Kategorie */}
          {kategorienData.map(kat => {
            const topBeh = behandlungenTop
              .filter(b => (b as any).kategorie === kat.kategorie)
              .slice(0, 5);
            if (topBeh.length === 0) return null;
            const colorClass = KATEGORIE_COLORS[kat.kategorie] || '';
            return (
              <div key={kat.kategorie} className="rounded-xl border border-border/30 overflow-hidden">
                <div className={`px-4 py-3 border-b border-border/30 flex items-center gap-2 bg-muted/20`}>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colorClass}`}>{kat.kategorie}</span>
                  <span className="text-xs text-muted-foreground">Top 5 Behandlungen</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {topBeh.map((b, i) => (
                      <tr key={b.behandlung_name} className={`border-b border-border/10 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="px-4 py-2 text-xs text-muted-foreground w-8">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-foreground">{b.behandlung_name}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">{fmtNum(b.anzahl)}×</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-500">{fmtEur(b.sum_umsatz, true)}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">{fmtEur(b.umsatz_pro_stunde)}/h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Tab: Detail ═══ */}
      {activeTab === 'detail' && selectedTherapeut && selectedTherapeutInfo && (
        <div className="space-y-4">
          {/* Therapeut Header */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedTherapeutInfo.therapeut_label}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedTherapeutInfo.therapeut_name} · {selYear}
                  {selMonth !== null && ` · ${MONATE[selMonth - 1]}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono text-emerald-500">{fmtEur(selectedTherapeutInfo.sum_umsatz)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtNum(selectedTherapeutInfo.anzahl_behandlungen)} Behandlungen ·{' '}
                  {selectedTherapeutInfo.total_stunden ? `${fmtNum(selectedTherapeutInfo.total_stunden, 1)}h` : '—'}
                </p>
              </div>
            </div>

            {/* Mini-KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              {[
                { label: '€/Stunde', value: selectedTherapeutInfo.umsatz_pro_stunde ? fmtEur(selectedTherapeutInfo.umsatz_pro_stunde) : '—' },
                { label: 'Ø Preis', value: fmtEur(selectedTherapeutInfo.avg_preis_pro_behandlung) },
                { label: 'Ø Dauer', value: selectedTherapeutInfo.avg_dauer_minuten ? `${fmtNum(selectedTherapeutInfo.avg_dauer_minuten, 0)}′` : '—' },
                { label: 'Lohn/Jahr', value: selectedTherapeutInfo.lohnkosten_jahr ? fmtEur(selectedTherapeutInfo.lohnkosten_jahr, true) : '—' },
                {
                  label: 'Deckungsbeitrag',
                  value: selectedTherapeutInfo.deckungsbeitrag != null ? fmtEur(selectedTherapeutInfo.deckungsbeitrag, true) : '—',
                  highlight: selectedTherapeutInfo.deckungsbeitrag != null,
                  positive: (selectedTherapeutInfo.deckungsbeitrag ?? 0) > 0,
                },
              ].map(kpi => (
                <div
                  key={kpi.label}
                  className={`text-center p-3 rounded-lg ${
                    kpi.highlight
                      ? kpi.positive ? 'bg-emerald-500/10' : 'bg-red-500/10'
                      : 'bg-muted/30'
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`text-lg font-mono font-semibold mt-1 ${
                    kpi.highlight ? (kpi.positive ? 'text-emerald-500' : 'text-red-400') : ''
                  }`}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Behandlungen dieses Therapeuten */}
          <div className="rounded-xl border border-border/30 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  {['Behandlung', 'Anzahl', 'Umsatz', 'Ø Preis', 'Gesamt Min.', 'Anteil'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider ${h === 'Behandlung' ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailData.map((d, i) => {
                  const thTotal = detailData.reduce((s, x) => s + x.sum_umsatz, 0);
                  const anteil = thTotal > 0 ? (d.sum_umsatz / thTotal) * 100 : 0;
                  return (
                    <tr key={d.behandlung_name} className={`border-b border-border/10 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{d.behandlung_name}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmtNum(d.anzahl)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-500">{fmtEur(d.sum_umsatz)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{fmtEur(d.avg_preis)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{fmtNum(d.total_minuten)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${Math.min(anteil, 100)}%` }} />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground w-12 text-right">{fmtPct(anteil)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-right">
        Daten: TAC Live-Sync · tac_behandlungen · Letzte Aktualisierung alle 15 Min.
      </p>
    </div>
  );
}
