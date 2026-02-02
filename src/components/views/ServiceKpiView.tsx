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
import { ConciergeBell, Save, Users, Coffee, UtensilsCrossed, Moon, Wine, TrendingUp } from "lucide-react";

type TrafficColor = "green" | "yellow" | "red";

interface ServiceReport {
  id: string;
  report_date: string;
  covers_breakfast: number;
  covers_lunch: number;
  covers_dinner: number;
  covers_total: number;
  guests_absent: number;
  extra_beverage_revenue: number | null;
  extra_food_revenue: number | null;
  staff_count: number;
  total_hours: number | null;
  complaints: number;
  covers_per_employee: number | null;
  extra_revenue_per_cover: number | null;
  complaint_rate_pct: number | null;
}

// Ampellogik
function getCoversPerEmployeeColor(covers: number): TrafficColor {
  if (covers >= 20 && covers <= 35) return "green";
  if (covers >= 15 && covers < 20) return "yellow";
  return "red";
}

function getExtraRevenueColor(revenue: number): TrafficColor {
  if (revenue >= 3) return "green";
  if (revenue >= 1.5) return "yellow";
  return "red";
}

function getComplaintColor(rate: number): TrafficColor {
  if (rate <= 1) return "green";
  if (rate <= 2) return "yellow";
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

export function ServiceKpiView() {
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [formData, setFormData] = useState({
    covers_breakfast: 0,
    covers_lunch: 0,
    covers_dinner: 0,
    guests_absent: 0,
    extra_beverage_revenue: 0,
    extra_food_revenue: 0,
    staff_count: 0,
    total_hours: 0,
    complaints: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const existingReport = reports.find(r => r.report_date === selectedDate);
    if (existingReport) {
      setFormData({
        covers_breakfast: existingReport.covers_breakfast || 0,
        covers_lunch: existingReport.covers_lunch || 0,
        covers_dinner: existingReport.covers_dinner || 0,
        guests_absent: existingReport.guests_absent || 0,
        extra_beverage_revenue: existingReport.extra_beverage_revenue || 0,
        extra_food_revenue: existingReport.extra_food_revenue || 0,
        staff_count: existingReport.staff_count || 0,
        total_hours: existingReport.total_hours || 0,
        complaints: existingReport.complaints || 0,
      });
    } else {
      setFormData({
        covers_breakfast: 0,
        covers_lunch: 0,
        covers_dinner: 0,
        guests_absent: 0,
        extra_beverage_revenue: 0,
        extra_food_revenue: 0,
        staff_count: 0,
        total_hours: 0,
        complaints: 0,
      });
    }
  }, [selectedDate, reports]);

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
    }
    setLoading(false);
  };

  const calculatedKpis = useMemo(() => {
    const { covers_breakfast, covers_lunch, covers_dinner, staff_count, extra_beverage_revenue, extra_food_revenue, complaints } = formData;
    
    const covers_total = covers_breakfast + covers_lunch + covers_dinner;
    const extra_total = (extra_beverage_revenue || 0) + (extra_food_revenue || 0);

    return {
      covers_total,
      covers_per_employee: staff_count > 0 ? covers_total / staff_count : 0,
      extra_revenue_per_cover: covers_total > 0 ? extra_total / covers_total : 0,
      complaint_rate_pct: covers_total > 0 ? (complaints / covers_total) * 100 : 0,
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

    const totalBreakfast = weekReports.reduce((s, r) => s + (r.covers_breakfast || 0), 0);
    const totalLunch = weekReports.reduce((s, r) => s + (r.covers_lunch || 0), 0);
    const totalDinner = weekReports.reduce((s, r) => s + (r.covers_dinner || 0), 0);
    const totalExtras = weekReports.reduce((s, r) => s + (r.extra_beverage_revenue || 0) + (r.extra_food_revenue || 0), 0);

    return {
      days: weekReports.length,
      totalBreakfast,
      totalLunch,
      totalDinner,
      totalCovers: totalBreakfast + totalLunch + totalDinner,
      totalExtras,
      avgCoversPerDay: (totalBreakfast + totalLunch + totalDinner) / weekReports.length,
    };
  }, [reports, selectedDate]);

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
        toast.success("Service-Report aktualisiert");
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
        toast.success("Service-Report gespeichert");
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
        <ConciergeBell className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Service-KPIs</h1>
          <p className="text-muted-foreground">Cover-Erfassung & Zusatzverkäufe</p>
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
                  <Users className="h-5 w-5" />
                  Cover-Erfassung (Service)
                </span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                ⏱️ Zeitaufwand: ca. 5 Minuten | 🔔 Diese Daten werden auch für die Küche verwendet
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Covers nach Mahlzeit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Coffee className="h-6 w-6 text-orange-600" />
                      <Label className="text-lg font-semibold">Frühstück</Label>
                    </div>
                    <Input
                      type="number"
                      value={formData.covers_breakfast || ""}
                      onChange={(e) => setFormData({ ...formData, covers_breakfast: Number(e.target.value) })}
                      placeholder="Anzahl Gäste"
                      className="text-2xl h-14 text-center font-bold"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <UtensilsCrossed className="h-6 w-6 text-yellow-600" />
                      <Label className="text-lg font-semibold">Mittagessen</Label>
                    </div>
                    <Input
                      type="number"
                      value={formData.covers_lunch || ""}
                      onChange={(e) => setFormData({ ...formData, covers_lunch: Number(e.target.value) })}
                      placeholder="Anzahl Gäste"
                      className="text-2xl h-14 text-center font-bold"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Moon className="h-6 w-6 text-blue-600" />
                      <Label className="text-lg font-semibold">Abendessen</Label>
                    </div>
                    <Input
                      type="number"
                      value={formData.covers_dinner || ""}
                      onChange={(e) => setFormData({ ...formData, covers_dinner: Number(e.target.value) })}
                      placeholder="Anzahl Gäste"
                      className="text-2xl h-14 text-center font-bold"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Zusammenfassung + Abwesend */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Covers Gesamt</p>
                  <p className="text-3xl font-bold text-primary">{calculatedKpis.covers_total}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Gäste außer Haus</p>
                  <Input
                    type="number"
                    value={formData.guests_absent || ""}
                    onChange={(e) => setFormData({ ...formData, guests_absent: Number(e.target.value) })}
                    className="w-24 mx-auto text-center text-lg"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Beschwerden</p>
                  <Input
                    type="number"
                    value={formData.complaints || ""}
                    onChange={(e) => setFormData({ ...formData, complaints: Number(e.target.value) })}
                    className="w-24 mx-auto text-center text-lg"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Service-MA</p>
                  <Input
                    type="number"
                    value={formData.staff_count || ""}
                    onChange={(e) => setFormData({ ...formData, staff_count: Number(e.target.value) })}
                    className="w-24 mx-auto text-center text-lg"
                  />
                </div>
              </div>

              {/* Zusatzverkäufe */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Wine className="h-4 w-4" />
                  Zusatzverkäufe (à la carte)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Getränke-Extras (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.extra_beverage_revenue || ""}
                      onChange={(e) => setFormData({ ...formData, extra_beverage_revenue: Number(e.target.value) })}
                      placeholder="z.B. 125.50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Wein, Cocktails, etc.</p>
                  </div>
                  <div>
                    <Label>Speisen-Extras (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.extra_food_revenue || ""}
                      onChange={(e) => setFormData({ ...formData, extra_food_revenue: Number(e.target.value) })}
                      placeholder="z.B. 45.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">À la carte Bestellungen</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichern..." : "Service-Report speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AKTUELLE KPIs ===== */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className={`border-2 ${colorBgClasses[getCoversPerEmployeeColor(calculatedKpis.covers_per_employee)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Covers/MA</p>
                    <p className="text-2xl font-bold">{calculatedKpis.covers_per_employee.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Ziel: 20-35</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getCoversPerEmployeeColor(calculatedKpis.covers_per_employee)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${colorBgClasses[getExtraRevenueColor(calculatedKpis.extra_revenue_per_cover)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Extra-Umsatz/Cover</p>
                    <p className="text-2xl font-bold">{calculatedKpis.extra_revenue_per_cover.toFixed(2)} €</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≥3 €</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getExtraRevenueColor(calculatedKpis.extra_revenue_per_cover)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${colorBgClasses[getComplaintColor(calculatedKpis.complaint_rate_pct)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Beschwerderate</p>
                    <p className="text-2xl font-bold">{calculatedKpis.complaint_rate_pct.toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≤1%</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getComplaintColor(calculatedKpis.complaint_rate_pct)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tagesübersicht */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Frühstück</p>
                  <p className="text-xl font-bold text-orange-600">{formData.covers_breakfast}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Mittag</p>
                  <p className="text-xl font-bold text-yellow-600">{formData.covers_lunch}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Abend</p>
                  <p className="text-xl font-bold text-blue-600">{formData.covers_dinner}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Gesamt</p>
                  <p className="text-xl font-bold">{calculatedKpis.covers_total}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Extras</p>
                  <p className="text-xl font-bold text-green-600">{((formData.extra_beverage_revenue || 0) + (formData.extra_food_revenue || 0)).toFixed(0)} €</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Service-MA</p>
                  <p className="text-xl font-bold">{formData.staff_count}</p>
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
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Frühstück Woche</p>
                    <p className="text-2xl font-bold text-orange-600">{weeklyStats.totalBreakfast}</p>
                    <p className="text-xs text-muted-foreground">Ø {(weeklyStats.totalBreakfast / weeklyStats.days).toFixed(0)}/Tag</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Mittag Woche</p>
                    <p className="text-2xl font-bold text-yellow-600">{weeklyStats.totalLunch}</p>
                    <p className="text-xs text-muted-foreground">Ø {(weeklyStats.totalLunch / weeklyStats.days).toFixed(0)}/Tag</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Abend Woche</p>
                    <p className="text-2xl font-bold text-blue-600">{weeklyStats.totalDinner}</p>
                    <p className="text-xs text-muted-foreground">Ø {(weeklyStats.totalDinner / weeklyStats.days).toFixed(0)}/Tag</p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Gesamt Woche</p>
                    <p className="text-2xl font-bold text-primary">{weeklyStats.totalCovers}</p>
                    <p className="text-xs text-muted-foreground">Ø {weeklyStats.avgCoversPerDay.toFixed(0)}/Tag</p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Zusatzverkäufe Woche</p>
                  <p className="text-2xl font-bold text-green-600">{weeklyStats.totalExtras.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground">Ø {(weeklyStats.totalExtras / weeklyStats.totalCovers).toFixed(2)} € pro Cover</p>
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
