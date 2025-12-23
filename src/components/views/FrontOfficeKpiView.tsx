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
import { ConciergeBell, Save, TrendingUp } from "lucide-react";
import { FrontOfficeTrendCharts } from "@/components/charts/FrontOfficeTrendCharts";

type TrafficColor = "green" | "yellow" | "red";

interface FrontOfficeReport {
  id: string;
  report_date: string;
  arrivals_total: number;
  departures_total: number;
  avg_checkin_time_sec: number;
  avg_checkout_time_sec: number;
  avg_queue_time_sec: number | null;
  fo_staff_on_duty: number;
  fo_hours_total: number;
  requests_total: number;
  requests_resolved_first_contact: number;
  fo_complaints: number;
  upsell_attempts: number;
  upsell_successes: number;
  upsell_revenue: number;
  fo_ratings_count: number;
  fo_ratings_sum: number;
  attendance_rate: number | null;
  turnover_rate: number | null;
  guests_per_fo_employee: number | null;
  requests_per_hour: number | null;
  fcr_pct: number | null;
  fo_complaint_rate_pct: number | null;
  avg_fo_rating: number | null;
  upsell_conversion_pct: number | null;
  upsell_rev_per_arrival: number | null;
}

// Ampellogik
function getCheckinTimeColor(minutes: number): TrafficColor {
  if (minutes <= 5) return "green";
  if (minutes <= 7) return "yellow";
  return "red";
}

function getCheckoutTimeColor(minutes: number): TrafficColor {
  if (minutes <= 3) return "green";
  if (minutes <= 5) return "yellow";
  return "red";
}

function getQueueTimeColor(minutes: number): TrafficColor {
  if (minutes <= 5) return "green";
  if (minutes <= 10) return "yellow";
  return "red";
}

function getRequestsPerHourColor(val: number): TrafficColor {
  if (val >= 5 && val <= 12) return "green";
  if ((val >= 3 && val < 5) || (val > 12 && val <= 15)) return "yellow";
  return "red";
}

