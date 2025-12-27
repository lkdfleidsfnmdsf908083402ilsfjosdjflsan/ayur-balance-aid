import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BereichAggregation, Bereich } from '@/types/finance';
import { bereichColors } from '@/lib/bereichMapping';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { translateBereich } from '@/lib/translationMappings';

interface BereichChartProps {
  data: BereichAggregation[];
  title: string;
  type: 'erlös' | 'einkauf';
  translateFn?: (key: string) => string;
}

interface ChartDataItem {
  name: string;
  bereich: Bereich;
  value: number;
  color: string;
  vormonatDiff: number | null;
  vormonatDiffProzent: number | null;
}

const CustomTooltip = ({ active, payload, type }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload as ChartDataItem;
  const hasDiff = data.vormonatDiff !== null;
  const isPositive = (data.vormonatDiff ?? 0) > 0;
  const isNegative = (data.vormonatDiff ?? 0) < 0;
  
  return (
    <div 
      className="rounded-lg p-3 shadow-lg border"
      style={{
        backgroundColor: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border))',
      }}
    >
      <div className="font-semibold text-sm mb-2" style={{ color: 'hsl(var(--foreground))' }}>
        {data.name}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-sm">
          <span style={{ color: 'hsl(var(--muted-foreground))' }}>
            {type === 'erlös' ? 'Erlös:' : 'Aufwand:'}
          </span>
          <span className="font-mono font-medium" style={{ color: 'hsl(var(--foreground))' }}>
            {formatCurrency(data.value)}
          </span>
        </div>
        {hasDiff && (
          <div className="flex justify-between gap-4 text-sm">
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>vs. Vormonat:</span>
            <span 
              className="font-mono font-medium"
              style={{ 
                color: isPositive 
                  ? 'hsl(var(--success))' 
                  : isNegative 
                    ? 'hsl(var(--destructive))' 
                    : 'hsl(var(--muted-foreground))'
              }}
            >
              {isPositive ? '+' : ''}{formatPercent(data.vormonatDiffProzent)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export function BereichChart({ data, title, type, translateFn }: BereichChartProps) {
  const chartData: ChartDataItem[] = data
    .filter(d => d.saldoAktuell !== 0)
    .map(d => ({
      name: translateFn ? translateBereich(d.bereich, translateFn) : d.bereich,
      bereich: d.bereich,
      value: Math.abs(d.saldoAktuell),
      color: bereichColors[d.bereich],
      vormonatDiff: d.saldoVormonatDiff,
      vormonatDiffProzent: d.saldoVormonatDiffProzent,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="glass-card rounded-xl p-5 border border-border animate-slide-up">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Keine Daten für diesen Zeitraum
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ top: 0, right: 20, bottom: 0, left: 100 }}
            >
              <XAxis 
                type="number" 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                axisLine={false}
                tickLine={false}
                width={95}
              />
              <Tooltip 
                content={<CustomTooltip type={type} />}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}