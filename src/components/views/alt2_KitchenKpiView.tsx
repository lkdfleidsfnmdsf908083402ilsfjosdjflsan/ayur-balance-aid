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
import { ChefHat, Save, Users, Coffee, UtensilsCrossed, Moon, Calculator } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type TrafficColor = "green" | "yellow" | "red";

interface KitchenReport {
  id: string;
  report_date: string;
  // Tägliche Covers
  covers_breakfast: number;
  covers_lunch: number;
  covers_dinner: number;
  covers_total: number;
  guests_absent: number;
  // Wöchentliche Kosten (nur am Freitag/Wochenende erfasst)
  food_cost_week: number | null;
  beverage_cost_week: number | null;
  waste_value_week: number | null;
  // Personal
  kitchen_staff_count: number;
  kitchen_hours_total: number;
  // Qualität
  food_complaints: number;
  // Berechnete KPIs
  weighted_covers: number | null;
  base_cpc: number | null;
  cpc_breakfast: number | null;
  cpc_lunch: number | null;
  cpc_dinner: number | null;
  cpgd: number | null;
  waste_pct: number | null;
  meals_per_employee: number | null;
}

// Gewichtungsfaktoren für Mahlzeiten
const WEIGHT_BREAKFAST = 1.0;
const WEIGHT_LUNCH = 1.5;
const WEIGHT_DINNER = 2.0;

// Ampellogik für Kurhotel/Vollpension
function getCpcBreakfastColor(cpc: number): TrafficColor {
  if (cpc >= 4 && cpc <= 6) return "green";
  if (cpc > 6 && cpc <= 8) return "yellow";
  return "red";
}

function getCpcLunchColor(cpc: number): TrafficColor {
  if (cpc >= 6 && cpc <= 10) return "green";
  if (cpc > 10 && cpc <= 14) return "yellow";
  return "red";
}

function getCpcDinnerColor(cpc: number): TrafficColor {
  if (cpc >= 8 && cpc <= 14) return "green";
  if (cpc > 14 && cpc <= 18) return "yellow";
  return "red";
}

function getCpgdColor(cpgd: number): TrafficColor {
  if (cpgd >= 18 && cpgd <= 30) return "green";
  if (cpgd > 30 && cpgd <= 40) return "yellow";
  return "red";
}

function getWasteColor(pct: number): TrafficColor {
  if (pct < 2) return "green";
  if (pct <= 5) return "yellow";
  return "red";
}

function getMealsPerEmployeeColor(meals: number): TrafficColor {
  if (meals >= 20 && meals <= 40) return "green";
  if ((meals >= 15 && meals < 20) || (meals > 40 && meals <= 50)) return "yellow";
  return "red";
}

