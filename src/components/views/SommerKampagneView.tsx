/**
 * SommerKampagneView.tsx
 * Sommer-Kampagne (Jun–Aug) · rollierend letzte 3 Jahre inkl. aktuellem Jahr
 * Mandira Ayurveda Hotel · Ayur Balance Aid
 *
 * Datenquellen (Supabase Views, stündlich via buchold-sync aktualisiert):
 *   v_kampagne_sommer_summary                 → Jahres-KPIs
 *   v_kampagne_sommer_gastprofil              → 1 Zeile pro Aufenthalt
 *   v_kampagne_sommer_top_extra_behandlungen  → Top extra dazugebuchte Behandlungen
 *
 * Einbau: Route "sommer-kampagne" unter Gästeverwaltung (siehe App.tsx / Sidebar)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sun, Sparkles, RefreshCw, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';

// ─────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────

interface SummaryRow {
  jahr: number;
  aufenthalte: number;
  gaeste: number;
  avg_alter: number | null;
  avg_naechte: number | null;
  avg_vorlauf_tage: number | null;
  logis_gesamt: number | null;
  fb_gesamt: number | null;
  extras_gesamt: number | null;
  avg_extras_pro_aufenthalt: number | null;
  extra_behandlungen_gesamt: number | null;
  extra_behandlungen_umsatz: number | null;
}

interface ProfilRow {
  jahr: number;
  kundennr: number;
  herkunft: string | null;
  alter_jahre: number | null;
  buchungsquelle: string | null;
  buchungsvorlauf_tage: number | null;
  package: string | null;
  zimmerkategorie: string | null;
  anzerw: number | null;
  anzkin: number | null;
  naechte: number | null;
  logis: number | null;
  fb: number | null;
  extras: number | null;
  extra_behandlungen_anz: number;
  extra_behandlungen_umsatz: number;
}

interface TopBehandlungRow {
  jahr: number;
  behandlung_name: string | null;
  anzahl: number;
  umsatz: number | null;
}

// ─────────────────────────────────────────────────────────────
// Format-Helfer
// ─────────────────────────────────────────────────────────────

const fmtEur = (v: number | null | undefined) =>
  v == null ? '–' : v.toLocaleString('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const fmtNum = (v: number | null | undefined, d = 0) =>
  v == null ? '–' : v.toLocaleString('de-AT', { minimumFractionDigits: d, maximumFractionDigits: d });

const JAHR_FARBEN = ['#94a3b8', '#0ea5e9', '#059669']; // ältestes → aktuelles Jahr

// ─────────────────────────────────────────────────────────────
// Kleine Bausteine
// ─────────────────────────────────────────────────────────────

function KpiZeile({ label, werte, format }: {
  label: string;
  werte: (number | null | undefined)[];
  format: (v: number | null | undefined) => string;
}) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2 pr-4 text-sm text-muted-foreground">{label}</td>
      {werte.map((v, i) => (
        <td key={i} className="py-2 px-3 text-sm font-medium text-right tabular-nums">
          {format(v)}
        </td>
      ))}
    </tr>
  );
}

function RankingListe({ titel, daten, einheit }: {
  titel: string;
  daten: { name: string; wert: number; anteil: number }[];
  einheit?: string;
}) {
  const max = daten[0]?.wert || 1;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{titel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {daten.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">Keine Daten für dieses Jahr.</p>
        )}
        {daten.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <div className="w-40 truncate" title={d.name}>{d.name}</div>
            <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded"
                style={{ width: `${(d.wert / max) * 100}%` }}
              />
            </div>
            <div className="w-16 text-right tabular-nums font-medium">
              {fmtNum(d.wert)}{einheit || ''}
            </div>
            <div className="w-12 text-right tabular-nums text-muted-foreground text-xs">
              {d.anteil.toFixed(0)}%
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Hauptkomponente
// ─────────────────────────────────────────────────────────────

export default function SommerKampagneView() {
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [profile, setProfile] = useState<ProfilRow[]>([]);
  const [topBeh, setTopBeh] = useState<TopBehandlungRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const heute = new Date();
  const aktJahr = heute.getFullYear();
  const jahre = [aktJahr - 2, aktJahr - 1, aktJahr];
  const [rankingJahr, setRankingJahr] = useState<number>(aktJahr - 1);

  const ladeDaten = async () => {
    setRefreshing(true);
    setFehler(null);
    const [sRes, pRes, bRes] = await Promise.all([
      supabase.from('v_kampagne_sommer_summary').select('*').order('jahr'),
      supabase.from('v_kampagne_sommer_gastprofil').select(
        'jahr,kundennr,herkunft,alter_jahre,buchungsquelle,buchungsvorlauf_tage,' +
        'package,zimmerkategorie,anzerw,anzkin,naechte,logis,fb,extras,' +
        'extra_behandlungen_anz,extra_behandlungen_umsatz'
      ).limit(10000),
      supabase.from('v_kampagne_sommer_top_extra_behandlungen').select('*'),
    ]);
    const err = sRes.error || pRes.error || bRes.error;
    if (err) setFehler(err.message);
    setSummary((sRes.data || []) as SummaryRow[]);
    setProfile((pRes.data || []) as ProfilRow[]);
    setTopBeh((bRes.data || []) as TopBehandlungRow[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { ladeDaten(); }, []);

  const summaryByJahr = useMemo(() => {
    const m = new Map<number, SummaryRow>();
    summary.forEach(s => m.set(s.jahr, s));
    return m;
  }, [summary]);

  // Rankings pro Jahr aus dem Gastprofil (client-seitig aggregiert)
  const ranking = useMemo(() => {
    const rows = profile.filter(p => p.jahr === rankingJahr);
    const total = rows.length || 1;

    const gruppiere = (key: (p: ProfilRow) => string | null, topN = 10) => {
      const m = new Map<string, number>();
      rows.forEach(p => {
        const k = (key(p) || 'Unbekannt').trim() || 'Unbekannt';
        m.set(k, (m.get(k) || 0) + 1);
      });
      return [...m.entries()]
        .map(([name, wert]) => ({ name, wert, anteil: (wert / total) * 100 }))
        .sort((a, b) => b.wert - a.wert)
        .slice(0, topN);
    };

    return {
      herkunft: gruppiere(p => p.herkunft),
      quellen: gruppiere(p => p.buchungsquelle),
      packages: gruppiere(p => p.package),
      kategorien: gruppiere(p => p.zimmerkategorie, 8),
      aufenthalte: rows.length,
    };
  }, [profile, rankingJahr]);

  // Top-Behandlungen fürs gewählte Jahr
  const topBehJahr = useMemo(() =>
    topBeh
      .filter(b => b.jahr === rankingJahr)
      .sort((a, b) => (b.umsatz || 0) - (a.umsatz || 0))
      .slice(0, 12),
    [topBeh, rankingJahr]);

  // Chart-Daten: Extras & Extra-Behandlungsumsatz im Jahresvergleich
  const chartDaten = useMemo(() =>
    jahre.map(j => {
      const s = summaryByJahr.get(j);
      return {
        jahr: String(j),
        'Extras €': Math.round(s?.extras_gesamt || 0),
        'Extra-Behandlungen €': Math.round(s?.extra_behandlungen_umsatz || 0),
      };
    }),
    [summaryByJahr]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Lade Sommer-Kampagne …
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Kopf */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Sun className="w-6 h-6 text-amber-500" />
          <div>
            <h1 className="text-lg font-semibold">Sommer-Kampagne · Juni–August</h1>
            <p className="text-xs text-muted-foreground">
              Rollierend {jahre[0]}–{jahre[2]} · aktualisiert stündlich aus Protel & TAC
            </p>
          </div>
        </div>
        <button
          onClick={ladeDaten}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {fehler && (
          <div className="text-sm text-destructive border border-destructive/30 rounded-md p-3">
            Daten konnten nicht geladen werden: {fehler}
          </div>
        )}

        {/* Hinweis laufendes Jahr */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {aktJahr} zeigt nur bereits <strong>abgereiste</strong> Aufenthalte seit 01.06. —
            Gäste im Haus und künftige Anreisen rutschen mit jedem Sync nach.
            Vergleiche mit Vorjahren daher erst ab September vollständig.
          </span>
        </div>

        {/* Jahresvergleich als Tabelle */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jahresvergleich — die 7 Kampagnen-Fragen</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Kennzahl</th>
                  {jahre.map((j, i) => (
                    <th key={j} className="py-2 px-3 text-right text-xs font-semibold"
                        style={{ color: JAHR_FARBEN[i] }}>
                      {j}{j === aktJahr ? ' (bis heute)' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <KpiZeile label="Aufenthalte" format={v => fmtNum(v)}
                  werte={jahre.map(j => summaryByJahr.get(j)?.aufenthalte)} />
                <KpiZeile label="Gäste (unique)" format={v => fmtNum(v)}
                  werte={jahre.map(j => summaryByJahr.get(j)?.gaeste)} />
                <KpiZeile label="Ø Alter" format={v => fmtNum(v, 1)}
                  werte={jahre.map(j => summaryByJahr.get(j)?.avg_alter)} />
                <KpiZeile label="Ø Nächte" format={v => fmtNum(v, 1)}
                  werte={jahre.map(j => summaryByJahr.get(j)?.avg_naechte)} />
                <KpiZeile label="Ø Buchungsvorlauf (Tage)" format={v => fmtNum(v)}
                  werte={jahre.map(j => summaryByJahr.get(j)?.avg_vorlauf_tage)} />
                <KpiZeile label="Logis gesamt" format={fmtEur}
                  werte={jahre.map(j => summaryByJahr.get(j)?.logis_gesamt)} />
                <KpiZeile label="F&B gesamt" format={fmtEur}
                  werte={jahre.map(j => summaryByJahr.get(j)?.fb_gesamt)} />
                <KpiZeile label="Extras gesamt" format={fmtEur}
                  werte={jahre.map(j => summaryByJahr.get(j)?.extras_gesamt)} />
                <KpiZeile label="Ø Extras / Aufenthalt" format={fmtEur}
                  werte={jahre.map(j => summaryByJahr.get(j)?.avg_extras_pro_aufenthalt)} />
                <KpiZeile label="Extra-Behandlungen (außerhalb Paket)" format={v => fmtNum(v)}
                  werte={jahre.map(j => summaryByJahr.get(j)?.extra_behandlungen_gesamt)} />
                <KpiZeile label="Umsatz Extra-Behandlungen" format={fmtEur}
                  werte={jahre.map(j => summaryByJahr.get(j)?.extra_behandlungen_umsatz)} />
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Extras-Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Extras & extra dazugebuchte Behandlungen im Vergleich
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDaten} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="jahr" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                  <ReTooltip formatter={(v: number) => fmtEur(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Extras €" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Extra-Behandlungen €" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rankings mit Jahr-Umschalter */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Detail-Rankings
          </h2>
          <Tabs value={String(rankingJahr)} onValueChange={v => setRankingJahr(Number(v))}>
            <TabsList>
              {jahre.map(j => (
                <TabsTrigger key={j} value={String(j)}>{j}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankingListe titel={`Herkunft · ${ranking.aufenthalte} Aufenthalte`} daten={ranking.herkunft} />
          <RankingListe titel="Buchungsquelle" daten={ranking.quellen} />
          <RankingListe titel="Gebuchte Packages" daten={ranking.packages} />
          <RankingListe titel="Zimmerkategorie" daten={ranking.kategorien} />
        </div>

        {/* Top Extra-Behandlungen */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Top extra dazugebuchte Behandlungen · Sommer {rankingJahr}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBehJahr.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Keine Daten für dieses Jahr.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2">Behandlung</th>
                    <th className="text-right py-2 px-3">Anzahl</th>
                    <th className="text-right py-2">Umsatz</th>
                  </tr>
                </thead>
                <tbody>
                  {topBehJahr.map(b => (
                    <tr key={`${b.jahr}-${b.behandlung_name}`} className="border-b last:border-b-0">
                      <td className="py-1.5 text-sm">{b.behandlung_name || 'Unbenannt'}</td>
                      <td className="py-1.5 px-3 text-sm text-right tabular-nums">{fmtNum(b.anzahl)}</td>
                      <td className="py-1.5 text-sm text-right tabular-nums font-medium">{fmtEur(b.umsatz)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
