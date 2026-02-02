import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { Wrench, Save, CheckCircle, Clock, Ticket, TrendingUp, Building, UtensilsCrossed, Sparkles, TreePine } from "lucide-react";

type TrafficColor = "green" | "yellow" | "red";

interface TechnikReport {
  id: string;
  report_date: string;
  tickets_new: number;
  tickets_completed: number;
  tickets_open: number;
  tickets_urgent: number;
  tickets_normal: number;
  tickets_low: number;
  tickets_rooms: number;
  tickets_public: number;
  tickets_kitchen: number;
  tickets_spa: number;
  tickets_outdoor: number;
  staff_count: number;
  total_hours: number | null;
  preventive_tasks: number;
  material_cost_week: number | null;
  external_service_cost_week: number | null;
  completion_rate_pct: number | null;
  tickets_per_employee: number | null;
}

// Ampellogik
function getCompletionRateColor(pct: number): TrafficColor {
  if (pct >= 90) return "green";
  if (pct >= 75) return "yellow";
  return "red";
}

function getOpenTicketsColor(open: number): TrafficColor {
  if (open <= 5) return "green";
  if (open <= 10) return "yellow";
  return "red";
}

function getUrgentColor(urgent: number): TrafficColor {
  if (urgent === 0) return "green";
  if (urgent <= 2) return "yellow";
  return "red";
}

const colorClasses: Record<TrafficColor, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const colorBgClasses: Record<TrafficColor, string> = {
  green: "bg-green-50 border-green-200",
  yellow: "bg-yellow-50 border-yellow-200",
  red: "bg-red-50 border-red-200",
};

