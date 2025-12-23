import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { de } from "date-fns/locale";
import { UtensilsCrossed, Save, TrendingUp } from "lucide-react";
import { ServiceTrendCharts } from "@/components/charts/ServiceTrendCharts";

type TrafficColor = "green" | "yellow" | "red";

interface ServiceReport {
  id: string;
  report_date: string;
  service_revenue: number;
  covers_total: number;
  tables_served: number;
  tables_available: number | null;
  service_staff_on_duty: number;
  service_hours_total: number;
  service_errors: number;
  items_total: number;
  service_complaints: number;
  service_ratings_count: number;
  service_ratings_sum: number;
  csat_positive_count: number | null;
  csat_total_respondents: number | null;
  attendance_rate: number | null;
  turnover_rate: number | null;
  sales_per_cover: number | null;
  sales_per_server: number | null;
  covers_per_server_per_hour: number | null;
  table_turnover_rate: number | null;
  service_error_rate_pct: number | null;
  service_complaint_rate_pct: number | null;
  avg_service_rating: number | null;
  csat_pct: number | null;
}

// Ampellogik
function getCoversPerHourColor(val: number): TrafficColor {
  if (val >= 6 && val <= 10) return "green";
  if ((val >= 4 && val < 6) || (val > 10 && val <= 12)) return "yellow";
  return "red";
}

function getErrorRateColor(rate: number): TrafficColor {
  if (rate <= 0.5) return "green";
  if (rate <= 1) return "yellow";
  return "red";
}

function getComplaintRateColor(rate: number): TrafficColor {
  if (rate <= 0.5) return "green";
  if (rate <= 1.5) return "yellow";
  return "red";
}

function getAvgRatingColor(rating: number): TrafficColor {
  if (rating >= 4.5) return "green";
  if (rating >= 4.2) return "yellow";
  return "red";
}

function getCsatColor(pct: number): TrafficColor {
  if (pct >= 90) return "green";
  if (pct >= 85) return "yellow";
  return "red";
}

function getAttendanceColor(rate: number): TrafficColor {
  if (rate >= 95) return "green";
  if (rate >= 92) return "yellow";
  return "red";
}

function getTurnoverColor(rate: number): TrafficColor {
  if (rate < 25) return "green";
  if (rate <= 30) return "yellow";
  return "red";
}

const colorClasses: Record<TrafficColor, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

