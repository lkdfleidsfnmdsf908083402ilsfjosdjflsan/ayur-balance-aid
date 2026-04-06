/**
 * GastAnalyticsView.tsx
 * Modul B — Gast & Treatment Analytics · Mandira Ayurveda Hotel
 *
 * Datenquellen:
 *  - v_wiederkehrrate           → Gast-Segmente (gesamt, jahresunabhängig)
 *  - v_gaeste_top               → Top-Gäste (filter_jahr)
 *  - v_buchungsvorlauf          → Buchungsvorlauf nach Kanal/Saison
 *  - v_kanal_performance        → ADR nach Buchungskanal
 *  - v_therapeuten_performance  → Therapeuten-Umsatz/Stunde (via logonid)
 *  - v_infusionen_analyse       → Infusions €/Stunde Analyse
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, TrendingUp, RefreshCw, Calendar, Heart,
  Star, Clock, AlertTriangle, Droplets, Zap, Activity, Globe, BarChart2,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────────────────────

interface Wiederkehrrate {
  segment: string;
  segment_order: number;
  anzahl_gaeste: number;
  avg_aufenthalte: number;
  avg_naechte: number;
  avg_umsatz_gesamt: number;
  sum_umsatz_gesamt: number;
  aktiv_letztes_jahr: number;
}

interface GasteTop {
  kdnr: string;
  nachname: string;
  vorname: string;
  land: string;
  jahr: number;
  aufenthalte_jahr: number;
  naechte_jahr: number;
  logis_jahr: number;
  umsatz_jahr: number;
  erster_aufenthalt_jahr: string;
  letzter_aufenthalt_jahr: string;
}

interface BuchungsVorlauf {
  jahr: number;
  monat_nr: number;
  saison: string;
  sourcenr: number;
  avg_vorlauf_tage: number;
  min_vorlauf_tage: number;
  max_vorlauf_tage: number;
  avg_naechte: number;
  anzahl_buchungen: number;
}

interface KanalPerformance {
  jahr: number;
  sourcenr: number;
  bezeichnung: string;
  anzahl_buchungen: number;
  sum_naechte: number;
  avg_adr: number;
  avg_vorlauf_tage: number;
  sum_umsatz: number;
  storno_rate_pct: number;
}

interface TherapeutPerformance {
  logonid: number;
  full_name: string;
  anzahl_behandlungen: number;
  total_stunden: number;
  sum_umsatz: number;
  avg_preis_pro_beh: number;
  umsatz_pro_stunde: number;
  umsatz_aktuelles_jahr: number;
}


interface GastLand {
  land: string;
  anzahl_gaeste: number;
  naechte_gesamt: number;
  logis_gesamt: number;
  avg_naechte: number;
  jahr: number;
}

interface GastAlter {
  altersgruppe: string;
  altersgruppe_order: number;
  anzahl_gaeste: number;
  anteil_pct: number;
  avg_naechte: number;
  jahr: number;
}
interface InfusionAnalyse {
  behandlung: string;
  anzahl: number;
  preis_avg: number;
  dauer_avg_min: number;
  eur_pro_stunde: number;
  kategorie: string | null;
  jahr: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatter & Konstanten
// ─────────────────────────────────────────────────────────────────────────────

const fmtEur = (n: number | null | undefined, short = false) => {
  if (n == null) return '—';
  if (short && Math.abs(n) >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(2)} M`;
  if (short && Math.abs(n) >= 1_000)    return `€ ${(n / 1_000).toFixed(1)} k`;
  return `€ ${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtEur0 = (n: number | null | undefined) =>
  n != null ? `€ ${n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—';
const fmtNum = (n: number | null | undefined, dec = 0) =>
  n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—';
const fmtPct = (n: number | null | undefined) =>
  n != null ? `${n.toFixed(1)} %` : '—';

const SEGMENT_COLORS = ['#94a3b8', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];
const SAISON_COLOR: Record<string, string> = {
  high: '#10b981', shoulder: '#f59e0b', summer: '#3b82f6',
  Hauptsaison: '#10b981', Nebensaison: '#f59e0b', Zwischensaison: '#3b82f6',
};
const INF_COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#64748b'];

function eurColor(v: number)     { return v >= 400 ? '#10b981' : v >= 250 ? '#f59e0b' : v >= 150 ? '#f97316' : '#ef4444'; }
function eurBadge(v: number)     { return v >= 400 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : v >= 250 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : v >= 150 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'; }

// ─────────────────────────────────────────────────────────────────────────────
// Unterkomponenten
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
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ msg, sub }: { msg: string; sub?: string }) {
  return (
    <Card className="glass-card border-border">
      <CardContent className="py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{msg}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hauptkomponente
// ─────────────────────────────────────────────────────────────────────────────

export function GastAnalyticsView() {
  const [wiederkehr,  setWiederkehr]  = useState<Wiederkehrrate[]>([]);
  const [gasteTop,    setGasteTop]    = useState<GasteTop[]>([]);
  const [vorlauf,     setVorlauf]     = useState<BuchungsVorlauf[]>([]);
  const [kanal,       setKanal]       = useState<KanalPerformance[]>([]);
  const [therapeuten, setTherapeuten] = useState<TherapeutPerformance[]>([]);
  const [infusionen,  setInfusionen]  = useState<InfusionAnalyse[]>([]);
  const [laender,     setLaender]     = useState<GastLand[]>([]);
  const [alter,       setAlter]       = useState<GastAlter[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [selYear,     setSelYear]     = useState(new Date().getFullYear());
  const [activeTab,   setActiveTab]   = useState<'wiederkehr'|'gaeste'|'herkunft'|'alter'|'vorlauf'|'therapeuten'|'infusionen'>('wiederkehr');

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const [wR, gR, vR, kR, tR, iR, lR, aR] = await Promise.all([
        supabase.from('v_wiederkehrrate').select('*').order('segment_order'),
        supabase.from('v_gaeste_top_mit_jahr').select('*').eq('jahr', selYear).order('logis_jahr', { ascending: false }).limit(100),
        supabase.from('v_buchungsvorlauf').select('*').eq('jahr', selYear).order('monat_nr'),
        supabase.from('v_kanal_performance').select('*').eq('jahr', selYear).order('sum_naechte', { ascending: false }),
        supabase.from('v_therapeuten_performance').select('*').order('sum_umsatz', { ascending: false }),
        supabase.from('v_infusionen_analyse').select('*').eq('jahr', selYear).order('eur_pro_stunde', { ascending: false }),
        supabase.from('v_gaeste_laender').select('*').eq('jahr', selYear).order('logis_gesamt', { ascending: false }).limit(15),
        supabase.from('v_gaeste_alter').select('*').eq('jahr', selYear).order('altersgruppe_order'),

      ]);
      if (wR.error) throw wR.error;
      setWiederkehr(wR.data || []);
      setGasteTop(gR.data || []);
      setVorlauf(vR.data || []);
      setKanal(kR.data || []);
      setTherapeuten(tR.data || []);
      setInfusionen(iR.data || []);
      setLaender(lR.data || []);
      setAlter(aR.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [selYear]);

  const wStats = useMemo(() => {
    if (!wiederkehr.length) return null;
    const gesamt     = wiederkehr.reduce((s, w) => s + w.anzahl_gaeste, 0);
    const stammgaeste= wiederkehr.filter(w => w.segment_order >= 3).reduce((s, w) => s + w.anzahl_gaeste, 0);
    const aktiv      = wiederkehr.reduce((s, w) => s + w.aktiv_letztes_jahr, 0);
    const erstgaeste = wiederkehr.find(w => w.segment_order === 1)?.anzahl_gaeste ?? 0;
    const wRate      = gesamt > 0 ? ((gesamt - erstgaeste) / gesamt) * 100 : 0;
    return { gesamt, stammgaeste, aktiv, wRate };
  }, [wiederkehr]);

  const vorlaufBySaison = useMemo(() => {
    const map = new Map<string, { saison: string; sum: number; count: number }>();
    vorlauf.forEach(v => {
      const e = map.get(v.saison) || { saison: v.saison, sum: 0, count: 0 };
      e.sum += (v.avg_vorlauf_tage ?? 0) * (v.anzahl_buchungen ?? 1);
      e.count += v.anzahl_buchungen ?? 1;
      map.set(v.saison, e);
    });
    return Array.from(map.values()).map(v => ({ ...v, avg: v.count > 0 ? Math.round(v.sum / v.count) : 0 }));
  }, [vorlauf]);

  const infKpis = useMemo(() => {
    if (!infusionen.length) return null;
    const withRate = infusionen.filter(i => i.eur_pro_stunde > 0);
    return {
      top:         withRate[0] ?? null,
      totalUmsatz: infusionen.reduce((s, i) => s + (i.anzahl || 0) * (i.preis_avg || 0), 0),
      totalAnzahl: infusionen.reduce((s, i) => s + (i.anzahl || 0), 0),
      avgEph:      withRate.length ? withRate.reduce((s, i) => s + i.eur_pro_stunde, 0) / withRate.length : 0,
    };
  }, [infusionen]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-64 text-muted-foreground">
      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">Gast Analytics werden geladen…</span>
    </div>
  );

  const tabs = [
    { id: 'wiederkehr',  label: 'Wiederkehrrate', Icon: Heart    },
    { id: 'gaeste',      label: 'Top-Gäste',      Icon: Star     },
    { id: 'vorlauf',     label: 'Buchungsvorlauf', Icon: Calendar },
    { id: 'therapeuten', label: 'Therapeuten',     Icon: Clock    },
    { id: 'herkunft',    label: 'Herkunft',         Icon: Globe    },
    { id: 'alter',       label: 'Altersstruktur',   Icon: BarChart2},
    { id: 'infusionen',  label: 'Infusionen',      Icon: Droplets },
  ] as const;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gast & Treatment Analytics
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Modul B · Protel + TAC Echtdaten</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {[2022, 2023, 2024, 2025, 2026].map(y => (
                <button key={y} onClick={() => setSelYear(y)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${selYear === y ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  {y}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={loadData} className="h-8 w-8">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* Tab-Navigation */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* ══ WIEDERKEHRRATE ══════════════════════════════════════════════ */}
        {activeTab === 'wiederkehr' && (
          <div className="space-y-6">
            {wStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Gästeprofile gesamt', val: fmtNum(wStats.gesamt), sub: 'seit 2019' },
                  { label: 'Wiederkehrrate', val: fmtPct(wStats.wRate), sub: 'Gäste mit 2+ Aufenthalten', green: true },
                  { label: 'Stammgäste (3x+)', val: fmtNum(wStats.stammgaeste), sub: `${fmtPct(wStats.stammgaeste / wStats.gesamt * 100)} aller Gäste` },
                  { label: 'Aktiv (letztes Jahr)', val: fmtNum(wStats.aktiv), sub: `${fmtPct(wStats.aktiv / wStats.gesamt * 100)} aller Gäste` },
                ].map(k => (
                  <Card key={k.label} className="glass-card border-border">
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground">{k.label}</p>
                      <p className={`text-2xl font-semibold font-mono mt-1 ${k.green ? 'text-emerald-500' : ''}`}>{k.val}</p>
                      <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {wiederkehr.length === 0 ? (
              <Empty msg="Keine Wiederkehrrate-Daten vorhanden." sub="v_wiederkehrrate prüfen." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="glass-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Gäste nach Aufenthaltsanzahl</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={wiederkehr.map((w, i) => ({ name: w.segment, gaeste: w.anzahl_gaeste, aktiv: w.aktiv_letztes_jahr, color: SEGMENT_COLORS[i] }))} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <ReTooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="gaeste" name="Gesamt" radius={[4, 4, 0, 0]}>
                          {wiederkehr.map((_, i) => <Cell key={i} fill={SEGMENT_COLORS[i]} />)}
                        </Bar>
                        <Bar dataKey="aktiv" name="Aktiv (letztes Jahr)" fill="#10b981" opacity={0.7} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="glass-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Segment-Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">Segment</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Gäste</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Ø Nächte</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Aktiv</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wiederkehr.map((w, i) => (
                          <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEGMENT_COLORS[i] }} />
                                <span className="font-medium text-foreground">{w.segment}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">{fmtNum(w.anzahl_gaeste)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(w.avg_naechte, 1)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="text-emerald-500 font-medium">{fmtNum(w.aktiv_letztes_jahr)}</span>
                              <span className="text-muted-foreground ml-1">({fmtPct(w.aktiv_letztes_jahr / w.anzahl_gaeste * 100)})</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ══ TOP-GÄSTE ═══════════════════════════════════════════════════ */}
        {activeTab === 'gaeste' && (
          <div className="space-y-4">
            {gasteTop.length === 0 ? (
              <Empty msg={`Keine Top-Gäste-Daten für ${selYear}.`} sub="Sync prüfen oder anderes Jahr wählen." />
            ) : (
              <Card className="glass-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Top 100 Gäste · {selYear}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[600px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b border-border">
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">#</th>
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">Name</th>
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">Land</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Aufenthalte</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Nächte</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Logis</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Umsatz</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Letzter Besuch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gasteTop.map((g, i) => (
                          <tr key={g.kdnr} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-foreground">{g.nachname}{g.vorname ? `, ${g.vorname}` : ''}</span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{g.land || '—'}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">{fmtNum(g.aufenthalte_jahr)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(g.naechte_jahr)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">{fmtEur(g.logis_jahr, true)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtEur(g.umsatz_jahr, true)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{g.letzter_aufenthalt_jahr ? new Date(g.letzter_aufenthalt_jahr).toLocaleDateString('de-DE') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ══ BUCHUNGSVORLAUF ═════════════════════════════════════════════ */}
        {activeTab === 'vorlauf' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {vorlaufBySaison.length === 0
                ? ['Hauptsaison', 'Nebensaison', 'Zwischensaison'].map(s => (
                    <Card key={s} className="glass-card border-border">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: SAISON_COLOR[s] }} />
                          <p className="text-sm text-muted-foreground">{s}</p>
                        </div>
                        <p className="text-2xl font-semibold font-mono text-foreground">— Tage</p>
                      </CardContent>
                    </Card>
                  ))
                : vorlaufBySaison.map(s => (
                    <Card key={s.saison} className="glass-card border-border">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: SAISON_COLOR[s.saison] || '#6366f1' }} />
                          <p className="text-sm text-muted-foreground capitalize">{s.saison}</p>
                        </div>
                        <p className="text-2xl font-semibold font-mono text-foreground">{s.avg} Tage</p>
                        <p className="text-xs text-muted-foreground mt-1">Ø Buchungsvorlauf</p>
                      </CardContent>
                    </Card>
                  ))
              }
            </div>

            <Card className="glass-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Buchungsvorlauf nach Monat · {selYear}</CardTitle>
              </CardHeader>
              <CardContent>
                {vorlauf.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-2 opacity-50" />
                    Keine Buchungsvorlauf-Daten für {selYear}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={vorlauf.map(v => ({ monat: ['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][v.monat_nr - 1], vorlauf: v.avg_vorlauf_tage, saison: v.saison }))} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="monat" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}T`} />
                      <ReTooltip content={<ChartTooltip />} />
                      <Bar dataKey="vorlauf" name="Ø Vorlauf (Tage)" radius={[4, 4, 0, 0]}>
                        {vorlauf.map((v, i) => <Cell key={i} fill={SAISON_COLOR[v.saison] || '#6366f1'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {kanal.length > 0 && (
              <Card className="glass-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Kanal-Performance · {selYear}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-muted-foreground font-medium px-4 py-3">Kanal</th>
                        <th className="text-right text-muted-foreground font-medium px-4 py-3">Buchungen</th>
                        <th className="text-right text-muted-foreground font-medium px-4 py-3">Nächte</th>
                        <th className="text-right text-muted-foreground font-medium px-4 py-3">Ø ADR</th>
                        <th className="text-right text-muted-foreground font-medium px-4 py-3">Ø Vorlauf</th>
                        <th className="text-right text-muted-foreground font-medium px-4 py-3">Storno %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kanal.map((k, i) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-foreground">{k.bezeichnung || `Kanal ${k.sourcenr}`}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{fmtNum(k.anzahl_buchungen)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(k.sum_naechte)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">{fmtEur(k.avg_adr)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(k.avg_vorlauf_tage, 0)}T</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={k.storno_rate_pct > 15 ? 'text-red-400' : 'text-muted-foreground'}>{fmtPct(k.storno_rate_pct)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ══ THERAPEUTEN ═════════════════════════════════════════════════ */}
        {activeTab === 'therapeuten' && (
          <div className="space-y-4">
            {therapeuten.length === 0 ? (
              <Empty msg="Keine Therapeuten-Daten vorhanden." />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="glass-card border-border"><CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">Aktive Therapeuten</p>
                    <p className="text-2xl font-semibold font-mono mt-1">{therapeuten.length}</p>
                  </CardContent></Card>
                  <Card className="glass-card border-border"><CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">Gesamt-Behandlungen</p>
                    <p className="text-2xl font-semibold font-mono mt-1">{fmtNum(therapeuten.reduce((s, t) => s + t.anzahl_behandlungen, 0))}</p>
                    <p className="text-xs text-muted-foreground mt-1">ab 2022</p>
                  </CardContent></Card>
                  <Card className="glass-card border-border"><CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">Gesamt-Umsatz TAC</p>
                    <p className="text-2xl font-semibold font-mono mt-1">{fmtEur(therapeuten.reduce((s, t) => s + (t.sum_umsatz || 0), 0), true)}</p>
                    <p className="text-xs text-muted-foreground mt-1">ab 2022</p>
                  </CardContent></Card>
                </div>

                <Card className="glass-card border-border">
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">Therapeut</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Behandlungen</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Stunden</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Umsatz gesamt</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Ø €/Stunde</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Ø €/Beh.</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">{new Date().getFullYear()}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {therapeuten.map((t, i) => (
                          <tr key={t.logonid} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                                <span className="font-medium text-foreground">{t.full_name || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-foreground">{fmtNum(t.anzahl_behandlungen)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(t.total_stunden, 0)}h</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">{fmtEur(t.sum_umsatz, true)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`font-mono font-medium ${(t.umsatz_pro_stunde || 0) >= 200 ? 'text-emerald-500' : 'text-foreground'}`}>{fmtEur(t.umsatz_pro_stunde)}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{fmtEur(t.avg_preis_pro_beh)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-foreground">{fmtEur(t.umsatz_aktuelles_jahr, true)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Umsatz pro Stunde nach Therapeut</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={therapeuten.slice(0, 15).map(t => ({ name: t.full_name?.split(' ').pop() || '—', uph: Math.round(t.umsatz_pro_stunde || 0) }))} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${v}`} />
                        <ReTooltip content={<ChartTooltip />} />
                        <Bar dataKey="uph" name="€/Stunde" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}


        {/* ══ HERKUNFT ════════════════════════════════════════════════ */}
        {activeTab === 'herkunft' && (
          <div className="space-y-4">
            {laender.length === 0 ? (
              <Empty msg={`Keine Herkunftsdaten für ${selYear}.`} sub="Sync prüfen oder anderes Jahr wählen." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="glass-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-400" />
                      Top-Herkunftsländer · {selYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {laender.slice(0, 12).map((l, i) => {
                        const max = laender[0]?.logis_gesamt || 1;
                        const pct = ((l.logis_gesamt || 0) / max) * 100;
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-medium text-foreground">{l.land || '—'}</span>
                              <span className="text-muted-foreground">
                                {fmtNum(l.anzahl_gaeste)} Gäste · {fmtEur(l.logis_gesamt, true)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Verteilung nach Gästeanzahl · {selYear}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={laender.slice(0, 8)}
                          dataKey="anzahl_gaeste"
                          nameKey="land"
                          cx="50%" cy="50%"
                          outerRadius={100}
                          label={({ land, percent }) => percent > 0.04 ? `${(percent*100).toFixed(0)}%` : ''}
                        >
                          {laender.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={INF_COLORS[i % INF_COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip content={<ChartTooltip />} formatter={(v: number, _n, p) => [`${fmtNum(v)} Gäste · ${fmtEur(p.payload?.logis_gesamt, true)}`, p.payload?.land]} />
                        <Legend formatter={value => <span style={{ fontSize: 11 }}>{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Länder-Detail · {selYear}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">#</th>
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">Land</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Gäste</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Nächte</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Ø Nächte</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Logis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laender.map((l, i) => (
                          <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-foreground">{l.land || '—'}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{fmtNum(l.anzahl_gaeste)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(l.naechte_gesamt)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(l.avg_naechte, 1)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">{fmtEur(l.logis_gesamt, true)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ══ ALTERSSTRUKTUR ══════════════════════════════════════════ */}
        {activeTab === 'alter' && (
          <div className="space-y-4">
            {alter.length === 0 ? (
              <Empty msg={`Keine Altersstruktur-Daten für ${selYear}.`} sub="Sync prüfen oder anderes Jahr wählen." />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {alter.map((a, i) => (
                    <Card key={i} className="glass-card border-border">
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">{a.altersgruppe}</p>
                        <p className="text-2xl font-semibold font-mono mt-1">{fmtNum(a.anzahl_gaeste)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fmtNum(a.anteil_pct, 1)} % · Ø {fmtNum(a.avg_naechte, 1)} Nächte</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="glass-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-emerald-400" />
                      Altersstruktur · {selYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={alter} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="altersgruppe" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <ReTooltip content={<ChartTooltip />} formatter={(v: number) => [fmtNum(v), 'Gäste']} />
                        <Bar dataKey="anzahl_gaeste" name="Gäste" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ══ INFUSIONEN ══════════════════════════════════════════════════ */}
        {activeTab === 'infusionen' && (
          <div className="space-y-4">
            {infKpis && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-card border-border"><CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Top €/Stunde</p>
                      <p className="text-2xl font-semibold font-mono mt-1 text-emerald-500">{infKpis.top ? `${fmtEur0(infKpis.top.eur_pro_stunde)}/h` : '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[130px]">{infKpis.top?.behandlung ?? '—'}</p>
                    </div>
                    <Zap className="h-5 w-5 text-emerald-400/50 mt-0.5" />
                  </div>
                </CardContent></Card>
                <Card className="glass-card border-border"><CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Gesamtumsatz</p>
                      <p className="text-2xl font-semibold font-mono mt-1">{fmtEur(infKpis.totalUmsatz, true)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{selYear} · Anz × Ø Preis</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-blue-400/50 mt-0.5" />
                  </div>
                </CardContent></Card>
                <Card className="glass-card border-border"><CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Behandlungen</p>
                      <p className="text-2xl font-semibold font-mono mt-1">{fmtNum(infKpis.totalAnzahl)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Gesamt {selYear}</p>
                    </div>
                    <Activity className="h-5 w-5 text-violet-400/50 mt-0.5" />
                  </div>
                </CardContent></Card>
                <Card className="glass-card border-border"><CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ø €/Stunde</p>
                      <p className="text-2xl font-semibold font-mono mt-1">{fmtEur0(infKpis.avgEph)}/h</p>
                      <p className="text-xs text-muted-foreground mt-1">Ø aller Infusionen</p>
                    </div>
                    <Droplets className="h-5 w-5 text-cyan-400/50 mt-0.5" />
                  </div>
                </CardContent></Card>
              </div>
            )}

            {infusionen.length === 0 ? (
              <Empty msg={`Keine Infusions-Daten für ${selYear}.`} sub="Sync prüfen oder anderes Jahr wählen." />
            ) : (
              <>
                <Card className="glass-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-cyan-400" />
                      Effizienz: €/Stunde nach Infusion · {selYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(280, infusionen.length * 28)}>
                      <BarChart data={[...infusionen].sort((a, b) => (b.eur_pro_stunde || 0) - (a.eur_pro_stunde || 0))} layout="vertical" margin={{ top: 4, right: 70, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `€${v}/h`} />
                        <YAxis type="category" dataKey="behandlung" width={170} tick={{ fontSize: 10 }} />
                        <ReTooltip content={<ChartTooltip />} formatter={(v: number, _n, p) => [`€ ${fmtNum(v, 0)}/h · ${fmtNum(p.payload?.anzahl)} Beh. · Ø ${fmtNum(p.payload?.dauer_avg_min, 0)} Min`, 'Effizienz']} />
                        <Bar dataKey="eur_pro_stunde" name="€/Stunde" radius={[0, 4, 4, 0]}>
                          {[...infusionen].sort((a, b) => (b.eur_pro_stunde || 0) - (a.eur_pro_stunde || 0)).map((e, i) => <Cell key={i} fill={eurColor(e.eur_pro_stunde || 0)} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                      {[['bg-emerald-500','≥ €400/h Top'],['bg-amber-500','≥ €250/h Gut'],['bg-orange-500','≥ €150/h OK'],['bg-red-500','< €150/h Niedrig']].map(([cls, lbl]) => (
                        <span key={lbl} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${cls} inline-block`} />{lbl}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Infusions-Detail · {selYear}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">#</th>
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">Behandlung</th>
                          <th className="text-left text-muted-foreground font-medium px-4 py-3">Kategorie</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Anzahl</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Umsatz</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Ø Preis</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">Ø Dauer</th>
                          <th className="text-right text-muted-foreground font-medium px-4 py-3">€/Stunde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {infusionen.map((inf, i) => (
                          <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-foreground">{inf.behandlung}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{inf.kategorie || '—'}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{fmtNum(inf.anzahl)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">{fmtEur((inf.anzahl || 0) * (inf.preis_avg || 0), true)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtEur(inf.preis_avg)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(inf.dauer_avg_min, 0)} Min</td>
                            <td className="px-4 py-2.5 text-right">
                              {inf.eur_pro_stunde > 0
                                ? <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${eurBadge(inf.eur_pro_stunde)}`}>{fmtEur0(inf.eur_pro_stunde)}/h</span>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Behandlungs-Verteilung nach Anzahl · {selYear}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={infusionen} dataKey="anzahl" nameKey="behandlung" cx="50%" cy="50%" outerRadius={100} label={({ percent }) => percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''}>
                          {infusionen.map((_, i) => <Cell key={i} fill={INF_COLORS[i % INF_COLORS.length]} />)}
                        </Pie>
                        <ReTooltip content={<ChartTooltip />} formatter={(v: number, _n, p) => [`${fmtNum(v)} Beh. · ${fmtEur((p.payload?.anzahl || 0) * (p.payload?.preis_avg || 0), true)}`, p.payload?.behandlung]} />
                        <Legend formatter={value => <span style={{ fontSize: 11 }}>{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