export function TechnicalKpiView() {
  const [reports, setReports] = useState<TechnikReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [formData, setFormData] = useState({
    tickets_new: 0,
    tickets_completed: 0,
    tickets_open: 0,
    tickets_urgent: 0,
    tickets_normal: 0,
    tickets_low: 0,
    tickets_rooms: 0,
    tickets_public: 0,
    tickets_kitchen: 0,
    tickets_spa: 0,
    tickets_outdoor: 0,
    staff_count: 0,
    total_hours: 0,
    preventive_tasks: 0,
    material_cost_week: 0,
    external_service_cost_week: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const existingReport = reports.find(r => r.report_date === selectedDate);
    if (existingReport) {
      setFormData({
        tickets_new: existingReport.tickets_new || 0,
        tickets_completed: existingReport.tickets_completed || 0,
        tickets_open: existingReport.tickets_open || 0,
        tickets_urgent: existingReport.tickets_urgent || 0,
        tickets_normal: existingReport.tickets_normal || 0,
        tickets_low: existingReport.tickets_low || 0,
        tickets_rooms: existingReport.tickets_rooms || 0,
        tickets_public: existingReport.tickets_public || 0,
        tickets_kitchen: existingReport.tickets_kitchen || 0,
        tickets_spa: existingReport.tickets_spa || 0,
        tickets_outdoor: existingReport.tickets_outdoor || 0,
        staff_count: existingReport.staff_count || 0,
        total_hours: existingReport.total_hours || 0,
        preventive_tasks: existingReport.preventive_tasks || 0,
        material_cost_week: existingReport.material_cost_week || 0,
        external_service_cost_week: existingReport.external_service_cost_week || 0,
      });
    } else {
      // Hole offene Tickets vom Vortag
      const yesterday = reports.find(r => r.report_date < selectedDate);
      setFormData({
        tickets_new: 0,
        tickets_completed: 0,
        tickets_open: yesterday?.tickets_open || 0,
        tickets_urgent: 0,
        tickets_normal: 0,
        tickets_low: 0,
        tickets_rooms: 0,
        tickets_public: 0,
        tickets_kitchen: 0,
        tickets_spa: 0,
        tickets_outdoor: 0,
        staff_count: 0,
        total_hours: 0,
        preventive_tasks: 0,
        material_cost_week: 0,
        external_service_cost_week: 0,
      });
    }
  }, [selectedDate, reports]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("technik_daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(365);

    if (error) {
      toast.error("Fehler beim Laden der Technik-Reports");
      console.error(error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const calculatedKpis = useMemo(() => {
    const { tickets_new, tickets_completed, tickets_open, staff_count } = formData;

    // Offene Tickets aktualisieren: Alte offene + Neue - Erledigte
    const new_tickets_open = Math.max(0, tickets_open + tickets_new - tickets_completed);

    const completion_rate_pct = (tickets_new + tickets_open) > 0 
      ? (tickets_completed / (tickets_new + tickets_open)) * 100 
      : 100;

    const tickets_per_employee = staff_count > 0 
      ? tickets_completed / staff_count 
      : 0;

    return {
      new_tickets_open,
      completion_rate_pct,
      tickets_per_employee,
    };
  }, [formData]);

  // Wochenstatistik
  const weeklyStats = useMemo(() => {
    const weekStart = startOfWeek(new Date(selectedDate), { locale: de });
    const weekEnd = endOfWeek(new Date(selectedDate), { locale: de });
    
    const weekReports = reports.filter(r => {
      const d = new Date(r.report_date);
      return d >= weekStart && d <= weekEnd;
    });

    if (weekReports.length === 0) return null;

    const totalNew = weekReports.reduce((s, r) => s + (r.tickets_new || 0), 0);
    const totalCompleted = weekReports.reduce((s, r) => s + (r.tickets_completed || 0), 0);
    const totalPreventive = weekReports.reduce((s, r) => s + (r.preventive_tasks || 0), 0);
    const totalMaterial = weekReports.reduce((s, r) => s + (r.material_cost_week || 0), 0);

    return {
      days: weekReports.length,
      totalNew,
      totalCompleted,
      totalPreventive,
      totalMaterial,
      avgCompletionRate: totalNew > 0 ? (totalCompleted / totalNew) * 100 : 100,
    };
  }, [reports, selectedDate]);

  const handleSave = async () => {
    setSaving(true);
    
    const reportData = {
      report_date: selectedDate,
      ...formData,
      tickets_open: calculatedKpis.new_tickets_open,
      completion_rate_pct: calculatedKpis.completion_rate_pct,
      tickets_per_employee: calculatedKpis.tickets_per_employee,
    };

    const existingReport = reports.find(r => r.report_date === selectedDate);

    if (existingReport) {
      const { error } = await supabase
        .from("technik_daily_reports")
        .update(reportData)
        .eq("id", existingReport.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
        console.error(error);
      } else {
        toast.success("Technik-Report aktualisiert");
        fetchReports();
      }
    } else {
      const { error } = await supabase
        .from("technik_daily_reports")
        .insert(reportData);

      if (error) {
        toast.error("Fehler beim Speichern");
        console.error(error);
      } else {
        toast.success("Technik-Report gespeichert");
        fetchReports();
      }
    }
    setSaving(false);
  };

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
        <Wrench className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Technik-KPIs</h1>
          <p className="text-muted-foreground">Aufträge & Instandhaltung</p>
        </div>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">📋 Tägliche Erfassung</TabsTrigger>
          <TabsTrigger value="kpis">🚦 Aktuelle KPIs</TabsTrigger>
          <TabsTrigger value="week">📊 Wochenübersicht</TabsTrigger>
        </TabsList>

        {/* ===== TÄGLICHE ERFASSUNG ===== */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Auftragserfassung
                </span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </CardTitle>
              <p className="text-sm text-muted-foreground">⏱️ Zeitaufwand: ca. 3 Minuten</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Haupt-Tickets */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <Label className="text-sm font-semibold">Neue Aufträge</Label>
                    <Input
                      type="number"
                      value={formData.tickets_new || ""}
                      onChange={(e) => setFormData({ ...formData, tickets_new: Number(e.target.value) })}
                      className="text-3xl h-14 text-center font-bold mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <Label className="text-sm font-semibold flex items-center justify-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Erledigt
                    </Label>
                    <Input
                      type="number"
                      value={formData.tickets_completed || ""}
                      onChange={(e) => setFormData({ ...formData, tickets_completed: Number(e.target.value) })}
                      className="text-3xl h-14 text-center font-bold mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className={`border-2 ${formData.tickets_open > 10 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                  <CardContent className="p-4 text-center">
                    <Label className="text-sm font-semibold flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4" /> Offen (gesamt)
                    </Label>
                    <p className="text-3xl h-14 flex items-center justify-center font-bold mt-2">
                      {calculatedKpis.new_tickets_open}
                    </p>
                    <p className="text-xs text-muted-foreground">automatisch berechnet</p>
                  </CardContent>
                </Card>
              </div>

              {/* Nach Priorität */}
              <div>
                <p className="text-sm font-semibold mb-2">Nach Priorität (optional)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <Label className="text-sm">Dringend</Label>
                    <Input
                      type="number"
                      value={formData.tickets_urgent || ""}
                      onChange={(e) => setFormData({ ...formData, tickets_urgent: Number(e.target.value) })}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <Label className="text-sm">Normal</Label>
                    <Input
                      type="number"
                      value={formData.tickets_normal || ""}
                      onChange={(e) => setFormData({ ...formData, tickets_normal: Number(e.target.value) })}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <Label className="text-sm">Niedrig</Label>
                    <Input
                      type="number"
                      value={formData.tickets_low || ""}
                      onChange={(e) => setFormData({ ...formData, tickets_low: Number(e.target.value) })}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Personal */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Techniker im Einsatz</Label>
                  <Input
                    type="number"
                    value={formData.staff_count || ""}
                    onChange={(e) => setFormData({ ...formData, staff_count: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Präventiv-Wartungen</Label>
                  <Input
                    type="number"
                    value={formData.preventive_tasks || ""}
                    onChange={(e) => setFormData({ ...formData, preventive_tasks: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Gesamtstunden</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.total_hours || ""}
                    onChange={(e) => setFormData({ ...formData, total_hours: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Optional: Nach Bereich & Kosten */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  ➕ Optional: Nach Bereich & Wochenkosten
                </summary>
                <div className="mt-4 p-4 border rounded-lg space-y-4">
                  <p className="text-sm font-semibold">Aufträge nach Bereich</p>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="text-center">
                      <Building className="h-4 w-4 mx-auto text-muted-foreground" />
                      <Label className="text-xs">Zimmer</Label>
                      <Input
                        type="number"
                        value={formData.tickets_rooms || ""}
                        onChange={(e) => setFormData({ ...formData, tickets_rooms: Number(e.target.value) })}
                        className="text-center"
                      />
                    </div>
                    <div className="text-center">
                      <Building className="h-4 w-4 mx-auto text-muted-foreground" />
                      <Label className="text-xs">Öffentlich</Label>
                      <Input
                        type="number"
                        value={formData.tickets_public || ""}
                        onChange={(e) => setFormData({ ...formData, tickets_public: Number(e.target.value) })}
                        className="text-center"
                      />
                    </div>
                    <div className="text-center">
                      <UtensilsCrossed className="h-4 w-4 mx-auto text-muted-foreground" />
                      <Label className="text-xs">Küche</Label>
                      <Input
                        type="number"
                        value={formData.tickets_kitchen || ""}
                        onChange={(e) => setFormData({ ...formData, tickets_kitchen: Number(e.target.value) })}
                        className="text-center"
                      />
                    </div>
                    <div className="text-center">
                      <Sparkles className="h-4 w-4 mx-auto text-muted-foreground" />
                      <Label className="text-xs">SPA</Label>
                      <Input
                        type="number"
                        value={formData.tickets_spa || ""}
                        onChange={(e) => setFormData({ ...formData, tickets_spa: Number(e.target.value) })}
                        className="text-center"
                      />
                    </div>
                    <div className="text-center">
                      <TreePine className="h-4 w-4 mx-auto text-muted-foreground" />
                      <Label className="text-xs">Außen</Label>
                      <Input
                        type="number"
                        value={formData.tickets_outdoor || ""}
                        onChange={(e) => setFormData({ ...formData, tickets_outdoor: Number(e.target.value) })}
                        className="text-center"
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm font-semibold mt-4">Wochenkosten</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Material (€/Woche)</Label>
                      <Input
                        type="number"
                        value={formData.material_cost_week || ""}
                        onChange={(e) => setFormData({ ...formData, material_cost_week: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Externe Dienstleister (€/Woche)</Label>
                      <Input
                        type="number"
                        value={formData.external_service_cost_week || ""}
                        onChange={(e) => setFormData({ ...formData, external_service_cost_week: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </details>

              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichern..." : "Technik-Report speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AKTUELLE KPIs ===== */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className={`border-2 ${colorBgClasses[getCompletionRateColor(calculatedKpis.completion_rate_pct)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Erledigungsquote</p>
                    <p className="text-3xl font-bold">{calculatedKpis.completion_rate_pct.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≥90%</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getCompletionRateColor(calculatedKpis.completion_rate_pct)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${colorBgClasses[getOpenTicketsColor(calculatedKpis.new_tickets_open)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Offene Aufträge</p>
                    <p className="text-3xl font-bold">{calculatedKpis.new_tickets_open}</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≤5</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getOpenTicketsColor(calculatedKpis.new_tickets_open)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${colorBgClasses[getUrgentColor(formData.tickets_urgent)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Dringende Aufträge</p>
                    <p className="text-3xl font-bold">{formData.tickets_urgent}</p>
                    <p className="text-xs text-muted-foreground">Ziel: 0</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getUrgentColor(formData.tickets_urgent)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tagesübersicht */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Neu heute</p>
                  <p className="text-xl font-bold text-blue-600">{formData.tickets_new}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Erledigt</p>
                  <p className="text-xl font-bold text-green-600">{formData.tickets_completed}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Offen</p>
                  <p className="text-xl font-bold text-yellow-600">{calculatedKpis.new_tickets_open}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Techniker</p>
                  <p className="text-xl font-bold">{formData.staff_count}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Präventiv</p>
                  <p className="text-xl font-bold text-purple-600">{formData.preventive_tasks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== WOCHENÜBERSICHT ===== */}
        <TabsContent value="week" className="space-y-4">
          {weeklyStats ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Wochenübersicht ({weeklyStats.days} Tage erfasst)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Neue Aufträge</p>
                    <p className="text-3xl font-bold text-blue-600">{weeklyStats.totalNew}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Erledigt</p>
                    <p className="text-3xl font-bold text-green-600">{weeklyStats.totalCompleted}</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Präventiv</p>
                    <p className="text-3xl font-bold text-purple-600">{weeklyStats.totalPreventive}</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Ø Erledigungsquote</p>
                    <p className="text-3xl font-bold">{weeklyStats.avgCompletionRate.toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Keine Daten für diese Woche vorhanden
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