function getFcrColor(pct: number): TrafficColor {
  if (pct >= 85) return "green";
  if (pct >= 75) return "yellow";
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

function getUpsellConversionColor(pct: number): TrafficColor {
  if (pct >= 10) return "green";
  if (pct >= 5) return "yellow";
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

export function FrontOfficeKpiView() {
  const [reports, setReports] = useState<FrontOfficeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [aggregateView, setAggregateView] = useState<"week" | "month" | "year">("month");

  const [formData, setFormData] = useState({
    arrivals_total: 0,
    departures_total: 0,
    avg_checkin_time_sec: 300,
    avg_checkout_time_sec: 180,
    avg_queue_time_sec: 180,
    fo_staff_on_duty: 0,
    fo_hours_total: 0,
    requests_total: 0,
    requests_resolved_first_contact: 0,
    fo_complaints: 0,
    upsell_attempts: 0,
    upsell_successes: 0,
    upsell_revenue: 0,
    fo_ratings_count: 0,
    fo_ratings_sum: 0,
    attendance_rate: 97,
    turnover_rate: 20,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("frontoffice_daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(365);

    if (error) {
      toast.error("Fehler beim Laden der Rezeption-Reports");
      console.error(error);
    } else {
      setReports(data || []);
      const existingReport = data?.find(r => r.report_date === selectedDate);
      if (existingReport) {
        setFormData({
          arrivals_total: existingReport.arrivals_total,
          departures_total: existingReport.departures_total,
          avg_checkin_time_sec: existingReport.avg_checkin_time_sec,
          avg_checkout_time_sec: existingReport.avg_checkout_time_sec,
          avg_queue_time_sec: existingReport.avg_queue_time_sec || 180,
          fo_staff_on_duty: existingReport.fo_staff_on_duty,
          fo_hours_total: existingReport.fo_hours_total,
          requests_total: existingReport.requests_total,
          requests_resolved_first_contact: existingReport.requests_resolved_first_contact,
          fo_complaints: existingReport.fo_complaints,
          upsell_attempts: existingReport.upsell_attempts,
          upsell_successes: existingReport.upsell_successes,
          upsell_revenue: existingReport.upsell_revenue,
          fo_ratings_count: existingReport.fo_ratings_count,
          fo_ratings_sum: existingReport.fo_ratings_sum,
          attendance_rate: existingReport.attendance_rate || 97,
          turnover_rate: existingReport.turnover_rate || 20,
        });
      }
    }
    setLoading(false);
  };

  const calculatedKpis = useMemo(() => {
    const { arrivals_total, departures_total, fo_staff_on_duty, fo_hours_total, requests_total, requests_resolved_first_contact, fo_complaints, upsell_attempts, upsell_successes, upsell_revenue, fo_ratings_count, fo_ratings_sum } = formData;

    const guestMovements = arrivals_total + departures_total;

    return {
      guests_per_fo_employee: fo_staff_on_duty > 0 ? guestMovements / fo_staff_on_duty : 0,
      requests_per_hour: fo_hours_total > 0 ? requests_total / fo_hours_total : 0,
      fcr_pct: requests_total > 0 ? (requests_resolved_first_contact / requests_total) * 100 : 0,
      fo_complaint_rate_pct: guestMovements > 0 ? (fo_complaints / guestMovements) * 100 : 0,
      avg_fo_rating: fo_ratings_count > 0 ? fo_ratings_sum / fo_ratings_count : 0,
      upsell_conversion_pct: upsell_attempts > 0 ? (upsell_successes / upsell_attempts) * 100 : 0,
      upsell_rev_per_arrival: arrivals_total > 0 ? upsell_revenue / arrivals_total : 0,
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
        .from("frontoffice_daily_reports")
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
        .from("frontoffice_daily_reports")
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

    const sum = (key: keyof FrontOfficeReport) => 
      filteredReports.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    const avg = (key: keyof FrontOfficeReport) => sum(key) / filteredReports.length;

    return {
      count: filteredReports.length,
      total_arrivals: sum("arrivals_total"),
      total_departures: sum("departures_total"),
      total_upsell_revenue: sum("upsell_revenue"),
      avg_checkin_min: avg("avg_checkin_time_sec") / 60,
      avg_checkout_min: avg("avg_checkout_time_sec") / 60,
      avg_fcr: avg("fcr_pct"),
      avg_rating: avg("avg_fo_rating"),
      avg_upsell_conversion: avg("upsell_conversion_pct"),
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

  const checkinMinutes = formData.avg_checkin_time_sec / 60;
  const checkoutMinutes = formData.avg_checkout_time_sec / 60;
  const queueMinutes = formData.avg_queue_time_sec / 60;

  return (
    <div className="space-y-6 p-6 overflow-auto">
      <div className="flex items-center gap-3">
        <ConciergeBell className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Rezeption-KPIs</h1>
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
                <span>Tagesreport Rezeption</span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Anreisen & Abreisen */}
              <div>
                <h3 className="font-semibold mb-3">Anreisen & Abreisen</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Anreisen</Label>
                    <Input
                      type="number"
                      value={formData.arrivals_total}
                      onChange={(e) => setFormData({ ...formData, arrivals_total: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Abreisen</Label>
                    <Input
                      type="number"
                      value={formData.departures_total}
                      onChange={(e) => setFormData({ ...formData, departures_total: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Ø Check-in Zeit (Sek)</Label>
                    <Input
                      type="number"
                      value={formData.avg_checkin_time_sec}
                      onChange={(e) => setFormData({ ...formData, avg_checkin_time_sec: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Ø Check-out Zeit (Sek)</Label>
                    <Input
                      type="number"
                      value={formData.avg_checkout_time_sec}
                      onChange={(e) => setFormData({ ...formData, avg_checkout_time_sec: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Ø Wartezeit (Sek)</Label>
                    <Input
                      type="number"
                      value={formData.avg_queue_time_sec}
                      onChange={(e) => setFormData({ ...formData, avg_queue_time_sec: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Personal */}
              <div>
                <h3 className="font-semibold mb-3">Personal</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>FO-MA im Einsatz</Label>
                    <Input
                      type="number"
                      value={formData.fo_staff_on_duty}
                      onChange={(e) => setFormData({ ...formData, fo_staff_on_duty: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>FO-Stunden gesamt</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.fo_hours_total}
                      onChange={(e) => setFormData({ ...formData, fo_hours_total: Number(e.target.value) })}
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

              {/* Anfragen & Qualität */}
              <div>
                <h3 className="font-semibold mb-3">Anfragen & Qualität</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Anfragen gesamt</Label>
                    <Input
                      type="number"
                      value={formData.requests_total}
                      onChange={(e) => setFormData({ ...formData, requests_total: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Beim 1. Kontakt gelöst</Label>
                    <Input
                      type="number"
                      value={formData.requests_resolved_first_contact}
                      onChange={(e) => setFormData({ ...formData, requests_resolved_first_contact: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Beschwerden FO</Label>
                    <Input
                      type="number"
                      value={formData.fo_complaints}
                      onChange={(e) => setFormData({ ...formData, fo_complaints: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Upselling */}
              <div>
                <h3 className="font-semibold mb-3">Upselling</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Upsell-Versuche</Label>
                    <Input
                      type="number"
                      value={formData.upsell_attempts}
                      onChange={(e) => setFormData({ ...formData, upsell_attempts: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Erfolgreiche Upsells</Label>
                    <Input
                      type="number"
                      value={formData.upsell_successes}
                      onChange={(e) => setFormData({ ...formData, upsell_successes: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Upsell-Umsatz (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.upsell_revenue}
                      onChange={(e) => setFormData({ ...formData, upsell_revenue: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Bewertungen */}
              <div>
                <h3 className="font-semibold mb-3">Gästebewertungen</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Anzahl FO-Bewertungen</Label>
                    <Input
                      type="number"
                      value={formData.fo_ratings_count}
                      onChange={(e) => setFormData({ ...formData, fo_ratings_count: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Summe Bewertungspunkte</Label>
                    <Input
                      type="number"
                      value={formData.fo_ratings_sum}
                      onChange={(e) => setFormData({ ...formData, fo_ratings_sum: Number(e.target.value) })}
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
            {renderKpiCard("Ø Check-in Zeit", checkinMinutes, " Min", getCheckinTimeColor(checkinMinutes), "Ziel: ≤5 Min")}
            {renderKpiCard("Ø Check-out Zeit", checkoutMinutes, " Min", getCheckoutTimeColor(checkoutMinutes), "Ziel: ≤3 Min")}
            {renderKpiCard("Ø Wartezeit", queueMinutes, " Min", getQueueTimeColor(queueMinutes), "Ziel: ≤5 Min")}
            {renderKpiCard("Gäste/FO-MA", calculatedKpis.guests_per_fo_employee, "", "green", "Abhängig von Struktur")}
            {renderKpiCard("Anfragen/Stunde", calculatedKpis.requests_per_hour, "", getRequestsPerHourColor(calculatedKpis.requests_per_hour), "Ziel: 5-12")}
            {renderKpiCard("FCR", calculatedKpis.fcr_pct, "%", getFcrColor(calculatedKpis.fcr_pct), "Ziel: ≥85%")}
            {renderKpiCard("Beschwerderate", calculatedKpis.fo_complaint_rate_pct, "%", getComplaintRateColor(calculatedKpis.fo_complaint_rate_pct), "Ziel: ≤0.5%")}
            {renderKpiCard("Ø FO-Bewertung", calculatedKpis.avg_fo_rating, "/5", getAvgRatingColor(calculatedKpis.avg_fo_rating), "Ziel: ≥4.5")}
            {renderKpiCard("Upsell Conversion", calculatedKpis.upsell_conversion_pct, "%", getUpsellConversionColor(calculatedKpis.upsell_conversion_pct), "Ziel: ≥10%")}
            {renderKpiCard("Upsell/Anreise", calculatedKpis.upsell_rev_per_arrival, "€", "green", "Benchmark abhängig")}
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
            <FrontOfficeTrendCharts reports={reports} daysToShow={30} />
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
                    <p className="text-sm text-muted-foreground">Anreisen gesamt</p>
                    <p className="text-2xl font-bold">{aggregatedData.total_arrivals}</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Ø Check-in</p>
                    <p className="text-2xl font-bold">{aggregatedData.avg_checkin_min.toFixed(1)} Min</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Upsell-Umsatz</p>
                    <p className="text-2xl font-bold">{aggregatedData.total_upsell_revenue.toLocaleString("de-DE")} €</p>
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
