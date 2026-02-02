import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Sparkles, Save, Leaf, Hand, Palette, Heart, TrendingUp } from "lucide-react";

type TrafficColor = "green" | "yellow" | "red";

interface SpaReport {
  id: string;
  report_date: string;
  treatments_ayurveda: number;
  treatments_classic: number;
  treatments_cosmetic: number;
  treatments_yoga: number;
  treatments_other: number;
  treatments_total: number;
  revenue_ayurveda: number | null;
  revenue_classic: number | null;
  revenue_cosmetic: number | null;
  revenue_yoga: number | null;
  revenue_products: number | null;
  revenue_total: number | null;
  therapists_count: number;
  total_hours: number | null;
  available_slots: number;
  booked_slots: number;
  complaints: number;
  utilization_pct: number | null;
  treatments_per_therapist: number | null;
  avg_revenue_per_treatment: number | null;
}

// Ampellogik
function getUtilizationColor(pct: number): TrafficColor {
  if (pct >= 75) return "green";
  if (pct >= 60) return "yellow";
  return "red";
}

function getTreatmentsPerTherapistColor(treatments: number): TrafficColor {
  if (treatments >= 4 && treatments <= 6) return "green";
  if (treatments >= 3 && treatments < 4) return "yellow";
  return "red";
}