export function ServiceKpiView() {
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [aggregateView, setAggregateView] = useState<"week" | "month" | "year">("month");

  // Formular-State
  const [formData, setFormData] = useState({
    service_revenue: 0,
    covers_total: 0,
    tables_served: 0,
    tables_available: 20,
    service_staff_on_duty: 0,
    service_hours_total: 0,
    service_errors: 0,
    items_total: 0,
    service_complaints: 0,
    service_ratings_count: 0,
    service_ratings_sum: 0,
    csat_positive_count: 0,
    csat_total_respondents: 0,
    attendance_rate: 97,
    turnover_rate: 20,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(365);

    if (error) {
      toast.error("Fehler beim Laden der Service-Reports");
      console.error(error);
    } else {
      setReports(data || []);
      const existingReport = data?.find(r => r.report_date === selectedDate);
      if (existingReport) {
        setFormData({
          service_revenue: existingReport.service_revenue,
          covers_total: existingReport.covers_total,
          tables_served: existingReport.tables_served,
          tables_available: existingReport.tables_available || 20,
          service_staff_on_duty: existingReport.service_staff_on_duty,
          service_hours_total: existingReport.service_hours_total,
          service_errors: existingReport.service_errors,
          items_total: existingReport.items_total,
          service_complaints: existingReport.service_complaints,
          service_ratings_count: existingReport.service_ratings_count,
          service_ratings_sum: existingReport.service_ratings_sum,
          csat_positive_count: existingReport.csat_positive_count || 0,
          csat_total_respondents: existingReport.csat_total_respondents || 0,
          attendance_rate: existingReport.attendance_rate || 97,
          turnover_rate: existingReport.turnover_rate || 20,
        });
      }
    }
    setLoading(false);
  };

  // Berechnete KPIs
  const calculatedKpis = useMemo(() => {
    const { service_revenue, covers_total, tables_served, tables_available, service_staff_on_duty, service_hours_total, service_errors, items_total, service_complaints, service_ratings_count, service_ratings_sum, csat_positive_count, csat_total_respondents } = formData;

    const totalServiceHours = service_staff_on_duty * service_hours_total;

    return {
      sales_per_cover: covers_total > 0 ? service_revenue / covers_total : 0,
      sales_per_server: service_staff_on_duty > 0 ? service_revenue / service_staff_on_duty : 0,
      covers_per_server_per_hour: totalServiceHours > 0 ? covers_total / totalServiceHours : 0,
      table_turnover_rate: tables_available > 0 ? tables_served / tables_available : 0,
      service_error_rate_pct: items_total > 0 ? (service_errors / items_total) * 100 : 0,
      service_complaint_rate_pct: covers_total > 0 ? (service_complaints / covers_total) * 100 : 0,
      avg_service_rating: service_ratings_count > 0 ? service_ratings_sum / service_ratings_count : 0,
      csat_pct: csat_total_respondents > 0 ? (csat_positive_count / csat_total_respondents) * 100 : 0,
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
        .from("service_daily_reports")
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
        .from("service_daily_reports")
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

    const sum = (key: keyof ServiceReport) => 
      filteredReports.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    const avg = (key: keyof ServiceReport) => sum(key) / filteredReports.length;

    return {
      count: filteredReports.length,
      total_revenue: sum("service_revenue"),
      total_covers: sum("covers_total"),
      avg_sales_per_cover: avg("sales_per_cover"),
      avg_covers_per_hour: avg("covers_per_server_per_hour"),
      avg_error_rate: avg("service_error_rate_pct"),
      avg_complaint_rate: avg("service_complaint_rate_pct"),
      avg_rating: avg("avg_service_rating"),
      avg_csat: avg("csat_pct"),
    };
  }, [reports, aggregateView]);

  const renderKpiCard = (label: string, value: number, unit: string, color: TrafficColor, target: string) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value.toFixed(unit === "€" ? 2 : 1)}{unit}</p>
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
    <div className="space-y-6 p-6 overflow-auto">
      <div className="flex items-center gap-3">
        <UtensilsCrossed className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Service-KPIs</h1>
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
              <CardTitle className="flex items-center justify-between">
                <span>Tagesreport Service</span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Umsatz & Gäste */}
              <div>
                <h3 className="font-semibold mb-3">Umsatz & Gäste</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Service-Umsatz (€)</Label>
                    <Input
                      type="number"
                      value={formData.service_revenue}
                      onChange={(e) => setFormData({ ...formData, service_revenue: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Covers gesamt</Label>
                    <Input
                      type="number"
                      value={formData.covers_total}
                      onChange={(e) => setFormData({ ...formData, covers_total: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Bediente Tische</Label>
                    <Input
                      type="number"
                      value={formData.tables_served}
                      onChange={(e) => setFormData({ ...formData, tables_served: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Verfügbare Tische</Label>
                    <Input
                      type="number"
                      value={formData.tables_available}
                      onChange={(e) => setFormData({ ...formData, tables_available: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Personal */}
              <div>
                <h3 className="font-semibold mb-3">Personal</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Service-MA im Einsatz</Label>
                    <Input
                      type="number"
                      value={formData.service_staff_on_duty}
                      onChange={(e) => setFormData({ ...formData, service_staff_on_duty: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Stunden pro MA</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.service_hours_total}
                      onChange={(e) => setFormData({ ...formData, service_hours_total: Number(e.target.value) })}
                    />
                  </div>
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

              {/* Qualität */}
              <div>
                <h3 className="font-semibold mb-3">Qualität</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Items/Bestellungen gesamt</Label>
                    <Input
                      type="number"
                      value={formData.items_total}
                      onChange={(e) => setFormData({ ...formData, items_total: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Service-Fehler</Label>
                    <Input
                      type="number"
                      value={formData.service_errors}
                      onChange={(e) => setFormData({ ...formData, service_errors: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Beschwerden Service</Label>
                    <Input
                      type="number"
                      value={formData.service_complaints}
                      onChange={(e) => setFormData({ ...formData, service_complaints: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Bewertungen */}
              <div>
                <h3 className="font-semibold mb-3">Gästebewertungen</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Anzahl Bewertungen</Label>
                    <Input
                      type="number"
                      value={formData.service_ratings_count}
                      onChange={(e) => setFormData({ ...formData, service_ratings_count: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Summe Bewertungspunkte</Label>
                    <Input
                      type="number"
                      value={formData.service_ratings_sum}
                      onChange={(e) => setFormData({ ...formData, service_ratings_sum: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>CSAT: Zufriedene Gäste</Label>
                    <Input
                      type="number"
                      value={formData.csat_positive_count}
                      onChange={(e) => setFormData({ ...formData, csat_positive_count: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>CSAT: Befragte gesamt</Label>
                    <Input
                      type="number"
                      value={formData.csat_total_respondents}
                      onChange={(e) => setFormData({ ...formData, csat_total_respondents: Number(e.target.value) })}
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
            {renderKpiCard("Sales/Cover", calculatedKpis.sales_per_cover, "€", "green", "Abhängig von Preismodell")}
            {renderKpiCard("Sales/Server", calculatedKpis.sales_per_server, "€", "green", "Produktivitätsindikator")}
            {renderKpiCard("Covers/MA/Stunde", calculatedKpis.covers_per_server_per_hour, "", getCoversPerHourColor(calculatedKpis.covers_per_server_per_hour), "Ziel: 6-10")}
            {renderKpiCard("Tisch-Umschlag", calculatedKpis.table_turnover_rate, "x", "green", "1-2 bei Resort")}
            {renderKpiCard("Fehlerrate", calculatedKpis.service_error_rate_pct, "%", getErrorRateColor(calculatedKpis.service_error_rate_pct), "Ziel: ≤0.5%")}
            {renderKpiCard("Beschwerderate", calculatedKpis.service_complaint_rate_pct, "%", getComplaintRateColor(calculatedKpis.service_complaint_rate_pct), "Ziel: ≤0.5%")}
            {renderKpiCard("Ø Service-Bewertung", calculatedKpis.avg_service_rating, "/5", getAvgRatingColor(calculatedKpis.avg_service_rating), "Ziel: ≥4.5")}
            {renderKpiCard("CSAT", calculatedKpis.csat_pct, "%", getCsatColor(calculatedKpis.csat_pct), "Ziel: ≥90%")}
            {renderKpiCard("Anwesenheit", formData.attendance_rate, "%", getAttendanceColor(formData.attendance_rate), "Ziel: ≥95%")}
            {renderKpiCard("Fluktuation", formData.turnover_rate, "%", getTurnoverColor(formData.turnover_rate), "Ziel: <25%")}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              KPI-Trends (letzte 30 Tage)
            </h3>
            <ServiceTrendCharts reports={reports} daysToShow={30} />
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
                    <p className="text-sm text-muted-foreground">Ø Sales/Cover</p>
                    <p className="text-2xl font-bold">{aggregatedData.avg_sales_per_cover.toFixed(2)} €</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Ø Bewertung</p>
                    <p className="text-2xl font-bold">{aggregatedData.avg_rating.toFixed(1)}/5</p>
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
