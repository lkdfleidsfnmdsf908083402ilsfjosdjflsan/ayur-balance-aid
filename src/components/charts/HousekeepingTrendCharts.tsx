import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';

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

interface HousekeepingTrendChartsProps {
  reports: HkDailyReport[];
  daysToShow?: number;
}

const chartConfig = {
  minutesPerRoom: {
    label: 'Min/Zimmer',
    color: 'hsl(var(--primary))',
  },
  roomsPerAttendant: {
    label: 'Zimmer/Attendant',
    color: 'hsl(var(--chart-2))',
  },
  inspectionPassRate: {
    label: 'Pass Rate %',
    color: 'hsl(var(--chart-3))',
  },
  complaintRate: {
    label: 'Beschwerderate %',
    color: 'hsl(var(--chart-4))',
  },
  attendanceRate: {
    label: 'Anwesenheit %',
    color: 'hsl(var(--chart-5))',
  },
  cleanedRooms: {
    label: 'Gereinigte Zimmer',
    color: 'hsl(var(--chart-1))',
  },
};

export function HousekeepingTrendCharts({ reports, daysToShow = 30 }: HousekeepingTrendChartsProps) {
  const chartData = useMemo(() => {
    const cutoffDate = subDays(new Date(), daysToShow);
    
    return reports
      .filter(r => new Date(r.report_date) >= cutoffDate)
      .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())
      .map(report => ({
        date: report.report_date,
        dateFormatted: format(new Date(report.report_date), 'dd.MM', { locale: de }),
        minutesPerRoom: report.avg_minutes_per_room,
        roomsPerAttendant: report.rooms_per_attendant,
        inspectionPassRate: report.inspection_pass_rate,
        complaintRate: report.complaint_rate,
        attendanceRate: report.attendance_rate,
        cleanedRooms: report.cleaned_rooms,
      }));
  }, [reports, daysToShow]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Keine Daten für die Trendanzeige vorhanden. Bitte erfassen Sie täglich Ihre Housekeeping-Daten.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Minuten pro Zimmer Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ø Minuten pro Zimmer</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={30} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: 'Ziel: 30', position: 'right', fontSize: 10 }} />
              <ReferenceLine y={35} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: 'Max: 35', position: 'right', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="minutesPerRoom"
                stroke="hsl(var(--primary))"
                fill="url(#fillMinutes)"
                strokeWidth={2}
                name="Min/Zimmer"
              />
              <Line
                type="monotone"
                dataKey="minutesPerRoom"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Min/Zimmer"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Zimmer pro Attendant Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zimmer pro Attendant</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRooms" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
                domain={[0, 'dataMax + 2']}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={10} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: 'Min: 10', position: 'right', fontSize: 10 }} />
              <ReferenceLine y={14} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: 'Max: 14', position: 'right', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="roomsPerAttendant"
                stroke="hsl(var(--chart-2))"
                fill="url(#fillRooms)"
                strokeWidth={2}
                name="Zimmer/Attendant"
              />
              <Line
                type="monotone"
                dataKey="roomsPerAttendant"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Zimmer/Attendant"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Inspection Pass Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspection Pass Rate (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillPassRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
                domain={[80, 100]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={97} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: 'Ziel: 97%', position: 'right', fontSize: 10 }} />
              <ReferenceLine y={94} stroke="hsl(var(--chart-4))" strokeDasharray="5 5" label={{ value: 'Min: 94%', position: 'right', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="inspectionPassRate"
                stroke="hsl(var(--chart-3))"
                fill="url(#fillPassRate)"
                strokeWidth={2}
                name="Pass Rate %"
              />
              <Line
                type="monotone"
                dataKey="inspectionPassRate"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Pass Rate %"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Beschwerderate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beschwerderate Sauberkeit (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillComplaint" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
                domain={[0, 'dataMax + 0.5']}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={0.5} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: 'Ziel: 0.5%', position: 'right', fontSize: 10 }} />
              <ReferenceLine y={1.0} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: 'Max: 1%', position: 'right', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="complaintRate"
                stroke="hsl(var(--chart-4))"
                fill="url(#fillComplaint)"
                strokeWidth={2}
                name="Beschwerderate %"
              />
              <Line
                type="monotone"
                dataKey="complaintRate"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Beschwerderate %"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gereinigte Zimmer pro Tag */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Gereinigte Zimmer pro Tag</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillCleaned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="cleanedRooms"
                stroke="hsl(var(--chart-1))"
                fill="url(#fillCleaned)"
                strokeWidth={2}
                name="Gereinigte Zimmer"
              />
              <Line
                type="monotone"
                dataKey="cleanedRooms"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Gereinigte Zimmer"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
