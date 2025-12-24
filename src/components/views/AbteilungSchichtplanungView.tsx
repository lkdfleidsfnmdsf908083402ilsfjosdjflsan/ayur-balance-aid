import { useState, useEffect, useMemo } from "react";
import { format, startOfWeek, addDays, subWeeks, addWeeks } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  AlertTriangle,
  Sun,
  Calendar,
  BarChart3,
  FileDown,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Database } from "@/integrations/supabase/types";

type AbsenceReason = Database["public"]["Enums"]["absence_reason"];

interface Employee {
  id: string;
  personalnummer: string;
  vorname: string;
  nachname: string;
  abteilung: string;
  wochenstunden_soll: number;
  stundenlohn: number;
}

interface Shift {
  id: string;
  employee_id: string;
  datum: string;
  soll_stunden: number;
  schicht_beginn: string | null;
  schicht_ende: string | null;
  ist_stunden: number | null;
  ueberstunden: number | null;
  abwesenheit: AbsenceReason;
  abwesenheit_notiz: string | null;
}

const ABWESENHEIT_OPTIONS: AbsenceReason[] = [
  "Arbeit",
  "Urlaub",
  "Krank",
  "Fortbildung",
  "Frei",
  "Überstundenabbau",
  "Elternzeit",
  "Sonstiges",
];

const ABTEILUNGEN = [
  "Housekeeping",
  "Front Office",
  "Service",
  "Küche",
  "Spa",
  "Technik",
  "Verwaltung",
];

