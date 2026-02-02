import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { Sparkles, TrendingUp, Users, Euro, AlertTriangle, Star, Calendar, XCircle } from "lucide-react";
import { SpaTrendCharts } from "@/components/charts/SpaTrendCharts";

type TrafficLight = "green" | "yellow" | "red";

interface KpiThresholds {
  green: [number, number];
  yellow: [number, number];
}

const getTrafficLight = (value: number | null, thresholds: KpiThresholds, inverse = false): TrafficLight => {
  if (value === null) return "yellow";
  
  if (inverse) {
    if (value <= thresholds.green[1]) return "green";
    if (value <= thresholds.yellow[1]) return "yellow";
    return "red";
  }
  
  if (value >= thresholds.green[0]) return "green";
  if (value >= thresholds.yellow[0]) return "yellow";
  return "red";
};

const trafficLightColors: Record<TrafficLight, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

// Schwellenwerte für Spa-KPIs
const thresholds = {
  roomUtilization: { green: [75, 100], yellow: [60, 74] },
  therapistUtilization: { green: [80, 100], yellow: [65, 79] },
  spaRating: { green: [4.5, 5], yellow: [4.2, 4.4] },
  complaintRate: { green: [0, 1], yellow: [1, 2] },
  noShowRate: { green: [0, 5], yellow: [5, 10] },
  retailRatio: { green: [15, 100], yellow: [10, 14] },
};