function getComplaintColor(complaints: number, covers: number): TrafficColor {
  const rate = covers > 0 ? (complaints / covers) * 100 : 0;
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

export function KitchenKpiView() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<KitchenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Tägliche Erfassung (5 Min)
  const [dailyData, setDailyData] = useState({
    covers_breakfast: 0,
    covers_lunch: 0,
    covers_dinner: 0,
    guests_absent: 0,
    food_complaints: 0,
    kitchen_staff_count: 0,
    kitchen_hours_total: 0,
  });

  // Wöchentliche Erfassung (Freitag-Meeting)
  const [weeklyData, setWeeklyData] = useState({
    food_cost_week: 0,
    beverage_cost_week: 0,
    waste_value_week: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    // Lade Daten für ausgewähltes Datum
    const existingReport = reports.find(r => r.report_date === selectedDate);
    if (existingReport) {
      setDailyData({
        covers_breakfast: existingReport.covers_breakfast || 0,
        covers_lunch: existingReport.covers_lunch || 0,
        covers_dinner: existingReport.covers_dinner || 0,
        guests_absent: existingReport.guests_absent || 0,
        food_complaints: existingReport.food_complaints || 0,
        kitchen_staff_count: existingReport.kitchen_staff_count || 0,
        kitchen_hours_total: existingReport.kitchen_hours_total || 0,
      });
      setWeeklyData({
        food_cost_week: existingReport.food_cost_week || 0,
        beverage_cost_week: existingReport.beverage_cost_week || 0,
        waste_value_week: existingReport.waste_value_week || 0,
      });
    } else {
      // Reset für neuen Tag
      setDailyData({
        covers_breakfast: 0,
        covers_lunch: 0,
        covers_dinner: 0,
        guests_absent: 0,
        food_complaints: 0,
        kitchen_staff_count: 0,
        kitchen_hours_total: 0,
      });
    }
  }, [selectedDate, reports]);

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
    }
    setLoading(false);
  };

  // Berechnete KPIs
  const calculatedKpis = useMemo(() => {
    const { covers_breakfast, covers_lunch, covers_dinner, kitchen_staff_count } = dailyData;
    const { food_cost_week, beverage_cost_week, waste_value_week } = weeklyData;

    const covers_total = covers_breakfast + covers_lunch + covers_dinner;
    const weighted_covers = (covers_breakfast * WEIGHT_BREAKFAST) + 
                           (covers_lunch * WEIGHT_LUNCH) + 
                           (covers_dinner * WEIGHT_DINNER);

    const total_cost_week = food_cost_week + beverage_cost_week;
    
    // Wir brauchen die Summe der gewichteten Covers der Woche für CPC
    // Für tägliche Anzeige nutzen wir die letzten 7 Tage
    const weekStart = startOfWeek(new Date(selectedDate), { locale: de });
    const weekEnd = endOfWeek(new Date(selectedDate), { locale: de });
    
    const weekReports = reports.filter(r => {
      const d = new Date(r.report_date);
      return d >= weekStart && d <= weekEnd;
    });

    const weeklyWeightedCovers = weekReports.reduce((sum, r) => {
      return sum + ((r.covers_breakfast || 0) * WEIGHT_BREAKFAST) +
                   ((r.covers_lunch || 0) * WEIGHT_LUNCH) +
                   ((r.covers_dinner || 0) * WEIGHT_DINNER);
    }, 0) || weighted_covers; // Fallback auf aktuellen Tag

    const base_cpc = weeklyWeightedCovers > 0 && total_cost_week > 0 
      ? total_cost_week / weeklyWeightedCovers 
      : 0;

    const cpc_breakfast = base_cpc * WEIGHT_BREAKFAST;
    const cpc_lunch = base_cpc * WEIGHT_LUNCH;
    const cpc_dinner = base_cpc * WEIGHT_DINNER;
    const cpgd = cpc_breakfast + cpc_lunch + cpc_dinner;

    const waste_pct = total_cost_week > 0 && waste_value_week > 0
      ? (waste_value_week / total_cost_week) * 100
      : 0;

    const meals_per_employee = kitchen_staff_count > 0 
      ? covers_total / kitchen_staff_count 
      : 0;

    return {
      covers_total,
      weighted_covers,
      base_cpc,
      cpc_breakfast,
      cpc_lunch,
      cpc_dinner,
      cpgd,
      waste_pct,
      meals_per_employee,
    };
  }, [dailyData, weeklyData, reports, selectedDate]);

  // Wochendaten für Übersicht
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
    const totalAbsent = weekReports.reduce((s, r) => s + (r.guests_absent || 0), 0);
    const totalComplaints = weekReports.reduce((s, r) => s + (r.food_complaints || 0), 0);

    return {
      days: weekReports.length,
      totalBreakfast,
      totalLunch,
      totalDinner,
      totalCovers: totalBreakfast + totalLunch + totalDinner,
      totalAbsent,
      totalComplaints,
      avgBreakfast: totalBreakfast / weekReports.length,
      avgLunch: totalLunch / weekReports.length,
      avgDinner: totalDinner / weekReports.length,
    };
  }, [reports, selectedDate]);

  const handleSaveDaily = async () => {
    setSaving(true);
    
    const covers_total = dailyData.covers_breakfast + dailyData.covers_lunch + dailyData.covers_dinner;
    const weighted_covers = (dailyData.covers_breakfast * WEIGHT_BREAKFAST) + 
                           (dailyData.covers_lunch * WEIGHT_LUNCH) + 
                           (dailyData.covers_dinner * WEIGHT_DINNER);

    const reportData = {
      report_date: selectedDate,
      covers_breakfast: dailyData.covers_breakfast,
      covers_lunch: dailyData.covers_lunch,
      covers_dinner: dailyData.covers_dinner,
      covers_total,
      guests_absent: dailyData.guests_absent,
      food_complaints: dailyData.food_complaints,
      kitchen_staff_count: dailyData.kitchen_staff_count,
      kitchen_hours_total: dailyData.kitchen_hours_total,
      weighted_covers,
      meals_per_employee: dailyData.kitchen_staff_count > 0 
        ? covers_total / dailyData.kitchen_staff_count 
        : null,
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

  const handleSaveWeekly = async () => {
    setSaving(true);
    
    // Speichere Wochendaten am aktuellen Tag (typischerweise Freitag)
    const reportData = {
      report_date: selectedDate,
      food_cost_week: weeklyData.food_cost_week,
      beverage_cost_week: weeklyData.beverage_cost_week,
      waste_value_week: weeklyData.waste_value_week,
      // Berechne CPCs
      base_cpc: calculatedKpis.base_cpc,
      cpc_breakfast: calculatedKpis.cpc_breakfast,
      cpc_lunch: calculatedKpis.cpc_lunch,
      cpc_dinner: calculatedKpis.cpc_dinner,
      cpgd: calculatedKpis.cpgd,
      waste_pct: calculatedKpis.waste_pct,
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
        toast.success("Wochendaten gespeichert & CPCs berechnet");
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
        toast.success("Wochendaten gespeichert & CPCs berechnet");
        fetchReports();
      }
    }
    setSaving(false);
  };

  const renderCpcCard = (
    label: string, 
    icon: React.ReactNode,
    value: number, 
    benchmark: string, 
    color: TrafficColor
  ) => (
    <Card className={`border-2 ${colorBgClasses[color]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{value.toFixed(2)} €</p>
              <p className="text-xs text-muted-foreground">{benchmark}</p>
            </div>
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
        <ChefHat className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Küchen-KPIs (Vollpension)</h1>
          <p className="text-muted-foreground">Cost per Cover Methode für Kurhotel</p>
        </div>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">📋 Tägliche Erfassung</TabsTrigger>
          <TabsTrigger value="weekly">📊 Wochenabschluss</TabsTrigger>
          <TabsTrigger value="kpis">🚦 Aktuelle KPIs</TabsTrigger>
        </TabsList>

        {/* ===== TÄGLICHE ERFASSUNG (5 Min) ===== */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Tägliche Cover-Erfassung
                </span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                ⏱️ Zeitaufwand: ca. 5 Minuten
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
                      value={dailyData.covers_breakfast || ""}
                      onChange={(e) => setDailyData({ ...dailyData, covers_breakfast: Number(e.target.value) })}
                      placeholder="Anzahl Gäste"
                      className="text-2xl h-14 text-center font-bold"
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">Gewichtung: ×1.0</p>
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
                      value={dailyData.covers_lunch || ""}
                      onChange={(e) => setDailyData({ ...dailyData, covers_lunch: Number(e.target.value) })}
                      placeholder="Anzahl Gäste"
                      className="text-2xl h-14 text-center font-bold"
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">Gewichtung: ×1.5</p>
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
                      value={dailyData.covers_dinner || ""}
                      onChange={(e) => setDailyData({ ...dailyData, covers_dinner: Number(e.target.value) })}
                      placeholder="Anzahl Gäste"
                      className="text-2xl h-14 text-center font-bold"
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">Gewichtung: ×2.0</p>
                  </CardContent>
                </Card>
              </div>

              {/* Zusammenfassung */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Covers Gesamt</p>
                  <p className="text-2xl font-bold">{calculatedKpis.covers_total}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Gewichtete Covers</p>
                  <p className="text-2xl font-bold">{calculatedKpis.weighted_covers.toFixed(1)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Gäste außer Haus</p>
                  <Input
                    type="number"
                    value={dailyData.guests_absent || ""}
                    onChange={(e) => setDailyData({ ...dailyData, guests_absent: Number(e.target.value) })}
                    className="w-20 mx-auto text-center"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Beschwerden</p>
                  <Input
                    type="number"
                    value={dailyData.food_complaints || ""}
                    onChange={(e) => setDailyData({ ...dailyData, food_complaints: Number(e.target.value) })}
                    className="w-20 mx-auto text-center"
                  />
                </div>
              </div>

              {/* Optional: Personal */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  ➕ Optional: Personal-Daten (für Meals/MA Berechnung)
                </summary>
                <div className="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-lg">
                  <div>
                    <Label>Küchen-MA im Einsatz</Label>
                    <Input
                      type="number"
                      value={dailyData.kitchen_staff_count || ""}
                      onChange={(e) => setDailyData({ ...dailyData, kitchen_staff_count: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Küchenstunden gesamt</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={dailyData.kitchen_hours_total || ""}
                      onChange={(e) => setDailyData({ ...dailyData, kitchen_hours_total: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </details>

              <Button onClick={handleSaveDaily} disabled={saving} className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichern..." : "Tagesreport speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== WOCHENABSCHLUSS (Freitag-Meeting) ===== */}
        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Wochenabschluss - Wareneinsatz & CPC Berechnung
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                📅 Empfohlen: Jeden Freitag im Team-Meeting (ca. 15 Min)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Wochenübersicht Covers */}
              {weeklyStats && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-3">📊 Diese Woche ({weeklyStats.days} Tage erfasst)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Frühstück</p>
                      <p className="text-xl font-bold text-orange-600">{weeklyStats.totalBreakfast}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Mittag</p>
                      <p className="text-xl font-bold text-yellow-600">{weeklyStats.totalLunch}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Abend</p>
                      <p className="text-xl font-bold text-blue-600">{weeklyStats.totalDinner}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Gesamt</p>
                      <p className="text-xl font-bold">{weeklyStats.totalCovers}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Ø pro Tag</p>
                      <p className="text-xl font-bold">{(weeklyStats.totalCovers / weeklyStats.days).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Wareneinsatz Eingabe */}
              <div>
                <h4 className="font-semibold mb-3">💰 Wareneinsatz der Woche (aus Lieferscheinen)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Food-Einkauf (€)</Label>
                    <Input
                      type="number"
                      value={weeklyData.food_cost_week || ""}
                      onChange={(e) => setWeeklyData({ ...weeklyData, food_cost_week: Number(e.target.value) })}
                      placeholder="z.B. 4500"
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Fleisch, Gemüse, Milch, etc.</p>
                  </div>
                  <div>
                    <Label>Getränke-Einkauf (€)</Label>
                    <Input
                      type="number"
                      value={weeklyData.beverage_cost_week || ""}
                      onChange={(e) => setWeeklyData({ ...weeklyData, beverage_cost_week: Number(e.target.value) })}
                      placeholder="z.B. 800"
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Wein, Bier, Säfte, Kaffee</p>
                  </div>
                  <div>
                    <Label>Schwund/Reste geschätzt (€)</Label>
                    <Input
                      type="number"
                      value={weeklyData.waste_value_week || ""}
                      onChange={(e) => setWeeklyData({ ...weeklyData, waste_value_week: Number(e.target.value) })}
                      placeholder="z.B. 150"
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Weggeworfene Lebensmittel</p>
                  </div>
                </div>
              </div>

              {/* Berechnete CPCs Vorschau */}
              {(weeklyData.food_cost_week > 0 || weeklyData.beverage_cost_week > 0) && (
                <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Berechnete Cost per Cover (CPC)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">CPC Frühstück</p>
                      <p className="text-2xl font-bold text-orange-600">{calculatedKpis.cpc_breakfast.toFixed(2)} €</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">CPC Mittagessen</p>
                      <p className="text-2xl font-bold text-yellow-600">{calculatedKpis.cpc_lunch.toFixed(2)} €</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-muted-foreground">CPC Abendessen</p>
                      <p className="text-2xl font-bold text-blue-600">{calculatedKpis.cpc_dinner.toFixed(2)} €</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border-2 border-primary">
                      <p className="text-xs text-muted-foreground">CPGD (pro Gast/Tag)</p>
                      <p className="text-2xl font-bold text-primary">{calculatedKpis.cpgd.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleSaveWeekly} disabled={saving} className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichern..." : "Wochendaten speichern & CPCs berechnen"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AKTUELLE KPIs ===== */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {renderCpcCard(
              "CPC Frühstück",
              <Coffee className="h-5 w-5 text-orange-600" />,
              calculatedKpis.cpc_breakfast,
              "Benchmark: 4-6 €",
              getCpcBreakfastColor(calculatedKpis.cpc_breakfast)
            )}
            {renderCpcCard(
              "CPC Mittagessen",
              <UtensilsCrossed className="h-5 w-5 text-yellow-600" />,
              calculatedKpis.cpc_lunch,
              "Benchmark: 6-10 €",
              getCpcLunchColor(calculatedKpis.cpc_lunch)
            )}
            {renderCpcCard(
              "CPC Abendessen",
              <Moon className="h-5 w-5 text-blue-600" />,
              calculatedKpis.cpc_dinner,
              "Benchmark: 8-14 €",
              getCpcDinnerColor(calculatedKpis.cpc_dinner)
            )}
            {renderCpcCard(
              "CPGD (Kosten/Gast/Tag)",
              <Users className="h-5 w-5 text-primary" />,
              calculatedKpis.cpgd,
              "Benchmark: 18-30 €",
              getCpgdColor(calculatedKpis.cpgd)
            )}
          </div>

          {/* Weitere KPIs */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Schwund</p>
                    <p className="text-2xl font-bold">{calculatedKpis.waste_pct.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Ziel: {"<"}2%</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${colorClasses[getWasteColor(calculatedKpis.waste_pct)]}`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Meals/MA</p>
                    <p className="text-2xl font-bold">{calculatedKpis.meals_per_employee.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Ziel: 20-40</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${colorClasses[getMealsPerEmployeeColor(calculatedKpis.meals_per_employee)]}`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Beschwerden</p>
                    <p className="text-2xl font-bold">{dailyData.food_complaints}</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≤1% der Covers</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${colorClasses[getComplaintColor(dailyData.food_complaints, calculatedKpis.covers_total)]}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Benchmark-Legende */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🚦 Ampel-Legende (Benchmarks für Kurhotel)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-2">Cost per Cover (CPC)</p>
                  <ul className="space-y-1">
                    <li><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>Frühstück: 4-6 € | Mittag: 6-10 € | Abend: 8-14 €</li>
                    <li><span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>Frühstück: 6-8 € | Mittag: 10-14 € | Abend: 14-18 €</li>
                    <li><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>Frühstück: {">"}8 € | Mittag: {">"}14 € | Abend: {">"}18 €</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Weitere KPIs</p>
                  <ul className="space-y-1">
                    <li><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>CPGD: 18-30 € | Schwund: {"<"}2% | Meals/MA: 20-40</li>
                    <li><span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>CPGD: 30-40 € | Schwund: 2-5%</li>
                    <li><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>CPGD: {">"}40 € | Schwund: {">"}5%</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
