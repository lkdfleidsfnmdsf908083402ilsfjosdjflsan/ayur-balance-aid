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
import { Wrench, TrendingUp, AlertTriangle, Euro, Calendar, Zap, CheckCircle, Clock } from "lucide-react";
import { TechnicalTrendCharts } from "@/components/charts/TechnicalTrendCharts";

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

// Schwellenwerte für Technik-KPIs
const thresholds = {
  resolutionTime: { green: [0, 60], yellow: [61, 120] }, // inverse
  backlogRate: { green: [0, 10], yellow: [11, 20] }, // inverse
  sameDayResolution: { green: [90, 100], yellow: [75, 89] },
  preventiveMaintenance: { green: [80, 100], yellow: [60, 79] },
  emergencyRate: { green: [0, 5], yellow: [6, 10] }, // inverse
  ticketsPerTechnician: { green: [5, 10], yellow: [11, 15] },
  costPerTicket: { green: [0, 50], yellow: [51, 100] }, // inverse
};

export function TechnicalKpiView() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [daysToShow, setDaysToShow] = useState(14);

  // Formular-State
  const [formData, setFormData] = useState({
    open_tickets: "",
    new_tickets: "",
    resolved_tickets: "",
    avg_resolution_time_min: "",
    preventive_maintenance_done: "",
    preventive_maintenance_planned: "",
    emergency_repairs: "",
    technicians_on_duty: "",
    technician_hours_total: "",
    external_costs: "",
    material_costs: "",
    energy_consumption_kwh: "",
    occupied_rooms: "",
    attendance_rate: "",
    turnover_rate: "",
  });

  // Daten laden
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["technical-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_daily_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(90);
      
      if (error) throw error;
      return data;
    },
  });

  // Aktuellen Tagesbericht laden
  const { data: currentReport } = useQuery({
    queryKey: ["technical-report", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_daily_reports")
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
        open_tickets: parseInt(data.open_tickets) || 0,
        new_tickets: parseInt(data.new_tickets) || 0,
        resolved_tickets: parseInt(data.resolved_tickets) || 0,
        avg_resolution_time_min: parseInt(data.avg_resolution_time_min) || 0,
        preventive_maintenance_done: parseInt(data.preventive_maintenance_done) || 0,
        preventive_maintenance_planned: parseInt(data.preventive_maintenance_planned) || 0,
        emergency_repairs: parseInt(data.emergency_repairs) || 0,
        technicians_on_duty: parseInt(data.technicians_on_duty) || 0,
        technician_hours_total: parseFloat(data.technician_hours_total) || 0,
        external_costs: parseFloat(data.external_costs) || 0,
        material_costs: parseFloat(data.material_costs) || 0,
        energy_consumption_kwh: parseFloat(data.energy_consumption_kwh) || 0,
        occupied_rooms: parseInt(data.occupied_rooms) || 0,
        attendance_rate: data.attendance_rate ? parseFloat(data.attendance_rate) : null,
        turnover_rate: data.turnover_rate ? parseFloat(data.turnover_rate) : null,
      };

      if (currentReport) {
        const { error } = await supabase
          .from("technical_daily_reports")
          .update(payload)
          .eq("id", currentReport.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("technical_daily_reports")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-reports"] });
      queryClient.invalidateQueries({ queryKey: ["technical-report", selectedDate] });
      toast.success("Technik-Bericht gespeichert");
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });

  // Formular mit bestehendem Bericht befüllen
  const loadReportToForm = () => {
    if (currentReport) {
      setFormData({
        open_tickets: currentReport.open_tickets?.toString() || "",
        new_tickets: currentReport.new_tickets?.toString() || "",
        resolved_tickets: currentReport.resolved_tickets?.toString() || "",
        avg_resolution_time_min: currentReport.avg_resolution_time_min?.toString() || "",
        preventive_maintenance_done: currentReport.preventive_maintenance_done?.toString() || "",
        preventive_maintenance_planned: currentReport.preventive_maintenance_planned?.toString() || "",
        emergency_repairs: currentReport.emergency_repairs?.toString() || "",
        technicians_on_duty: currentReport.technicians_on_duty?.toString() || "",
        technician_hours_total: currentReport.technician_hours_total?.toString() || "",
        external_costs: currentReport.external_costs?.toString() || "",
        material_costs: currentReport.material_costs?.toString() || "",
        energy_consumption_kwh: currentReport.energy_consumption_kwh?.toString() || "",
        occupied_rooms: currentReport.occupied_rooms?.toString() || "",
        attendance_rate: currentReport.attendance_rate?.toString() || "",
        turnover_rate: currentReport.turnover_rate?.toString() || "",
      });
    }
  };

  // Aggregierte Werte berechnen
  const last7Days = reports.filter(r => 
    new Date(r.report_date) >= subDays(new Date(), 7)
  );
  
  const avgResolutionTime = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.avg_resolution_time_min || 0), 0) / last7Days.length 
    : null;
  const avgBacklogRate = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.ticket_backlog_rate_pct || 0), 0) / last7Days.length 
    : null;
  const avgSameDayResolution = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.same_day_resolution_pct || 0), 0) / last7Days.length 
    : null;
  const avgPreventiveMaintenance = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.preventive_maintenance_pct || 0), 0) / last7Days.length 
    : null;
  const avgEmergencyRate = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.emergency_rate_pct || 0), 0) / last7Days.length 
    : null;
  const avgCostPerTicket = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.cost_per_ticket || 0), 0) / last7Days.length 
    : null;
  const totalCosts = last7Days.reduce((sum, r) => sum + (r.external_costs || 0) + (r.material_costs || 0), 0);
  const totalTickets = last7Days.reduce((sum, r) => sum + (r.resolved_tickets || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wrench className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Technik KPIs</h2>
      </div>

      <Tabs defaultValue="input">
        <TabsList>
          <TabsTrigger value="input">Tageseingabe</TabsTrigger>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

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
                <div>
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                {currentReport && (
                  <Button variant="outline" onClick={loadReportToForm}>
                    Vorhandene Daten laden
                  </Button>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Ticket Management */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Tickets</h4>
                  <div>
                    <Label>Offene Tickets</Label>
                    <Input
                      type="number"
                      value={formData.open_tickets}
                      onChange={(e) => setFormData({ ...formData, open_tickets: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Neue Tickets</Label>
                    <Input
                      type="number"
                      value={formData.new_tickets}
                      onChange={(e) => setFormData({ ...formData, new_tickets: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Erledigte Tickets</Label>
                    <Input
                      type="number"
                      value={formData.resolved_tickets}
                      onChange={(e) => setFormData({ ...formData, resolved_tickets: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Ø Bearbeitungszeit (Min)</Label>
                    <Input
                      type="number"
                      value={formData.avg_resolution_time_min}
                      onChange={(e) => setFormData({ ...formData, avg_resolution_time_min: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Wartung */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Wartung</h4>
                  <div>
                    <Label>Präventive Wartungen (erledigt)</Label>
                    <Input
                      type="number"
                      value={formData.preventive_maintenance_done}
                      onChange={(e) => setFormData({ ...formData, preventive_maintenance_done: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Präventive Wartungen (geplant)</Label>
                    <Input
                      type="number"
                      value={formData.preventive_maintenance_planned}
                      onChange={(e) => setFormData({ ...formData, preventive_maintenance_planned: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Notfall-Einsätze</Label>
                    <Input
                      type="number"
                      value={formData.emergency_repairs}
                      onChange={(e) => setFormData({ ...formData, emergency_repairs: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Personal */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Personal</h4>
                  <div>
                    <Label>Techniker im Dienst</Label>
                    <Input
                      type="number"
                      value={formData.technicians_on_duty}
                      onChange={(e) => setFormData({ ...formData, technicians_on_duty: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Techniker-Stunden gesamt</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.technician_hours_total}
                      onChange={(e) => setFormData({ ...formData, technician_hours_total: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Anwesenheitsquote (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.attendance_rate}
                      onChange={(e) => setFormData({ ...formData, attendance_rate: e.target.value })}
                      placeholder="optional"
                    />
                  </div>
                  <div>
                    <Label>Fluktuation (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.turnover_rate}
                      onChange={(e) => setFormData({ ...formData, turnover_rate: e.target.value })}
                      placeholder="optional"
                    />
                  </div>
                </div>

                {/* Kosten */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Kosten</h4>
                  <div>
                    <Label>Externe Kosten (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.external_costs}
                      onChange={(e) => setFormData({ ...formData, external_costs: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Material-Kosten (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.material_costs}
                      onChange={(e) => setFormData({ ...formData, material_costs: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Energie */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Energie</h4>
                  <div>
                    <Label>Energieverbrauch (kWh)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.energy_consumption_kwh}
                      onChange={(e) => setFormData({ ...formData, energy_consumption_kwh: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Belegte Zimmer</Label>
                    <Input
                      type="number"
                      value={formData.occupied_rooms}
                      onChange={(e) => setFormData({ ...formData, occupied_rooms: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
                className="w-full md:w-auto"
              >
                {saveMutation.isPending ? "Speichern..." : "Bericht speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          {/* KPI-Karten */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Bearbeitungszeit</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgResolutionTime, thresholds.resolutionTime as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {avgResolutionTime?.toFixed(0) ?? "-"} Min
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Backlog Rate</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgBacklogRate, thresholds.backlogRate as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold">
                    {avgBacklogRate?.toFixed(1) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Same-Day Resolution</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgSameDayResolution, thresholds.sameDayResolution as KpiThresholds)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">
                    {avgSameDayResolution?.toFixed(1) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Präventive Wartung</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgPreventiveMaintenance, thresholds.preventiveMaintenance as KpiThresholds)]}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgPreventiveMaintenance?.toFixed(1) ?? "-"}%
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Notfall-Rate</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgEmergencyRate, thresholds.emergencyRate as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <Zap className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold">
                    {avgEmergencyRate?.toFixed(1) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Kosten/Ticket</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgCostPerTicket, thresholds.costPerTicket as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{avgCostPerTicket?.toFixed(2) ?? "-"}
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gesamtkosten</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{totalCosts.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tickets erledigt</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTickets}</div>
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
                      <th className="py-2 text-right">Offen</th>
                      <th className="py-2 text-right">Erledigt</th>
                      <th className="py-2 text-right">Backlog %</th>
                      <th className="py-2 text-right">Same-Day %</th>
                      <th className="py-2 text-right">Notfall %</th>
                      <th className="py-2 text-right">Kosten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 10).map((report) => (
                      <tr key={report.id} className="border-b">
                        <td className="py-2">
                          {format(new Date(report.report_date), "dd.MM.yyyy", { locale: de })}
                        </td>
                        <td className="py-2 text-right">{report.open_tickets}</td>
                        <td className="py-2 text-right">{report.resolved_tickets}</td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.ticket_backlog_rate_pct, thresholds.backlogRate as KpiThresholds, true)] + " text-white"}>
                            {report.ticket_backlog_rate_pct?.toFixed(1) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.same_day_resolution_pct, thresholds.sameDayResolution as KpiThresholds)] + " text-white"}>
                            {report.same_day_resolution_pct?.toFixed(1) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.emergency_rate_pct, thresholds.emergencyRate as KpiThresholds, true)] + " text-white"}>
                            {report.emergency_rate_pct?.toFixed(1) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right font-medium">
                          €{((report.external_costs || 0) + (report.material_costs || 0)).toLocaleString("de-DE")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Label>Zeitraum:</Label>
            <select
              value={daysToShow}
              onChange={(e) => setDaysToShow(parseInt(e.target.value))}
              className="border rounded px-3 py-1"
            >
              <option value={7}>7 Tage</option>
              <option value={14}>14 Tage</option>
              <option value={30}>30 Tage</option>
              <option value={60}>60 Tage</option>
              <option value={90}>90 Tage</option>
            </select>
          </div>
          
          {isLoading ? (
            <p>Lade Daten...</p>
          ) : (
            <TechnicalTrendCharts data={reports} daysToShow={daysToShow} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