export function SpaKpiView() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [daysToShow, setDaysToShow] = useState(14);

  // Formular-State
  const [formData, setFormData] = useState({
    available_treatment_hours: "",
    booked_treatment_hours: "",
    treatments_total: "",
    guests_total: "",
    therapists_on_duty: "",
    therapist_hours_total: "",
    spa_revenue: "",
    retail_revenue: "",
    no_shows: "",
    cancellations: "",
    bookings_total: "",
    spa_complaints: "",
    spa_ratings_count: "",
    spa_ratings_sum: "",
    attendance_rate: "",
    turnover_rate: "",
  });

  // Daten laden
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["spa-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spa_daily_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(90);
      
      if (error) throw error;
      return data;
    },
  });

  // Aktuellen Tagesbericht laden
  const { data: currentReport } = useQuery({
    queryKey: ["spa-report", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spa_daily_reports")
        .select("*")
        .eq("report_date", selectedDate)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation zum Speichern
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        report_date: selectedDate,
        available_treatment_hours: parseFloat(data.available_treatment_hours) || 0,
        booked_treatment_hours: parseFloat(data.booked_treatment_hours) || 0,
        treatments_total: parseInt(data.treatments_total) || 0,
        guests_total: parseInt(data.guests_total) || 0,
        therapists_on_duty: parseInt(data.therapists_on_duty) || 0,
        therapist_hours_total: parseFloat(data.therapist_hours_total) || 0,
        spa_revenue: parseFloat(data.spa_revenue) || 0,
        retail_revenue: parseFloat(data.retail_revenue) || 0,
        no_shows: parseInt(data.no_shows) || 0,
        cancellations: parseInt(data.cancellations) || 0,
        bookings_total: parseInt(data.bookings_total) || 0,
        spa_complaints: parseInt(data.spa_complaints) || 0,
        spa_ratings_count: parseInt(data.spa_ratings_count) || 0,
        spa_ratings_sum: parseInt(data.spa_ratings_sum) || 0,
        attendance_rate: data.attendance_rate ? parseFloat(data.attendance_rate) : null,
        turnover_rate: data.turnover_rate ? parseFloat(data.turnover_rate) : null,
      };

      if (currentReport) {
        const { error } = await supabase
          .from("spa_daily_reports")
          .update(payload)
          .eq("id", currentReport.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("spa_daily_reports")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spa-reports"] });
      queryClient.invalidateQueries({ queryKey: ["spa-report", selectedDate] });
      toast.success("Spa-Bericht gespeichert");
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });

  // Formular mit bestehendem Bericht befüllen
  const loadReportToForm = () => {
    if (currentReport) {
      setFormData({
        available_treatment_hours: currentReport.available_treatment_hours?.toString() || "",
        booked_treatment_hours: currentReport.booked_treatment_hours?.toString() || "",
        treatments_total: currentReport.treatments_total?.toString() || "",
        guests_total: currentReport.guests_total?.toString() || "",
        therapists_on_duty: currentReport.therapists_on_duty?.toString() || "",
        therapist_hours_total: currentReport.therapist_hours_total?.toString() || "",
        spa_revenue: currentReport.spa_revenue?.toString() || "",
        retail_revenue: currentReport.retail_revenue?.toString() || "",
        no_shows: currentReport.no_shows?.toString() || "",
        cancellations: currentReport.cancellations?.toString() || "",
        bookings_total: currentReport.bookings_total?.toString() || "",
        spa_complaints: currentReport.spa_complaints?.toString() || "",
        spa_ratings_count: currentReport.spa_ratings_count?.toString() || "",
        spa_ratings_sum: currentReport.spa_ratings_sum?.toString() || "",
        attendance_rate: currentReport.attendance_rate?.toString() || "",
        turnover_rate: currentReport.turnover_rate?.toString() || "",
      });
    }
  };

  // Aggregierte Werte berechnen
  const last7Days = reports.filter(r => 
    new Date(r.report_date) >= subDays(new Date(), 7)
  );
  
  const avgRoomUtilization = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.room_utilization_pct || 0), 0) / last7Days.length 
    : null;
  const avgTherapistUtilization = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.therapist_utilization_pct || 0), 0) / last7Days.length 
    : null;
  const avgSpaRating = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.avg_spa_rating || 0), 0) / last7Days.length 
    : null;
  const avgComplaintRate = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.complaint_rate_pct || 0), 0) / last7Days.length 
    : null;
  const avgNoShowRate = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.no_show_rate_pct || 0), 0) / last7Days.length 
    : null;
  const avgRetailRatio = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.retail_ratio_pct || 0), 0) / last7Days.length 
    : null;
  const totalRevenue = last7Days.reduce((sum, r) => sum + (r.spa_revenue || 0) + (r.retail_revenue || 0), 0);
  const totalGuests = last7Days.reduce((sum, r) => sum + (r.guests_total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Spa & Wellness KPIs</h2>
      </div>

      <Tabs defaultValue="input">
        <TabsList>
          <TabsTrigger value="input">Tageseingabe</TabsTrigger>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* KPI-Karten */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Raum-Auslastung</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgRoomUtilization, thresholds.roomUtilization as KpiThresholds)]}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgRoomUtilization?.toFixed(1) ?? "-"}%
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Therapeuten-Auslastung</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgTherapistUtilization, thresholds.therapistUtilization as KpiThresholds)]}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgTherapistUtilization?.toFixed(1) ?? "-"}%
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Spa Rating</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgSpaRating, thresholds.spaRating as KpiThresholds)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">
                    {avgSpaRating?.toFixed(2) ?? "-"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Beschwerderate</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgComplaintRate, thresholds.complaintRate as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold">
                    {avgComplaintRate?.toFixed(2) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø No-Show Rate</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgNoShowRate, thresholds.noShowRate as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold">
                    {avgNoShowRate?.toFixed(1) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Retail Ratio</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgRetailRatio, thresholds.retailRatio as KpiThresholds)]}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgRetailRatio?.toFixed(1) ?? "-"}%
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gesamt-Umsatz</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{totalRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gäste gesamt</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalGuests}</div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>
          </div>

          {/* Letzte Berichte */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Letzte Tagesberichte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto touch-pan-x touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">Datum</th>
                      <th className="py-2 text-right">Raum %</th>
                      <th className="py-2 text-right">Therap. %</th>
                      <th className="py-2 text-right">Rating</th>
                      <th className="py-2 text-right">No-Show %</th>
                      <th className="py-2 text-right">Retail %</th>
                      <th className="py-2 text-right">Umsatz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 10).map((report) => (
                      <tr key={report.id} className="border-b">
                        <td className="py-2">
                          {format(new Date(report.report_date), "dd.MM.yyyy", { locale: de })}
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.room_utilization_pct, thresholds.roomUtilization as KpiThresholds)] + " text-white"}>
                            {report.room_utilization_pct?.toFixed(1) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.therapist_utilization_pct, thresholds.therapistUtilization as KpiThresholds)] + " text-white"}>
                            {report.therapist_utilization_pct?.toFixed(1) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.avg_spa_rating, thresholds.spaRating as KpiThresholds)] + " text-white"}>
                            {report.avg_spa_rating?.toFixed(2) ?? "-"}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.no_show_rate_pct, thresholds.noShowRate as KpiThresholds, true)] + " text-white"}>
                            {report.no_show_rate_pct?.toFixed(1) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.retail_ratio_pct, thresholds.retailRatio as KpiThresholds)] + " text-white"}>
                            {report.retail_ratio_pct?.toFixed(1) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right font-medium">
                          €{((report.spa_revenue || 0) + (report.retail_revenue || 0)).toLocaleString("de-DE")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tagesbericht erfassen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                {currentReport && (
                  <div className="pt-6">
                    <Button variant="outline" onClick={loadReportToForm}>
                      Bestehende Daten laden
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Kapazität */}
                <div className="space-y-2">
                  <Label htmlFor="available_treatment_hours">Verfügbare Behandlungsstunden</Label>
                  <Input
                    id="available_treatment_hours"
                    type="number"
                    step="0.5"
                    value={formData.available_treatment_hours}
                    onChange={(e) => setFormData({ ...formData, available_treatment_hours: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booked_treatment_hours">Gebuchte Behandlungsstunden</Label>
                  <Input
                    id="booked_treatment_hours"
                    type="number"
                    step="0.5"
                    value={formData.booked_treatment_hours}
                    onChange={(e) => setFormData({ ...formData, booked_treatment_hours: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="treatments_total">Behandlungen gesamt</Label>
                  <Input
                    id="treatments_total"
                    type="number"
                    value={formData.treatments_total}
                    onChange={(e) => setFormData({ ...formData, treatments_total: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guests_total">Gäste gesamt</Label>
                  <Input
                    id="guests_total"
                    type="number"
                    value={formData.guests_total}
                    onChange={(e) => setFormData({ ...formData, guests_total: e.target.value })}
                  />
                </div>

                {/* Personal */}
                <div className="space-y-2">
                  <Label htmlFor="therapists_on_duty">Therapeuten im Einsatz</Label>
                  <Input
                    id="therapists_on_duty"
                    type="number"
                    value={formData.therapists_on_duty}
                    onChange={(e) => setFormData({ ...formData, therapists_on_duty: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="therapist_hours_total">Therapeuten-Stunden gesamt</Label>
                  <Input
                    id="therapist_hours_total"
                    type="number"
                    step="0.5"
                    value={formData.therapist_hours_total}
                    onChange={(e) => setFormData({ ...formData, therapist_hours_total: e.target.value })}
                  />
                </div>

                {/* Umsatz */}
                <div className="space-y-2">
                  <Label htmlFor="spa_revenue">Spa-Umsatz (€)</Label>
                  <Input
                    id="spa_revenue"
                    type="number"
                    step="0.01"
                    value={formData.spa_revenue}
                    onChange={(e) => setFormData({ ...formData, spa_revenue: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retail_revenue">Produkt-Umsatz (€)</Label>
                  <Input
                    id="retail_revenue"
                    type="number"
                    step="0.01"
                    value={formData.retail_revenue}
                    onChange={(e) => setFormData({ ...formData, retail_revenue: e.target.value })}
                  />
                </div>

                {/* Effizienz */}
                <div className="space-y-2">
                  <Label htmlFor="bookings_total">Buchungen gesamt</Label>
                  <Input
                    id="bookings_total"
                    type="number"
                    value={formData.bookings_total}
                    onChange={(e) => setFormData({ ...formData, bookings_total: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="no_shows">No-Shows</Label>
                  <Input
                    id="no_shows"
                    type="number"
                    value={formData.no_shows}
                    onChange={(e) => setFormData({ ...formData, no_shows: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellations">Stornierungen</Label>
                  <Input
                    id="cancellations"
                    type="number"
                    value={formData.cancellations}
                    onChange={(e) => setFormData({ ...formData, cancellations: e.target.value })}
                  />
                </div>

                {/* Qualität */}
                <div className="space-y-2">
                  <Label htmlFor="spa_complaints">Beschwerden</Label>
                  <Input
                    id="spa_complaints"
                    type="number"
                    value={formData.spa_complaints}
                    onChange={(e) => setFormData({ ...formData, spa_complaints: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spa_ratings_count">Anzahl Bewertungen</Label>
                  <Input
                    id="spa_ratings_count"
                    type="number"
                    value={formData.spa_ratings_count}
                    onChange={(e) => setFormData({ ...formData, spa_ratings_count: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spa_ratings_sum">Summe Bewertungspunkte</Label>
                  <Input
                    id="spa_ratings_sum"
                    type="number"
                    value={formData.spa_ratings_sum}
                    onChange={(e) => setFormData({ ...formData, spa_ratings_sum: e.target.value })}
                  />
                </div>

                {/* Personal-KPIs */}
                <div className="space-y-2">
                  <Label htmlFor="attendance_rate">Anwesenheitsrate (%)</Label>
                  <Input
                    id="attendance_rate"
                    type="number"
                    step="0.1"
                    value={formData.attendance_rate}
                    onChange={(e) => setFormData({ ...formData, attendance_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turnover_rate">Fluktuationsrate (%)</Label>
                  <Input
                    id="turnover_rate"
                    type="number"
                    step="0.1"
                    value={formData.turnover_rate}
                    onChange={(e) => setFormData({ ...formData, turnover_rate: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Speichern..." : "Bericht speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Label>Zeitraum:</Label>
            <div className="flex gap-2">
              {[7, 14, 30, 90].map((days) => (
                <Button
                  key={days}
                  variant={daysToShow === days ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDaysToShow(days)}
                >
                  {days} Tage
                </Button>
              ))}
            </div>
          </div>
          <SpaTrendCharts reports={reports} daysToShow={daysToShow} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
