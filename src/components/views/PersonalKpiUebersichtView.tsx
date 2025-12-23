import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Users, Clock, Euro, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

interface StaffKpi {
  abteilung: string;
  datum: string;
  mitarbeiter_anwesend: number;
  mitarbeiter_krank: number;
  mitarbeiter_urlaub: number;
  mitarbeiter_geplant: number;
  soll_stunden: number;
  ist_stunden: number;
  ueberstunden: number;
  personalkosten: number;
  anwesenheitsquote_pct: number;
  krankenquote_pct: number;
}

interface MonthlyStaffKpi {
  abteilung: string;
  jahr: number;
  monat: number;
  mitarbeiter_gesamt: number;
  soll_stunden_monat: number;
  ist_stunden_monat: number;
  ueberstunden_monat: number;
  personalkosten_monat: number;
  krankheitstage: number;
  urlaubstage: number;
  arbeitstage: number;
  anwesenheitsquote_pct: number;
  krankenquote_pct: number;
}

const DEPARTMENT_MAPPING: Record<string, string> = {
  'Housekeeping': 'hk_daily_reports',
  'Küche': 'kitchen_daily_reports',
  'Service': 'service_daily_reports',
  'Rezeption': 'frontoffice_daily_reports',
  'Spa': 'spa_daily_reports',
  'Technik': 'technical_daily_reports',
  'Verwaltung': 'admin_daily_reports',
};

