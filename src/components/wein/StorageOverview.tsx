/**
 * StorageOverview
 *
 * Bestandsübersicht pro Lagerort. Tab-Navigation zwischen Kühlhaus 1/2, Küche,
 * Bar und Restaurant. In den Kühlhäusern und der Küche wird jedes Fach als Kachel
 * mit Belegungs-Heatmap dargestellt. Klick auf eine Kachel öffnet die Detailliste.
 *
 * Datenbasis: liest direkt aus dem bereits geladenen `wines`-Array (kein eigener
 * Supabase-Call), gruppiert über (lagerort, kuehlhaus_nr, reihe, fach).
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Snowflake,
  CookingPot,
  GlassWater,
  UtensilsCrossed,
  Wine,
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  MapPin,
  User,
} from 'lucide-react';

export interface WineEntry {
  id?: string;
  name: string;
  weingut: string | null;
  jahrgang: string | null;
  rebsorte?: string | null;
  region?: string | null;
  lagerort: string;
  kuehlhaus_nr: number | null;
  reihe: number | null;
  fach: number | null;
  anzahl_flaschen: number | null;
  einkaufspreis: number | null;
  barcode?: string | null;
}

const KUEHLHAUS_REIHEN: Record<number, number> = {
  1: 9, 2: 9, 3: 9, 4: 9, 5: 5, 6: 6, 7: 5, 8: 5, 9: 5,
};
const KUEHLHAUS_MAX_FACH = Math.max(...Object.values(KUEHLHAUS_REIHEN));

const KUECHE_REIHEN: Record<number, number> = {
  1: 2, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3,
};
const KUECHE_MAX_SCHUBL = Math.max(...Object.values(KUECHE_REIHEN));

// Menschenlesbarer Lagerort für einen beliebigen Wein — auch in der Suche genutzt,
// damit "wo liegt Wein X" sofort beantwortet ist.
export function locationLabel(w: WineEntry): string {
  switch (w.lagerort) {
    case 'kuehlhaus':
      return `Kühlhaus ${w.kuehlhaus_nr ?? '?'} · Reihe ${w.reihe ?? '?'} · Fach ${w.fach ?? '?'}`;
    case 'kueche':
      return `Küche · Reihe ${w.reihe ?? '?'} · Schublade ${w.fach ?? '?'}`;
    case 'ad':
      return `AD · Reihe ${w.reihe ?? '?'} · Fach ${w.fach ?? '?'}`;
    case 'bar':
      return 'Bar';
    case 'restaurant':
      return 'Restaurant';
    default:
      return w.lagerort;
  }
}

type View = 'kh1' | 'kh2' | 'kh3' | 'kueche' | 'bar' | 'restaurant' | 'ad';

type SelectedCell =
  | { kind: 'kuehlhaus'; nr: number; reihe: number; fach: number }
  | { kind: 'kueche'; reihe: number; fach: number }
  | { kind: 'ad'; reihe: number; fach: number }
  | { kind: 'bar' }
  | { kind: 'restaurant' }
  | null;

interface Props {
  wines: WineEntry[];
  // Bestand ändern: delta -1 = eine Flasche entnehmen, +1 = eine dazu.
  // Wird nach außen (WeinScannerView) durchgereicht, wo der Supabase-Zugriff sitzt.
  onAdjustBottles?: (wine: WineEntry, delta: number) => void;
}

// −/+ Steuerung zum Entnehmen/Nachlegen einer Flasche.
function BottleControls({
  wine,
  onAdjust,
}: {
  wine: WineEntry;
  onAdjust: (wine: WineEntry, delta: number) => void;
}) {
  const count = wine.anzahl_flaschen ?? 1;
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        title={count <= 1 ? 'Letzte Flasche entnehmen (Eintrag wird gelöscht)' : 'Eine Flasche entnehmen'}
        onClick={(e) => {
          e.stopPropagation();
          onAdjust(wine, -1);
        }}
      >
        {count <= 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      </Button>
      <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
        {count} Fl.
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        title="Eine Flasche hinzufügen"
        onClick={(e) => {
          e.stopPropagation();
          onAdjust(wine, 1);
        }}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function StorageOverview({ wines, onAdjustBottles }: Props) {
  const [view, setView] = useState<View>('kh1');
  const [selected, setSelected] = useState<SelectedCell>(null);
  const [search, setSearch] = useState('');

  // ─── Suche: über alle Weine, Treffer zeigen sofort ihren Lagerort ───
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return wines.filter((w) => {
      const hay = [w.name, w.weingut, w.jahrgang, w.rebsorte, w.region]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [wines, search]);

  // Index: "lagerort|kh|reihe|fach" -> Einträge
  const index = useMemo(() => {
    const map = new Map<string, WineEntry[]>();
    for (const w of wines) {
      const key = `${w.lagerort}|${w.kuehlhaus_nr ?? '_'}|${w.reihe ?? '_'}|${w.fach ?? '_'}`;
      const arr = map.get(key);
      if (arr) arr.push(w);
      else map.set(key, [w]);
    }
    return map;
  }, [wines]);

  const at = (
    lagerort: string,
    kh: number | null,
    reihe: number | null,
    fach: number | null
  ): WineEntry[] => {
    return index.get(`${lagerort}|${kh ?? '_'}|${reihe ?? '_'}|${fach ?? '_'}`) || [];
  };

  const totalBottles = (entries: WineEntry[]) =>
    entries.reduce((sum, w) => sum + (w.anzahl_flaschen || 1), 0);

  const cellClass = (count: number) => {
    if (count === 0) return 'bg-muted/30 text-muted-foreground border-border';
    if (count <= 3) return 'bg-primary/15 text-foreground border-primary/30';
    if (count <= 9) return 'bg-primary/40 text-foreground border-primary/60';
    return 'bg-primary/70 text-primary-foreground border-primary';
  };

  // ─── Detail-Daten zur Auswahl ───
  const selectionLabel = (() => {
    if (!selected) return '';
    if (selected.kind === 'kuehlhaus')
      return `Kühlhaus ${selected.nr} · Reihe ${selected.reihe} · Fach ${selected.fach}`;
    if (selected.kind === 'kueche')
      return `Küche · Reihe ${selected.reihe} · Schublade ${selected.fach}`;
    if (selected.kind === 'ad')
      return `AD · Reihe ${selected.reihe} · Fach ${selected.fach}`;
    if (selected.kind === 'bar') return 'Bar';
    return 'Restaurant';
  })();

  const selectionEntries = (() => {
    if (!selected) return [];
    if (selected.kind === 'kuehlhaus')
      return at('kuehlhaus', selected.nr, selected.reihe, selected.fach);
    if (selected.kind === 'kueche')
      return at('kueche', null, selected.reihe, selected.fach);
    if (selected.kind === 'ad')
      return at('ad', null, selected.reihe, selected.fach);
    return wines.filter((w) => w.lagerort === selected.kind);
  })();

  // ─── Renderer pro View ───
  const renderKuehlhaus = (nr: number) => {
    let grandTotal = 0;
    return (
      <div className="space-y-3">
        {Object.entries(KUEHLHAUS_REIHEN).map(([reiheStr, faecher]) => {
          const reihe = Number(reiheStr);
          let reiheTotal = 0;
          const cells = Array.from({ length: faecher }, (_, i) => {
            const fach = i + 1;
            const entries = at('kuehlhaus', nr, reihe, fach);
            const count = totalBottles(entries);
            reiheTotal += count;
            return { fach, count };
          });
          grandTotal += reiheTotal;
          return (
            <div key={reihe}>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Reihe {reihe}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {reiheTotal > 0 ? `${reiheTotal} Fl.` : 'leer'}
                </span>
              </div>
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${KUEHLHAUS_MAX_FACH}, minmax(0, 1fr))` }}
              >
                {cells.map(({ fach, count }) => (
                  <button
                    key={fach}
                    className={`h-12 rounded text-xs font-bold border transition-colors hover:opacity-80 ${cellClass(count)}`}
                    onClick={() => setSelected({ kind: 'kuehlhaus', nr, reihe, fach })}
                    title={`KH${nr} R${reihe} F${fach}: ${count} Flaschen`}
                  >
                    <div>{fach}</div>
                    {count > 0 && <div className="text-[10px] opacity-80">{count}🍾</div>}
                  </button>
                ))}
                {Array.from({ length: KUEHLHAUS_MAX_FACH - faecher }, (_, i) => (
                  <div key={`spacer-${reihe}-${i}`} className="h-12" />
                ))}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Kühlhaus {nr}: <span className="font-semibold text-foreground">{grandTotal}</span>{' '}
          Flaschen gesamt
        </p>
      </div>
    );
  };

  const renderKueche = () => {
    let grandTotal = 0;
    return (
      <div className="space-y-3">
        {Object.entries(KUECHE_REIHEN).map(([reiheStr, schubladen]) => {
          const reihe = Number(reiheStr);
          let reiheTotal = 0;
          const cells = Array.from({ length: schubladen }, (_, i) => {
            const schubl = i + 1;
            const entries = at('kueche', null, reihe, schubl);
            const count = totalBottles(entries);
            reiheTotal += count;
            return { schubl, count };
          });
          grandTotal += reiheTotal;
          return (
            <div key={reihe}>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Reihe {reihe} · {schubladen} Schubl.
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {reiheTotal > 0 ? `${reiheTotal} Fl.` : 'leer'}
                </span>
              </div>
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${KUECHE_MAX_SCHUBL}, minmax(0, 1fr))` }}
              >
                {cells.map(({ schubl, count }) => (
                  <button
                    key={schubl}
                    className={`h-14 rounded text-xs font-bold border transition-colors hover:opacity-80 ${cellClass(count)}`}
                    onClick={() => setSelected({ kind: 'kueche', reihe, fach: schubl })}
                    title={`Küche R${reihe} S${schubl}: ${count} Flaschen`}
                  >
                    <div>S{schubl}</div>
                    {count > 0 && <div className="text-[10px] opacity-80">{count}🍾</div>}
                  </button>
                ))}
                {Array.from({ length: KUECHE_MAX_SCHUBL - schubladen }, (_, i) => (
                  <div key={`spacer-${reihe}-${i}`} className="h-14" />
                ))}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Küche: <span className="font-semibold text-foreground">{grandTotal}</span> Flaschen gesamt
        </p>
      </div>
    );
  };

  // AD (Privatlager) — Regal wie ein Kühlhaus, aber lagerort='ad' ohne Nummer.
  const renderAd = () => {
    let grandTotal = 0;
    return (
      <div className="space-y-3">
        {Object.entries(KUEHLHAUS_REIHEN).map(([reiheStr, faecher]) => {
          const reihe = Number(reiheStr);
          let reiheTotal = 0;
          const cells = Array.from({ length: faecher }, (_, i) => {
            const fach = i + 1;
            const entries = at('ad', null, reihe, fach);
            const count = totalBottles(entries);
            reiheTotal += count;
            return { fach, count };
          });
          grandTotal += reiheTotal;
          return (
            <div key={reihe}>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Reihe {reihe}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {reiheTotal > 0 ? `${reiheTotal} Fl.` : 'leer'}
                </span>
              </div>
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${KUEHLHAUS_MAX_FACH}, minmax(0, 1fr))` }}
              >
                {cells.map(({ fach, count }) => (
                  <button
                    key={fach}
                    className={`h-12 rounded text-xs font-bold border transition-colors hover:opacity-80 ${cellClass(count)}`}
                    onClick={() => setSelected({ kind: 'ad', reihe, fach })}
                    title={`AD R${reihe} F${fach}: ${count} Flaschen`}
                  >
                    <div>{fach}</div>
                    {count > 0 && <div className="text-[10px] opacity-80">{count}🍾</div>}
                  </button>
                ))}
                {Array.from({ length: KUEHLHAUS_MAX_FACH - faecher }, (_, i) => (
                  <div key={`spacer-${reihe}-${i}`} className="h-12" />
                ))}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          AD: <span className="font-semibold text-foreground">{grandTotal}</span> Flaschen gesamt
        </p>
      </div>
    );
  };

  const renderFlat = (lagerort: 'bar' | 'restaurant', icon: typeof GlassWater, label: string) => {
    const entries = wines.filter((w) => w.lagerort === lagerort);
    const total = totalBottles(entries);
    const Icon = icon;
    return (
      <button
        className="w-full p-6 border-2 rounded-lg flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary transition-colors"
        onClick={() => setSelected({ kind: lagerort })}
      >
        <Icon className="h-10 w-10 text-primary" />
        <span className="text-lg font-bold">{label}</span>
        <span className="text-sm text-muted-foreground">
          {total} Flaschen · {entries.length} Einträge
        </span>
      </button>
    );
  };

  const tabs: { key: View; icon: typeof Snowflake; label: string }[] = [
    { key: 'kh1', icon: Snowflake, label: 'KH 1' },
    { key: 'kh2', icon: Snowflake, label: 'KH 2' },
    { key: 'kh3', icon: Snowflake, label: 'KH 3' },
    { key: 'kueche', icon: CookingPot, label: 'Küche' },
    { key: 'bar', icon: GlassWater, label: 'Bar' },
    { key: 'restaurant', icon: UtensilsCrossed, label: 'Rest.' },
    { key: 'ad', icon: User, label: 'AD' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wine className="h-4 w-4" /> Bestandsübersicht
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Suche: "wo liegt der Wein?" */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Wein suchen — Name, Weingut, Jahrgang …"
            className="w-full rounded-md border border-input bg-background pl-8 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch('')}
              title="Suche zurücksetzen"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Suchergebnisse — zeigen sofort den Lagerort */}
        {search.trim().length >= 2 && (
          <div className="border rounded-lg divide-y divide-border">
            {searchResults.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Kein Wein gefunden für „{search.trim()}"
              </p>
            ) : (
              searchResults.map((w, i) => (
                <div key={w.id || i} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{w.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[w.weingut, w.jahrgang].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {locationLabel(w)}
                    </p>
                  </div>
                  {onAdjustBottles ? (
                    <BottleControls wine={w} onAdjust={onAdjustBottles} />
                  ) : (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {w.anzahl_flaschen ?? 1} Fl.
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Browse-Ansicht nur zeigen, wenn nicht gesucht wird */}
        {search.trim().length < 2 && (
        <>
        {/* Tab-Bar */}
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <Button
                key={t.key}
                variant={view === t.key ? 'default' : 'outline'}
                size="sm"
                className="h-12 flex flex-col gap-0.5 px-1"
                onClick={() => {
                  setView(t.key);
                  setSelected(null);
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px]">{t.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Hauptview */}
        <div className="border rounded-lg p-3">
          {view === 'kh1' && renderKuehlhaus(1)}
          {view === 'kh2' && renderKuehlhaus(2)}
          {view === 'kh3' && renderKuehlhaus(3)}
          {view === 'kueche' && renderKueche()}
          {view === 'ad' && renderAd()}
          {view === 'bar' && renderFlat('bar', GlassWater, 'Bar')}
          {view === 'restaurant' && renderFlat('restaurant', UtensilsCrossed, 'Restaurant')}
        </div>

        {/* Legende */}
        {(view === 'kh1' || view === 'kh2' || view === 'kh3' || view === 'kueche' || view === 'ad') && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center flex-wrap">
            <span>Belegung:</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded border bg-muted/30" /> leer
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-primary/30 bg-primary/15" /> 1–3
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-primary/60 bg-primary/40" /> 4–9
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-primary bg-primary/70" /> 10+
            </span>
          </div>
        )}
        </>
        )}

        {/* Detail-Modal (inline) */}
        {selected && (
          <Card className="border-primary">
            <CardHeader className="p-3 flex flex-row items-start justify-between space-y-0">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm">{selectionLabel}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalBottles(selectionEntries)} Flaschen · {selectionEntries.length} Einträge
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => setSelected(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {selectionEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Leer</p>
              ) : (
                <div className="divide-y divide-border">
                  {selectionEntries.map((w, i) => (
                    <div key={w.id || i} className="py-2 flex justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{w.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[w.weingut, w.jahrgang].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {onAdjustBottles ? (
                          <BottleControls wine={w} onAdjust={onAdjustBottles} />
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {w.anzahl_flaschen || 1} Fl.
                          </Badge>
                        )}
                        {w.einkaufspreis != null && (
                          <p className="text-[10px] text-green-600">€{w.einkaufspreis}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
