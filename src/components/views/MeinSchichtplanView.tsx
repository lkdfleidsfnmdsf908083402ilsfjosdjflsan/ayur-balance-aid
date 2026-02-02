import { useState, useEffect, useMemo } from "react";
import { format, startOfWeek, addDays, subWeeks, addWeeks } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Sun,
  Moon,
  Palmtree,
  Heart,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";

type AbsenceReason = Database["public"]["Enums"]["absence_reason"];

interface Shift {
  id: string;
  employee_id: string;
  datum: string;
  soll_stunden: number;
  schicht_beginn: string | null;
  schicht_ende: string | null;
  vormittag_beginn: string | null;
  vormittag_ende: string | null;
  nachmittag_beginn: string | null;
  nachmittag_ende: string | null;
  ist_stunden: number | null;
  ueberstunden: number | null;
  abwesenheit: AbsenceReason;
  abwesenheit_notiz: string | null;
  pause_minuten: number;
}

interface Employee {
  id: string;
  personalnummer: string;
  vorname: string;
  nachname: string;
  abteilung: string;
  wochenstunden_soll: number;
  urlaubstage_jahr: number;
  urlaubstage_genommen: number;
}

const ABWESENHEIT_OPTIONS: { value: AbsenceReason; label: string; color: string }[] = [
  { value: 'Arbeit', label: 'Arbeit', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'Urlaub', label: 'Urlaub', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'Krank', label: 'Krank', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'Fortbildung', label: 'Fortbildung', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'Frei', label: 'Frei', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  { value: 'Überstundenabbau', label: 'Überstundenabbau', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'Elternzeit', label: 'Elternzeit', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  { value: 'Sonstiges', label: 'Sonstiges', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
];

export function MeinSchichtplanView() {
  const { userProfile } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  useEffect(() => {
    if (userProfile?.email) {
      loadData();
    }
  }, [currentWeekStart, userProfile?.email]);

  const loadData = async () => {
    if (!userProfile?.email) return;
    
    setLoading(true);
    try {
      // Find employee by email
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("email", userProfile.email)
        .maybeSingle();

      if (empError) throw empError;
      
      if (!empData) {
        setEmployee(null);
        setShifts([]);
        setLoading(false);
        return;
      }
      
      setEmployee(empData as Employee);

      // Get shifts for this employee for the current week
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const weekEnd = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

      const { data: shiftsData, error: shiftError } = await supabase
        .from("employee_shifts")
        .select("*")
        .eq("employee_id", empData.id)
        .gte("datum", weekStart)
        .lte("datum", weekEnd);

      if (shiftError) throw shiftError;
      setShifts((shiftsData || []) as Shift[]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Zeit-String zu Minuten
  const parseTime = (timeStr: string | null): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  // Calculate IST hours from shift times (same logic as other views)
  const calculateIstStunden = (shift: Shift): number => {
    let istStunden = shift.ist_stunden;
    
    if ((istStunden === null || istStunden === 0) && shift.abwesenheit === 'Arbeit') {
      if (shift.vormittag_beginn && shift.vormittag_ende && shift.nachmittag_beginn && shift.nachmittag_ende) {
        // Geteilte Schicht
        const vmMinuten = parseTime(shift.vormittag_ende) - parseTime(shift.vormittag_beginn);
        const nmMinuten = parseTime(shift.nachmittag_ende) - parseTime(shift.nachmittag_beginn);
        istStunden = (vmMinuten + nmMinuten) / 60;
      } else if (shift.schicht_beginn && shift.schicht_ende) {
        // Durchgehende Schicht
        const minuten = parseTime(shift.schicht_ende) - parseTime(shift.schicht_beginn);
        const pauseMinuten = shift.pause_minuten || 0;
        istStunden = (minuten - pauseMinuten) / 60;
      } else {
        // Fallback
        istStunden = shift.soll_stunden || 0;
      }
    }
    
    return istStunden || 0;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!employee) return null;

    let weekSollStunden = 0;
    let weekIstStunden = 0;
    let weekUeberstunden = 0;
    let krankTage = 0;
    let urlaubTage = 0;

    shifts.forEach((shift) => {
      // Soll-Stunden nur bei Arbeit
      if (shift.abwesenheit === 'Arbeit') {
        weekSollStunden += shift.soll_stunden || 0;
      }
      
      // IST-Stunden berechnen (aus Schichtzeiten wenn nicht in DB)
      const istStunden = calculateIstStunden(shift);
      if (istStunden > 0) {
        weekIstStunden += istStunden;
      }
      
      // Überstunden: entweder aus DB oder berechnet
      let ueberstunden = shift.ueberstunden;
      if ((ueberstunden === null || ueberstunden === 0) && shift.abwesenheit === 'Arbeit') {
        ueberstunden = istStunden - (shift.soll_stunden || 0);
      }
      if (ueberstunden !== null) {
        weekUeberstunden += ueberstunden;
      }
      
      if (shift.abwesenheit === "Krank") krankTage++;
      if (shift.abwesenheit === "Urlaub") urlaubTage++;
    });

    // Calculate remaining vacation days
    const urlaubstageRest = (employee.urlaubstage_jahr || 30) - (employee.urlaubstage_genommen || 0);

    return {
      weekSollStunden,
      weekIstStunden,
      weekUeberstunden,
      krankTage,
      urlaubTage,
      urlaubstageRest,
      wochenstundenSoll: employee.wochenstunden_soll,
    };
  }, [shifts, employee]);

  const getShiftForDay = (date: Date): Shift | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.find((s) => s.datum === dateStr) || null;
  };

  const getAbwesenheitBadge = (abwesenheit: AbsenceReason) => {
    const option = ABWESENHEIT_OPTIONS.find(o => o.value === abwesenheit);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Bitte melden Sie sich an.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mein Schichtplan</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Kein Mitarbeiterprofil gefunden für {userProfile.email}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Bitte wenden Sie sich an die Personalabteilung.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mein Schichtplan</h1>
        <p className="text-muted-foreground">
          {employee.vorname} {employee.nachname} • {employee.abteilung}
        </p>
      </div>

      {/* Persönliche Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Woche Soll</span>
            </div>
            <p className="text-2xl font-bold">{stats?.weekSollStunden.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">von {stats?.wochenstundenSoll}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Woche Ist</span>
            </div>
            <p className="text-2xl font-bold">{stats?.weekIstStunden.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {(stats?.weekUeberstunden || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-orange-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-blue-500" />
              )}
              <span className="text-sm text-muted-foreground">Überstunden</span>
            </div>
            <p className={`text-2xl font-bold ${(stats?.weekUeberstunden || 0) >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
              {(stats?.weekUeberstunden || 0) >= 0 ? '+' : ''}{stats?.weekUeberstunden.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Palmtree className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Resturlaub</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats?.urlaubstageRest} Tage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Urlaub (Woche)</span>
            </div>
            <p className="text-2xl font-bold">{stats?.urlaubTage} Tage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Krank (Woche)</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats?.krankTage} Tage</p>
          </CardContent>
        </Card>
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

      {/* Farblegende */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Legende</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {ABWESENHEIT_OPTIONS.map((option) => (
              <Badge key={option.value} className={option.color}>
                {option.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wochenplan */}
      <Card>
        <CardHeader>
          <CardTitle>Meine Woche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {weekDays.map((day) => (
                    <TableHead key={day.toISOString()} className="text-center min-w-32">
                      <div className="font-medium">{format(day, "EEEE", { locale: de })}</div>
                      <div className="text-xs text-muted-foreground">{format(day, "dd.MM.yyyy")}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  {weekDays.map((day) => {
                    const shift = getShiftForDay(day);
                    const istStunden = shift ? calculateIstStunden(shift) : 0;
                    const ueberstunden = shift && shift.abwesenheit === 'Arbeit' 
                      ? (shift.ueberstunden !== null && shift.ueberstunden !== 0 
                          ? shift.ueberstunden 
                          : istStunden - (shift.soll_stunden || 0))
                      : null;
                    
                    return (
                      <TableCell key={day.toISOString()} className="text-center p-4 align-top">
                        {shift ? (
                          <div className="space-y-2">
                            <Badge className={`${getAbwesenheitBadge(shift.abwesenheit)} w-full justify-center`}>
                              {shift.abwesenheit}
                            </Badge>
                            {shift.abwesenheit === "Arbeit" && (
                              <div className="space-y-1 text-sm">
                                {shift.vormittag_beginn && shift.nachmittag_beginn ? (
                                  <>
                                    <div className="flex items-center justify-center gap-1">
                                      <Sun className="h-3 w-3 text-yellow-500" />
                                      {shift.vormittag_beginn?.slice(0, 5)}-{shift.vormittag_ende?.slice(0, 5)}
                                    </div>
                                    <div className="flex items-center justify-center gap-1">
                                      <Moon className="h-3 w-3 text-indigo-500" />
                                      {shift.nachmittag_beginn?.slice(0, 5)}-{shift.nachmittag_ende?.slice(0, 5)}
                                    </div>
                                  </>
                                ) : (
                                  <div>
                                    {shift.schicht_beginn?.slice(0, 5)} - {shift.schicht_ende?.slice(0, 5)}
                                  </div>
                                )}
                                <div className="text-muted-foreground">
                                  {shift.soll_stunden}h Soll
                                </div>
                                <div className="text-green-600">
                                  {istStunden.toFixed(1)}h Ist
                                </div>
                                {ueberstunden !== null && ueberstunden !== 0 && (
                                  <div className={ueberstunden >= 0 ? 'text-orange-600' : 'text-blue-600'}>
                                    {ueberstunden >= 0 ? '+' : ''}{ueberstunden.toFixed(1)}h
                                  </div>
                                )}
                              </div>
                            )}
                            {shift.abwesenheit_notiz && (
                              <div className="text-xs text-muted-foreground italic">
                                {shift.abwesenheit_notiz}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Nicht geplant</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
