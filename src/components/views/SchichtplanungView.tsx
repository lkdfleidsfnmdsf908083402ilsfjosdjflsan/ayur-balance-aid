import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Calendar, Clock, Users, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface Employee {
  id: string;
  personalnummer: string;
  vorname: string;
  nachname: string;
  abteilung: string;
  wochenstunden_soll: number;
  stundenlohn: number;
  aktiv: boolean;
}

interface Shift {
  id: string;
  employee_id: string;
  datum: string;
  soll_stunden: number;
  schicht_beginn: string | null;
  schicht_ende: string | null;
  ist_stunden: number | null;
  ist_beginn: string | null;
  ist_ende: string | null;
  ueberstunden: number | null;
  abwesenheit: 'Arbeit' | 'Urlaub' | 'Krank' | 'Fortbildung' | 'Frei' | 'Überstundenabbau' | 'Elternzeit' | 'Sonstiges';
  abwesenheit_notiz: string | null;
  pause_minuten: number;
}

const ABWESENHEIT_OPTIONS: Shift['abwesenheit'][] = [
  'Arbeit', 'Urlaub', 'Krank', 'Fortbildung', 'Frei', 'Überstundenabbau', 'Elternzeit', 'Sonstiges'
];

const ABTEILUNGEN = [
  'Logis', 'F&B', 'Spa', 'Ärztin', 'Shop', 
  'Verwaltung', 'Technik', 'Energie', 'Marketing', 
  'Personal', 'Finanzierung', 'Sonstiges',
  'Housekeeping', 'Küche', 'Service', 'Rezeption'
];

