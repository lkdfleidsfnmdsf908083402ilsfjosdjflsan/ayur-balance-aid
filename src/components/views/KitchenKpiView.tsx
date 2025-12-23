import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, startOfMonth, startOfYear, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { ChefHat, Save, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { KitchenTrendCharts } from "@/components/charts/KitchenTrendCharts";

type TrafficColor = "green" | "yellow" | "red";

interface KitchenReport {
  id: string;
  report_date: string;
  food_revenue: number;
  food_cost: number;
  covers_total: number;
  plates_total: number;
  kitchen_staff_on_duty: number;
  kitchen_hours_total: number;
  kitchen_labour_cost: number | null;
  food_complaints: number;
  correct_orders: number;
  orders_total: number;
  food_waste_value: number | null;
  attendance_rate: number | null;
  turnover_rate: number | null;
  food_cost_pct: number | null;
  food_cost_per_cover: number | null;
  kitchen_labour_pct: number | null;
  prime_cost_pct: number | null;
  meals_per_employee: number | null;
  plates_per_hour: number | null;
  complaint_rate_pct: number | null;
  order_accuracy_pct: number | null;
  food_waste_pct: number | null;
}

// Ampellogik
function getFoodCostColor(pct: number): TrafficColor {
  if (pct >= 25 && pct <= 35) return "green";
  if (pct > 35 && pct <= 38) return "yellow";
  return "red";
}

function getLabourCostColor(pct: number): TrafficColor {
  if (pct >= 18 && pct <= 28) return "green";
  if (pct > 28 && pct <= 32) return "yellow";
  return "red";
}

function getMealsPerEmployeeColor(meals: number): TrafficColor {
  if (meals >= 25 && meals <= 45) return "green";
  if ((meals >= 20 && meals < 25) || (meals > 45 && meals <= 55)) return "yellow";
  return "red";
}

function getPlatesPerHourColor(plates: number): TrafficColor {
  if (plates >= 15 && plates <= 35) return "green";
  if (plates >= 10 && plates < 15) return "yellow";
  return "red";
}

function getComplaintRateColor(rate: number): TrafficColor {
  if (rate <= 1) return "green";
  if (rate <= 1.5) return "yellow";
  return "red";
}

function getOrderAccuracyColor(rate: number): TrafficColor {
  if (rate >= 98) return "green";
  if (rate >= 95) return "yellow";
  return "red";
}

function getFoodWasteColor(pct: number): TrafficColor {
  if (pct < 5) return "green";
  if (pct <= 10) return "yellow";
  return "red";
}

function getAttendanceColor(rate: number): TrafficColor {
  if (rate >= 95) return "green";
  if (rate >= 92) return "yellow";
  return "red";
}

const colorClasses: Record<TrafficColor, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

export function KitchenKpiView() {
  const [reports, setReports] = useState<KitchenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [aggregateView, setAggregateView] = useState<"week" | "month" | "year">("month");

  // Formular-State
  const [formData, setFormData] = useState({
    food_revenue: 0,
    food_cost: 0,
    covers_total: 0,
    plates_total: 0,
    kitchen_staff_on_duty: 0,
    kitchen_hours_total: 0,
    kitchen_labour_cost: 0,
    food_complaints: 0,
    correct_orders: 0,
    orders_total: 0,
    food_waste_value: 0,
    attendance_rate: 97,
    turnover_rate: 20,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kitchen_daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(365);

    if (error) {
      toast.error("Fehler beim Laden der Küchen-Reports");
      console.error(error);
    } else {
      setReports(data || []);
      // Lade Daten für ausgewähltes Datum
      const existingReport = data?.find(r => r.report_date === selectedDate);
      if (existingReport) {
        setFormData({
          food_revenue: existingReport.food_revenue,
          food_cost: existingReport.food_cost,
          covers_total: existingReport.covers_total,
          plates_total: existingReport.plates_total,
          kitchen_staff_on_duty: existingReport.kitchen_staff_on_duty,
          kitchen_hours_total: existingReport.kitchen_hours_total,
          kitchen_labour_cost: existingReport.kitchen_labour_cost || 0,
          food_complaints: existingReport.food_complaints,
          correct_orders: existingReport.correct_orders,
          orders_total: existingReport.orders_total,
          food_waste_value: existingReport.food_waste_value || 0,
          attendance_rate: existingReport.attendance_rate || 97,
          turnover_rate: existingReport.turnover_rate || 20,
        });
      }
    }
    setLoading(false);
  };

  // Berechnete KPIs
  const calculatedKpis = useMemo(() => {
    const { food_revenue, food_cost, covers_total, plates_total, kitchen_staff_on_duty, kitchen_hours_total, kitchen_labour_cost, food_complaints, correct_orders, orders_total, food_waste_value } = formData;

    return {
      food_cost_pct: food_revenue > 0 ? (food_cost / food_revenue) * 100 : 0,
      food_cost_per_cover: covers_total > 0 ? food_cost / covers_total : 0,
      kitchen_labour_pct: food_revenue > 0 && kitchen_labour_cost > 0 ? (kitchen_labour_cost / food_revenue) * 100 : 0,
      prime_cost_pct: food_revenue > 0 ? ((food_cost + kitchen_labour_cost) / food_revenue) * 100 : 0,
      meals_per_employee: kitchen_staff_on_duty > 0 ? covers_total / kitchen_staff_on_duty : 0,
      plates_per_hour: kitchen_hours_total > 0 ? plates_total / kitchen_hours_total : 0,
      complaint_rate_pct: covers_total > 0 ? (food_complaints / covers_total) * 100 : 0,
      order_accuracy_pct: orders_total > 0 ? (correct_orders / orders_total) * 100 : 0,
      food_waste_pct: food_cost > 0 && food_waste_value > 0 ? (food_waste_value / food_cost) * 100 : 0,
    };
  }, [formData]);

  const handleSave = async () => {
    setSaving(true);
    const reportData = {
      report_date: selectedDate,
      ...formData,
      ...calculatedKpis,
    };

    const existingReport = reports.find(r => r.report_date === selectedDate);

    if (existingReport) {
      const { error } = await supabase
        .from("kitchen_daily_reports")
        .update(reportData)
        .eq("id", existingReport.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
        console.error(error);
      } else {
        toast.success("Tagesreport aktualisiert");
        fetchReports();
      }
    } else {
      const { error } = await supabase
        .from("kitchen_daily_reports")
        .insert(reportData);

      if (error) {
        toast.error("Fehler beim Speichern");
        console.error(error);
      } else {
        toast.success("Tagesreport gespeichert");
        fetchReports();
      }
    }
    setSaving(false);
  };

  // Aggregierte Daten
  const aggregatedData = useMemo(() => {
    if (reports.length === 0) return null;

    let startDate: Date;
    const now = new Date();

    switch (aggregateView) {
      case "week":
        startDate = startOfWeek(now, { locale: de });
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
      case "year":
        startDate = startOfYear(now);
        break;
    }

    const filteredReports = reports.filter(r => new Date(r.report_date) >= startDate);

    if (filteredReports.length === 0) return null;

    const sum = (key: keyof KitchenReport) => 
      filteredReports.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    const avg = (key: keyof KitchenReport) => sum(key) / filteredReports.length;

    return {
      count: filteredReports.length,
      total_revenue: sum("food_revenue"),
      total_food_cost: sum("food_cost"),
      total_covers: sum("covers_total"),
      avg_food_cost_pct: avg("food_cost_pct"),
      avg_labour_pct: avg("kitchen_labour_pct"),
      avg_prime_cost_pct: avg("prime_cost_pct"),
      avg_meals_per_employee: avg("meals_per_employee"),
      avg_plates_per_hour: avg("plates_per_hour"),
      avg_complaint_rate: avg("complaint_rate_pct"),
      avg_order_accuracy: avg("order_accuracy_pct"),
      avg_food_waste: avg("food_waste_pct"),
    };
  }, [reports, aggregateView]);

  const renderKpiCard = (label: string, value: number, unit: string, color: TrafficColor, target: string) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value.toFixed(1)}{unit}</p>
            <p className="text-xs text-muted-foreground">{target}</p>
          </div>
          <div className={`w-4 h-4 rounded-full ${colorClasses[color]}`} />
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ChefHat className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Küchen-KPIs</h1>
          <p className="text-muted-foreground">Tägliche Erfassung und Auswertung</p>
        </div>
      </div>

      <Tabs defaultValue="input" className="space-y-4">
        <TabsList>
          <TabsTrigger value="input">Tageseingabe</TabsTrigger>
          <TabsTrigger value="kpis">Aktuelle KPIs</TabsTrigger>
          <TabsTrigger value="trends">Trends & Vergleiche</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Tagesreport Küche</span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto ml-auto"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Umsatz & Kosten */}
              <div>
                <h3 className="font-semibold mb-3">Umsatz & Kosten</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Speisenumsatz (€)</Label>
                    <Input
                      type="number"
                      value={formData.food_revenue}
                      onChange={(e) => setFormData({ ...formData, food_revenue: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Wareneinsatz (€)</Label>
                    <Input
                      type="number"
                      value={formData.food_cost}
                      onChange={(e) => setFormData({ ...formData, food_cost: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Personalkosten Küche (€)</Label>
                    <Input
                      type="number"
                      value={formData.kitchen_labour_cost}
                      onChange={(e) => setFormData({ ...formData, kitchen_labour_cost: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Food Waste Wert (€)</Label>
                    <Input
                      type="number"
                      value={formData.food_waste_value}
                      onChange={(e) => setFormData({ ...formData, food_waste_value: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Produktion */}
              <div>
                <h3 className="font-semibold mb-3">Produktion</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Covers gesamt</Label>
                    <Input
                      type="number"
                      value={formData.covers_total}
                      onChange={(e) => setFormData({ ...formData, covers_total: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Teller gesamt</Label>
                    <Input
                      type="number"
                      value={formData.plates_total}
                      onChange={(e) => setFormData({ ...formData, plates_total: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Küchen-MA im Einsatz</Label>
                    <Input
                      type="number"
                      value={formData.kitchen_staff_on_duty}
                      onChange={(e) => setFormData({ ...formData, kitchen_staff_on_duty: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Küchenstunden gesamt</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.kitchen_hours_total}
                      onChange={(e) => setFormData({ ...formData, kitchen_hours_total: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Qualität */}
              <div>
                <h3 className="font-semibold mb-3">Qualität</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Bestellungen gesamt</Label>
                    <Input
                      type="number"
                      value={formData.orders_total}
                      onChange={(e) => setFormData({ ...formData, orders_total: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Korrekte Bestellungen</Label>
                    <Input
                      type="number"
                      value={formData.correct_orders}
                      onChange={(e) => setFormData({ ...formData, correct_orders: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Beschwerden Speisen</Label>
                    <Input
                      type="number"
                      value={formData.food_complaints}
                      onChange={(e) => setFormData({ ...formData, food_complaints: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Personal */}
              <div>
                <h3 className="font-semibold mb-3">Personal</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Anwesenheitsquote (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.attendance_rate}
                      onChange={(e) => setFormData({ ...formData, attendance_rate: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Fluktuation p.a. (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.turnover_rate}
                      onChange={(e) => setFormData({ ...formData, turnover_rate: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichern..." : "Tagesreport speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {renderKpiCard("Food Cost", calculatedKpis.food_cost_pct, "%", getFoodCostColor(calculatedKpis.food_cost_pct), "Ziel: 25-35%")}
            {renderKpiCard("Kitchen Labour", calculatedKpis.kitchen_labour_pct, "%", getLabourCostColor(calculatedKpis.kitchen_labour_pct), "Ziel: 18-28%")}
            {renderKpiCard("Prime Cost", calculatedKpis.prime_cost_pct, "%", calculatedKpis.prime_cost_pct <= 65 ? "green" : calculatedKpis.prime_cost_pct <= 70 ? "yellow" : "red", "Ziel: ≤65%")}
            {renderKpiCard("Food Cost/Cover", calculatedKpis.food_cost_per_cover, "€", "green", "Benchmark abhängig")}
            {renderKpiCard("Meals/MA", calculatedKpis.meals_per_employee, "", getMealsPerEmployeeColor(calculatedKpis.meals_per_employee), "Ziel: 25-45")}
            {renderKpiCard("Teller/Stunde", calculatedKpis.plates_per_hour, "", getPlatesPerHourColor(calculatedKpis.plates_per_hour), "Ziel: 15-35")}
            {renderKpiCard("Order Accuracy", calculatedKpis.order_accuracy_pct, "%", getOrderAccuracyColor(calculatedKpis.order_accuracy_pct), "Ziel: ≥98%")}
            {renderKpiCard("Beschwerderate", calculatedKpis.complaint_rate_pct, "%", getComplaintRateColor(calculatedKpis.complaint_rate_pct), "Ziel: ≤1%")}
            {renderKpiCard("Food Waste", calculatedKpis.food_waste_pct, "%", getFoodWasteColor(calculatedKpis.food_waste_pct), "Ziel: <5%")}
            {renderKpiCard("Anwesenheit", formData.attendance_rate, "%", getAttendanceColor(formData.attendance_rate), "Ziel: ≥95%")}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              KPI-Trends (letzte 30 Tage)
            </h3>
            <KitchenTrendCharts reports={reports} daysToShow={30} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Aggregierte Auswertung</span>
                <Select value={aggregateView} onValueChange={(v) => setAggregateView(v as "week" | "month" | "year")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Woche</SelectItem>
                    <SelectItem value="month">Monat</SelectItem>
                    <SelectItem value="year">Jahr</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aggregatedData ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Erfasste Tage</p>
                    <p className="text-2xl font-bold">{aggregatedData.count}</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Gesamtumsatz</p>
                    <p className="text-2xl font-bold">{aggregatedData.total_revenue.toLocaleString("de-DE")} €</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Ø Food Cost</p>
                    <p className="text-2xl font-bold">{aggregatedData.avg_food_cost_pct.toFixed(1)}%</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Ø Order Accuracy</p>
                    <p className="text-2xl font-bold">{aggregatedData.avg_order_accuracy.toFixed(1)}%</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Keine Daten für diesen Zeitraum</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
