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
  Users,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";

type AbsenceReason = Database["public"]["Enums"]["absence_reason"];

interface Employee {
  id: string;
  personalnummer: string;
  vorname: string;
  nachname: string;
  abteilung: string;
  wochenstunden_soll: number;
}

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
  abwesenheit: AbsenceReason;
}

const ABWESENHEIT_DISPLAY: { value: AbsenceReason; label: string; color: string; showInTeam: boolean }[] = [
  { value: 'Arbeit', label: 'Arbeit', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', showInTeam: true },
  { value: 'Urlaub', label: 'Abwesend', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', showInTeam: false },
  { value: 'Krank', label: 'Abwesend', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', showInTeam: false },
  { value: 'Fortbildung', label: 'Fortbildung', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', showInTeam: true },
  { value: 'Frei', label: 'Frei', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', showInTeam: true },
  { value: 'Überstundenabbau', label: 'Abwesend', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', showInTeam: false },
  { value: 'Elternzeit', label: 'Abwesend', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', showInTeam: false },
  { value: 'Sonstiges', label: 'Abwesend', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', showInTeam: false },
];

export function TeamSchichtplanungView() {
  const { userProfile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAbteilung, setUserAbteilung] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  useEffect(() => {
    if (userProfile?.email) {
      findUserAbteilung();
    }
  }, [userProfile?.email]);

  useEffect(() => {
    if (userAbteilung) {
      loadData();
    }
  }, [currentWeekStart, userAbteilung]);

  const findUserAbteilung = async () => {
    if (!userProfile?.email) return;
    
    try {
      // Try to find user in employees table
      const { data: empData } = await supabase
        .from("employees")
        .select("abteilung")
        .eq("email", userProfile.email)
        .maybeSingle();

      if (empData?.abteilung) {
        setUserAbteilung(empData.abteilung);
        return;
      }

      // Try to find user in abteilungsleiter table
      const { data: leiterData } = await supabase
        .from("abteilungsleiter")
        .select("abteilung")
        .eq("email", userProfile.email)
        .eq("aktiv", true)
        .maybeSingle();

      if (leiterData?.abteilung) {
        setUserAbteilung(leiterData.abteilung);
        return;
      }

      // Fallback: use userProfile abteilung if available
      if (userProfile.abteilung) {
        setUserAbteilung(userProfile.abteilung);
      }
    } catch (error) {
      console.error("Error finding user department:", error);
    }
  };

  const loadData = async () => {
    if (!userAbteilung) return;
    
    setLoading(true);
    try {
      const { data: employeesData, error: empError } = await supabase
        .from("employees")
        .select("id, personalnummer, vorname, nachname, abteilung, wochenstunden_soll")
        .eq("aktiv", true)
        .eq("abteilung", userAbteilung)
        .order("nachname");

      if (empError) throw empError;
      setEmployees(employeesData || []);

      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const weekEnd = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

      const employeeIds = (employeesData || []).map((e) => e.id);

      if (employeeIds.length > 0) {
        const { data: shiftsData, error: shiftError } = await supabase
          .from("employee_shifts")
          .select("id, employee_id, datum, soll_stunden, schicht_beginn, schicht_ende, vormittag_beginn, vormittag_ende, nachmittag_beginn, nachmittag_ende, abwesenheit")
          .in("employee_id", employeeIds)
          .gte("datum", weekStart)
          .lte("datum", weekEnd);

        if (shiftError) throw shiftError;
        setShifts((shiftsData || []) as Shift[]);
      } else {
        setShifts([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getShiftForDay = (employeeId: string, date: Date): Shift | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.find((s) => s.employee_id === employeeId && s.datum === dateStr) || null;
  };

  // Get display info for team view (hides sensitive absence reasons)
  const getTeamDisplayInfo = (abwesenheit: AbsenceReason) => {
    const option = ABWESENHEIT_DISPLAY.find(o => o.value === abwesenheit);
    if (!option) return { label: 'Abwesend', color: 'bg-gray-100 text-gray-800' };
    return { label: option.label, color: option.color };
  };

  // Count how many are working today
  const workingCount = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    return shifts.filter(s => s.datum === todayStr && s.abwesenheit === 'Arbeit').length;
  }, [shifts]);

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Bitte melden Sie sich an.</p>
      </div>
    );
  }

  if (loading && !userAbteilung) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userAbteilung) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Team-Schichtplan</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Keine Abteilungszuordnung gefunden.
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
        <h1 className="text-2xl font-bold text-foreground">Team-Schichtplan</h1>
        <p className="text-muted-foreground">
          Abteilung: {userAbteilung}
        </p>
      </div>

      {/* Team Stats (nur Anzahl, keine sensiblen Daten) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Team-Mitglieder</span>
            </div>
            <p className="text-2xl font-bold">{employees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Heute im Dienst</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{workingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-muted-foreground">Heute abwesend</span>
            </div>
            <p className="text-2xl font-bold">{employees.length - workingCount}</p>
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

      {/* Legende (vereinfacht für Team) */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Legende</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-green-100 text-green-800">Arbeit</Badge>
            <Badge className="bg-purple-100 text-purple-800">Fortbildung</Badge>
            <Badge className="bg-gray-100 text-gray-800">Frei / Abwesend</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Team Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Wochenplan Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Team-Mitglieder gefunden
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-48 sticky left-0 bg-background z-20">Mitarbeiter</TableHead>
                    {weekDays.map((day) => (
                      <TableHead key={day.toISOString()} className="text-center min-w-28">
                        <div className="font-medium">{format(day, "EEE", { locale: de })}</div>
                        <div className="text-xs text-muted-foreground">{format(day, "dd.MM")}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        {employee.vorname} {employee.nachname}
                      </TableCell>
                      {weekDays.map((day) => {
                        const shift = getShiftForDay(employee.id, day);
                        const displayInfo = shift ? getTeamDisplayInfo(shift.abwesenheit) : null;
                        
                        return (
                          <TableCell key={day.toISOString()} className="text-center p-2">
                            {shift ? (
                              <div className="space-y-1">
                                <Badge variant="secondary" className={`${displayInfo?.color} text-xs`}>
                                  {shift.abwesenheit === "Arbeit" ? (
                                    shift.vormittag_beginn && shift.nachmittag_beginn ? (
                                      <div className="flex flex-col text-[10px]">
                                        <span>{shift.vormittag_beginn?.slice(0, 5)}-{shift.vormittag_ende?.slice(0, 5)}</span>
                                        <span>{shift.nachmittag_beginn?.slice(0, 5)}-{shift.nachmittag_ende?.slice(0, 5)}</span>
                                      </div>
                                    ) : (
                                      `${shift.schicht_beginn?.slice(0, 5) || "?"}-${shift.schicht_ende?.slice(0, 5) || "?"}`
                                    )
                                  ) : (
                                    displayInfo?.label
                                  )}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datenschutz-Hinweis */}
      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground text-center">
            Aus Datenschutzgründen werden persönliche Abwesenheitsgründe (Urlaub, Krankheit, etc.) 
            nur als "Abwesend" angezeigt. Ihre eigenen Daten sehen Sie unter "Mein Schichtplan".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
