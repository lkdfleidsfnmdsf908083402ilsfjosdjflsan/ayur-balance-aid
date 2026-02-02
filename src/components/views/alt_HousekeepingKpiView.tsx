import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon, Save, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HousekeepingTrendCharts } from '@/components/charts/HousekeepingTrendCharts';

type TrafficColor = 'green' | 'yellow' | 'red';

interface HkDailyReport {
  id: string;
  report_date: string;
  rooms_in_sale: number;
  occupied_rooms: number;
  cleaned_rooms: number;
  avg_minutes_per_room: number;
  total_cleaning_minutes: number;
  hk_employees_on_duty: number;
  hk_hours_total: number;
  shift_minutes: number;
  inspected_rooms: number;
  passed_rooms: number;
  complaints_cleanliness: number;
  attendance_rate: number;
  turnover_rate: number;
  rooms_per_attendant: number;
  inspection_pass_rate: number;
  complaint_rate: number;
}

// Ampel-Funktionen
function getCleaningTimeColor(minutesPerRoom: number): TrafficColor {
  if (minutesPerRoom <= 30) return 'green';
  if (minutesPerRoom <= 35) return 'yellow';
  return 'red';
}

function getRoomsPerAttendantColor(roomsPerAttendant: number): TrafficColor {
  if (roomsPerAttendant >= 10 && roomsPerAttendant <= 14) return 'green';
  if (roomsPerAttendant >= 8 && roomsPerAttendant < 10) return 'yellow';
  return 'red';
}

function getInspectionPassRateColor(rate: number): TrafficColor {
  if (rate >= 97) return 'green';
  if (rate >= 94) return 'yellow';
  return 'red';
}

function getComplaintRateColor(rate: number): TrafficColor {
  if (rate <= 0.5) return 'green';
  if (rate <= 1.0) return 'yellow';
  return 'red';
}

function getAttendanceColor(rate: number): TrafficColor {
  if (rate >= 95) return 'green';
  if (rate >= 92) return 'yellow';
  return 'red';
}

function getTurnoverColor(rate: number): TrafficColor {
  if (rate < 20) return 'green';
  if (rate <= 25) return 'yellow';
  return 'red';
}

const colorClasses: Record<TrafficColor, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
};

function TrafficLight({ color }: { color: TrafficColor }) {
  return (
    <span className={cn('inline-block w-4 h-4 rounded-full', colorClasses[color])} />
  );
}

