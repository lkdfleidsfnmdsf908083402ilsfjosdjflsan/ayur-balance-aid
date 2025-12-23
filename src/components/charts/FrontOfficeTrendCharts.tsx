import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface FrontOfficeReport {
  report_date: string;
  avg_checkin_time_sec: number;
  avg_checkout_time_sec: number;
  avg_queue_time_sec: number | null;
  guests_per_fo_employee: number | null;
  requests_per_hour: number | null;
  fcr_pct: number | null;
  fo_complaint_rate_pct: number | null;
  avg_fo_rating: number | null;
  upsell_conversion_pct: number | null;
  upsell_rev_per_arrival: number | null;
  arrivals_total: number;
  departures_total: number;
  upsell_revenue: number;
}

interface FrontOfficeTrendChartsProps {
  reports: FrontOfficeReport[];
  daysToShow?: number;
}

const chartConfig = {
  checkinTime: { label: "Check-in Min", color: "hsl(var(--chart-1))" },
  checkoutTime: { label: "Check-out Min", color: "hsl(var(--chart-2))" },
  queueTime: { label: "Wartezeit Min", color: "hsl(var(--chart-3))" },
  guestsPerEmployee: { label: "Gäste/MA", color: "hsl(var(--chart-4))" },
  requestsPerHour: { label: "Anfragen/h", color: "hsl(var(--chart-5))" },
  fcr: { label: "FCR %", color: "hsl(var(--chart-1))" },
  complaintRate: { label: "Beschwerderate %", color: "hsl(var(--destructive))" },
  avgRating: { label: "Ø Bewertung", color: "hsl(var(--chart-2))" },
  upsellConversion: { label: "Upsell %", color: "hsl(var(--chart-3))" },
  upsellRevenue: { label: "Upsell €", color: "hsl(var(--chart-4))" },
  arrivals: { label: "Anreisen", color: "hsl(var(--chart-1))" },
  departures: { label: "Abreisen", color: "hsl(var(--chart-2))" },
};

export function FrontOfficeTrendCharts({ reports, daysToShow = 30 }: FrontOfficeTrendChartsProps) {
  const sortedReports = [...reports]
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())
    .slice(-daysToShow);

  const chartData = sortedReports.map(report => ({
    date: format(new Date(report.report_date), "dd.MM", { locale: de }),
    fullDate: format(new Date(report.report_date), "dd.MM.yyyy", { locale: de }),
    checkinTime: report.avg_checkin_time_sec / 60,
    checkoutTime: report.avg_checkout_time_sec / 60,
    queueTime: report.avg_queue_time_sec ? report.avg_queue_time_sec / 60 : null,
    guestsPerEmployee: report.guests_per_fo_employee,
    requestsPerHour: report.requests_per_hour,
    fcr: report.fcr_pct,
    complaintRate: report.fo_complaint_rate_pct,
    avgRating: report.avg_fo_rating,
    upsellConversion: report.upsell_conversion_pct,
    upsellRevPerArrival: report.upsell_rev_per_arrival,
    arrivals: report.arrivals_total,
    departures: report.departures_total,
    upsellRevenue: report.upsell_revenue,
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
      {/* Check-in/Check-out Zeiten */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Check-in & Check-out Zeiten (Min)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 15]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={5} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" label={{ value: "CI Ziel 5", position: "right", fontSize: 10 }} />
              <ReferenceLine y={3} stroke="hsl(var(--chart-2))" strokeDasharray="5 5" label={{ value: "CO Ziel 3", position: "right", fontSize: 10 }} />
              <Line type="monotone" dataKey="checkinTime" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Check-in Min" />
              <Line type="monotone" dataKey="checkoutTime" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Check-out Min" />
              <Line type="monotone" dataKey="queueTime" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Wartezeit Min" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Produktivität */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Produktivität: Gäste/MA & Anfragen/h</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line yAxisId="left" type="monotone" dataKey="guestsPerEmployee" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} name="Gäste/MA" />
              <Line yAxisId="right" type="monotone" dataKey="requestsPerHour" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} name="Anfragen/h" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Qualität: FCR & Beschwerden */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Qualität: FCR & Beschwerderate</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" className="text-xs" domain={[0, 5]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine yAxisId="left" y={85} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" />
              <ReferenceLine yAxisId="right" y={1} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
              <Area yAxisId="left" type="monotone" dataKey="fcr" fill="hsl(var(--chart-1))" fillOpacity={0.2} stroke="hsl(var(--chart-1))" strokeWidth={2} name="FCR %" />
              <Line yAxisId="right" type="monotone" dataKey="complaintRate" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Beschwerderate %" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Upselling */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upselling: Conversion & Umsatz/Anreise</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" domain={[0, 50]} />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine yAxisId="left" y={15} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: "Ziel 15%", position: "right", fontSize: 10 }} />
              <Line yAxisId="left" type="monotone" dataKey="upsellConversion" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Upsell %" />
              <Area yAxisId="right" type="monotone" dataKey="upsellRevPerArrival" fill="hsl(var(--chart-4))" fillOpacity={0.2} stroke="hsl(var(--chart-4))" strokeWidth={2} name="Upsell €/Anreise" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Anreisen & Abreisen */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Anreisen & Abreisen</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="arrivals" fill="hsl(var(--chart-1))" fillOpacity={0.3} stroke="hsl(var(--chart-1))" strokeWidth={2} name="Anreisen" />
              <Area type="monotone" dataKey="departures" fill="hsl(var(--chart-2))" fillOpacity={0.3} stroke="hsl(var(--chart-2))" strokeWidth={2} name="Abreisen" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
