import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ServiceReport {
  report_date: string;
  sales_per_cover: number | null;
  sales_per_server: number | null;
  covers_per_server_per_hour: number | null;
  service_error_rate_pct: number | null;
  service_complaint_rate_pct: number | null;
  avg_service_rating: number | null;
  csat_pct: number | null;
  covers_total: number;
  service_revenue: number;
}

interface ServiceTrendChartsProps {
  reports: ServiceReport[];
  daysToShow?: number;
}

const chartConfig = {
  salesPerCover: { label: "Sales/Cover €", color: "hsl(var(--chart-1))" },
  salesPerServer: { label: "Sales/Server €", color: "hsl(var(--chart-2))" },
  coversPerHour: { label: "Covers/MA/h", color: "hsl(var(--chart-3))" },
  errorRate: { label: "Fehlerrate %", color: "hsl(var(--destructive))" },
  complaintRate: { label: "Beschwerderate %", color: "hsl(var(--chart-4))" },
  avgRating: { label: "Ø Bewertung", color: "hsl(var(--chart-1))" },
  csat: { label: "CSAT %", color: "hsl(var(--chart-2))" },
  covers: { label: "Covers", color: "hsl(var(--chart-3))" },
  revenue: { label: "Umsatz", color: "hsl(var(--chart-4))" },
};

export function ServiceTrendCharts({ reports, daysToShow = 30 }: ServiceTrendChartsProps) {
  const sortedReports = [...reports]
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())
    .slice(-daysToShow);

  const chartData = sortedReports.map(report => ({
    date: format(new Date(report.report_date), "dd.MM", { locale: de }),
    fullDate: format(new Date(report.report_date), "dd.MM.yyyy", { locale: de }),
    salesPerCover: report.sales_per_cover,
    salesPerServer: report.sales_per_server,
    coversPerHour: report.covers_per_server_per_hour,
    errorRate: report.service_error_rate_pct,
    complaintRate: report.service_complaint_rate_pct,
    avgRating: report.avg_service_rating,
    csat: report.csat_pct,
    covers: report.covers_total,
    revenue: report.service_revenue,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Keine Daten für Trend-Analyse vorhanden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Umsatz pro Cover & Server */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Umsatz: Sales/Cover & Sales/Server</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="salesPerCover" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Sales/Cover €" />
              <Line type="monotone" dataKey="salesPerServer" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Sales/Server €" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Produktivität */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Produktivität: Covers/MA/Stunde</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 15]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={6} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" label={{ value: "Min 6", position: "right", fontSize: 10 }} />
              <ReferenceLine y={10} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" label={{ value: "Max 10", position: "right", fontSize: 10 }} />
              <Area type="monotone" dataKey="coversPerHour" fill="hsl(var(--chart-3))" fillOpacity={0.3} stroke="hsl(var(--chart-3))" strokeWidth={2} name="Covers/MA/h" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Qualität: Fehler & Beschwerden */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Qualität: Fehler- & Beschwerderate</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 3]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={0.5} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" label={{ value: "Ziel 0.5%", position: "right", fontSize: 10 }} />
              <ReferenceLine y={1} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "Max 1%", position: "right", fontSize: 10 }} />
              <Line type="monotone" dataKey="errorRate" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Fehlerrate %" />
              <Line type="monotone" dataKey="complaintRate" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} name="Beschwerderate %" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gästezufriedenheit */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Zufriedenheit: Rating & CSAT</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" domain={[1, 5]} />
              <YAxis yAxisId="right" orientation="right" className="text-xs" domain={[0, 100]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine yAxisId="left" y={4.5} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" />
              <ReferenceLine yAxisId="right" y={90} stroke="hsl(var(--chart-2))" strokeDasharray="5 5" />
              <Line yAxisId="left" type="monotone" dataKey="avgRating" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Ø Bewertung" />
              <Line yAxisId="right" type="monotone" dataKey="csat" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="CSAT %" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Covers & Umsatz */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Covers & Umsatz</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area yAxisId="right" type="monotone" dataKey="revenue" fill="hsl(var(--chart-4))" fillOpacity={0.2} stroke="hsl(var(--chart-4))" strokeWidth={2} name="Umsatz €" />
              <Line yAxisId="left" type="monotone" dataKey="covers" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Covers" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
