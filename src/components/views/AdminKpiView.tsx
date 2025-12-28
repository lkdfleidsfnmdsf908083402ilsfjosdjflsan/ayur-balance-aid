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
import { Building2, Users, Euro, Monitor, Truck, Calendar, TrendingDown, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { AdminTrendCharts } from "@/components/charts/AdminTrendCharts";

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

// Schwellenwerte für Verwaltungs-KPIs
const thresholds = {
  sickRate: { green: [0, 3], yellow: [3, 5] }, // inverse
  openPositionsRate: { green: [0, 5], yellow: [5, 10] }, // inverse
  turnoverRate: { green: [0, 1], yellow: [1, 2] }, // inverse
  paymentCompliance: { green: [95, 100], yellow: [85, 94] },
  dso: { green: [0, 30], yellow: [31, 45] }, // inverse
  dpo: { green: [30, 45], yellow: [20, 29] }, // special range
  itAvailability: { green: [99.5, 100], yellow: [98, 99.4] },
  itResolution: { green: [90, 100], yellow: [75, 89] },
  supplierComplaintRate: { green: [0, 2], yellow: [2, 5] }, // inverse
};

export function AdminKpiView() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [daysToShow, setDaysToShow] = useState(14);

  // Formular-State
  const [formData, setFormData] = useState({
    open_positions: "",
    applications_received: "",
    new_hires: "",
    terminations: "",
    sick_days: "",
    total_employees: "",
    planned_employees: "",
    open_invoices_count: "",
    open_invoices_value: "",
    paid_invoices_count: "",
    open_receivables: "",
    reminders_sent: "",
    daily_revenue: "",
    daily_expenses: "",
    it_tickets_open: "",
    it_tickets_resolved: "",
    system_downtime_min: "",
    orders_placed: "",
    deliveries_received: "",
    supplier_complaints: "",
    admin_staff_on_duty: "",
    admin_hours_total: "",
    attendance_rate: "",
    turnover_rate: "",
  });

  // Daten laden
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_daily_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(90);
      
      if (error) throw error;
      return data;
    },
  });

  // Aktuellen Tagesbericht laden
  const { data: currentReport } = useQuery({
    queryKey: ["admin-report", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_daily_reports")
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
        open_positions: parseInt(data.open_positions) || 0,
        applications_received: parseInt(data.applications_received) || 0,
        new_hires: parseInt(data.new_hires) || 0,
        terminations: parseInt(data.terminations) || 0,
        sick_days: parseInt(data.sick_days) || 0,
        total_employees: parseInt(data.total_employees) || 0,
        planned_employees: parseInt(data.planned_employees) || 0,
        open_invoices_count: parseInt(data.open_invoices_count) || 0,
        open_invoices_value: parseFloat(data.open_invoices_value) || 0,
        paid_invoices_count: parseInt(data.paid_invoices_count) || 0,
        open_receivables: parseFloat(data.open_receivables) || 0,
        reminders_sent: parseInt(data.reminders_sent) || 0,
        daily_revenue: parseFloat(data.daily_revenue) || 0,
        daily_expenses: parseFloat(data.daily_expenses) || 0,
        it_tickets_open: parseInt(data.it_tickets_open) || 0,
        it_tickets_resolved: parseInt(data.it_tickets_resolved) || 0,
        system_downtime_min: parseInt(data.system_downtime_min) || 0,
        orders_placed: parseInt(data.orders_placed) || 0,
        deliveries_received: parseInt(data.deliveries_received) || 0,
        supplier_complaints: parseInt(data.supplier_complaints) || 0,
        admin_staff_on_duty: parseInt(data.admin_staff_on_duty) || 0,
        admin_hours_total: parseFloat(data.admin_hours_total) || 0,
        attendance_rate: data.attendance_rate ? parseFloat(data.attendance_rate) : null,
        turnover_rate: data.turnover_rate ? parseFloat(data.turnover_rate) : null,
      };

      if (currentReport) {
        const { error } = await supabase
          .from("admin_daily_reports")
          .update(payload)
          .eq("id", currentReport.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("admin_daily_reports")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-report", selectedDate] });
      toast.success("Verwaltungs-Bericht gespeichert");
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });

  // Formular mit bestehendem Bericht befüllen
  const loadReportToForm = () => {
    if (currentReport) {
      setFormData({
        open_positions: currentReport.open_positions?.toString() || "",
        applications_received: currentReport.applications_received?.toString() || "",
        new_hires: currentReport.new_hires?.toString() || "",
        terminations: currentReport.terminations?.toString() || "",
        sick_days: currentReport.sick_days?.toString() || "",
        total_employees: currentReport.total_employees?.toString() || "",
        planned_employees: currentReport.planned_employees?.toString() || "",
        open_invoices_count: currentReport.open_invoices_count?.toString() || "",
        open_invoices_value: currentReport.open_invoices_value?.toString() || "",
        paid_invoices_count: currentReport.paid_invoices_count?.toString() || "",
        open_receivables: currentReport.open_receivables?.toString() || "",
        reminders_sent: currentReport.reminders_sent?.toString() || "",
        daily_revenue: currentReport.daily_revenue?.toString() || "",
        daily_expenses: currentReport.daily_expenses?.toString() || "",
        it_tickets_open: currentReport.it_tickets_open?.toString() || "",
        it_tickets_resolved: currentReport.it_tickets_resolved?.toString() || "",
        system_downtime_min: currentReport.system_downtime_min?.toString() || "",
        orders_placed: currentReport.orders_placed?.toString() || "",
        deliveries_received: currentReport.deliveries_received?.toString() || "",
        supplier_complaints: currentReport.supplier_complaints?.toString() || "",
        admin_staff_on_duty: currentReport.admin_staff_on_duty?.toString() || "",
        admin_hours_total: currentReport.admin_hours_total?.toString() || "",
        attendance_rate: currentReport.attendance_rate?.toString() || "",
        turnover_rate: currentReport.turnover_rate?.toString() || "",
      });
    }
  };

  // Aggregierte Werte berechnen
  const last7Days = reports.filter(r => 
    new Date(r.report_date) >= subDays(new Date(), 7)
  );
  
  const avgSickRate = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.sick_rate_pct || 0), 0) / last7Days.length 
    : null;
  const avgOpenPositionsRate = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.open_positions_rate_pct || 0), 0) / last7Days.length 
    : null;
  const avgPaymentCompliance = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.payment_compliance_pct || 0), 0) / last7Days.length 
    : null;
  const avgDso = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.dso_days || 0), 0) / last7Days.length 
    : null;
  const avgItAvailability = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.it_availability_pct || 0), 0) / last7Days.length 
    : null;
  const avgItResolution = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.it_resolution_rate_pct || 0), 0) / last7Days.length 
    : null;
  const avgSupplierComplaintRate = last7Days.length > 0 
    ? last7Days.reduce((sum, r) => sum + (r.supplier_complaint_rate_pct || 0), 0) / last7Days.length 
    : null;
  const totalOpenReceivables = last7Days.length > 0 ? last7Days[0]?.open_receivables || 0 : 0;
  const totalOpenInvoices = last7Days.length > 0 ? last7Days[0]?.open_invoices_value || 0 : 0;

  return (
    <div className="space-y-6 p-6 overflow-auto">
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Verwaltungs-KPIs</h2>
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

              <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                {/* HR/Personal */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Personal/HR
                  </h4>
                  <div>
                    <Label>Offene Stellen</Label>
                    <Input
                      type="number"
                      value={formData.open_positions}
                      onChange={(e) => setFormData({ ...formData, open_positions: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Soll-Mitarbeiter</Label>
                    <Input
                      type="number"
                      value={formData.planned_employees}
                      onChange={(e) => setFormData({ ...formData, planned_employees: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Bewerbungen erhalten</Label>
                    <Input
                      type="number"
                      value={formData.applications_received}
                      onChange={(e) => setFormData({ ...formData, applications_received: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Einstellungen</Label>
                    <Input
                      type="number"
                      value={formData.new_hires}
                      onChange={(e) => setFormData({ ...formData, new_hires: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Kündigungen</Label>
                    <Input
                      type="number"
                      value={formData.terminations}
                      onChange={(e) => setFormData({ ...formData, terminations: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Krankheitstage</Label>
                    <Input
                      type="number"
                      value={formData.sick_days}
                      onChange={(e) => setFormData({ ...formData, sick_days: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Mitarbeiter gesamt</Label>
                    <Input
                      type="number"
                      value={formData.total_employees}
                      onChange={(e) => setFormData({ ...formData, total_employees: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Finanzen */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">
                    <Euro className="h-4 w-4" /> Finanzen
                  </h4>
                  <div>
                    <Label>Offene Rechnungen (Anzahl)</Label>
                    <Input
                      type="number"
                      value={formData.open_invoices_count}
                      onChange={(e) => setFormData({ ...formData, open_invoices_count: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Offene Rechnungen (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.open_invoices_value}
                      onChange={(e) => setFormData({ ...formData, open_invoices_value: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Bezahlte Rechnungen</Label>
                    <Input
                      type="number"
                      value={formData.paid_invoices_count}
                      onChange={(e) => setFormData({ ...formData, paid_invoices_count: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Offene Forderungen (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.open_receivables}
                      onChange={(e) => setFormData({ ...formData, open_receivables: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Mahnungen versendet</Label>
                    <Input
                      type="number"
                      value={formData.reminders_sent}
                      onChange={(e) => setFormData({ ...formData, reminders_sent: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Tagesumsatz (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.daily_revenue}
                      onChange={(e) => setFormData({ ...formData, daily_revenue: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Tagesaufwand (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.daily_expenses}
                      onChange={(e) => setFormData({ ...formData, daily_expenses: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* IT Support */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">
                    <Monitor className="h-4 w-4" /> IT Support
                  </h4>
                  <div>
                    <Label>IT-Tickets offen</Label>
                    <Input
                      type="number"
                      value={formData.it_tickets_open}
                      onChange={(e) => setFormData({ ...formData, it_tickets_open: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>IT-Tickets gelöst</Label>
                    <Input
                      type="number"
                      value={formData.it_tickets_resolved}
                      onChange={(e) => setFormData({ ...formData, it_tickets_resolved: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>System-Ausfallzeit (Min)</Label>
                    <Input
                      type="number"
                      value={formData.system_downtime_min}
                      onChange={(e) => setFormData({ ...formData, system_downtime_min: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Einkauf & Verwaltung */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Einkauf
                  </h4>
                  <div>
                    <Label>Bestellungen aufgegeben</Label>
                    <Input
                      type="number"
                      value={formData.orders_placed}
                      onChange={(e) => setFormData({ ...formData, orders_placed: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Lieferungen erhalten</Label>
                    <Input
                      type="number"
                      value={formData.deliveries_received}
                      onChange={(e) => setFormData({ ...formData, deliveries_received: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Reklamationen</Label>
                    <Input
                      type="number"
                      value={formData.supplier_complaints}
                      onChange={(e) => setFormData({ ...formData, supplier_complaints: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  
                  <h4 className="font-semibold text-sm border-b pb-2 pt-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Verwaltung
                  </h4>
                  <div>
                    <Label>Verwaltungsmitarbeiter</Label>
                    <Input
                      type="number"
                      value={formData.admin_staff_on_duty}
                      onChange={(e) => setFormData({ ...formData, admin_staff_on_duty: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Verwaltungsstunden</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.admin_hours_total}
                      onChange={(e) => setFormData({ ...formData, admin_hours_total: e.target.value })}
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
                <CardTitle className="text-sm font-medium">Ø Krankenquote</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgSickRate, thresholds.sickRate as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold">
                    {avgSickRate?.toFixed(2) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Offene Stellen</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgOpenPositionsRate, thresholds.openPositionsRate as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {avgOpenPositionsRate?.toFixed(1) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Zahlungseinhaltung</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgPaymentCompliance, thresholds.paymentCompliance as KpiThresholds)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">
                    {avgPaymentCompliance?.toFixed(1) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø DSO</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgDso, thresholds.dso as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {avgDso?.toFixed(1) ?? "-"} Tage
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Days Sales Outstanding</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø IT-Verfügbarkeit</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgItAvailability, thresholds.itAvailability as KpiThresholds)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <Monitor className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">
                    {avgItAvailability?.toFixed(2) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø IT-Resolution</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgItResolution, thresholds.itResolution as KpiThresholds)]}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgItResolution?.toFixed(1) ?? "-"}%
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Lieferanten-Reklamation</CardTitle>
                <div className={`h-3 w-3 rounded-full ${trafficLightColors[getTrafficLight(avgSupplierComplaintRate, thresholds.supplierComplaintRate as KpiThresholds, true)]}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold">
                    {avgSupplierComplaintRate?.toFixed(2) ?? "-"}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Offene Forderungen</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{totalOpenReceivables.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Aktueller Stand</p>
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
                      <th className="py-2 text-right">Krank %</th>
                      <th className="py-2 text-right">Stellen %</th>
                      <th className="py-2 text-right">DSO</th>
                      <th className="py-2 text-right">IT Verf. %</th>
                      <th className="py-2 text-right">Lieferant %</th>
                      <th className="py-2 text-right">Forderungen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 10).map((report) => (
                      <tr key={report.id} className="border-b">
                        <td className="py-2">
                          {format(new Date(report.report_date), "dd.MM.yyyy", { locale: de })}
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.sick_rate_pct, thresholds.sickRate as KpiThresholds, true)] + " text-white"}>
                            {report.sick_rate_pct?.toFixed(2) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.open_positions_rate_pct, thresholds.openPositionsRate as KpiThresholds, true)] + " text-white"}>
                            {report.open_positions_rate_pct?.toFixed(1) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.dso_days, thresholds.dso as KpiThresholds, true)] + " text-white"}>
                            {report.dso_days?.toFixed(1) ?? "-"}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.it_availability_pct, thresholds.itAvailability as KpiThresholds)] + " text-white"}>
                            {report.it_availability_pct?.toFixed(2) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className={trafficLightColors[getTrafficLight(report.supplier_complaint_rate_pct, thresholds.supplierComplaintRate as KpiThresholds, true)] + " text-white"}>
                            {report.supplier_complaint_rate_pct?.toFixed(2) ?? "-"}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right font-medium">
                          €{(report.open_receivables || 0).toLocaleString("de-DE")}
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
            <AdminTrendCharts data={reports} daysToShow={daysToShow} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
