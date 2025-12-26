import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { formatCurrency } from '@/lib/calculations';

interface KlassenData {
  klasse: string;
  name: string;
  value: number;
  color: string;
}

interface AufwandKlassenChartProps {
  data: KlassenData[];
  title: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-card rounded-lg p-3 border border-border shadow-lg">
        <p className="font-medium text-foreground mb-1">
          Klasse {data.klasse}: {data.name}
        </p>
        <p className="text-lg font-mono font-semibold text-foreground">
          {formatCurrency(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

export function AufwandKlassenChart({ data, title }: AufwandKlassenChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

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

  return (
    <Card className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {data.map((item) => (
          <div 
            key={item.klasse}
            className="rounded-lg p-3 border border-border bg-card/50"
          >
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">Klasse {item.klasse}</span>
            </div>
            <p className="text-sm font-medium text-foreground truncate" title={item.name}>
              {item.name}
            </p>
            <p className="text-base font-mono font-semibold text-foreground">
              {formatCurrency(item.value)}
            </p>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
            </p>
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
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.klasse} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Total */}
      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">Gesamtaufwand</span>
        <span className="text-lg font-mono font-semibold text-foreground">
          {formatCurrency(total)}
        </span>
      </div>
    </Card>
  );
}