export function HousekeepingKpiView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reports, setReports] = useState<HkDailyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [periodView, setPeriodView] = useState<'day' | 'week' | 'month' | 'year'>('day');

  // Formular-State
  const [formData, setFormData] = useState({
    rooms_in_sale: 60,
    occupied_rooms: 50,
    cleaned_rooms: 50,
    avg_minutes_per_room: 25,
    total_cleaning_minutes: 0,
    hk_employees_on_duty: 4,
    hk_hours_total: 32,
    shift_minutes: 480,
    inspected_rooms: 30,
    passed_rooms: 29,
    complaints_cleanliness: 0,
    attendance_rate: 97,
    turnover_rate: 15,
  });

  // Berechnete KPIs
  const calculatedKpis = useMemo(() => {
    const roomsPerAttendant = formData.hk_employees_on_duty > 0 
      ? formData.cleaned_rooms / formData.hk_employees_on_duty 
      : 0;
    const inspectionPassRate = formData.inspected_rooms > 0 
      ? (formData.passed_rooms / formData.inspected_rooms) * 100 
      : 0;
    const complaintRate = formData.occupied_rooms > 0 
      ? (formData.complaints_cleanliness / formData.occupied_rooms) * 100 
      : 0;

    return {
      roomsPerAttendant,
      inspectionPassRate,
      complaintRate,
    };
  }, [formData]);

  // Daten laden
  useEffect(() => {
    loadReports();
  }, []);

  // Report für ausgewähltes Datum laden
  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existingReport = reports.find(r => r.report_date === dateStr);
    if (existingReport) {
      setFormData({
        rooms_in_sale: existingReport.rooms_in_sale,
        occupied_rooms: existingReport.occupied_rooms,
        cleaned_rooms: existingReport.cleaned_rooms,
        avg_minutes_per_room: existingReport.avg_minutes_per_room,
        total_cleaning_minutes: existingReport.total_cleaning_minutes,
        hk_employees_on_duty: existingReport.hk_employees_on_duty,
        hk_hours_total: existingReport.hk_hours_total,
        shift_minutes: existingReport.shift_minutes,
        inspected_rooms: existingReport.inspected_rooms,
        passed_rooms: existingReport.passed_rooms,
        complaints_cleanliness: existingReport.complaints_cleanliness,
        attendance_rate: existingReport.attendance_rate,
        turnover_rate: existingReport.turnover_rate,
      });
    }
  }, [selectedDate, reports]);

  async function loadReports() {
    setLoading(true);
    const { data, error } = await supabase
      .from('hk_daily_reports')
      .select('*')
      .order('report_date', { ascending: false });

    if (error) {
      toast({ title: 'Fehler beim Laden', description: error.message, variant: 'destructive' });
    } else {
      setReports(data || []);
    }
    setLoading(false);
  }

  async function saveReport() {
    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const reportData = {
      report_date: dateStr,
      ...formData,
      rooms_per_attendant: calculatedKpis.roomsPerAttendant,
      inspection_pass_rate: calculatedKpis.inspectionPassRate,
      complaint_rate: calculatedKpis.complaintRate,
    };

    const { error } = await supabase
      .from('hk_daily_reports')
      .upsert(reportData, { onConflict: 'report_date' });

    if (error) {
      toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Gespeichert', description: `Report für ${format(selectedDate, 'dd.MM.yyyy')} gespeichert.` });
      loadReports();
    }
    setSaving(false);
  }

  // Aggregierte KPIs für Periode berechnen
  const aggregatedKpis = useMemo(() => {
    let filteredReports = reports;
    const now = selectedDate;

    switch (periodView) {
      case 'week':
        const weekStart = startOfWeek(now, { locale: de });
        const weekEnd = endOfWeek(now, { locale: de });
        filteredReports = reports.filter(r => {
          const d = new Date(r.report_date);
          return d >= weekStart && d <= weekEnd;
        });
        break;
      case 'month':
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        filteredReports = reports.filter(r => {
          const d = new Date(r.report_date);
          return d >= monthStart && d <= monthEnd;
        });
        break;
      case 'year':
        const yearStart = startOfYear(now);
        const yearEnd = endOfYear(now);
        filteredReports = reports.filter(r => {
          const d = new Date(r.report_date);
          return d >= yearStart && d <= yearEnd;
        });
        break;
    }

    if (filteredReports.length === 0) return null;

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => arr.length > 0 ? sum(arr) / arr.length : 0;

    return {
      count: filteredReports.length,
      totalCleanedRooms: sum(filteredReports.map(r => r.cleaned_rooms)),
      avgMinutesPerRoom: avg(filteredReports.map(r => r.avg_minutes_per_room)),
      avgRoomsPerAttendant: avg(filteredReports.map(r => r.rooms_per_attendant)),
      avgInspectionPassRate: avg(filteredReports.map(r => r.inspection_pass_rate)),
      avgComplaintRate: avg(filteredReports.map(r => r.complaint_rate)),
      avgAttendanceRate: avg(filteredReports.map(r => r.attendance_rate)),
      avgTurnoverRate: avg(filteredReports.map(r => r.turnover_rate)),
    };
  }, [reports, periodView, selectedDate]);

  const handleInputChange = (field: keyof typeof formData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Housekeeping KPIs</h1>
          <p className="text-muted-foreground">Tägliche Erfassung und Auswertung</p>
        </div>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'dd.MM.yyyy', { locale: de })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={de}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Tabs defaultValue="input" className="space-y-4">
        <TabsList>
          <TabsTrigger value="input">Tageserfassung</TabsTrigger>
          <TabsTrigger value="overview">KPI-Übersicht</TabsTrigger>
          <TabsTrigger value="trends">Trends & Vergleiche</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          {/* Basis-Eingaben */}
          <Card>
            <CardHeader>
              <CardTitle>Basis-Daten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rooms_in_sale">Zimmer im Verkauf</Label>
                  <Input
                    id="rooms_in_sale"
                    type="number"
                    value={formData.rooms_in_sale}
                    onChange={(e) => handleInputChange('rooms_in_sale', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupied_rooms">Belegte Zimmer</Label>
                  <Input
                    id="occupied_rooms"
                    type="number"
                    value={formData.occupied_rooms}
                    onChange={(e) => handleInputChange('occupied_rooms', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cleaned_rooms">Gereinigte Zimmer</Label>
                  <Input
                    id="cleaned_rooms"
                    type="number"
                    value={formData.cleaned_rooms}
                    onChange={(e) => handleInputChange('cleaned_rooms', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avg_minutes_per_room">Ø Minuten/Zimmer</Label>
                  <Input
                    id="avg_minutes_per_room"
                    type="number"
                    step="0.1"
                    value={formData.avg_minutes_per_room}
                    onChange={(e) => handleInputChange('avg_minutes_per_room', Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal */}
          <Card>
            <CardHeader>
              <CardTitle>Personal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hk_employees_on_duty">HK-Mitarbeiter im Einsatz</Label>
                  <Input
                    id="hk_employees_on_duty"
                    type="number"
                    value={formData.hk_employees_on_duty}
                    onChange={(e) => handleInputChange('hk_employees_on_duty', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hk_hours_total">Gesamt HK-Stunden</Label>
                  <Input
                    id="hk_hours_total"
                    type="number"
                    step="0.5"
                    value={formData.hk_hours_total}
                    onChange={(e) => handleInputChange('hk_hours_total', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance_rate">Anwesenheitsquote (%)</Label>
                  <Input
                    id="attendance_rate"
                    type="number"
                    step="0.1"
                    value={formData.attendance_rate}
                    onChange={(e) => handleInputChange('attendance_rate', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turnover_rate">Fluktuation (% p.a.)</Label>
                  <Input
                    id="turnover_rate"
                    type="number"
                    step="0.1"
                    value={formData.turnover_rate}
                    onChange={(e) => handleInputChange('turnover_rate', Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Qualität */}
          <Card>
            <CardHeader>
              <CardTitle>Qualität</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inspected_rooms">Kontrollierte Zimmer</Label>
                  <Input
                    id="inspected_rooms"
                    type="number"
                    value={formData.inspected_rooms}
                    onChange={(e) => handleInputChange('inspected_rooms', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passed_rooms">Davon "OK beim 1. Mal"</Label>
                  <Input
                    id="passed_rooms"
                    type="number"
                    value={formData.passed_rooms}
                    onChange={(e) => handleInputChange('passed_rooms', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complaints_cleanliness">Reklamationen Sauberkeit</Label>
                  <Input
                    id="complaints_cleanliness"
                    type="number"
                    value={formData.complaints_cleanliness}
                    onChange={(e) => handleInputChange('complaints_cleanliness', Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={saveReport} disabled={saving} className="w-full md:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Speichere...' : 'Tagesreport speichern'}
          </Button>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KPI-Übersicht mit Ampel – {format(selectedDate, 'dd.MM.yyyy', { locale: de })}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI</TableHead>
                    <TableHead className="text-right">Wert</TableHead>
                    <TableHead className="text-center">Ampel</TableHead>
                    <TableHead>Zielbereich</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Ø Minuten pro Zimmer</TableCell>
                    <TableCell className="text-right">{formData.avg_minutes_per_room.toFixed(1)} min</TableCell>
                    <TableCell className="text-center">
                      <TrafficLight color={getCleaningTimeColor(formData.avg_minutes_per_room)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Grün: ≤30, Gelb: 31-35, Rot: &gt;35</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Zimmer pro Attendant</TableCell>
                    <TableCell className="text-right">{calculatedKpis.roomsPerAttendant.toFixed(1)}</TableCell>
                    <TableCell className="text-center">
                      <TrafficLight color={getRoomsPerAttendantColor(calculatedKpis.roomsPerAttendant)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Grün: 10-14, Gelb: 8-9, Rot: sonst</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Inspection Pass Rate</TableCell>
                    <TableCell className="text-right">{calculatedKpis.inspectionPassRate.toFixed(1)} %</TableCell>
                    <TableCell className="text-center">
                      <TrafficLight color={getInspectionPassRateColor(calculatedKpis.inspectionPassRate)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Grün: ≥97%, Gelb: 94-96%, Rot: &lt;94%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Beschwerderate Sauberkeit</TableCell>
                    <TableCell className="text-right">{calculatedKpis.complaintRate.toFixed(2)} %</TableCell>
                    <TableCell className="text-center">
                      <TrafficLight color={getComplaintRateColor(calculatedKpis.complaintRate)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Grün: ≤0,5%, Gelb: 0,5-1%, Rot: &gt;1%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Anwesenheitsquote</TableCell>
                    <TableCell className="text-right">{formData.attendance_rate.toFixed(1)} %</TableCell>
                    <TableCell className="text-center">
                      <TrafficLight color={getAttendanceColor(formData.attendance_rate)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Grün: ≥95%, Gelb: 92-94%, Rot: &lt;92%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Fluktuation Housekeeping</TableCell>
                    <TableCell className="text-right">{formData.turnover_rate.toFixed(1)} %</TableCell>
                    <TableCell className="text-center">
                      <TrafficLight color={getTurnoverColor(formData.turnover_rate)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Grün: &lt;20%, Gelb: 20-25%, Rot: &gt;25%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="mt-4 text-xs text-muted-foreground">
                Hinweis: Schwellenwerte basieren auf typischen 4★-Wellness-/Resort-Benchmarks und wurden für Mandira angepasst.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Trend Charts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">KPI-Trends (letzte 30 Tage)</h3>
            </div>
            <HousekeepingTrendCharts reports={reports} daysToShow={30} />
          </div>

          {/* Aggregierte Ansicht */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold">Aggregierte Kennzahlen</h3>
              <Select value={periodView} onValueChange={(v) => setPeriodView(v as typeof periodView)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Zeitraum wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Tag</SelectItem>
                  <SelectItem value="week">Woche</SelectItem>
                  <SelectItem value="month">Monat</SelectItem>
                  <SelectItem value="year">Jahr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {aggregatedKpis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Erfasste Tage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{aggregatedKpis.count}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gereinigte Zimmer (Summe)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{aggregatedKpis.totalCleanedRooms.toLocaleString('de-DE')}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ø Min/Zimmer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{aggregatedKpis.avgMinutesPerRoom.toFixed(1)}</span>
                    <TrafficLight color={getCleaningTimeColor(aggregatedKpis.avgMinutesPerRoom)} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ø Zimmer/Attendant</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{aggregatedKpis.avgRoomsPerAttendant.toFixed(1)}</span>
                    <TrafficLight color={getRoomsPerAttendantColor(aggregatedKpis.avgRoomsPerAttendant)} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ø Inspection Pass Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{aggregatedKpis.avgInspectionPassRate.toFixed(1)}%</span>
                    <TrafficLight color={getInspectionPassRateColor(aggregatedKpis.avgInspectionPassRate)} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ø Beschwerderate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{aggregatedKpis.avgComplaintRate.toFixed(2)}%</span>
                    <TrafficLight color={getComplaintRateColor(aggregatedKpis.avgComplaintRate)} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ø Anwesenheitsquote</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{aggregatedKpis.avgAttendanceRate.toFixed(1)}%</span>
                    <TrafficLight color={getAttendanceColor(aggregatedKpis.avgAttendanceRate)} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ø Fluktuation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{aggregatedKpis.avgTurnoverRate.toFixed(1)}%</span>
                    <TrafficLight color={getTurnoverColor(aggregatedKpis.avgTurnoverRate)} />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Keine Daten für den ausgewählten Zeitraum vorhanden.</p>
              </CardContent>
            </Card>
          )}

          {/* Letzte Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Letzte Tagesreports</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Zimmer</TableHead>
                    <TableHead className="text-right">Min/Zimmer</TableHead>
                    <TableHead className="text-right">Z./Attendant</TableHead>
                    <TableHead className="text-right">Pass Rate</TableHead>
                    <TableHead className="text-right">Beschwerden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.slice(0, 10).map((report) => (
                    <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedDate(new Date(report.report_date))}>
                      <TableCell>{format(new Date(report.report_date), 'dd.MM.yyyy', { locale: de })}</TableCell>
                      <TableCell className="text-right">{report.cleaned_rooms}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {report.avg_minutes_per_room.toFixed(1)}
                          <TrafficLight color={getCleaningTimeColor(report.avg_minutes_per_room)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {report.rooms_per_attendant.toFixed(1)}
                          <TrafficLight color={getRoomsPerAttendantColor(report.rooms_per_attendant)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {report.inspection_pass_rate.toFixed(1)}%
                          <TrafficLight color={getInspectionPassRateColor(report.inspection_pass_rate)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {report.complaint_rate.toFixed(2)}%
                          <TrafficLight color={getComplaintRateColor(report.complaint_rate)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