const MONTHS = [
  { value: 1, label: 'Januar' },
  { value: 2, label: 'Februar' },
  { value: 3, label: 'März' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Dezember' },
];

export function PersonalKpiUebersichtView() {
  const [dailyKpis, setDailyKpis] = useState<StaffKpi[]>([]);
  const [monthlyKpis, setMonthlyKpis] = useState<MonthlyStaffKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    
    const monthStart = format(new Date(selectedYear, selectedMonth - 1, 1), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');

    // Load daily staff KPIs
    const { data: dailyData } = await supabase
      .from('v_department_staff_kpis')
      .select('*')
      .gte('datum', monthStart)
      .lte('datum', monthEnd)
      .order('datum', { ascending: true });

    // Load monthly staff KPIs
    const { data: monthlyData } = await supabase
      .from('v_department_monthly_staff_kpis')
      .select('*')
      .eq('jahr', selectedYear)
      .eq('monat', selectedMonth);

    setDailyKpis((dailyData as StaffKpi[]) || []);
    setMonthlyKpis((monthlyData as MonthlyStaffKpi[]) || []);
    setLoading(false);
  };

  // Aggregierte Statistiken
  const totalStats = useMemo(() => {
    return monthlyKpis.reduce((acc, kpi) => ({
      mitarbeiter: acc.mitarbeiter + kpi.mitarbeiter_gesamt,
      sollStunden: acc.sollStunden + Number(kpi.soll_stunden_monat || 0),
      istStunden: acc.istStunden + Number(kpi.ist_stunden_monat || 0),
      ueberstunden: acc.ueberstunden + Number(kpi.ueberstunden_monat || 0),
      personalkosten: acc.personalkosten + Number(kpi.personalkosten_monat || 0),
      krankheitstage: acc.krankheitstage + Number(kpi.krankheitstage || 0),
      urlaubstage: acc.urlaubstage + Number(kpi.urlaubstage || 0),
      arbeitstage: acc.arbeitstage + Number(kpi.arbeitstage || 0),
    }), { mitarbeiter: 0, sollStunden: 0, istStunden: 0, ueberstunden: 0, personalkosten: 0, krankheitstage: 0, urlaubstage: 0, arbeitstage: 0 });
  }, [monthlyKpis]);

  // Chart-Daten für tägliche Entwicklung
  const dailyChartData = useMemo(() => {
    const days = eachDayOfInterval({
      start: new Date(selectedYear, selectedMonth - 1, 1),
      end: endOfMonth(new Date(selectedYear, selectedMonth - 1, 1))
    });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayKpis = dailyKpis.filter(k => k.datum === dateStr);
      
      return {
        datum: format(day, 'dd.MM.'),
        anwesend: dayKpis.reduce((sum, k) => sum + Number(k.mitarbeiter_anwesend || 0), 0),
        krank: dayKpis.reduce((sum, k) => sum + Number(k.mitarbeiter_krank || 0), 0),
        urlaub: dayKpis.reduce((sum, k) => sum + Number(k.mitarbeiter_urlaub || 0), 0),
        istStunden: dayKpis.reduce((sum, k) => sum + Number(k.ist_stunden || 0), 0),
        personalkosten: dayKpis.reduce((sum, k) => sum + Number(k.personalkosten || 0), 0),
      };
    });
  }, [dailyKpis, selectedYear, selectedMonth]);

  // Abteilungs-Vergleich Chart-Daten
  const departmentChartData = useMemo(() => {
    return monthlyKpis.map(kpi => ({
      abteilung: kpi.abteilung,
      istStunden: Number(kpi.ist_stunden_monat || 0),
      sollStunden: Number(kpi.soll_stunden_monat || 0),
      personalkosten: Number(kpi.personalkosten_monat || 0),
      ueberstunden: Number(kpi.ueberstunden_monat || 0),
    }));
  }, [monthlyKpis]);

  const getStatusBadge = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value <= threshold : value >= threshold;
    return isGood ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
        <CheckCircle className="w-3 h-3 mr-1" /> OK
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
        <AlertTriangle className="w-3 h-3 mr-1" /> Achtung
      </Badge>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Personal-KPI Übersicht</h2>
          <p className="text-muted-foreground">Automatisch berechnet aus Schichtdaten</p>
        </div>
        <div className="flex gap-4">
          <div className="min-w-[120px]">
            <Label>Jahr</Label>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <Label>Monat</Label>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Gesamt-KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Mitarbeiter</span>
            </div>
            <p className="text-xl font-bold">{totalStats.mitarbeiter}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Soll-Stunden</span>
            </div>
            <p className="text-xl font-bold">{totalStats.sollStunden.toFixed(0)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Ist-Stunden</span>
            </div>
            <p className="text-xl font-bold">{totalStats.istStunden.toFixed(0)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {totalStats.ueberstunden >= 0 ? (
                <TrendingUp className="h-4 w-4 text-orange-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-blue-500" />
              )}
              <span className="text-xs text-muted-foreground">Überstunden</span>
            </div>
            <p className={`text-xl font-bold ${totalStats.ueberstunden >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
              {totalStats.ueberstunden >= 0 ? '+' : ''}{totalStats.ueberstunden.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Personalkosten</span>
            </div>
            <p className="text-xl font-bold">{totalStats.personalkosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Arbeitstage</span>
            </div>
            <p className="text-xl font-bold">{totalStats.arbeitstage}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Krankheit</span>
            </div>
            <p className="text-xl font-bold text-red-600">{totalStats.krankheitstage}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Urlaub</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{totalStats.urlaubstage}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="abteilungen" className="space-y-4">
        <TabsList>
          <TabsTrigger value="abteilungen">Abteilungs-Übersicht</TabsTrigger>
          <TabsTrigger value="taeglich">Täglicher Verlauf</TabsTrigger>
          <TabsTrigger value="vergleich">Soll/Ist Vergleich</TabsTrigger>
        </TabsList>

        <TabsContent value="abteilungen" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal-KPIs pro Abteilung</CardTitle>
              <CardDescription>
                {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Laden...</p>
              ) : monthlyKpis.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Keine Schichtdaten für diesen Monat vorhanden. Bitte erfassen Sie zuerst Schichten in der Schichtplanung.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Abteilung</TableHead>
                      <TableHead className="text-right">MA</TableHead>
                      <TableHead className="text-right">Soll-h</TableHead>
                      <TableHead className="text-right">Ist-h</TableHead>
                      <TableHead className="text-right">+/- h</TableHead>
                      <TableHead className="text-right">Kosten</TableHead>
                      <TableHead className="text-center">Anwesenheit</TableHead>
                      <TableHead className="text-center">Krank</TableHead>
                      <TableHead className="text-center">Urlaub</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyKpis.map((kpi) => {
                      const ueberstunden = Number(kpi.ueberstunden_monat || 0);
                      const anwesenheit = Number(kpi.anwesenheitsquote_pct || 0);
                      const kranken = Number(kpi.krankenquote_pct || 0);
                      
                      return (
                        <TableRow key={kpi.abteilung}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">{kpi.abteilung}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{kpi.mitarbeiter_gesamt}</TableCell>
                          <TableCell className="text-right">{Number(kpi.soll_stunden_monat || 0).toFixed(0)}h</TableCell>
                          <TableCell className="text-right">{Number(kpi.ist_stunden_monat || 0).toFixed(0)}h</TableCell>
                          <TableCell className={`text-right font-medium ${ueberstunden >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                            {ueberstunden >= 0 ? '+' : ''}{ueberstunden.toFixed(1)}h
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(kpi.personalkosten_monat || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm">{anwesenheit.toFixed(0)}%</span>
                              <Progress value={anwesenheit} className="w-16 h-1" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={kranken > 5 ? 'destructive' : 'secondary'}>
                              {Number(kpi.krankheitstage || 0)} Tage
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                              {Number(kpi.urlaubstage || 0)} Tage
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Abteilungs-Vergleichs-Chart */}
          {departmentChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Personalkosten pro Abteilung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="abteilung" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                      <Tooltip 
                        formatter={(value: number) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="personalkosten" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Personalkosten" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="taeglich" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Täglicher Personalverlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="datum" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="anwesend" stroke="hsl(var(--primary))" strokeWidth={2} name="Anwesend" dot={false} />
                    <Line type="monotone" dataKey="krank" stroke="#ef4444" strokeWidth={2} name="Krank" dot={false} />
                    <Line type="monotone" dataKey="urlaub" stroke="#3b82f6" strokeWidth={2} name="Urlaub" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tägliche Ist-Stunden</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="datum" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="istStunden" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Ist-Stunden" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vergleich" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Soll/Ist Stunden-Vergleich</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="abteilung" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="sollStunden" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Soll-Stunden" />
                    <Bar dataKey="istStunden" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Ist-Stunden" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Überstunden pro Abteilung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="abteilung" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Bar 
                      dataKey="ueberstunden" 
                      fill="#f97316" 
                      radius={[4, 4, 0, 0]} 
                      name="Überstunden"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