function getAvgRevenueColor(revenue: number): TrafficColor {
  if (revenue >= 80) return "green";
  if (revenue >= 60) return "yellow";
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

export function SpaKpiView() {
  const [reports, setReports] = useState<SpaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [formData, setFormData] = useState({
    treatments_ayurveda: 0,
    treatments_classic: 0,
    treatments_cosmetic: 0,
    treatments_yoga: 0,
    treatments_other: 0,
    revenue_ayurveda: 0,
    revenue_classic: 0,
    revenue_cosmetic: 0,
    revenue_yoga: 0,
    revenue_products: 0,
    therapists_count: 0,
    total_hours: 0,
    available_slots: 0,
    booked_slots: 0,
    complaints: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const existingReport = reports.find(r => r.report_date === selectedDate);
    if (existingReport) {
      setFormData({
        treatments_ayurveda: existingReport.treatments_ayurveda || 0,
        treatments_classic: existingReport.treatments_classic || 0,
        treatments_cosmetic: existingReport.treatments_cosmetic || 0,
        treatments_yoga: existingReport.treatments_yoga || 0,
        treatments_other: existingReport.treatments_other || 0,
        revenue_ayurveda: existingReport.revenue_ayurveda || 0,
        revenue_classic: existingReport.revenue_classic || 0,
        revenue_cosmetic: existingReport.revenue_cosmetic || 0,
        revenue_yoga: existingReport.revenue_yoga || 0,
        revenue_products: existingReport.revenue_products || 0,
        therapists_count: existingReport.therapists_count || 0,
        total_hours: existingReport.total_hours || 0,
        available_slots: existingReport.available_slots || 0,
        booked_slots: existingReport.booked_slots || 0,
        complaints: existingReport.complaints || 0,
      });
    } else {
      setFormData({
        treatments_ayurveda: 0,
        treatments_classic: 0,
        treatments_cosmetic: 0,
        treatments_yoga: 0,
        treatments_other: 0,
        revenue_ayurveda: 0,
        revenue_classic: 0,
        revenue_cosmetic: 0,
        revenue_yoga: 0,
        revenue_products: 0,
        therapists_count: 0,
        total_hours: 0,
        available_slots: 0,
        booked_slots: 0,
        complaints: 0,
      });
    }
  }, [selectedDate, reports]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("spa_daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(365);

    if (error) {
      toast.error("Fehler beim Laden der SPA-Reports");
      console.error(error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const calculatedKpis = useMemo(() => {
    const treatments_total = formData.treatments_ayurveda + formData.treatments_classic + 
                            formData.treatments_cosmetic + formData.treatments_yoga + 
                            formData.treatments_other;
    
    const revenue_total = (formData.revenue_ayurveda || 0) + (formData.revenue_classic || 0) + 
                         (formData.revenue_cosmetic || 0) + (formData.revenue_yoga || 0) + 
                         (formData.revenue_products || 0);

    const utilization_pct = formData.available_slots > 0 
      ? (formData.booked_slots / formData.available_slots) * 100 
      : 0;

    const treatments_per_therapist = formData.therapists_count > 0 
      ? treatments_total / formData.therapists_count 
      : 0;

    const treatment_revenue = revenue_total - (formData.revenue_products || 0);
    const avg_revenue_per_treatment = treatments_total > 0 
      ? treatment_revenue / treatments_total 
      : 0;

    return {
      treatments_total,
      revenue_total,
      utilization_pct,
      treatments_per_therapist,
      avg_revenue_per_treatment,
    };
  }, [formData]);

  // Monatsstatistik
  const monthlyStats = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedDate));
    const monthEnd = endOfMonth(new Date(selectedDate));
    
    const monthReports = reports.filter(r => {
      const d = new Date(r.report_date);
      return d >= monthStart && d <= monthEnd;
    });

    if (monthReports.length === 0) return null;

    const totalTreatments = monthReports.reduce((s, r) => s + (r.treatments_total || 0), 0);
    const totalRevenue = monthReports.reduce((s, r) => s + (r.revenue_total || 0), 0);
    const totalAyurveda = monthReports.reduce((s, r) => s + (r.treatments_ayurveda || 0), 0);
    const totalProducts = monthReports.reduce((s, r) => s + (r.revenue_products || 0), 0);

    return {
      days: monthReports.length,
      totalTreatments,
      totalRevenue,
      totalAyurveda,
      totalProducts,
      avgTreatmentsPerDay: totalTreatments / monthReports.length,
    };
  }, [reports, selectedDate]);

  const handleSave = async () => {
    setSaving(true);
    
    const reportData = {
      report_date: selectedDate,
      ...formData,
      treatments_total: calculatedKpis.treatments_total,
      revenue_total: calculatedKpis.revenue_total,
      utilization_pct: calculatedKpis.utilization_pct,
      treatments_per_therapist: calculatedKpis.treatments_per_therapist,
      avg_revenue_per_treatment: calculatedKpis.avg_revenue_per_treatment,
    };

    const existingReport = reports.find(r => r.report_date === selectedDate);

    if (existingReport) {
      const { error } = await supabase
        .from("spa_daily_reports")
        .update(reportData)
        .eq("id", existingReport.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
        console.error(error);
      } else {
        toast.success("SPA-Report aktualisiert");
        fetchReports();
      }
    } else {
      const { error } = await supabase
        .from("spa_daily_reports")
        .insert(reportData);

      if (error) {
        toast.error("Fehler beim Speichern");
        console.error(error);
      } else {
        toast.success("SPA-Report gespeichert");
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
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">SPA & Wellness KPIs</h1>
          <p className="text-muted-foreground">Behandlungen & Auslastung</p>
        </div>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">📋 Tägliche Erfassung</TabsTrigger>
          <TabsTrigger value="kpis">🚦 Aktuelle KPIs</TabsTrigger>
          <TabsTrigger value="month">📊 Monatsübersicht</TabsTrigger>
        </TabsList>

        {/* ===== TÄGLICHE ERFASSUNG ===== */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Behandlungen heute
                </span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </CardTitle>
              <p className="text-sm text-muted-foreground">⏱️ Zeitaufwand: ca. 5 Minuten</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Behandlungen nach Kategorie */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-3 text-center">
                    <Leaf className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <Label className="text-xs font-semibold">Ayurveda</Label>
                    <Input
                      type="number"
                      value={formData.treatments_ayurveda || ""}
                      onChange={(e) => setFormData({ ...formData, treatments_ayurveda: Number(e.target.value) })}
                      className="text-xl h-10 text-center font-bold mt-1"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-3 text-center">
                    <Hand className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <Label className="text-xs font-semibold">Klassisch</Label>
                    <Input
                      type="number"
                      value={formData.treatments_classic || ""}
                      onChange={(e) => setFormData({ ...formData, treatments_classic: Number(e.target.value) })}
                      className="text-xl h-10 text-center font-bold mt-1"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-pink-200 bg-pink-50">
                  <CardContent className="p-3 text-center">
                    <Palette className="h-5 w-5 text-pink-600 mx-auto mb-1" />
                    <Label className="text-xs font-semibold">Kosmetik</Label>
                    <Input
                      type="number"
                      value={formData.treatments_cosmetic || ""}
                      onChange={(e) => setFormData({ ...formData, treatments_cosmetic: Number(e.target.value) })}
                      className="text-xl h-10 text-center font-bold mt-1"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-purple-50">
                  <CardContent className="p-3 text-center">
                    <Heart className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <Label className="text-xs font-semibold">Yoga</Label>
                    <Input
                      type="number"
                      value={formData.treatments_yoga || ""}
                      onChange={(e) => setFormData({ ...formData, treatments_yoga: Number(e.target.value) })}
                      className="text-xl h-10 text-center font-bold mt-1"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200 bg-gray-50">
                  <CardContent className="p-3 text-center">
                    <Sparkles className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                    <Label className="text-xs font-semibold">Sonstige</Label>
                    <Input
                      type="number"
                      value={formData.treatments_other || ""}
                      onChange={(e) => setFormData({ ...formData, treatments_other: Number(e.target.value) })}
                      className="text-xl h-10 text-center font-bold mt-1"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Auslastung & Personal */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Therapeuten im Einsatz</Label>
                  <Input
                    type="number"
                    value={formData.therapists_count || ""}
                    onChange={(e) => setFormData({ ...formData, therapists_count: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Verfügbare Slots</Label>
                  <Input
                    type="number"
                    value={formData.available_slots || ""}
                    onChange={(e) => setFormData({ ...formData, available_slots: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Gebuchte Slots</Label>
                  <Input
                    type="number"
                    value={formData.booked_slots || ""}
                    onChange={(e) => setFormData({ ...formData, booked_slots: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Produktverkauf (€)</Label>
                  <Input
                    type="number"
                    value={formData.revenue_products || ""}
                    onChange={(e) => setFormData({ ...formData, revenue_products: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Optional: Umsatz nach Kategorie */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  ➕ Optional: Umsatz nach Kategorie
                </summary>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 border rounded-lg">
                  <div>
                    <Label>Ayurveda (€)</Label>
                    <Input
                      type="number"
                      value={formData.revenue_ayurveda || ""}
                      onChange={(e) => setFormData({ ...formData, revenue_ayurveda: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Klassisch (€)</Label>
                    <Input
                      type="number"
                      value={formData.revenue_classic || ""}
                      onChange={(e) => setFormData({ ...formData, revenue_classic: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Kosmetik (€)</Label>
                    <Input
                      type="number"
                      value={formData.revenue_cosmetic || ""}
                      onChange={(e) => setFormData({ ...formData, revenue_cosmetic: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Yoga (€)</Label>
                    <Input
                      type="number"
                      value={formData.revenue_yoga || ""}
                      onChange={(e) => setFormData({ ...formData, revenue_yoga: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </details>

              {/* Live-Zusammenfassung */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Behandlungen</p>
                    <p className="text-2xl font-bold text-primary">{calculatedKpis.treatments_total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Auslastung</p>
                    <p className="text-2xl font-bold">{calculatedKpis.utilization_pct.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Beh./Therapeut</p>
                    <p className="text-2xl font-bold">{calculatedKpis.treatments_per_therapist.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ø Umsatz/Beh.</p>
                    <p className="text-2xl font-bold">{calculatedKpis.avg_revenue_per_treatment.toFixed(0)} €</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichern..." : "SPA-Report speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AKTUELLE KPIs ===== */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className={`border-2 ${colorBgClasses[getUtilizationColor(calculatedKpis.utilization_pct)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Auslastung</p>
                    <p className="text-3xl font-bold">{calculatedKpis.utilization_pct.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≥75%</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getUtilizationColor(calculatedKpis.utilization_pct)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${colorBgClasses[getTreatmentsPerTherapistColor(calculatedKpis.treatments_per_therapist)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Beh./Therapeut</p>
                    <p className="text-3xl font-bold">{calculatedKpis.treatments_per_therapist.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Ziel: 4-6</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getTreatmentsPerTherapistColor(calculatedKpis.treatments_per_therapist)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${colorBgClasses[getAvgRevenueColor(calculatedKpis.avg_revenue_per_treatment)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ø Umsatz/Behandlung</p>
                    <p className="text-3xl font-bold">{calculatedKpis.avg_revenue_per_treatment.toFixed(0)} €</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≥80 €</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getAvgRevenueColor(calculatedKpis.avg_revenue_per_treatment)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Behandlungen nach Kategorie */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">Behandlungen nach Kategorie</p>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="p-2 bg-green-50 rounded">
                  <Leaf className="h-4 w-4 text-green-600 mx-auto" />
                  <p className="text-lg font-bold text-green-600">{formData.treatments_ayurveda}</p>
                  <p className="text-xs">Ayurveda</p>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <Hand className="h-4 w-4 text-blue-600 mx-auto" />
                  <p className="text-lg font-bold text-blue-600">{formData.treatments_classic}</p>
                  <p className="text-xs">Klassisch</p>
                </div>
                <div className="p-2 bg-pink-50 rounded">
                  <Palette className="h-4 w-4 text-pink-600 mx-auto" />
                  <p className="text-lg font-bold text-pink-600">{formData.treatments_cosmetic}</p>
                  <p className="text-xs">Kosmetik</p>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <Heart className="h-4 w-4 text-purple-600 mx-auto" />
                  <p className="text-lg font-bold text-purple-600">{formData.treatments_yoga}</p>
                  <p className="text-xs">Yoga</p>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <Sparkles className="h-4 w-4 text-gray-600 mx-auto" />
                  <p className="text-lg font-bold text-gray-600">{formData.treatments_other}</p>
                  <p className="text-xs">Sonstige</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MONATSÜBERSICHT ===== */}
        <TabsContent value="month" className="space-y-4">
          {monthlyStats ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monatsübersicht ({monthlyStats.days} Tage erfasst)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Behandlungen</p>
                    <p className="text-3xl font-bold text-primary">{monthlyStats.totalTreatments}</p>
                    <p className="text-xs text-muted-foreground">Ø {monthlyStats.avgTreatmentsPerDay.toFixed(0)}/Tag</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">davon Ayurveda</p>
                    <p className="text-3xl font-bold text-green-600">{monthlyStats.totalAyurveda}</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Gesamtumsatz</p>
                    <p className="text-3xl font-bold">{monthlyStats.totalRevenue.toLocaleString('de-DE')} €</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg col-span-2 md:col-span-1">
                    <p className="text-sm text-muted-foreground">Produktverkauf</p>
                    <p className="text-2xl font-bold text-yellow-600">{monthlyStats.totalProducts.toLocaleString('de-DE')} €</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Keine Daten für diesen Monat vorhanden
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
