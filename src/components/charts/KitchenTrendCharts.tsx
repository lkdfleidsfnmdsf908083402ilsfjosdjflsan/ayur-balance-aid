import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface KitchenReport {
  report_date: string;
  food_cost_pct: number | null;
  kitchen_labour_pct: number | null;
  prime_cost_pct: number | null;
  meals_per_employee: number | null;
  plates_per_hour: number | null;
  complaint_rate_pct: number | null;
  order_accuracy_pct: number | null;
  food_waste_pct: number | null;
  covers_total: number;
  food_revenue: number;
}

interface KitchenTrendChartsProps {
  reports: KitchenReport[];
  daysToShow?: number;
}

const chartConfig = {
  foodCost: { label: "Food Cost %", color: "hsl(var(--chart-1))" },
  labourCost: { label: "Labour Cost %", color: "hsl(var(--chart-2))" },
  primeCost: { label: "Prime Cost %", color: "hsl(var(--chart-3))" },
  mealsPerEmployee: { label: "Meals/MA", color: "hsl(var(--chart-4))" },
  platesPerHour: { label: "Teller/h", color: "hsl(var(--chart-5))" },
  complaintRate: { label: "Beschwerderate %", color: "hsl(var(--destructive))" },
  orderAccuracy: { label: "Order Accuracy %", color: "hsl(var(--chart-1))" },
  foodWaste: { label: "Food Waste %", color: "hsl(var(--chart-2))" },
  covers: { label: "Covers", color: "hsl(var(--chart-3))" },
  revenue: { label: "Umsatz", color: "hsl(var(--chart-4))" },
};

export function KitchenTrendCharts({ reports, daysToShow = 30 }: KitchenTrendChartsProps) {
  const sortedReports = [...reports]
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())
    .slice(-daysToShow);

  const chartData = sortedReports.map(report => ({
    date: format(new Date(report.report_date), "dd.MM", { locale: de }),
    fullDate: format(new Date(report.report_date), "dd.MM.yyyy", { locale: de }),
    foodCost: report.food_cost_pct,
    labourCost: report.kitchen_labour_pct,
    primeCost: report.prime_cost_pct,
    mealsPerEmployee: report.meals_per_employee,
    platesPerHour: report.plates_per_hour,
    complaintRate: report.complaint_rate_pct,
    orderAccuracy: report.order_accuracy_pct,
    foodWaste: report.food_waste_pct,
    covers: report.covers_total,
    revenue: report.food_revenue,
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
      {/* Food Cost & Prime Cost */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Food Cost & Prime Cost %</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 80]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={35} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" label={{ value: "Food 35%", position: "right", fontSize: 10 }} />
              <ReferenceLine y={65} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: "Prime 65%", position: "right", fontSize: 10 }} />
              <Line type="monotone" dataKey="foodCost" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Food Cost %" />
              <Line type="monotone" dataKey="primeCost" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Prime Cost %" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Produktivität */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Produktivität: Meals/MA & Teller/h</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={35} stroke="hsl(var(--chart-4))" strokeDasharray="5 5" label={{ value: "Meals 35", position: "right", fontSize: 10 }} />
              <ReferenceLine y={25} stroke="hsl(var(--chart-5))" strokeDasharray="5 5" label={{ value: "Teller 25", position: "right", fontSize: 10 }} />
              <Line type="monotone" dataKey="mealsPerEmployee" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} name="Meals/MA" />
              <Line type="monotone" dataKey="platesPerHour" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} name="Teller/h" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Qualität */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Qualität: Order Accuracy & Beschwerderate</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" domain={[90, 100]} />
              <YAxis yAxisId="right" orientation="right" className="text-xs" domain={[0, 5]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine yAxisId="left" y={98} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" />
              <ReferenceLine yAxisId="right" y={1} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
              <Line yAxisId="left" type="monotone" dataKey="orderAccuracy" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Order Accuracy %" />
              <Line yAxisId="right" type="monotone" dataKey="complaintRate" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Beschwerderate %" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Food Waste */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Food Waste %</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 15]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={5} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" label={{ value: "Ziel 5%", position: "right", fontSize: 10 }} />
              <ReferenceLine y={10} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "Max 10%", position: "right", fontSize: 10 }} />
              <Area type="monotone" dataKey="foodWaste" fill="hsl(var(--chart-2))" fillOpacity={0.3} stroke="hsl(var(--chart-2))" strokeWidth={2} name="Food Waste %" />
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
