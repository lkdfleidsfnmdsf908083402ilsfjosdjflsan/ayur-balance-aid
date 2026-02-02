import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KontoDetail {
  kontonummer: string;
  bezeichnung: string;
  saldoAktuell: number;
  saldoVormonat: number | null;
  saldoVorjahr: number | null;
}

interface KlassenData {
  klasse: string;
  name: string;
  value: number;
  valueVormonat: number;
  valueVorjahr: number;
  color: string;
  konten: KontoDetail[];
}

interface AufwandKlassenChartProps {
  data: KlassenData[];
  title: string;
  totalLabel?: string;
}

const TrendIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous === null || previous === 0) return null;
  
  const diff = current - previous;
  const diffPercent = (diff / Math.abs(previous)) * 100;
  const isPositive = diff > 0;
  const isNegative = diff < 0;
  
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  
  return (
    <span className={cn(
      "flex items-center gap-0.5 text-xs font-medium",
      isPositive && "text-destructive",
      isNegative && "text-success",
      !isPositive && !isNegative && "text-muted-foreground"
    )}>
      <Icon className="h-3 w-3" />
      {formatPercent(diffPercent)}
    </span>
  );
};

// Variante für Erlöse (positive Trends sind gut)
const TrendIndicatorRevenue = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous === null || previous === 0) return null;
  
  const diff = current - previous;
  const diffPercent = (diff / Math.abs(previous)) * 100;
  const isPositive = diff > 0;
  const isNegative = diff < 0;
  
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  
  return (
    <span className={cn(
      "flex items-center gap-0.5 text-xs font-medium",
      isPositive && "text-success",
      isNegative && "text-destructive",
      !isPositive && !isNegative && "text-muted-foreground"
    )}>
      <Icon className="h-3 w-3" />
      {formatPercent(diffPercent)}
    </span>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as KlassenData;
    return (
      <div className="glass-card rounded-lg p-3 border border-border shadow-lg">
        <p className="font-medium text-foreground mb-2">
          Klasse {data.klasse}: {data.name}
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Aktuell:</span>
            <span className="font-mono font-semibold">{formatCurrency(data.value)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Vormonat:</span>
            <span className="font-mono">{formatCurrency(data.valueVormonat)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Vorjahr:</span>
            <span className="font-mono">{formatCurrency(data.valueVorjahr)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function AufwandKlassenChart({ data, title, totalLabel = "Gesamtaufwand" }: AufwandKlassenChartProps) {
  const [expandedKlasse, setExpandedKlasse] = useState<string | null>(null);
  
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const totalVormonat = data.reduce((sum, d) => sum + d.valueVormonat, 0);
  const totalVorjahr = data.reduce((sum, d) => sum + d.valueVorjahr, 0);
  
  // Determine if this is a revenue chart (for trend indicator styling)
  const isRevenueChart = totalLabel.toLowerCase().includes('erlös') || totalLabel.toLowerCase().includes('revenue');
  const TrendComponent = isRevenueChart ? TrendIndicatorRevenue : TrendIndicator;

  if (data.length === 0 || total === 0) {
    return (
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Keine Daten vorhanden
        </div>
      </Card>
    );
  }

  const toggleExpand = (klasse: string) => {
    setExpandedKlasse(expandedKlasse === klasse ? null : klasse);
  };

  return (
    <Card className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      
      {/* Summary Cards with Drill-down */}
      <div className="space-y-3 mb-6">
        {data.map((item) => (
          <div key={item.klasse}>
            <button
              onClick={() => toggleExpand(item.klasse)}
              className={cn(
                "w-full rounded-lg p-4 border border-border bg-card/50 hover:bg-card/80 transition-colors text-left",
                expandedKlasse === item.klasse && "bg-card/80 border-primary/30"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">Klasse {item.klasse}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {item.name}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Aktuell */}
                  <div className="text-right">
                    <p className="text-base font-mono font-semibold text-foreground">
                      {formatCurrency(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">Aktuell</p>
                  </div>
                  
                  {/* Vormonat */}
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center justify-end gap-1">
                      <p className="text-sm font-mono text-muted-foreground">
                        {formatCurrency(item.valueVormonat)}
                      </p>
                      <TrendComponent current={item.value} previous={item.valueVormonat} />
                    </div>
                    <p className="text-xs text-muted-foreground">Vormonat</p>
                  </div>
                  
                  {/* Vorjahr */}
                  <div className="text-right hidden md:block">
                    <div className="flex items-center justify-end gap-1">
                      <p className="text-sm font-mono text-muted-foreground">
                        {formatCurrency(item.valueVorjahr)}
                      </p>
                      <TrendComponent current={item.value} previous={item.valueVorjahr} />
                    </div>
                    <p className="text-xs text-muted-foreground">Vorjahr</p>
                  </div>
                  
                  {/* Expand Icon */}
                  <div className="text-muted-foreground">
                    {expandedKlasse === item.klasse ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </div>
            </button>
            
            {/* Drill-down: Einzelne Konten - MIT SCROLLBAR */}
            {expandedKlasse === item.klasse && item.konten.length > 0 && (
              <div className="mt-2 ml-4 border-l-2 border-border pl-4">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground py-2 border-b border-border">
                  <div className="col-span-2">Konto</div>
                  <div className="col-span-4">Bezeichnung</div>
                  <div className="col-span-2 text-right">Aktuell</div>
                  <div className="col-span-2 text-right hidden sm:block">Vormonat</div>
                  <div className="col-span-2 text-right hidden md:block">Vorjahr</div>
                </div>
                {/* Scrollbare Liste mit max-height */}
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {item.konten
                    .sort((a, b) => Math.abs(b.saldoAktuell) - Math.abs(a.saldoAktuell))
                    .map((konto) => (
                    <div 
                      key={konto.kontonummer} 
                      className="grid grid-cols-12 gap-2 text-sm py-2 hover:bg-muted/30 rounded px-1"
                    >
                      <div className="col-span-2 font-mono text-muted-foreground">
                        {konto.kontonummer}
                      </div>
                      <div className="col-span-4 truncate text-foreground" title={konto.bezeichnung}>
                        {konto.bezeichnung}
                      </div>
                      <div className="col-span-2 text-right font-mono font-medium text-foreground">
                        {formatCurrency(Math.abs(konto.saldoAktuell))}
                      </div>
                      <div className="col-span-2 text-right font-mono text-muted-foreground hidden sm:block">
                        {konto.saldoVormonat !== null ? formatCurrency(Math.abs(konto.saldoVormonat)) : '–'}
                      </div>
                      <div className="col-span-2 text-right font-mono text-muted-foreground hidden md:block">
                        {konto.saldoVorjahr !== null ? formatCurrency(Math.abs(konto.saldoVorjahr)) : '–'}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Anzahl der Konten anzeigen */}
                <div className="text-xs text-muted-foreground pt-2 border-t border-border mt-2">
                  {item.konten.length} Konten
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Bar Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis 
              type="number" 
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              type="category" 
              dataKey="klasse"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={50}
              tickFormatter={(v) => `Kl. ${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
            <Bar 
              dataKey="value" 
              radius={[0, 4, 4, 0]}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={entry.klasse} 
                  fill={entry.color}
                  className="transition-all duration-200 hover:opacity-80 hover:drop-shadow-lg cursor-pointer"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Total with comparisons */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm font-medium text-muted-foreground">{totalLabel}</span>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-lg font-mono font-semibold text-foreground">
                {formatCurrency(total)}
              </p>
              <p className="text-xs text-muted-foreground">Aktuell</p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1">
                <p className="text-sm font-mono text-muted-foreground">
                  {formatCurrency(totalVormonat)}
                </p>
                <TrendComponent current={total} previous={totalVormonat} />
              </div>
              <p className="text-xs text-muted-foreground">Vormonat</p>
            </div>
            <div className="text-right hidden md:block">
              <div className="flex items-center justify-end gap-1">
                <p className="text-sm font-mono text-muted-foreground">
                  {formatCurrency(totalVorjahr)}
                </p>
                <TrendComponent current={total} previous={totalVorjahr} />
              </div>
              <p className="text-xs text-muted-foreground">Vorjahr</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
