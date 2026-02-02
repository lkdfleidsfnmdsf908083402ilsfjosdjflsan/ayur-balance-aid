import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Hotel, Save, Users, LogIn, LogOut, UserX, TrendingUp, DoorOpen } from "lucide-react";

type TrafficColor = "green" | "yellow" | "red";

// Stammdaten
const TOTAL_ROOMS = 60; // Aktiv im Verkauf (7 für Mitarbeiter nicht mitgezählt)

interface FrontdeskReport {
  id: string;
  report_date: string;
  rooms_occupied: number;
  checkins_today: number;
  checkouts_today: number;
  walkins: number;
  noshows: number;
  cancellations: number;
  guests_total: number;
  guests_absent: number;
  room_revenue: number | null;
  staff_count: number;
  complaints: number;
  occupancy_pct: number | null;
  adr: number | null;
  revpar: number | null;
}

// Ampellogik
function getOccupancyColor(pct: number): TrafficColor {
  if (pct >= 70) return "green";
  if (pct >= 50) return "yellow";
  return "red";
}

function getAdrColor(adr: number): TrafficColor {
  if (adr >= 150) return "green";
  if (adr >= 120) return "yellow";
  return "red";
}

function getNoshowColor(rate: number): TrafficColor {
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

export function FrontOfficeKpiView() {
  const [reports, setReports] = useState<FrontdeskReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [formData, setFormData] = useState({
    rooms_occupied: 0,
    checkins_today: 0,
    checkouts_today: 0,
    walkins: 0,
    noshows: 0,
    cancellations: 0,
    guests_total: 0,
    guests_absent: 0,
    room_revenue: 0,
    staff_count: 0,
    complaints: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const existingReport = reports.find(r => r.report_date === selectedDate);
    if (existingReport) {
      setFormData({
        rooms_occupied: existingReport.rooms_occupied || 0,
        checkins_today: existingReport.checkins_today || 0,
        checkouts_today: existingReport.checkouts_today || 0,
        walkins: existingReport.walkins || 0,
        noshows: existingReport.noshows || 0,
        cancellations: existingReport.cancellations || 0,
        guests_total: existingReport.guests_total || 0,
        guests_absent: existingReport.guests_absent || 0,
        room_revenue: existingReport.room_revenue || 0,
        staff_count: existingReport.staff_count || 0,
        complaints: existingReport.complaints || 0,
      });
    } else {
      setFormData({
        rooms_occupied: 0,
        checkins_today: 0,
        checkouts_today: 0,
        walkins: 0,
        noshows: 0,
        cancellations: 0,
        guests_total: 0,
        guests_absent: 0,
        room_revenue: 0,
        staff_count: 0,
        complaints: 0,
      });
    }
  }, [selectedDate, reports]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("frontdesk_daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(365);

    if (error) {
      toast.error("Fehler beim Laden der Rezeption-Reports");
      console.error(error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const calculatedKpis = useMemo(() => {
    const { rooms_occupied, room_revenue, checkins_today, noshows } = formData;

    const occupancy_pct = (rooms_occupied / TOTAL_ROOMS) * 100;
    const adr = rooms_occupied > 0 && room_revenue > 0 ? room_revenue / rooms_occupied : 0;
    const revpar = room_revenue > 0 ? room_revenue / TOTAL_ROOMS : 0;
    const noshow_rate = (checkins_today + noshows) > 0 ? (noshows / (checkins_today + noshows)) * 100 : 0;

    return {
      occupancy_pct,
      adr,
      revpar,
      noshow_rate,
      rooms_available: TOTAL_ROOMS - rooms_occupied,
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

    const totalOccupied = monthReports.reduce((s, r) => s + (r.rooms_occupied || 0), 0);
    const totalRevenue = monthReports.reduce((s, r) => s + (r.room_revenue || 0), 0);
    const totalCheckins = monthReports.reduce((s, r) => s + (r.checkins_today || 0), 0);
    const totalNoshows = monthReports.reduce((s, r) => s + (r.noshows || 0), 0);

    const avgOccupancy = (totalOccupied / (monthReports.length * TOTAL_ROOMS)) * 100;
    const avgAdr = totalOccupied > 0 ? totalRevenue / totalOccupied : 0;

    return {
      days: monthReports.length,
      avgOccupancy,
      avgAdr,
      totalRevenue,
      totalCheckins,
      totalNoshows,
    };
  }, [reports, selectedDate]);

  const handleSave = async () => {
    setSaving(true);
    
    const reportData = {
      report_date: selectedDate,
      total_rooms: TOTAL_ROOMS,
      ...formData,
      occupancy_pct: calculatedKpis.occupancy_pct,
      adr: calculatedKpis.adr,
      revpar: calculatedKpis.revpar,
    };

    const existingReport = reports.find(r => r.report_date === selectedDate);

    if (existingReport) {
      const { error } = await supabase
        .from("frontdesk_daily_reports")
        .update(reportData)
        .eq("id", existingReport.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
        console.error(error);
      } else {
        toast.success("Rezeption-Report aktualisiert");
        fetchReports();
      }
    } else {
      const { error } = await supabase
        .from("frontdesk_daily_reports")
        .insert(reportData);

      if (error) {
        toast.error("Fehler beim Speichern");
        console.error(error);
      } else {
        toast.success("Rezeption-Report gespeichert");
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
        <Hotel className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Rezeption-KPIs</h1>
          <p className="text-muted-foreground">Belegung & Gästebewegung ({TOTAL_ROOMS} Zimmer aktiv)</p>
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
                  <DoorOpen className="h-5 w-5" />
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
              
              {/* Zimmerbelegung */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="border-2 border-primary bg-primary/5">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold">Belegte Zimmer</Label>
                    <Input
                      type="number"
                      max={TOTAL_ROOMS}
                      value={formData.rooms_occupied || ""}
                      onChange={(e) => setFormData({ ...formData, rooms_occupied: Number(e.target.value) })}
                      className="text-3xl h-14 text-center font-bold mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-center">von {TOTAL_ROOMS} Zimmern</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <LogIn className="h-4 w-4" /> Check-ins
                    </Label>
                    <Input
                      type="number"
                      value={formData.checkins_today || ""}
                      onChange={(e) => setFormData({ ...formData, checkins_today: Number(e.target.value) })}
                      className="text-2xl h-12 text-center font-bold mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <LogOut className="h-4 w-4" /> Check-outs
                    </Label>
                    <Input
                      type="number"
                      value={formData.checkouts_today || ""}
                      onChange={(e) => setFormData({ ...formData, checkouts_today: Number(e.target.value) })}
                      className="text-2xl h-12 text-center font-bold mt-2"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Gäste */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> Gäste im Haus
                  </Label>
                  <Input
                    type="number"
                    value={formData.guests_total || ""}
                    onChange={(e) => setFormData({ ...formData, guests_total: Number(e.target.value) })}
                    className="text-lg"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <UserX className="h-4 w-4" /> Gäste außer Haus
                  </Label>
                  <Input
                    type="number"
                    value={formData.guests_absent || ""}
                    onChange={(e) => setFormData({ ...formData, guests_absent: Number(e.target.value) })}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">Ausflüge, etc.</p>
                </div>
                <div>
                  <Label>Walk-ins</Label>
                  <Input
                    type="number"
                    value={formData.walkins || ""}
                    onChange={(e) => setFormData({ ...formData, walkins: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>No-Shows</Label>
                  <Input
                    type="number"
                    value={formData.noshows || ""}
                    onChange={(e) => setFormData({ ...formData, noshows: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Umsatz (optional) */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  ➕ Optional: Tagesumsatz & Personal
                </summary>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 p-4 border rounded-lg">
                  <div>
                    <Label>Logis-Umsatz (€)</Label>
                    <Input
                      type="number"
                      value={formData.room_revenue || ""}
                      onChange={(e) => setFormData({ ...formData, room_revenue: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Rezeption-MA</Label>
                    <Input
                      type="number"
                      value={formData.staff_count || ""}
                      onChange={(e) => setFormData({ ...formData, staff_count: Number(e.target.value) })}
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
                </div>
              </details>

              {/* Live-Berechnung */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Belegung</p>
                    <p className="text-2xl font-bold text-primary">{calculatedKpis.occupancy_pct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Frei</p>
                    <p className="text-2xl font-bold text-green-600">{calculatedKpis.rooms_available}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ADR</p>
                    <p className="text-2xl font-bold">{calculatedKpis.adr.toFixed(0)} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">RevPAR</p>
                    <p className="text-2xl font-bold">{calculatedKpis.revpar.toFixed(0)} €</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichern..." : "Rezeption-Report speichern"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AKTUELLE KPIs ===== */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className={`border-2 ${colorBgClasses[getOccupancyColor(calculatedKpis.occupancy_pct)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Belegungsrate</p>
                    <p className="text-3xl font-bold">{calculatedKpis.occupancy_pct.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≥70%</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getOccupancyColor(calculatedKpis.occupancy_pct)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${colorBgClasses[getAdrColor(calculatedKpis.adr)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ADR (Ø Zimmerpreis)</p>
                    <p className="text-3xl font-bold">{calculatedKpis.adr.toFixed(0)} €</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≥150 €</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getAdrColor(calculatedKpis.adr)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 ${colorBgClasses[getNoshowColor(calculatedKpis.noshow_rate)]}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">No-Show Rate</p>
                    <p className="text-3xl font-bold">{calculatedKpis.noshow_rate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Ziel: ≤2%</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full ${colorClasses[getNoshowColor(calculatedKpis.noshow_rate)]} shadow-md`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tagesübersicht */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Belegt</p>
                  <p className="text-xl font-bold text-primary">{formData.rooms_occupied}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Frei</p>
                  <p className="text-xl font-bold text-green-600">{calculatedKpis.rooms_available}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                  <p className="text-xl font-bold text-green-600">{formData.checkins_today}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Check-outs</p>
                  <p className="text-xl font-bold text-orange-600">{formData.checkouts_today}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Gäste</p>
                  <p className="text-xl font-bold">{formData.guests_total}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Außer Haus</p>
                  <p className="text-xl font-bold text-yellow-600">{formData.guests_absent}</p>
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
                    <p className="text-sm text-muted-foreground">Ø Belegung</p>
                    <p className="text-3xl font-bold text-primary">{monthlyStats.avgOccupancy.toFixed(1)}%</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Ø ADR</p>
                    <p className="text-3xl font-bold">{monthlyStats.avgAdr.toFixed(0)} €</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Logis-Umsatz</p>
                    <p className="text-3xl font-bold text-green-600">{monthlyStats.totalRevenue.toLocaleString('de-DE')} €</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Check-ins</p>
                    <p className="text-2xl font-bold">{monthlyStats.totalCheckins}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">No-Shows</p>
                    <p className="text-2xl font-bold text-red-600">{monthlyStats.totalNoshows}</p>
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
