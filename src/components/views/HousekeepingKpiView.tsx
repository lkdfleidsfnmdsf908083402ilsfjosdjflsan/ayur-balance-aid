import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Bed, Save, SprayCan } from "lucide-react";

type TrafficColor = "green" | "yellow" | "red";

interface HousekeepingReport {
  id: string;
  report_date: string;
  rooms_to_clean: number;
  rooms_cleaned: number;
  checkouts_today: number;
  stayovers: number;
  deep_cleans: number;
  staff_count: number;
  total_hours: number | null;
  complaints: number;
  rooms_recleaned: number;
  laundry_kg_week: number | null;
  cleaning_supplies_cost_week: number | null;
  cleaning_rate_pct: number | null;
  rooms_per_employee: number | null;
  avg_time_per_room: number | null;
  complaint_rate_pct: number | null;
  reclean_rate_pct: number | null;
}

// Ampellogik
function getCleaningRateColor(pct: number): TrafficColor {
  if (pct >= 98) return "green";
  if (pct >= 95) return "yellow";
  return "red";
}

function getRoomsPerEmployeeColor(rooms: number): TrafficColor {
  if (rooms >= 12 && rooms <= 16) return "green";
  if (rooms >= 10 && rooms < 12) return "yellow";
  return "red";
}

function getTimePerRoomColor(minutes: number): TrafficColor {
  if (minutes >= 25 && minutes <= 35) return "green";
  if (minutes >= 20 && minutes < 25) return "yellow";
  return "red";
}

function getComplaintColor(rate: number): TrafficColor {
  if (rate <= 1) return "green";
  if (rate <= 2) return "yellow";
  return "red";
}

