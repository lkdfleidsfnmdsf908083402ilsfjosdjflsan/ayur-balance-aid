import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RefreshCw, Users, Gift, TrendingUp, Calendar, Star } from 'lucide-react';

interface KampagneGast {
  kdnr: number;
  nachname: string;
  vorname: string;
  email: string;
  land: string | null;
  letzterauf: string | null;
  anzahl_aufenthalte: number;
  gebdat?: string | null;
  geburtstag_tag?: number;
  geburtstag_monat?: number;
  logis_gesamt?: number;
  spa_umsatz?: number;
  spa_anteil_pct?: number;
  stammmonat?: number;
  tage_seit_letztem_aufenthalt?: number;
  marketing?: string;
  mailing?: string;
}

const KAMPAGNEN = [
  { id: 'rueckkehrer', label: 'Rückkehrer', view: 'v_kampagne_rueckkehrer', icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Gäste die letztes Jahr da waren, heuer noch nicht gebucht haben' },
  { id: 'geburtstag', label: 'Geburtstag', view: 'v_kampagne_geburtstag', icon: Gift, color: 'text-pink-500', bg: 'bg-pink-500/10', desc: 'Geburtstag in den nächsten 30 Tagen' },
  { id: 'saisonal', label: 'Saisonal', view: 'v_kampagne_saisonal', icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Stammgäste die typischerweise jetzt buchen' },
  { id: 'stammgaeste', label: 'Stammgäste reaktivieren', view: 'v_kampagne_stammgaeste', icon: Star, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Mehr als 3 Aufenthalte, über 1 Jahr nicht da' },
  { id: 'upgrade', label: 'Upgrade-Kandidaten', view: 'v_kampagne_upgrade', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Hoher Spa-Anteil am Gesamtumsatz' },
];

export function KampagnenView() {
  const [activeKampagne, setActiveKampagne] = useState(KAMPAGNEN[0]);
  const [gaeste, setGaeste] = useState<KampagneGast[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadCounts();
  }, []);

  useEffect(() => {
    loadGaeste();
  }, [activeKampagne]);

  const loadCounts = async () => {
    const results: Record<string, number> = {};
    for (const k of KAMPAGNEN) {
      const { count } = await supabase.from(k.view).select('*', { count: 'exact', head: true });
      results[k.id] = count || 0;
    }
    setCounts(results);
  };

  const loadGaeste = async () => {
    setLoading(true);
    const { data } = await supabase.from(activeKampagne.view).select('*').limit(200);
    setGaeste((data as KampagneGast[]) || []);
    setLoading(false);
  };

  const exportCSV = () => {
    if (!gaeste.length) return;
    const headers = Object.keys(gaeste[0]).join(';');
    const rows = gaeste.map(g => Object.values(g).map(v => `"${v ?? ''}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kampagne_${activeKampagne.id}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Kampagnen-Manager</h1>
            <p className="text-xs text-muted-foreground">Gästesegmente aus Protel & TAC — Modul C</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          disabled={!gaeste.length}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          CSV Export
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* Kampagnen-Auswahl */}
        <div className="grid grid-cols-5 gap-3">
          {KAMPAGNEN.map(k => {
            const Icon = k.icon;
            const isActive = activeKampagne.id === k.id;
            return (
              <button
                key={k.id}
                onClick={() => setActiveKampagne(k)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:bg-muted/30'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className="text-xs font-medium text-foreground">{k.label}</p>
                <p className="text-lg font-semibold font-mono mt-0.5">{counts[k.id] ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{k.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Gäste-Tabelle */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {activeKampagne.label} — {gaeste.length} Gäste
              {counts[activeKampagne.id] > 200 && <span className="text-muted-foreground font-normal"> (erste 200 von {counts[activeKampagne.id]})</span>}
            </CardTitle>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent className="p-0">
            {gaeste.length === 0 && !loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Keine Gäste in diesem Segment</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">Name</th>
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">E-Mail</th>
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">Land</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Aufenthalte</th>
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">Letzter Aufenthalt</th>
                    <th className="text-left text-muted-foreground font-medium px-4 py-3">Gasttyp</th>
                      {activeKampagne.id === 'geburtstag' && <th className="text-left text-muted-foreground font-medium px-4 py-3">Geburtstag</th>}
                      {activeKampagne.id === 'upgrade' && <th className="text-right text-muted-foreground font-medium px-4 py-3">Spa-Anteil</th>}
                      {activeKampagne.id === 'stammgaeste' && <th className="text-right text-muted-foreground font-medium px-4 py-3">Tage inaktiv</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {gaeste.map((g, i) => (
                      <tr key={`${g.kdnr}-${i}`} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground">{g.nachname}, {g.vorname}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{g.email}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{g.land || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">{g.anzahl_aufenthalte}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {g.letzterauf ? new Date(g.letzterauf).toLocaleDateString('de-DE') : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          {(g as any).gasttyp && (g as any).gasttyp !== 'Sonstig' && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              (g as any).gasttyp === 'Ayurveda Kurgast' ? 'bg-emerald-500/10 text-emerald-500' :
                              (g as any).gasttyp === 'Wellness Gast' ? 'bg-blue-500/10 text-blue-500' :
                              (g as any).gasttyp === 'Vollpension' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>{(g as any).gasttyp}</span>
                          )}
                        </td>
                        {activeKampagne.id === 'geburtstag' && (
                          <td className="px-4 py-2.5 text-pink-500 font-medium">
                            {g.geburtstag_tag}.{g.geburtstag_monat}.
                          </td>
                        )}
                        {activeKampagne.id === 'upgrade' && (
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-500">{g.spa_anteil_pct}%</td>
                        )}
                        {activeKampagne.id === 'stammgaeste' && (
                          <td className="px-4 py-2.5 text-right font-mono text-amber-500">{g.tage_seit_letztem_aufenthalt}d</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
