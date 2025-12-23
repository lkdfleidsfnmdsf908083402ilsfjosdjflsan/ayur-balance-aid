import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

interface SpaReport {
  report_date: string;
  room_utilization_pct: number | null;
  therapist_utilization_pct: number | null;
  revpath: number | null;
  revenue_per_guest: number | null;
  retail_ratio_pct: number | null;
  treatments_per_therapist: number | null;
  avg_spa_rating: number | null;
  complaint_rate_pct: number | null;
  no_show_rate_pct: number | null;
  guests_total: number;
  spa_revenue: number;
  retail_revenue: number;
}

interface SpaTrendChartsProps {
  reports: SpaReport[];
  daysToShow?: number;
}

const chartConfig = {
  roomUtilization: { label: "Raum-Auslastung %", color: "hsl(var(--chart-1))" },
  therapistUtilization: { label: "Therapeuten-Auslastung %", color: "hsl(var(--chart-2))" },
  revpath: { label: "RevPATH", color: "hsl(var(--chart-3))" },
  revenuePerGuest: { label: "Umsatz/Gast", color: "hsl(var(--chart-4))" },
  retailRatio: { label: "Retail Ratio %", color: "hsl(var(--chart-5))" },
  treatmentsPerTherapist: { label: "Treatments/Therapeut", color: "hsl(var(--chart-1))" },
  spaRating: { label: "Spa Rating", color: "hsl(var(--chart-2))" },
  complaintRate: { label: "Beschwerderate %", color: "hsl(var(--chart-3))" },
  noShowRate: { label: "No-Show Rate %", color: "hsl(var(--chart-4))" },
  guests: { label: "Gäste", color: "hsl(var(--chart-1))" },
  spaRevenue: { label: "Spa-Umsatz", color: "hsl(var(--chart-2))" },
  retailRevenue: { label: "Retail-Umsatz", color: "hsl(var(--chart-3))" },
};

export function SpaTrendCharts({ reports, daysToShow = 14 }: SpaTrendChartsProps) {
  const sortedReports = [...reports]
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())
    .slice(-daysToShow);

  const chartData = sortedReports.map(report => ({
    date: format(parseISO(report.report_date), "dd.MM", { locale: de }),
    roomUtilization: report.room_utilization_pct ?? 0,
    therapistUtilization: report.therapist_utilization_pct ?? 0,
    revpath: report.revpath ?? 0,
    revenuePerGuest: report.revenue_per_guest ?? 0,
    retailRatio: report.retail_ratio_pct ?? 0,
    treatmentsPerTherapist: report.treatments_per_therapist ?? 0,
    spaRating: report.avg_spa_rating ?? 0,
    complaintRate: report.complaint_rate_pct ?? 0,
    noShowRate: report.no_show_rate_pct ?? 0,
    guests: report.guests_total,
    spaRevenue: report.spa_revenue,
    retailRevenue: report.retail_revenue,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Keine Daten für Trend-Analyse verfügbar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Auslastung */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Auslastung</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" unit="%" />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="roomUtilization" 
                  name="Raum %" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="therapistUtilization" 
                  name="Therapeut %" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Umsatz-KPIs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Umsatz-KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" unit="€" />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revpath" 
                  name="RevPATH" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenuePerGuest" 
                  name="€/Gast" 
                  stroke="hsl(var(--chart-4))" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Qualität */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Qualität (Rating & Beschwerden)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" domain={[0, 5]} />
                <YAxis yAxisId="right" orientation="right" className="text-xs" unit="%" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="spaRating" 
                  name="Rating" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="complaintRate" 
                  name="Beschwerden %" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Effizienz */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Effizienz (No-Shows & Retail)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" unit="%" />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="noShowRate" 
                  name="No-Show %" 
                  stroke="hsl(var(--chart-4))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="retailRatio" 
                  name="Retail %" 
                  stroke="hsl(var(--chart-5))" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gäste & Umsatz */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Gäste & Umsatz</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" unit="€" />
                <Tooltip />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="guests" 
                  name="Gäste" 
                  fill="hsl(var(--chart-1))" 
                  fillOpacity={0.3}
                  stroke="hsl(var(--chart-1))"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="spaRevenue" 
                  name="Spa €" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="retailRevenue" 
                  name="Retail €" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
