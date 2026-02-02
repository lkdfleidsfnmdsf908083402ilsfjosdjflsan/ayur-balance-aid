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
import { ChefHat, Save, Calculator, Coffee, UtensilsCrossed, Moon, Users, AlertCircle } from "lucide-react";

type TrafficColor = "green" | "yellow" | "red";

interface KitchenReport {
  id: string;
  report_date: string;
  food_cost_week: number | null;
  beverage_cost_week: number | null;
  waste_value_week: number | null;
  kitchen_staff_count: number;
  base_cpc: number | null;
  cpc_breakfast: number | null;
  cpc_lunch: number | null;
  cpc_dinner: number | null;
  cpgd: number | null;
  waste_pct: number | null;
}

interface ServiceReport {
  report_date: string;
  covers_breakfast: number;
  covers_lunch: number;
  covers_dinner: number;
  covers_total: number;
}

// Gewichtungsfaktoren
const WEIGHT_BREAKFAST = 1.0;
const WEIGHT_LUNCH = 1.5;
const WEIGHT_DINNER = 2.0;

// Ampellogik
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
  const [kitchenReports, setKitchenReports] = useState<KitchenReport[]>([]);
  const [serviceReports, setServiceReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Nur Wareneinsatz wird eingegeben
  const [formData, setFormData] = useState({
    food_cost_week: 0,
    beverage_cost_week: 0,
    waste_value_week: 0,
    kitchen_staff_count: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const existingReport = kitchenReports.find(r => r.report_date === selectedDate);
    if (existingReport) {
      setFormData({
        food_cost_week: existingReport.food_cost_week || 0,
        beverage_cost_week: existingReport.beverage_cost_week || 0,
        waste_value_week: existingReport.waste_value_week || 0,
        kitchen_staff_count: existingReport.kitchen_staff_count || 0,
      });
    } else {
      setFormData({
        food_cost_week: 0,
        beverage_cost_week: 0,
        waste_value_week: 0,
        kitchen_staff_count: 0,
      });
    }
  }, [selectedDate, kitchenReports]);

  const fetchData = async () => {
    setLoading(true);
    
    // Kitchen Reports
    const { data: kitchenData, error: kitchenError } = await supabase
      .from("kitchen_daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(365);

    if (kitchenError) {
      console.error("Kitchen fetch error:", kitchenError);
    } else {
      setKitchenReports(kitchenData || []);
    }

    // Service Reports (für Covers)
    const { data: serviceData, error: serviceError } = await supabase
      .from("service_daily_reports")
      .select("report_date, covers_breakfast, covers_lunch, covers_dinner, covers_total")
      .order("report_date", { ascending: false })
      .limit(365);

    if (serviceError) {
      console.error("Service fetch error:", serviceError);
    } else {
      setServiceReports(serviceData || []);
    }

    setLoading(false);
  };

  // Covers von Service für die aktuelle Woche
  const weeklyCovers = useMemo(() => {
    const weekStart = startOfWeek(new Date(selectedDate), { locale: de });
    const weekEnd = endOfWeek(new Date(selectedDate), { locale: de });
    
    const weekReports = serviceReports.filter(r => {
      const d = new Date(r.report_date);
      return d >= weekStart && d <= weekEnd;
    });

    if (weekReports.length === 0) return null;

    const totalBreakfast = weekReports.reduce((s, r) => s + (r.covers_breakfast || 0), 0);
    const totalLunch = weekReports.reduce((s, r) => s + (r.covers_lunch || 0), 0);
    const totalDinner = weekReports.reduce((s, r) => s + (r.covers_dinner || 0), 0);

    const weightedCovers = (totalBreakfast * WEIGHT_BREAKFAST) + 
                          (totalLunch * WEIGHT_LUNCH) + 
                          (totalDinner * WEIGHT_DINNER);

    return {
      days: weekReports.length,
      totalBreakfast,
      totalLunch,
      totalDinner,
      totalCovers: totalBreakfast + totalLunch + totalDinner,
      weightedCovers,
    };
  }, [serviceReports, selectedDate]);

  // Berechnete CPCs
  const calculatedKpis = useMemo(() => {
    if (!weeklyCovers || weeklyCovers.weightedCovers === 0) {
      return {
        base_cpc: 0,
        cpc_breakfast: 0,
        cpc_lunch: 0,
        cpc_dinner: 0,
        cpgd: 0,
        waste_pct: 0,
      };
    }

    const total_cost = (formData.food_cost_week || 0) + (formData.beverage_cost_week || 0);
    const base_cpc = total_cost / weeklyCovers.weightedCovers;

    return {
      base_cpc,
      cpc_breakfast: base_cpc * WEIGHT_BREAKFAST,
      cpc_lunch: base_cpc * WEIGHT_LUNCH,
      cpc_dinner: base_cpc * WEIGHT_DINNER,
      cpgd: base_cpc * (WEIGHT_BREAKFAST + WEIGHT_LUNCH + WEIGHT_DINNER),
      waste_pct: total_cost > 0 ? ((formData.waste_value_week || 0) / total_cost) * 100 : 0,
    };
  }, [formData, weeklyCovers]);

  const handleSave = async () => {
    setSaving(true);
    
    const reportData = {
      report_date: selectedDate,
      food_cost_week: formData.food_cost_week,
      beverage_cost_week: formData.beverage_cost_week,
      waste_value_week: formData.waste_value_week,
      kitchen_staff_count: formData.kitchen_staff_count,
      base_cpc: calculatedKpis.base_cpc,
      cpc_breakfast: calculatedKpis.cpc_breakfast,
      cpc_lunch: calculatedKpis.cpc_lunch,
      cpc_dinner: calculatedKpis.cpc_dinner,
      cpgd: calculatedKpis.cpgd,
      waste_pct: calculatedKpis.waste_pct,
    };

    const existingReport = kitchenReports.find(r => r.report_date === selectedDate);

    if (existingReport) {
      const { error } = await supabase
        .from("kitchen_daily_reports")
        .update(reportData)
        .eq("id", existingReport.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
        console.error(error);
      } else {
        toast.success("Küchen-Report aktualisiert & CPCs berechnet");
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("kitchen_daily_reports")
        .insert(reportData);

      if (error) {
        toast.error("Fehler beim Speichern");
        console.error(error);
      } else {
        toast.success("Küchen-Report gespeichert & CPCs berechnet");
        fetchData();
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
          <p className="text-muted-foreground">Cost per Cover Berechnung</p>
        </div>
      </div>

      <Tabs defaultValue="costs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="costs">💰 Wareneinsatz (Woche)</TabsTrigger>
          <TabsTrigger value="covers">👥 Covers (von Service)</TabsTrigger>
          <TabsTrigger value="kpis">🚦 Aktuelle CPCs</TabsTrigger>
        </TabsList>

        {/* ===== WARENEINSATZ EINGABE ===== */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Wareneinsatz der Woche
                </span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                📅 Empfohlen: Jeden Freitag erfassen (aus Lieferscheinen)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Covers-Info von Service (Read-Only) */}
              {weeklyCovers ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                    <Users className="h-4 w-4" />
                    Covers der Woche (vom Service erfasst)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-muted-foreground">Frühstück</p>
                      <p className="text-lg font-bold text-orange-600">{weeklyCovers.totalBreakfast}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-muted-foreground">Mittag</p>
                      <p className="text-lg font-bold text-yellow-600">{weeklyCovers.totalLunch}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-muted-foreground">Abend</p>
                      <p className="text-lg font-bold text-blue-600">{weeklyCovers.totalDinner}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-muted-foreground">Gesamt</p>
                      <p className="text-lg font-bold">{weeklyCovers.totalCovers}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-muted-foreground">Gewichtet</p>
                      <p className="text-lg font-bold text-primary">{weeklyCovers.weightedCovers.toFixed(0)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {weeklyCovers.days} Tage erfasst | Gewichtung: Frühstück ×1, Mittag ×1.5, Abend ×2
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800">Keine Cover-Daten vorhanden</p>
                    <p className="text-sm text-yellow-700">Der Service muss zuerst die Covers dieser Woche erfassen.</p>
                  </div>
                </div>
              )}

              {/* Wareneinsatz Eingabe */}
              <div>
                <h4 className="font-semibold mb-3">💰 Wareneinsatz eingeben</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-2 border-green-200">
                    <CardContent className="p-4">
                      <Label className="font-semibold">Food-Einkauf (€)</Label>
                      <Input
                        type="number"
                        value={formData.food_cost_week || ""}
                        onChange={(e) => setFormData({ ...formData, food_cost_week: Number(e.target.value) })}
                        placeholder="z.B. 4500"
                        className="text-xl h-12 mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Fleisch, Gemüse, Milch, etc.</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-purple-200">
                    <CardContent className="p-4">
                      <Label className="font-semibold">Getränke-Einkauf (€)</Label>
                      <Input
                        type="number"
                        value={formData.beverage_cost_week || ""}
                        onChange={(e) => setFormData({ ...formData, beverage_cost_week: Number(e.target.value) })}
                        placeholder="z.B. 800"
                        className="text-xl h-12 mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Wein, Bier, Säfte, Kaffee</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-red-200">
                    <CardContent className="p-4">
                      <Label className="font-semibold">Schwund/Reste (€)</Label>
                      <Input
                        type="number"
                        value={formData.waste_value_week || ""}
                        onChange={(e) => setFormData({ ...formData, waste_value_week: Number(e.target.value) })}
                        placeholder="z.B. 150"
                        className="text-xl h-12 mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Geschätzte Lebensmittelabfälle</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Vorschau der berechneten CPCs */}
              {weeklyCovers && (formData.food_cost_week > 0 || formData.beverage_cost_week > 0) && (
                <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Berechnete Cost per Cover (Vorschau)
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

              <Button 
                onClick={handleSave} 
                disabled={saving || !weeklyCovers} 
                className="w-full" 
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichern..." : "Wareneinsatz speichern & CPCs berechnen"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== COVERS ANZEIGE (Read-Only) ===== */}
        <TabsContent value="covers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Covers der Woche (vom Service erfasst)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Diese Daten werden vom Service-Team eingegeben
              </p>
            </CardHeader>
            <CardContent>
              {weeklyCovers ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-2 border-orange-200 bg-orange-50">
                      <CardContent className="p-6 text-center">
                        <Coffee className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Frühstück</p>
                        <p className="text-3xl font-bold text-orange-600">{weeklyCovers.totalBreakfast}</p>
                        <p className="text-xs text-muted-foreground">Ø {(weeklyCovers.totalBreakfast / weeklyCovers.days).toFixed(0)}/Tag</p>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-yellow-200 bg-yellow-50">
                      <CardContent className="p-6 text-center">
                        <UtensilsCrossed className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Mittagessen</p>
                        <p className="text-3xl font-bold text-yellow-600">{weeklyCovers.totalLunch}</p>
                        <p className="text-xs text-muted-foreground">Ø {(weeklyCovers.totalLunch / weeklyCovers.days).toFixed(0)}/Tag</p>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardContent className="p-6 text-center">
                        <Moon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Abendessen</p>
                        <p className="text-3xl font-bold text-blue-600">{weeklyCovers.totalDinner}</p>
                        <p className="text-xs text-muted-foreground">Ø {(weeklyCovers.totalDinner / weeklyCovers.days).toFixed(0)}/Tag</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Gesamt Covers</p>
                        <p className="text-3xl font-bold">{weeklyCovers.totalCovers}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-primary">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Gewichtete Covers</p>
                        <p className="text-3xl font-bold text-primary">{weeklyCovers.weightedCovers.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Für CPC-Berechnung</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                  <p className="font-semibold">Keine Cover-Daten für diese Woche</p>
                  <p className="text-sm">Der Service muss zuerst die täglichen Covers erfassen.</p>
                </div>
              )}
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

          {/* Schwund */}
          <Card className={`border-2 ${colorBgClasses[getWasteColor(calculatedKpis.waste_pct)]}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Schwund/Waste</p>
                  <p className="text-2xl font-bold">{calculatedKpis.waste_pct.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Ziel: {"<"}2%</p>
                </div>
                <div className={`w-5 h-5 rounded-full ${colorClasses[getWasteColor(calculatedKpis.waste_pct)]} shadow-md`} />
              </div>
            </CardContent>
          </Card>

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
                    <li><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>CPGD: 18-30 € | Schwund: {"<"}2%</li>
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