function getRecleanColor(rate: number): TrafficColor {
  if (rate <= 2) return "green";
  if (rate <= 5) return "yellow";
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

export function HousekeepingKpiView() {
  const [reports, setReports] = useState<HousekeepingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [formData, setFormData] = useState({
    rooms_to_clean: 0,
    rooms_cleaned: 0,
    checkouts_today: 0,
    stayovers: 0,
    deep_cleans: 0,
    staff_count: 0,
    total_hours: 0,
    complaints: 0,
    rooms_recleaned: 0,
    laundry_kg_week: 0,
    cleaning_supplies_cost_week: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const existingReport = reports.find(r => r.report_date === selectedDate);
    if (existingReport) {
      setFormData({
        rooms_to_clean: existingReport.rooms_to_clean || 0,
        rooms_cleaned: existingReport.rooms_cleaned || 0,
        checkouts_today: existingReport.checkouts_today || 0,
        stayovers: existingReport.stayovers || 0,
        deep_cleans: existingReport.deep_cleans || 0,
        staff_count: existingReport.staff_count || 0,
        total_hours: existingReport.total_hours || 0,
        complaints: existingReport.complaints || 0,
        rooms_recleaned: existingReport.rooms_recleaned || 0,
        laundry_kg_week: existingReport.laundry_kg_week || 0,
        cleaning_supplies_cost_week: existingReport.cleaning_supplies_cost_week || 0,
      });
    } else {
      setFormData({
        rooms_to_clean: 0,
        rooms_cleaned: 0,
        checkouts_today: 0,
        stayovers: 0,
        deep_cleans: 0,
        staff_count: 0,
        total_hours: 0,
        complaints: 0,
        rooms_recleaned: 0,
        laundry_kg_week: 0,
        cleaning_supplies_cost_week: 0,
      });
    }
  }, [selectedDate, reports]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("housekeeping_daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(365);

    if (error) {
      toast.error("Fehler beim Laden der Housekeeping-Reports");
      console.error(error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const calculatedKpis = useMemo(() => {
    const { rooms_to_clean, rooms_cleaned, staff_count, total_hours, complaints, rooms_recleaned } = formData;

    return {
      cleaning_rate_pct: rooms_to_clean > 0 ? (rooms_cleaned / rooms_to_clean) * 100 : 0,
      rooms_per_employee: staff_count > 0 ? rooms_cleaned / staff_count : 0,
      avg_time_per_room: rooms_cleaned > 0 && total_hours > 0 ? (total_hours * 60) / rooms_cleaned : 0,
      complaint_rate_pct: rooms_cleaned > 0 ? (complaints / rooms_cleaned) * 100 : 0,
      reclean_rate_pct: rooms_cleaned > 0 ? (rooms_recleaned / rooms_cleaned) * 100 : 0,
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
        .from("housekeeping_daily_reports")
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
        .from("housekeeping_daily_reports")
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

  const renderKpiCard = (label: string, value: number, unit: string, color: TrafficColor, target: string) => (
    <Card className={`border-2 ${colorBgClasses[color]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value.toFixed(1)}{unit}</p>
            <p className="text-xs text-muted-foreground">{target}</p>
          </div>
          <div className={`w-5 h-5 rounded-full ${colorClasses[color]} shadow-md`} />
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
        <Bed className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Housekeeping-KPIs</h1>
          <p className="text-muted-foreground">Tägliche Zimmerreinigung & Qualität</p>
        </div>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">📋 Tägliche Erfassung</TabsTrigger>
          <TabsTrigger value="kpis">🚦 Aktuelle KPIs</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <SprayCan className="h-5 w-5" />
                  Tägliche Erfassung
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
              
              {/* Zimmer */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold">Zimmer zu reinigen</Label>
                    <Input
                      type="number"
                      value={formData.rooms_to_clean || ""}
                      onChange={(e) => setFormData({ ...formData, rooms_to_clean: Number(e.target.value) })}
                      className="text-2xl h-12 text-center font-bold mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold">Zimmer gereinigt ✓</Label>
                    <Input
                      type="number"
                      value={formData.rooms_cleaned || ""}
                      onChange={(e) => setFormData({ ...formData, rooms_cleaned: Number(e.target.value) })}
                      className="text-2xl h-12 text-center font-bold mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold">Check-outs</Label>
                    <Input
                      type="number"
                      value={formData.checkouts_today || ""}
                      onChange={(e) => setFormData({ ...formData, checkouts_today: Number(e.target.value) })}
                      className="text-2xl h-12 text-center font-bold mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Abreise-Zimmer</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold">Stayovers</Label>
                    <Input
                      type="number"
                      value={formData.stayovers || ""}
                      onChange={(e) => setFormData({ ...formData, stayovers: Number(e.target.value) })}
                      className="text-2xl h-12 text-center font-bold mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Durchreisende</p>
                  </CardContent>
                </Card>
              </div>

              {/* Personal & Qualität */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>MA im Einsatz</Label>
                  <Input
                    type="number"
                    value={formData.staff_count || ""}
                    onChange={(e) => setFormData({ ...formData, staff_count: Number(e.target.value) })}
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
                <div>
                  <Label>Beschwerden</Label>
                  <Input
                    type="number"
                    value={formData.complaints || ""}
                    onChange={(e) => setFormData({ ...formData, complaints: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Nachgereinigt</Label>
                  <Input
                    type="number"
                    value={formData.rooms_recleaned || ""}
                    onChange={(e) => setFormData({ ...formData, rooms_recleaned: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Optional: Wöchentlich */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  ➕ Wöchentliche Daten (Verbrauch)
                </summary>
                <div className="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-lg">
                  <div>
                    <Label>Wäsche kg/Woche</Label>
                    <Input
                      type="number"
                      value={formData.laundry_kg_week || ""}
                      onChange={(e) => setFormData({ ...formData, laundry_kg_week: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Reinigungsmittel €/Woche</Label>
                    <Input
                      type="number"
                      value={formData.cleaning_supplies_cost_week || ""}
                      onChange={(e) => setFormData({ ...formData, cleaning_supplies_cost_week: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </details>

              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichern..." : "Tagesreport speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {renderKpiCard("Reinigungsquote", calculatedKpis.cleaning_rate_pct, "%", 
              getCleaningRateColor(calculatedKpis.cleaning_rate_pct), "Ziel: ≥98%")}
            {renderKpiCard("Zimmer/MA", calculatedKpis.rooms_per_employee, "", 
              getRoomsPerEmployeeColor(calculatedKpis.rooms_per_employee), "Ziel: 12-16")}
            {renderKpiCard("Min/Zimmer", calculatedKpis.avg_time_per_room, "", 
              getTimePerRoomColor(calculatedKpis.avg_time_per_room), "Ziel: 25-35 Min")}
            {renderKpiCard("Beschwerderate", calculatedKpis.complaint_rate_pct, "%", 
              getComplaintColor(calculatedKpis.complaint_rate_pct), "Ziel: ≤1%")}
            {renderKpiCard("Nachreinigung", calculatedKpis.reclean_rate_pct, "%", 
              getRecleanColor(calculatedKpis.reclean_rate_pct), "Ziel: ≤2%")}
          </div>

          {/* Tagesübersicht */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">📊 Tagesübersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Zu reinigen</p>
                  <p className="text-xl font-bold">{formData.rooms_to_clean}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Gereinigt</p>
                  <p className="text-xl font-bold text-green-600">{formData.rooms_cleaned}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Check-outs</p>
                  <p className="text-xl font-bold">{formData.checkouts_today}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Personal</p>
                  <p className="text-xl font-bold">{formData.staff_count} MA</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Stunden</p>
                  <p className="text-xl font-bold">{formData.total_hours} h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
