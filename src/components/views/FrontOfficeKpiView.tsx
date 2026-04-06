/**
 * FrontOfficeKpiView.tsx
 * Rezeption-Dashboard — 100% aus Protel Live-Daten (protel_kpi_tag)
 * 
 * Keine manuellen Daily Reports mehr nötig!
 * Daten kommen alle 15 Min. via Sync-Agent → Supabase.
 *
 * Tabs:
 *  1. Heute     — Tages-KPIs mit Ampeln
 *  2. Monat     — Monatsübersicht mit Trend-Chart
 *  3. Jahresvergleich — Aktuelles Jahr vs. Vorjahr
 */

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, getDaysInMonth } from "date-fns";
import { de } from "date-fns/locale";
import {
  Hotel, TrendingUp, TrendingDown, Minus, RefreshCw,
  LogIn, LogOut, DoorOpen, Users, CalendarDays, BarChart3
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Konstanten
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_ROOMS = 59; // 59 verkaufbare Zimmer (Zi 114+214 = Mitarbeiter)

const MONTHS = [
  "Jänner", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

// ─────────────────────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────────────────────

interface ProtelKpiTag {
  datum: string;
  auslastung_pct: number | null;
  adr: number | null;
  revpar: number | null;
  logis_netto: number | null;
  zimmer_belegt: number | null;
  ankuenfte: number | null;
  abreisen: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ampellogik
// ─────────────────────────────────────────────────────────────────────────────

type TrafficColor = "green" | "yellow" | "red";

function getOccupancyColor(pct: number | null): TrafficColor {
  if (pct == null) return "yellow";
  if (pct >= 70) return "green";
  if (pct >= 50) return "yellow";
  return "red";
}

function getAdrColor(adr: number | null): TrafficColor {
  if (adr == null) return "yellow";
  if (adr >= 150) return "green";
  if (adr >= 120) return "yellow";
  return "red";
}

function getRevparColor(revpar: number | null): TrafficColor {
  if (revpar == null) return "yellow";
  if (revpar >= 100) return "green";
  if (revpar >= 70) return "yellow";
  return "red";
}

const colorClasses: Record<TrafficColor, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const colorBgClasses: Record<TrafficColor, string> = {
  green: "bg-green-500/10 border-green-500/30",
  yellow: "bg-yellow-500/10 border-yellow-500/30",
  red: "bg-red-500/10 border-red-500/30",
};

// ─────────────────────────────────────────────────────────────────────────────
// Hilfsfunktionen
// ─────────────────────────────────────────────────────────────────────────────

function fmtEur(val: number | null): string {
  if (val == null) return "–";
  return val.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function fmtPct(val: number | null): string {
  if (val == null) return "–";
  return val.toFixed(1) + " %";
}

function fmtNum(val: number | null): string {
  if (val == null) return "–";
  return Math.round(val).toLocaleString("de-DE");
}

function DeltaBadge({ current, previous, suffix = "", invert = false }: { 
  current: number | null; previous: number | null; suffix?: string; invert?: boolean 
}) {
  if (current == null || previous == null || previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  const isPositive = invert ? delta < 0 : delta > 0;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${isPositive ? "text-green-600 border-green-300" : delta === 0 ? "text-gray-500" : "text-red-600 border-red-300"}`}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}%{suffix}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Komponente
// ─────────────────────────────────────────────────────────────────────────────

export function FrontOfficeKpiView() {
  const [kpiData, setKpiData] = useState<ProtelKpiTag[]>([]);
  const [vjData, setVjData] = useState<ProtelKpiTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);

  // ── Daten laden ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
  }, [selYear, selMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dateFrom = `${selYear}-${String(selMonth).padStart(2, "0")}-01`;
      const dateTo = new Date(selYear, selMonth, 0).toISOString().split("T")[0];

      // Aktueller Monat
      const { data: current, error: err1 } = await supabase
        .from("protel_kpi_tag")
        .select("datum,auslastung_pct,adr,revpar,logis_netto,zimmer_belegt,ankuenfte,abreisen")
        .gte("datum", dateFrom)
        .lte("datum", dateTo)
        .order("datum");

      if (err1) throw err1;
      setKpiData(current || []);

      // Vorjahr zum Vergleich
      const vjFrom = `${selYear - 1}-${String(selMonth).padStart(2, "0")}-01`;
      const vjTo = new Date(selYear - 1, selMonth, 0).toISOString().split("T")[0];

      const { data: prev } = await supabase
        .from("protel_kpi_tag")
        .select("datum,auslastung_pct,adr,revpar,logis_netto,zimmer_belegt,ankuenfte,abreisen")
        .gte("datum", vjFrom)
        .lte("datum", vjTo)
        .order("datum");

      setVjData(prev || []);
      setLastSync(new Date());
    } catch (e) {
      console.error("Fehler beim Laden:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Heute ────────────────────────────────────────────────────────────────

  const today = useMemo(() => {
    const todayStr = format(now, "yyyy-MM-dd");
    // Heute oder letzter verfügbarer Tag
    const todayData = kpiData.find(k => k.datum === todayStr);
    if (todayData) return todayData;
    // Fallback: letzter Tag mit Daten
    return kpiData.length > 0 ? kpiData[kpiData.length - 1] : null;
  }, [kpiData]);

  // ── Monatszusammenfassung ────────────────────────────────────────────────

  const monthSummary = useMemo(() => {
    if (!kpiData.length) return null;
    const valid = kpiData.filter(k => k.zimmer_belegt != null && k.zimmer_belegt > 0);
    if (!valid.length) return null;

    const sumBelegt = valid.reduce((s, k) => s + (k.zimmer_belegt ?? 0), 0);
    const sumLogis = valid.reduce((s, k) => s + (k.logis_netto ?? 0), 0);
    const sumAnkuenfte = kpiData.reduce((s, k) => s + (k.ankuenfte ?? 0), 0);
    const sumAbreisen = kpiData.reduce((s, k) => s + (k.abreisen ?? 0), 0);

    const avgOcc = valid.reduce((s, k) => s + (k.auslastung_pct ?? 0), 0) / valid.length;
    const avgAdr = sumBelegt > 0 ? sumLogis / sumBelegt : 0;
    const avgRevpar = valid.length > 0
      ? valid.reduce((s, k) => s + (k.revpar ?? 0), 0) / valid.length
      : 0;

    return {
      days: valid.length,
      totalDays: getDaysInMonth(new Date(selYear, selMonth - 1)),
      avgOcc, avgAdr, avgRevpar,
      sumLogis, sumBelegt, sumAnkuenfte, sumAbreisen,
    };
  }, [kpiData, selYear, selMonth]);

  // ── Vorjahr-Summary ──────────────────────────────────────────────────────

  const vjSummary = useMemo(() => {
    if (!vjData.length) return null;
    const valid = vjData.filter(k => k.zimmer_belegt != null && k.zimmer_belegt > 0);
    if (!valid.length) return null;

    const sumBelegt = valid.reduce((s, k) => s + (k.zimmer_belegt ?? 0), 0);
    const sumLogis = valid.reduce((s, k) => s + (k.logis_netto ?? 0), 0);
    const avgOcc = valid.reduce((s, k) => s + (k.auslastung_pct ?? 0), 0) / valid.length;
    const avgAdr = sumBelegt > 0 ? sumLogis / sumBelegt : 0;
    const avgRevpar = valid.reduce((s, k) => s + (k.revpar ?? 0), 0) / valid.length;
    const sumAnkuenfte = vjData.reduce((s, k) => s + (k.ankuenfte ?? 0), 0);

    return { avgOcc, avgAdr, avgRevpar, sumLogis, sumAnkuenfte, days: valid.length };
  }, [vjData]);

  // ── Chart-Daten ──────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    return kpiData.map(k => ({
      tag: parseInt(k.datum.split("-")[2]),
      datum: k.datum,
      occ: k.auslastung_pct ?? 0,
      adr: k.adr ?? 0,
      revpar: k.revpar ?? 0,
      logis: k.logis_netto ?? 0,
      belegt: k.zimmer_belegt ?? 0,
      ankuenfte: k.ankuenfte ?? 0,
      abreisen: k.abreisen ?? 0,
    }));
  }, [kpiData]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Hotel className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Rezeption</h1>
            <p className="text-xs text-muted-foreground">
              Live-Daten aus Protel · {TOTAL_ROOMS} Verkaufszimmer
              {lastSync && <> · Aktualisiert {format(lastSync, "HH:mm", { locale: de })}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selMonth)} onValueChange={v => setSelMonth(Number(v))}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selYear)} onValueChange={v => setSelYear(Number(v))}>
            <SelectTrigger className="w-[80px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2022, 2023, 2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="heute" className="space-y-4">
          <TabsList>
            <TabsTrigger value="heute">Heute</TabsTrigger>
            <TabsTrigger value="monat">Monat</TabsTrigger>
            <TabsTrigger value="vergleich">Jahresvergleich</TabsTrigger>
          </TabsList>

          {/* ═══════ TAB 1: HEUTE ═══════ */}
          <TabsContent value="heute" className="space-y-4">
            {today ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(today.datum), "EEEE, d. MMMM yyyy", { locale: de })}
                  {today.datum !== format(now, "yyyy-MM-dd") && (
                    <Badge variant="outline" className="ml-2 text-xs">Letzter verfügbarer Tag</Badge>
                  )}
                </p>

                {/* KPI-Kacheln mit Ampel */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className={`border-2 ${colorBgClasses[getOccupancyColor(today.auslastung_pct)]}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Auslastung</p>
                          <p className="text-3xl font-bold font-mono">{fmtPct(today.auslastung_pct)}</p>
                          <p className="text-xs text-muted-foreground">Ziel: ≥ 70%</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full ${colorClasses[getOccupancyColor(today.auslastung_pct)]} shadow-md`} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${colorBgClasses[getAdrColor(today.adr)]}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">ADR</p>
                          <p className="text-3xl font-bold font-mono">{fmtEur(today.adr)}</p>
                          <p className="text-xs text-muted-foreground">Ziel: ≥ 150 €</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full ${colorClasses[getAdrColor(today.adr)]} shadow-md`} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${colorBgClasses[getRevparColor(today.revpar)]}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">RevPAR</p>
                          <p className="text-3xl font-bold font-mono">{fmtEur(today.revpar)}</p>
                          <p className="text-xs text-muted-foreground">Ziel: ≥ 100 €</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full ${colorClasses[getRevparColor(today.revpar)]} shadow-md`} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Logis-Umsatz</p>
                      <p className="text-3xl font-bold font-mono">{fmtEur(today.logis_netto)}</p>
                      <p className="text-xs text-muted-foreground">Tagesumsatz netto</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tagesdetails */}
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <DoorOpen className="h-4 w-4 mx-auto mb-1 text-primary" />
                        <p className="text-xs text-muted-foreground">Belegt</p>
                        <p className="text-xl font-bold text-primary font-mono">{fmtNum(today.zimmer_belegt)}</p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <Hotel className="h-4 w-4 mx-auto mb-1 text-green-600" />
                        <p className="text-xs text-muted-foreground">Frei</p>
                        <p className="text-xl font-bold text-green-600 font-mono">
                          {today.zimmer_belegt != null ? TOTAL_ROOMS - today.zimmer_belegt : "–"}
                        </p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <LogIn className="h-4 w-4 mx-auto mb-1 text-green-600" />
                        <p className="text-xs text-muted-foreground">Ankünfte</p>
                        <p className="text-xl font-bold text-green-600 font-mono">{fmtNum(today.ankuenfte)}</p>
                      </div>
                      <div className="p-3 bg-orange-500/10 rounded-lg">
                        <LogOut className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                        <p className="text-xs text-muted-foreground">Abreisen</p>
                        <p className="text-xl font-bold text-orange-600 font-mono">{fmtNum(today.abreisen)}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg col-span-2">
                        <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Auslastung</p>
                        <div className="mt-1 w-full bg-muted-foreground/20 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${colorClasses[getOccupancyColor(today.auslastung_pct)]}`}
                            style={{ width: `${Math.min(100, today.auslastung_pct ?? 0)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {fmtNum(today.zimmer_belegt)} von {TOTAL_ROOMS} Zimmern
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Lade Protel-Daten...
                    </div>
                  ) : (
                    "Keine Daten für heute verfügbar"
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════ TAB 2: MONAT ═══════ */}
          <TabsContent value="monat" className="space-y-4">
            {monthSummary ? (
              <>
                {/* Monats-KPIs */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Ø Auslastung</p>
                      <p className="text-3xl font-bold text-primary font-mono">{fmtPct(monthSummary.avgOcc)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{monthSummary.days} von {monthSummary.totalDays} Tagen</p>
                        <DeltaBadge current={monthSummary.avgOcc} previous={vjSummary?.avgOcc ?? null} suffix=" VJ" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Ø ADR</p>
                      <p className="text-3xl font-bold font-mono">{fmtEur(monthSummary.avgAdr)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">pro belegte Nacht</p>
                        <DeltaBadge current={monthSummary.avgAdr} previous={vjSummary?.avgAdr ?? null} suffix=" VJ" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Ø RevPAR</p>
                      <p className="text-3xl font-bold font-mono">{fmtEur(monthSummary.avgRevpar)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">pro verfügbare Nacht</p>
                        <DeltaBadge current={monthSummary.avgRevpar} previous={vjSummary?.avgRevpar ?? null} suffix=" VJ" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Logis-Umsatz</p>
                      <p className="text-3xl font-bold text-green-600 font-mono">{fmtEur(monthSummary.sumLogis)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{fmtNum(monthSummary.sumBelegt)} Zimmernächte</p>
                        <DeltaBadge current={monthSummary.sumLogis} previous={vjSummary?.sumLogis ?? null} suffix=" VJ" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Bewegungen */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <LogIn className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ankünfte gesamt</p>
                        <p className="text-2xl font-bold font-mono">{fmtNum(monthSummary.sumAnkuenfte)}</p>
                      </div>
                      <DeltaBadge current={monthSummary.sumAnkuenfte} previous={vjSummary?.sumAnkuenfte ?? null} suffix=" VJ" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 bg-orange-500/10 rounded-lg">
                        <LogOut className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Abreisen gesamt</p>
                        <p className="text-2xl font-bold font-mono">{fmtNum(monthSummary.sumAbreisen)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tagesverlauf Chart */}
                {chartData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Tagesverlauf — {MONTHS[selMonth - 1]} {selYear}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="tag" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} unit="%" />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <ReTooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                              formatter={(value: number, name: string) => {
                                if (name === "Auslastung") return [fmtPct(value), name];
                                if (name === "ADR" || name === "RevPAR") return [fmtEur(value), name];
                                return [fmtNum(value), name];
                              }}
                              labelFormatter={(label) => `Tag ${label}`}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area yAxisId="left" type="monotone" dataKey="occ" name="Auslastung" stroke="#6366f1" fill="url(#occGrad)" strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="adr" name="ADR" stroke="#10b981" strokeWidth={2} dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="revpar" name="RevPAR" stroke="#f59e0b" strokeWidth={2} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {loading ? "Lade Daten..." : "Keine Protel-Daten für diesen Monat"}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════ TAB 3: JAHRESVERGLEICH ═══════ */}
          <TabsContent value="vergleich" className="space-y-4">
            {monthSummary && vjSummary ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {MONTHS[selMonth - 1]} {selYear} vs. {selYear - 1}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">KPI</th>
                          <th className="text-right py-3 px-4 text-muted-foreground font-medium">{selYear}</th>
                          <th className="text-right py-3 px-4 text-muted-foreground font-medium">{selYear - 1}</th>
                          <th className="text-right py-3 px-4 text-muted-foreground font-medium">Δ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        <tr>
                          <td className="py-3 px-4 font-medium">Ø Auslastung</td>
                          <td className="py-3 px-4 text-right font-mono">{fmtPct(monthSummary.avgOcc)}</td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmtPct(vjSummary.avgOcc)}</td>
                          <td className="py-3 px-4 text-right"><DeltaBadge current={monthSummary.avgOcc} previous={vjSummary.avgOcc} /></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">Ø ADR</td>
                          <td className="py-3 px-4 text-right font-mono">{fmtEur(monthSummary.avgAdr)}</td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmtEur(vjSummary.avgAdr)}</td>
                          <td className="py-3 px-4 text-right"><DeltaBadge current={monthSummary.avgAdr} previous={vjSummary.avgAdr} /></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">Ø RevPAR</td>
                          <td className="py-3 px-4 text-right font-mono">{fmtEur(monthSummary.avgRevpar)}</td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmtEur(vjSummary.avgRevpar)}</td>
                          <td className="py-3 px-4 text-right"><DeltaBadge current={monthSummary.avgRevpar} previous={vjSummary.avgRevpar} /></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">Logis-Umsatz</td>
                          <td className="py-3 px-4 text-right font-mono">{fmtEur(monthSummary.sumLogis)}</td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmtEur(vjSummary.sumLogis)}</td>
                          <td className="py-3 px-4 text-right"><DeltaBadge current={monthSummary.sumLogis} previous={vjSummary.sumLogis} /></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">Zimmernächte</td>
                          <td className="py-3 px-4 text-right font-mono">{fmtNum(monthSummary.sumBelegt)}</td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">–</td>
                          <td className="py-3 px-4 text-right"></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">Ankünfte</td>
                          <td className="py-3 px-4 text-right font-mono">{fmtNum(monthSummary.sumAnkuenfte)}</td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmtNum(vjSummary.sumAnkuenfte)}</td>
                          <td className="py-3 px-4 text-right"><DeltaBadge current={monthSummary.sumAnkuenfte} previous={vjSummary.sumAnkuenfte} /></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">Erfasste Tage</td>
                          <td className="py-3 px-4 text-right font-mono">{monthSummary.days}</td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">{vjSummary.days}</td>
                          <td className="py-3 px-4 text-right"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {loading ? "Lade Daten..." : vjData.length === 0
                    ? `Keine Vorjahresdaten für ${MONTHS[selMonth - 1]} ${selYear - 1} verfügbar`
                    : "Keine Daten für den gewählten Zeitraum"
                  }
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
