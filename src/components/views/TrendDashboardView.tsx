import { useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PeriodSelector } from '@/components/PeriodSelector';
import { calculateAbteilungKpis, calculateGesamtKpis } from '@/lib/kpiCalculations';
import { formatCurrency } from '@/lib/calculations';
import { exportTrendToPdf } from '@/lib/pdfExport';
import { operativeAbteilungen, bereichColors } from '@/lib/bereichMapping';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Package,
  Users,
  Zap,
  BarChart3,
  Info,
  FileDown,
} from 'lucide-react';
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

const months = ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function TrendDashboardView() {
  const { konten, salden, selectedYear, uploadedFiles } = useFinanceStore();

  // Berechne KPIs für alle verfügbaren Monate des aktuellen und Vorjahres
  const trendData = useMemo(() => {
    if (konten.length === 0 || salden.length === 0) return [];

    // Finde verfügbare Monate
    const availableMonths = [...new Set(salden.filter(s => s.jahr === selectedYear).map(s => s.monat))].sort((a, b) => a - b);
    
    return availableMonths.map(month => {
      const kpis = calculateAbteilungKpis(konten, salden, selectedYear, month);
      const gesamt = calculateGesamtKpis(kpis);
      
      const vorjahrKpis = calculateAbteilungKpis(konten, salden, selectedYear - 1, month);
      const vorjahrGesamt = calculateGesamtKpis(vorjahrKpis);
      
      return {
        monat: months[month],
        monatNum: month,
        umsatz: gesamt.gesamtUmsatz,
        umsatzVorjahr: vorjahrGesamt.gesamtUmsatz,
        db1: gesamt.gesamtDB1,
        db1Vorjahr: vorjahrGesamt.gesamtDB1,
        db2: gesamt.gesamtDB2,
        db2Vorjahr: vorjahrGesamt.gesamtDB2,
        personal: gesamt.gesamtPersonal,
        personalVorjahr: vorjahrGesamt.gesamtPersonal,
        energie: gesamt.gesamtEnergie,
        energieVorjahr: vorjahrGesamt.gesamtEnergie,
        wareneinsatz: gesamt.gesamtWareneinsatz,
        wareneinsatzVorjahr: vorjahrGesamt.gesamtWareneinsatz,
        db1Marge: gesamt.gesamtUmsatz > 0 ? (gesamt.gesamtDB1 / gesamt.gesamtUmsatz) * 100 : 0,
        db2Marge: gesamt.gesamtUmsatz > 0 ? (gesamt.gesamtDB2 / gesamt.gesamtUmsatz) * 100 : 0,
      };
    });
  }, [konten, salden, selectedYear]);

  // Berechne Abteilungs-Trends
  const abteilungTrends = useMemo(() => {
    if (konten.length === 0 || salden.length === 0) return [];

    const availableMonths = [...new Set(salden.filter(s => s.jahr === selectedYear).map(s => s.monat))].sort((a, b) => a - b);
    
    return availableMonths.map(month => {
      const kpis = calculateAbteilungKpis(konten, salden, selectedYear, month);
      const operativeKpis = kpis.filter(k => operativeAbteilungen.includes(k.abteilung));
      
      const result: Record<string, any> = {
        monat: months[month],
        monatNum: month,
      };
      
      operativeKpis.forEach(kpi => {
        result[`${kpi.abteilung}_umsatz`] = kpi.umsatz;
        result[`${kpi.abteilung}_db2`] = kpi.db2;
      });
      
      return result;
    });
  }, [konten, salden, selectedYear]);

  // Berechne YTD-Summenwerte
  const ytdSummary = useMemo(() => {
    return trendData.reduce((acc, month) => ({
      umsatz: acc.umsatz + month.umsatz,
      umsatzVorjahr: acc.umsatzVorjahr + month.umsatzVorjahr,
      db1: acc.db1 + month.db1,
      db1Vorjahr: acc.db1Vorjahr + month.db1Vorjahr,
      db2: acc.db2 + month.db2,
      db2Vorjahr: acc.db2Vorjahr + month.db2Vorjahr,
      personal: acc.personal + month.personal,
      energie: acc.energie + month.energie,
    }), {
      umsatz: 0,
      umsatzVorjahr: 0,
      db1: 0,
      db1Vorjahr: 0,
      db2: 0,
      db2Vorjahr: 0,
      personal: 0,
      energie: 0,
    });
  }, [trendData]);

  if (uploadedFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="KPI-Trends" description="Trendanalyse über mehrere Monate" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Keine Daten vorhanden
            </h3>
            <p className="text-muted-foreground">
              Laden Sie Ihre Saldenlisten hoch, um KPI-Trends zu analysieren.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const umsatzDiff = ytdSummary.umsatzVorjahr > 0 
    ? ((ytdSummary.umsatz - ytdSummary.umsatzVorjahr) / ytdSummary.umsatzVorjahr) * 100 
    : 0;
  
  const db2Diff = ytdSummary.db2Vorjahr !== 0 
    ? ((ytdSummary.db2 - ytdSummary.db2Vorjahr) / Math.abs(ytdSummary.db2Vorjahr)) * 100 
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="KPI-Trends" 
        description={`Trendanalyse ${selectedYear}`}
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header mit Periodenauswahl */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <BarChart3 className="h-3 w-3" />
              {trendData.length} Monate
            </Badge>
            <Badge variant="secondary">
              YTD {selectedYear}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportTrendToPdf(trendData, ytdSummary, selectedYear)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              disabled={trendData.length === 0}
            >
              <FileDown className="h-4 w-4" />
              PDF Export
            </button>
            <PeriodSelector />
          </div>
        </div>

        {/* YTD-Zusammenfassung */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <YtdCard 
            title="Umsatz YTD"
            value={ytdSummary.umsatz}
            vorjahr={ytdSummary.umsatzVorjahr}
            icon={Euro}
          />
          <YtdCard 
            title="DB I YTD"
            value={ytdSummary.db1}
            vorjahr={ytdSummary.db1Vorjahr}
            icon={TrendingUp}
            variant={ytdSummary.db1 > 0 ? 'success' : 'warning'}
            tooltip="DB I (Deckungsbeitrag I) = Umsatz − Wareneinsatz. Zeigt den Rohertrag nach Abzug der direkten Warenkosten."
          />
          <YtdCard 
            title="DB II YTD"
            value={ytdSummary.db2}
            vorjahr={ytdSummary.db2Vorjahr}
            icon={TrendingUp}
            variant={ytdSummary.db2 > 0 ? 'success' : 'warning'}
            tooltip="DB II (Deckungsbeitrag II) = DB I − Personalkosten. Zeigt den Ertrag nach Abzug der Personalkosten."
          />
          <YtdCard 
            title="Personal YTD"
            value={ytdSummary.personal}
            icon={Users}
          />
        </div>

        {/* Umsatz-Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              Umsatzentwicklung
              <Badge variant="outline" className="ml-auto">
                {umsatzDiff >= 0 ? '+' : ''}{umsatzDiff.toFixed(1)}% vs. Vorjahr
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="umsatzGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="monat" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="umsatz" 
                  name={`Umsatz ${selectedYear}`}
                  stroke="hsl(var(--primary))" 
                  fill="url(#umsatzGradient)"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="umsatzVorjahr" 
                  name={`Umsatz ${selectedYear - 1}`}
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deckungsbeitrag-Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DB I Trend */}
          <Card className="glass-card">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-success" />
                DB I Entwicklung (Rohertrag)
                <TooltipProvider>
                  <TooltipUI>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm font-semibold mb-1">DB I (Deckungsbeitrag I)</p>
                      <p className="text-sm">= Umsatz − Wareneinsatz</p>
                      <p className="text-xs text-muted-foreground mt-1">Zeigt den Rohertrag nach Abzug der direkten Warenkosten.</p>
                    </TooltipContent>
                  </TooltipUI>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="monat" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="db1" 
                    name={`DB I ${selectedYear}`}
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 76%, 36%)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="db1Vorjahr" 
                    name={`DB I ${selectedYear - 1}`}
                    stroke="hsl(142, 76%, 36%, 0.4)" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* DB II Trend */}
          <Card className="glass-card">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                DB II Entwicklung
                <TooltipProvider>
                  <TooltipUI>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm font-semibold mb-1">DB II (Deckungsbeitrag II)</p>
                      <p className="text-sm">= DB I − Personalkosten</p>
                      <p className="text-xs text-muted-foreground mt-1">Zeigt den Ertrag nach Abzug der Personalkosten.</p>
                    </TooltipContent>
                  </TooltipUI>
                </TooltipProvider>
                <Badge variant="outline" className="ml-auto text-xs">
                  {db2Diff >= 0 ? '+' : ''}{db2Diff.toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="monat" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="db2" 
                    name={`DB II ${selectedYear}`}
                    stroke="hsl(280, 70%, 60%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(280, 70%, 60%)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="db2Vorjahr" 
                    name={`DB II ${selectedYear - 1}`}
                    stroke="hsl(280, 70%, 60%, 0.4)" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Margen-Entwicklung */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Margenentwicklung (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="monat" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="db1Marge" 
                  name="DB I Marge"
                  stroke="hsl(142, 76%, 36%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142, 76%, 36%)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="db2Marge" 
                  name="DB II Marge"
                  stroke="hsl(280, 70%, 60%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(280, 70%, 60%)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Abteilungs-Umsatz-Trends */}
        {abteilungTrends.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Umsatztrends nach Abteilung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={abteilungTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="monat" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {operativeAbteilungen.map(abt => (
                    <Line 
                      key={abt}
                      type="monotone" 
                      dataKey={`${abt}_umsatz`}
                      name={abt}
                      stroke={bereichColors[abt]}
                      strokeWidth={2}
                      dot={{ fill: bereichColors[abt], r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Kosten-Trends */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              Kostenentwicklung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="monat" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="wareneinsatz" 
                  name="Wareneinsatz"
                  stroke="hsl(0, 70%, 50%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(0, 70%, 50%)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="personal" 
                  name="Personal"
                  stroke="hsl(210, 70%, 50%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(210, 70%, 50%)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="energie" 
                  name="Energie"
                  stroke="hsl(45, 90%, 50%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(45, 90%, 50%)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function YtdCard({ 
  title, 
  value,
  vorjahr,
  icon: Icon,
  variant = 'default',
  tooltip
}: { 
  title: string; 
  value: number;
  vorjahr?: number;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning';
  tooltip?: string;
}) {
  const diff = vorjahr && vorjahr !== 0 ? ((value - vorjahr) / Math.abs(vorjahr)) * 100 : null;
  
  return (
    <Card className="glass-card hover:scale-[1.02] transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">{title}</span>
            {tooltip && (
              <TooltipProvider>
                <TooltipUI>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{tooltip}</p>
                  </TooltipContent>
                </TooltipUI>
              </TooltipProvider>
            )}
          </div>
          <Icon className={`h-4 w-4 ${
            variant === 'success' ? 'text-success' : 
            variant === 'warning' ? 'text-warning' : 
            'text-muted-foreground'
          }`} />
        </div>
        <div className="text-xl font-bold">{formatCurrency(value)}</div>
        {diff !== null && (
          <div className="flex items-center gap-1 mt-1">
            {diff > 0 ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : diff < 0 ? (
              <TrendingDown className="h-3 w-3 text-destructive" />
            ) : null}
            <span className={`text-xs ${
              diff > 0 ? 'text-success' : 
              diff < 0 ? 'text-destructive' : 
              'text-muted-foreground'
            }`}>
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs. VJ
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