export function AbteilungSchichtplanungView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedAbteilung, setSelectedAbteilung] = useState<string>(ABTEILUNGEN[0]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState<{
    employee: Employee;
    date: Date;
    shift: Shift | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    schicht_beginn: "",
    schicht_ende: "",
    soll_stunden: 8,
    abwesenheit: "Arbeit" as AbsenceReason,
    abwesenheit_notiz: "",
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  useEffect(() => {
    loadData();
  }, [currentWeekStart, selectedAbteilung]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load employees for selected department
      const { data: employeesData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("aktiv", true)
        .eq("abteilung", selectedAbteilung)
        .order("nachname");

      if (empError) throw empError;
      setEmployees(employeesData || []);

      // Load shifts for the week
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const weekEnd = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

      const employeeIds = (employeesData || []).map((e) => e.id);

      if (employeeIds.length > 0) {
        const { data: shiftsData, error: shiftError } = await supabase
          .from("employee_shifts")
          .select("*")
          .in("employee_id", employeeIds)
          .gte("datum", weekStart)
          .lte("datum", weekEnd);

        if (shiftError) throw shiftError;
        setShifts(shiftsData || []);
      } else {
        setShifts([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees;

  const getShiftForDay = (employeeId: string, date: Date): Shift | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.find((s) => s.employee_id === employeeId && s.datum === dateStr) || null;
  };

  const openShiftDialog = (employee: Employee, date: Date) => {
    const shift = getShiftForDay(employee.id, date);
    setSelectedShift({ employee, date, shift });
    setFormData({
      schicht_beginn: shift?.schicht_beginn || "08:00",
      schicht_ende: shift?.schicht_ende || "16:00",
      soll_stunden: shift?.soll_stunden || 8,
      abwesenheit: shift?.abwesenheit || "Arbeit",
      abwesenheit_notiz: shift?.abwesenheit_notiz || "",
    });
    setShowDialog(true);
  };

  const handleSaveShift = async () => {
    if (!selectedShift) return;

    try {
      const shiftData = {
        employee_id: selectedShift.employee.id,
        datum: format(selectedShift.date, "yyyy-MM-dd"),
        schicht_beginn: formData.abwesenheit === "Arbeit" ? formData.schicht_beginn : null,
        schicht_ende: formData.abwesenheit === "Arbeit" ? formData.schicht_ende : null,
        soll_stunden: formData.soll_stunden,
        abwesenheit: formData.abwesenheit,
        abwesenheit_notiz: formData.abwesenheit_notiz || null,
      };

      if (selectedShift.shift) {
        const { error } = await supabase
          .from("employee_shifts")
          .update(shiftData)
          .eq("id", selectedShift.shift.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employee_shifts").insert(shiftData);
        if (error) throw error;
      }

      toast.success("Schicht gespeichert");
      setShowDialog(false);
      loadData();
    } catch (error) {
      console.error("Error saving shift:", error);
      toast.error("Fehler beim Speichern");
    }
  };

  const getAbwesenheitBadge = (abwesenheit: AbsenceReason) => {
    const styles: Record<AbsenceReason, string> = {
      Arbeit: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Urlaub: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Krank: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Fortbildung: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      Frei: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      Überstundenabbau: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      Elternzeit: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      Sonstiges: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
    return styles[abwesenheit] || styles.Sonstiges;
  };

  // Weekly statistics for the department
  const weekStats = useMemo(() => {
    let totalSollStunden = 0;
    let totalIstStunden = 0;
    let totalUeberstunden = 0;
    let krankTage = 0;
    let urlaubTage = 0;
    let arbeitsTage = 0;

    shifts.forEach((shift) => {
      totalSollStunden += shift.soll_stunden || 0;
      totalIstStunden += shift.ist_stunden || 0;
      totalUeberstunden += shift.ueberstunden || 0;
      if (shift.abwesenheit === "Krank") krankTage++;
      if (shift.abwesenheit === "Urlaub") urlaubTage++;
      if (shift.abwesenheit === "Arbeit") arbeitsTage++;
    });

    const planungsquote = employees.length > 0 && weekDays.length > 0
      ? (shifts.length / (employees.length * 7)) * 100
      : 0;

    return {
      totalSollStunden,
      totalIstStunden,
      totalUeberstunden,
      krankTage,
      urlaubTage,
      arbeitsTage,
      mitarbeiterAnzahl: employees.length,
      planungsquote,
    };
  }, [shifts, employees, weekDays]);

  // PDF Export Function
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    
    const kwNumber = format(currentWeekStart, "ww", { locale: de });
    const yearNumber = format(currentWeekStart, "yyyy");
    const weekStartStr = format(currentWeekStart, "dd.MM.yyyy", { locale: de });
    const weekEndStr = format(addDays(currentWeekStart, 6), "dd.MM.yyyy", { locale: de });

    // Header
    doc.setFontSize(18);
    doc.text(`Schichtplan ${selectedAbteilung}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`KW ${kwNumber}/${yearNumber} (${weekStartStr} - ${weekEndStr})`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Erstellt am: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`, 14, 35);

    // Table data
    const headers = [
      "Mitarbeiter",
      ...weekDays.map((day) => format(day, "EEE dd.MM", { locale: de })),
      "Woche",
    ];

    const rows = filteredEmployees.map((employee) => {
      const employeeShifts = weekDays.map((day) => getShiftForDay(employee.id, day));
      const weekTotal = employeeShifts.reduce(
        (sum, shift) => sum + (shift?.soll_stunden || 0),
        0
      );

      return [
        `${employee.vorname} ${employee.nachname}`,
        ...employeeShifts.map((shift) => {
          if (!shift) return "-";
          if (shift.abwesenheit === "Arbeit") {
            return `${shift.schicht_beginn?.slice(0, 5) || "?"}-${shift.schicht_ende?.slice(0, 5) || "?"}\n(${shift.soll_stunden}h)`;
          }
          return shift.abwesenheit;
        }),
        `${weekTotal}h / ${employee.wochenstunden_soll}h`,
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 42,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 45 },
      },
      theme: "grid",
    });

    // Summary
    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(10);
    doc.text(`Zusammenfassung:`, 14, finalY + 10);
    doc.text(`• Mitarbeiter: ${weekStats.mitarbeiterAnzahl}`, 14, finalY + 18);
    doc.text(`• Soll-Stunden gesamt: ${weekStats.totalSollStunden.toFixed(1)}h`, 14, finalY + 24);
    doc.text(`• Arbeitstage: ${weekStats.arbeitsTage} | Urlaub: ${weekStats.urlaubTage} | Krank: ${weekStats.krankTage}`, 14, finalY + 30);
    doc.text(`• Planungsquote: ${weekStats.planungsquote.toFixed(0)}%`, 14, finalY + 36);

    doc.save(`Schichtplan_${selectedAbteilung}_KW${kwNumber}_${yearNumber}.pdf`);
    toast.success("PDF erfolgreich erstellt");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Abteilungs-Schichtplanung</h1>
          <p className="text-muted-foreground">
            Wochenplanung für {selectedAbteilung}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={exportToPDF} disabled={filteredEmployees.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF Export
          </Button>
          <Select value={selectedAbteilung} onValueChange={setSelectedAbteilung}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Abteilung wählen" />
            </SelectTrigger>
            <SelectContent>
              {ABTEILUNGEN.map((abt) => (
                <SelectItem key={abt} value={abt}>
                  {abt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-lg font-semibold">
                KW {format(currentWeekStart, "ww", { locale: de })} / {format(currentWeekStart, "yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(currentWeekStart, "dd. MMM", { locale: de })} -{" "}
                {format(addDays(currentWeekStart, 6), "dd. MMM yyyy", { locale: de })}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Department Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Mitarbeiter</span>
            </div>
            <p className="text-2xl font-bold">{weekStats.mitarbeiterAnzahl}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Planungsquote</span>
            </div>
            <p className="text-2xl font-bold">{weekStats.planungsquote.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Soll-Stunden</span>
            </div>
            <p className="text-2xl font-bold">{weekStats.totalSollStunden.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Arbeitstage</span>
            </div>
            <p className="text-2xl font-bold">{weekStats.arbeitsTage}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Urlaub</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{weekStats.urlaubTage}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Krank</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{weekStats.krankTage}</p>
          </CardContent>
        </Card>
      </div>

      {/* Shift Planning Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Wochenplan {selectedAbteilung}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Mitarbeiter in dieser Abteilung gefunden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48 sticky left-0 bg-background">Mitarbeiter</TableHead>
                    {weekDays.map((day) => (
                      <TableHead key={day.toISOString()} className="text-center min-w-24">
                        <div className="font-medium">{format(day, "EEE", { locale: de })}</div>
                        <div className="text-xs text-muted-foreground">{format(day, "dd.MM")}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Woche</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const employeeShifts = weekDays.map((day) => getShiftForDay(employee.id, day));
                    const weekTotal = employeeShifts.reduce(
                      (sum, shift) => sum + (shift?.soll_stunden || 0),
                      0
                    );

                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium sticky left-0 bg-background">
                          <div>{employee.vorname} {employee.nachname}</div>
                          <div className="text-xs text-muted-foreground">
                            Soll: {employee.wochenstunden_soll}h/Woche
                          </div>
                        </TableCell>
                        {weekDays.map((day, idx) => {
                          const shift = employeeShifts[idx];
                          return (
                            <TableCell
                              key={day.toISOString()}
                              className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => openShiftDialog(employee, day)}
                            >
                              {shift ? (
                                <div className="space-y-1">
                                  <Badge
                                    variant="secondary"
                                    className={getAbwesenheitBadge(shift.abwesenheit)}
                                  >
                                    {shift.abwesenheit === "Arbeit"
                                      ? `${shift.schicht_beginn?.slice(0, 5) || "?"}-${shift.schicht_ende?.slice(0, 5) || "?"}`
                                      : shift.abwesenheit.slice(0, 3)}
                                  </Badge>
                                  {shift.abwesenheit === "Arbeit" && (
                                    <div className="text-xs text-muted-foreground">
                                      {shift.soll_stunden}h
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-medium">
                          <span
                            className={
                              weekTotal > employee.wochenstunden_soll
                                ? "text-orange-600"
                                : weekTotal < employee.wochenstunden_soll
                                ? "text-blue-600"
                                : ""
                            }
                          >
                            {weekTotal}h
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Schicht bearbeiten
              {selectedShift && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {selectedShift.employee.vorname} {selectedShift.employee.nachname} -{" "}
                  {format(selectedShift.date, "EEEE, dd. MMMM yyyy", { locale: de })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select
                value={formData.abwesenheit}
                onValueChange={(value) =>
                  setFormData({ ...formData, abwesenheit: value as AbsenceReason })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ABWESENHEIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.abwesenheit === "Arbeit" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Beginn</Label>
                    <Input
                      type="time"
                      value={formData.schicht_beginn}
                      onChange={(e) =>
                        setFormData({ ...formData, schicht_beginn: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Ende</Label>
                    <Input
                      type="time"
                      value={formData.schicht_ende}
                      onChange={(e) =>
                        setFormData({ ...formData, schicht_ende: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Soll-Stunden</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.soll_stunden}
                    onChange={(e) =>
                      setFormData({ ...formData, soll_stunden: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </>
            )}

            <div>
              <Label>Notiz (optional)</Label>
              <Textarea
                value={formData.abwesenheit_notiz}
                onChange={(e) =>
                  setFormData({ ...formData, abwesenheit_notiz: e.target.value })
                }
                placeholder="Zusätzliche Informationen..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveShift}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