export function SchichtplanungView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterAbteilung, setFilterAbteilung] = useState('alle');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState<Partial<Shift>>({
    soll_stunden: 8,
    schicht_beginn: '08:00',
    schicht_ende: '16:30',
    ist_stunden: null,
    ist_beginn: null,
    ist_ende: null,
    abwesenheit: 'Arbeit',
    abwesenheit_notiz: '',
    pause_minuten: 30,
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadData();
  }, [currentWeek]);

  const loadData = async () => {
    setLoading(true);
    
    // Load employees
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('aktiv', true)
      .order('abteilung', { ascending: true })
      .order('nachname', { ascending: true });

    // Load shifts for current week
    const { data: shiftData } = await supabase
      .from('employee_shifts')
      .select('*')
      .gte('datum', format(weekStart, 'yyyy-MM-dd'))
      .lte('datum', format(weekEnd, 'yyyy-MM-dd'));

    setEmployees(empData || []);
    setShifts(shiftData || []);
    setLoading(false);
  };

  const filteredEmployees = useMemo(() => {
    if (filterAbteilung === 'alle') return employees;
    return employees.filter(e => e.abteilung === filterAbteilung);
  }, [employees, filterAbteilung]);

  const getShiftForDay = (employeeId: string, date: Date): Shift | undefined => {
    return shifts.find(s => 
      s.employee_id === employeeId && 
      isSameDay(new Date(s.datum), date)
    );
  };

  const openShiftDialog = (employee: Employee, date: Date) => {
    setSelectedEmployee(employee);
    setSelectedDate(date);
    
    const existingShift = getShiftForDay(employee.id, date);
    if (existingShift) {
      setFormData({
        soll_stunden: existingShift.soll_stunden,
        schicht_beginn: existingShift.schicht_beginn || '08:00',
        schicht_ende: existingShift.schicht_ende || '16:30',
        ist_stunden: existingShift.ist_stunden,
        ist_beginn: existingShift.ist_beginn,
        ist_ende: existingShift.ist_ende,
        abwesenheit: existingShift.abwesenheit,
        abwesenheit_notiz: existingShift.abwesenheit_notiz || '',
        pause_minuten: existingShift.pause_minuten,
      });
    } else {
      // Default based on weekly hours
      const dailyHours = employee.wochenstunden_soll / 5;
      setFormData({
        soll_stunden: dailyHours,
        schicht_beginn: '08:00',
        schicht_ende: format(addDays(new Date(`2000-01-01T08:00`), 0).setMinutes(dailyHours * 60 + 30), 'HH:mm'),
        ist_stunden: null,
        ist_beginn: null,
        ist_ende: null,
        abwesenheit: 'Arbeit',
        abwesenheit_notiz: '',
        pause_minuten: 30,
      });
    }
    
    setDialogOpen(true);
  };

  const handleSaveShift = async () => {
    if (!selectedEmployee || !selectedDate) return;

    const existingShift = getShiftForDay(selectedEmployee.id, selectedDate);
    const payload = {
      employee_id: selectedEmployee.id,
      datum: format(selectedDate, 'yyyy-MM-dd'),
      soll_stunden: formData.soll_stunden || 0,
      schicht_beginn: formData.abwesenheit === 'Arbeit' ? formData.schicht_beginn : null,
      schicht_ende: formData.abwesenheit === 'Arbeit' ? formData.schicht_ende : null,
      ist_stunden: formData.ist_stunden,
      ist_beginn: formData.ist_beginn,
      ist_ende: formData.ist_ende,
      abwesenheit: formData.abwesenheit,
      abwesenheit_notiz: formData.abwesenheit_notiz || null,
      pause_minuten: formData.pause_minuten || 0,
    };

    if (existingShift) {
      const { error } = await supabase
        .from('employee_shifts')
        .update(payload)
        .eq('id', existingShift.id);
      
      if (error) {
        toast.error('Fehler beim Aktualisieren');
        console.error(error);
      } else {
        toast.success('Schicht aktualisiert');
        loadData();
      }
    } else {
      const { error } = await supabase
        .from('employee_shifts')
        .insert([payload]);
      
      if (error) {
        toast.error('Fehler beim Speichern');
        console.error(error);
      } else {
        toast.success('Schicht gespeichert');
        loadData();
      }
    }

    setDialogOpen(false);
  };

  const getAbwesenheitBadge = (shift: Shift) => {
    const colors: Record<Shift['abwesenheit'], string> = {
      'Arbeit': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      'Urlaub': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      'Krank': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      'Fortbildung': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      'Frei': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
      'Überstundenabbau': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      'Elternzeit': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100',
      'Sonstiges': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    };
    return colors[shift.abwesenheit] || 'bg-gray-100 text-gray-800';
  };

  // Wochenstatistiken
  const weekStats = useMemo(() => {
    const employeeStats = filteredEmployees.map(emp => {
      const empShifts = shifts.filter(s => s.employee_id === emp.id);
      const sollGesamt = empShifts.reduce((sum, s) => sum + (s.abwesenheit === 'Arbeit' ? s.soll_stunden : 0), 0);
      const istGesamt = empShifts.reduce((sum, s) => sum + (s.ist_stunden || 0), 0);
      const ueberstundenGesamt = empShifts.reduce((sum, s) => sum + (s.ueberstunden || 0), 0);
      const krankTage = empShifts.filter(s => s.abwesenheit === 'Krank').length;
      const urlaubTage = empShifts.filter(s => s.abwesenheit === 'Urlaub').length;

      return {
        employee: emp,
        sollGesamt,
        istGesamt,
        ueberstundenGesamt,
        krankTage,
        urlaubTage,
      };
    });

    return {
      employees: employeeStats,
      totalSoll: employeeStats.reduce((sum, e) => sum + e.sollGesamt, 0),
      totalIst: employeeStats.reduce((sum, e) => sum + e.istGesamt, 0),
      totalUeberstunden: employeeStats.reduce((sum, e) => sum + e.ueberstundenGesamt, 0),
      totalKrank: employeeStats.reduce((sum, e) => sum + e.krankTage, 0),
      totalUrlaub: employeeStats.reduce((sum, e) => sum + e.urlaubTage, 0),
    };
  }, [filteredEmployees, shifts]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-foreground">Schichtplanung</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[200px] text-center">
            {format(weekStart, 'dd.MM.', { locale: de })} - {format(weekEnd, 'dd.MM.yyyy', { locale: de })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>Heute</Button>
        </div>
      </div>

      {/* Wochenstatistiken */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Soll-Stunden</span>
            </div>
            <p className="text-2xl font-bold">{weekStats.totalSoll.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Ist-Stunden</span>
            </div>
            <p className="text-2xl font-bold">{weekStats.totalIst.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {weekStats.totalUeberstunden >= 0 ? (
                <TrendingUp className="h-4 w-4 text-orange-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-blue-500" />
              )}
              <span className="text-sm text-muted-foreground">Überstunden</span>
            </div>
            <p className={`text-2xl font-bold ${weekStats.totalUeberstunden >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
              {weekStats.totalUeberstunden >= 0 ? '+' : ''}{weekStats.totalUeberstunden.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Krankheitstage</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{weekStats.totalKrank}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Urlaubstage</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{weekStats.totalUrlaub}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-end">
            <div className="min-w-[200px]">
              <Label>Abteilung</Label>
              <Select value={filterAbteilung} onValueChange={setFilterAbteilung}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Abteilungen</SelectItem>
                  {ABTEILUNGEN.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground pb-2">
              {filteredEmployees.length} Mitarbeiter
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Schichtplan-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wochenplan</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Mitarbeiter</TableHead>
                    <TableHead className="sticky left-[150px] bg-background z-10">Abteilung</TableHead>
                    {weekDays.map((day) => (
                      <TableHead key={day.toISOString()} className="text-center min-w-[100px]">
                        <div>{format(day, 'EEE', { locale: de })}</div>
                        <div className="text-xs">{format(day, 'dd.MM.')}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Σ Soll</TableHead>
                    <TableHead className="text-right">Σ Ist</TableHead>
                    <TableHead className="text-right">+/-</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekStats.employees.map(({ employee, sollGesamt, istGesamt, ueberstundenGesamt }) => (
                    <TableRow key={employee.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {employee.nachname}, {employee.vorname}
                      </TableCell>
                      <TableCell className="sticky left-[150px] bg-background z-10">
                        <Badge variant="outline">{employee.abteilung}</Badge>
                      </TableCell>
                      {weekDays.map((day) => {
                        const shift = getShiftForDay(employee.id, day);
                        return (
                          <TableCell 
                            key={day.toISOString()} 
                            className="text-center cursor-pointer hover:bg-muted/50 transition-colors p-1"
                            onClick={() => openShiftDialog(employee, day)}
                          >
                            {shift ? (
                              <div className={`rounded px-1 py-0.5 text-xs ${getAbwesenheitBadge(shift)}`}>
                                {shift.abwesenheit === 'Arbeit' ? (
                                  <>
                                    <div>{shift.soll_stunden}h</div>
                                    {shift.ist_stunden !== null && (
                                      <div className="font-medium">{shift.ist_stunden}h</div>
                                    )}
                                  </>
                                ) : (
                                  <div>{shift.abwesenheit.slice(0, 3)}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-xs">-</div>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-medium">{sollGesamt.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">{istGesamt.toFixed(1)}h</TableCell>
                      <TableCell className={`text-right font-medium ${ueberstundenGesamt >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                        {ueberstundenGesamt >= 0 ? '+' : ''}{ueberstundenGesamt.toFixed(1)}h
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Keine Mitarbeiter gefunden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schicht-Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Schicht: {selectedEmployee?.vorname} {selectedEmployee?.nachname}
              {selectedDate && ` - ${format(selectedDate, 'EEEE, dd.MM.yyyy', { locale: de })}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.abwesenheit} 
                onValueChange={(v) => setFormData({ ...formData, abwesenheit: v as Shift['abwesenheit'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ABWESENHEIT_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.abwesenheit === 'Arbeit' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Schicht Beginn</Label>
                    <Input
                      type="time"
                      value={formData.schicht_beginn || ''}
                      onChange={(e) => setFormData({ ...formData, schicht_beginn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Schicht Ende</Label>
                    <Input
                      type="time"
                      value={formData.schicht_ende || ''}
                      onChange={(e) => setFormData({ ...formData, schicht_ende: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Soll-Stunden</Label>
                    <Input
                      type="number"
                      min={0}
                      max={16}
                      step={0.5}
                      value={formData.soll_stunden || 0}
                      onChange={(e) => setFormData({ ...formData, soll_stunden: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pause (Minuten)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={formData.pause_minuten || 0}
                      onChange={(e) => setFormData({ ...formData, pause_minuten: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Ist-Zeiten (tatsächlich gearbeitet)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ist Beginn</Label>
                      <Input
                        type="time"
                        value={formData.ist_beginn || ''}
                        onChange={(e) => setFormData({ ...formData, ist_beginn: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ist Ende</Label>
                      <Input
                        type="time"
                        value={formData.ist_ende || ''}
                        onChange={(e) => setFormData({ ...formData, ist_ende: e.target.value || null })}
                      />
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    <Label>Ist-Stunden (gesamt)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={16}
                      step={0.25}
                      value={formData.ist_stunden ?? ''}
                      onChange={(e) => setFormData({ ...formData, ist_stunden: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Automatisch berechnet oder manuell eingeben"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.abwesenheit !== 'Arbeit' && (
              <div className="space-y-2">
                <Label>Notiz</Label>
                <Textarea
                  value={formData.abwesenheit_notiz || ''}
                  onChange={(e) => setFormData({ ...formData, abwesenheit_notiz: e.target.value })}
                  placeholder="Optionale Bemerkung..."
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveShift}>Speichern</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
