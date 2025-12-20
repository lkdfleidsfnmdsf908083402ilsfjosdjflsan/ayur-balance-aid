import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BereichAggregation } from '@/types/finance';
import { bereichColors } from '@/lib/bereichMapping';
import { formatCurrency } from '@/lib/calculations';

interface BereichChartProps {
  data: BereichAggregation[];
  title: string;
  type: 'erlös' | 'einkauf';
}

export function BereichChart({ data, title, type }: BereichChartProps) {
  const chartData = data
    .filter(d => d.saldoAktuell !== 0)
    .map(d => ({
      name: d.bereich,
      value: Math.abs(d.saldoAktuell),
      color: bereichColors[d.bereich],
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
                formatter={(value: number) => [formatCurrency(value), type === 'erlös' ? 'Erlös' : 'Aufwand']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
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
