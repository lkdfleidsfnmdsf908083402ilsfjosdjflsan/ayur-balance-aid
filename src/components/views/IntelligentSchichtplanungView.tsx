import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Save, Clock, User, Calendar, Sparkles, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type AbsenceReason = 'Arbeit' | 'Urlaub' | 'Krank' | 'Fortbildung' | 'Frei' | 'Überstundenabbau' | 'Elternzeit' | 'Sonstiges';

const ABSENCE_COLORS: Record<AbsenceReason, string> = {
  'Arbeit': 'bg-success/20 border-success text-success',
  'Urlaub': 'bg-blue-500/20 border-blue-500 text-blue-400',
  'Krank': 'bg-destructive/20 border-destructive text-destructive',
  'Fortbildung': 'bg-purple-500/20 border-purple-500 text-purple-400',
  'Frei': 'bg-muted/50 border-muted-foreground/30 text-muted-foreground',
  'Überstundenabbau': 'bg-orange-500/20 border-orange-500 text-orange-400',
  'Elternzeit': 'bg-pink-500/20 border-pink-500 text-pink-400',
  'Sonstiges': 'bg-gray-500/20 border-gray-500 text-gray-400',
};

interface Employee {
  id: string;
  vorname: string;
  nachname: string;
  personalnummer: string;
  abteilung: string;
  email: string;
  aktiv: boolean;
}

interface EmployeeWithOvertimeInfo extends Employee {
  ueberstunden_saldo: number;
  ist_krank: boolean;
  rejection_count: number;
}

interface Shift {
  id: string;
  employee_id: string;
  datum: string;
  abwesenheit: AbsenceReason;
  soll_stunden: number;
  ist_stunden: number | null;
  vormittag_beginn: string | null;
  vormittag_ende: string | null;
  nachmittag_beginn: string | null;
  nachmittag_ende: string | null;
  ueberstunden: number;
}

const ABTEILUNGEN = [
  'Housekeeping',
  'Küche',
  'Service',
  'Front Office',
  'Spa & Wellness',
  'Technik',
  'Administration',
];

export const IntelligentSchichtplanungView = () => {
  const [selectedAbteilung, setSelectedAbteilung] = useState<string>('');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [employees, setEmployees] = useState<EmployeeWithOvertimeInfo[]>([]);
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithOvertimeInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestedEmployee, setSuggestedEmployee] = useState<EmployeeWithOvertimeInfo | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  
  const [shiftForm, setShiftForm] = useState({
    abwesenheit: 'Arbeit' as AbsenceReason,
    vormittag_beginn: '',
    vormittag_ende: '',
    nachmittag_beginn: '',
    nachmittag_ende: '',
    soll_stunden: 8,
  });
  const [isLoading, setIsLoading] = useState(false);

  const { userProfile, isAbteilungsleiter, user } = useAuth();
  const { toast } = useToast();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    if (userProfile?.abteilung && !selectedAbteilung) {
      setSelectedAbteilung(userProfile.abteilung);
    }
  }, [userProfile, selectedAbteilung]);

  useEffect(() => {
    if (!selectedAbteilung) return;

    const fetchEmployeesWithOvertimeInfo = async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('abteilung', selectedAbteilung)
        .eq('aktiv', true)
        .order('nachname');

      if (empError) {
        console.error('Error fetching employees:', empError);
        return;
      }

      const { data: balanceData } = await supabase
        .from('employee_time_balances')
        .select('employee_id, ueberstunden_saldo')
        .eq('jahr', currentYear)
        .eq('monat', currentMonth)
        .in('employee_id', empData.map(e => e.id));

      const { data: sickData } = await supabase
        .from('employee_shifts')
        .select('employee_id')
        .eq('datum', today)
        .eq('abwesenheit', 'Krank')
        .in('employee_id', empData.map(e => e.id));

      const { data: rejectionData } = await supabase
        .from('shift_suggestion_rejections')
        .select('employee_id')
        .in('employee_id', empData.map(e => e.id));

      const employeesWithInfo: EmployeeWithOvertimeInfo[] = empData.map(emp => {
        const balance = balanceData?.find(b => b.employee_id === emp.id);
        const isSick = sickData?.some(s => s.employee_id === emp.id) || false;
        const rejections = rejectionData?.filter(r => r.employee_id === emp.id).length || 0;

        return {
          ...emp,
          ueberstunden_saldo: balance?.ueberstunden_saldo || 0,
          ist_krank: isSick,
          rejection_count: rejections,
        };
      });

      setEmployees(employeesWithInfo);
    };

    fetchEmployeesWithOvertimeInfo();
  }, [selectedAbteilung]);

  useEffect(() => {
    if (employees.length === 0) return;

    const fetchShifts = async () => {
      const employeeIds = employees.map(e => e.id);
      const weekStart = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEnd = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('employee_shifts')
        .select('*')
        .in('employee_id', employeeIds)
        .gte('datum', weekStart)
        .lte('datum', weekEnd);

      if (error) {
        console.error('Error fetching shifts:', error);
        return;
      }

      const shiftsMap: Record<string, Shift> = {};
      data?.forEach(shift => {
        shiftsMap[`${shift.employee_id}_${shift.datum}`] = shift as Shift;
      });
      setShifts(shiftsMap);
    };

    fetchShifts();
  }, [employees, currentWeekStart]);

  const getSuggestedEmployee = (date: Date): EmployeeWithOvertimeInfo | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const availableEmployees = employees.filter(emp => {
      const key = `${emp.id}_${dateStr}`;
      const existingShift = shifts[key];
      
      if (emp.ist_krank) return false;
      if (existingShift && existingShift.abwesenheit === 'Arbeit') return false;
      
      return true;
    });

    if (availableEmployees.length === 0) return null;

    availableEmployees.sort((a, b) => b.ueberstunden_saldo - a.ueberstunden_saldo);

    const suggested = availableEmployees.find(emp => emp.rejection_count < 3);
    
    return suggested || null;
  };

  const handleShiftClick = (employee: EmployeeWithOvertimeInfo, date: Date) => {
    if (!isAbteilungsleiter) return;
    
    setSelectedEmployee(employee);
    setSelectedDate(date);
    
    const key = `${employee.id}_${format(date, 'yyyy-MM-dd')}`;
    const existingShift = shifts[key];
    
    if (existingShift) {
      setShiftForm({
        abwesenheit: existingShift.abwesenheit,
        vormittag_beginn: existingShift.vormittag_beginn || '',
        vormittag_ende: existingShift.vormittag_ende || '',
        nachmittag_beginn: existingShift.nachmittag_beginn || '',
        nachmittag_ende: existingShift.nachmittag_ende || '',
        soll_stunden: existingShift.soll_stunden,
      });
    } else {
      setShiftForm({
        abwesenheit: 'Arbeit',
        vormittag_beginn: '',
        vormittag_ende: '',
        nachmittag_beginn: '',
        nachmittag_ende: '',
        soll_stunden: 8,
      });
    }
    
    const suggested = getSuggestedEmployee(date);
    if (suggested && suggested.id !== employee.id && suggested.ueberstunden_saldo > 5) {
      setSuggestedEmployee(suggested);
      setShowSuggestion(true);
    } else {
      setShowSuggestion(false);
      setSuggestedEmployee(null);
    }
    
    setIsDialogOpen(true);
  };

  const handleAcceptSuggestion = () => {
    if (suggestedEmployee && selectedDate) {
      setSelectedEmployee(suggestedEmployee);
      setShowSuggestion(false);
      
      const key = `${suggestedEmployee.id}_${format(selectedDate, 'yyyy-MM-dd')}`;
      const existingShift = shifts[key];
      
      if (existingShift) {
        setShiftForm({
          abwesenheit: existingShift.abwesenheit,
          vormittag_beginn: existingShift.vormittag_beginn || '',
          vormittag_ende: existingShift.vormittag_ende || '',
          nachmittag_beginn: existingShift.nachmittag_beginn || '',
          nachmittag_ende: existingShift.nachmittag_ende || '',
          soll_stunden: existingShift.soll_stunden,
        });
      } else {
        setShiftForm({
          abwesenheit: 'Arbeit',
          vormittag_beginn: '08:00',
          vormittag_ende: '12:00',
          nachmittag_beginn: '13:00',
          nachmittag_ende: '17:00',
          soll_stunden: 8,
        });
      }
    }
  };

  const handleRejectSuggestion = async () => {
    if (!suggestedEmployee || !selectedEmployee || !selectedDate || !user) return;
    setShowRejectionDialog(true);
  };

  const handleSaveRejection = async () => {
    if (!rejectionReason.trim() || !suggestedEmployee || !selectedDate || !user) {
      toast({
        variant: 'destructive',
        title: 'Begründung erforderlich',
        description: 'Bitte geben Sie eine Begründung für die Ablehnung an.',
      });
      return;
    }

    const { error } = await supabase
      .from('shift_suggestion_rejections')
      .insert({
        employee_id: suggestedEmployee.id,
        abteilungsleiter_id: user.id,
        datum: format(selectedDate, 'yyyy-MM-dd'),
        begruendung: rejectionReason,
        ueberstunden_aktuell: suggestedEmployee.ueberstunden_saldo,
      });

    if (error) {
      console.error('Error saving rejection:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Ablehnung konnte nicht gespeichert werden',
      });
      return;
    }

    toast({
      title: 'Vorschlag abgelehnt',
      description: `Die Ablehnung wurde gespeichert. ${suggestedEmployee.vorname} ${suggestedEmployee.nachname} hat nun ${suggestedEmployee.rejection_count + 1}/3 Ablehnungen.`,
    });

    setShowSuggestion(false);
    setShowRejectionDialog(false);
    setRejectionReason('');
    setSuggestedEmployee(null);

    const { data: rejectionData } = await supabase
      .from('shift_suggestion_rejections')
      .select('employee_id')
      .in('employee_id', employees.map(e => e.id));

    setEmployees(prev => prev.map(emp => {
      const rejections = rejectionData?.filter(r => r.employee_id === emp.id).length || 0;
      return { ...emp, rejection_count: rejections };
    }));
  };

  const handleSaveShift = async () => {
    if (!selectedEmployee || !selectedDate) return;

    setIsLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const key = `${selectedEmployee.id}_${dateStr}`;
    const existingShift = shifts[key];

    const shiftData = {
      employee_id: selectedEmployee.id,
      datum: dateStr,
      abwesenheit: shiftForm.abwesenheit,
      vormittag_beginn: shiftForm.vormittag_beginn || null,
      vormittag_ende: shiftForm.vormittag_ende || null,
      nachmittag_beginn: shiftForm.nachmittag_beginn || null,
      nachmittag_ende: shiftForm.nachmittag_ende || null,
      soll_stunden: shiftForm.soll_stunden,
    };

    try {
      if (existingShift) {
        const { error } = await supabase
          .from('employee_shifts')
          .update(shiftData)
          .eq('id', existingShift.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_shifts')
          .insert(shiftData);

        if (error) throw error;
      }

      toast({
        title: 'Schicht gespeichert',
        description: `Schicht für ${selectedEmployee.vorname} ${selectedEmployee.nachname} wurde aktualisiert.`,
      });

      const { data } = await supabase
        .from('employee_shifts')
        .select('*')
        .eq('employee_id', selectedEmployee.id)
        .eq('datum', dateStr)
        .single();

      if (data) {
        setShifts(prev => ({
          ...prev,
          [key]: data as Shift,
        }));
      }

      setIsDialogOpen(false);
      setShowSuggestion(false);
      setSuggestedEmployee(null);
      setSelectedEmployee(null);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error saving shift:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Schicht konnte nicht gespeichert werden',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getShiftDisplay = (employee: EmployeeWithOvertimeInfo, day: Date) => {
    const key = `${employee.id}_${format(day, 'yyyy-MM-dd')}`;
    const shift = shifts[key];
    
    if (!shift) {
      return <span className="text-muted-foreground text-xs">-</span>;
    }

    if (shift.abwesenheit !== 'Arbeit') {
      return (
        <Badge variant="outline" className={`text-xs ${ABSENCE_COLORS[shift.abwesenheit]}`}>
          {shift.abwesenheit.slice(0, 2)}
        </Badge>
      );
    }

    if (shift.vormittag_beginn && shift.nachmittag_beginn) {
      return (
        <div className="text-xs space-y-0.5">
          <div>{shift.vormittag_beginn.slice(0, 5)}-{shift.vormittag_ende?.slice(0, 5)}</div>
          <div>{shift.nachmittag_beginn.slice(0, 5)}-{shift.nachmittag_ende?.slice(0, 5)}</div>
        </div>
      );
    }

    if (shift.vormittag_beginn) {
      return (
        <span className="text-xs">
          {shift.vormittag_beginn.slice(0, 5)}-{shift.vormittag_ende?.slice(0, 5)}
        </span>
      );
    }

    return <span className="text-muted-foreground text-xs">-</span>;
  };

  return (
    <div className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Intelligente Schichtplanung
          </h1>
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Das System schlägt automatisch Mitarbeiter mit hohen Überstunden vor. Nach 3 Ablehnungen muss der Mitarbeiter Überstunden abbauen.
          </AlertDescription>
        </Alert>

        <Select value={selectedAbteilung} onValueChange={setSelectedAbteilung}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Abteilung wählen..." />
          </SelectTrigger>
          <SelectContent>
            {ABTEILUNGEN.map((abt) => (
              <SelectItem key={abt} value={abt}>
                {abt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-center flex-1">
            {format(currentWeekStart, 'dd.MM.', { locale: de })} - {format(addDays(currentWeekStart, 6), 'dd.MM.yyyy', { locale: de })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {Object.entries(ABSENCE_COLORS).slice(0, 4).map(([key, value]) => (
          <Badge key={key} variant="outline" className={`text-xs ${value}`}>
            {key.slice(0, 2)}
          </Badge>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {employees.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Keine Mitarbeiter in dieser Abteilung</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {employees.map((employee) => (
              <Card key={employee.id} className="glass-card">
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {employee.vorname} {employee.nachname}
                      {employee.ist_krank && (
                        <Badge variant="destructive" className="ml-2 text-xs">Krank</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={employee.ueberstunden_saldo > 20 ? "destructive" : employee.ueberstunden_saldo > 10 ? "warning" : "secondary"} className="text-xs">
                        {employee.ueberstunden_saldo}h ÜS
                      </Badge>
                      {employee.rejection_count > 0 && (
                        <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                          {employee.rejection_count}/3 Abl.
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={`text-center p-1 rounded cursor-pointer transition-colors ${
                          isAbteilungsleiter ? 'hover:bg-accent/50' : ''
                        } ${employee.ist_krank ? 'opacity-50' : ''}`}
                        onClick={() => !employee.ist_krank && handleShiftClick(employee, day)}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {format(day, 'EE', { locale: de })}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {format(day, 'dd')}
                        </div>
                        {getShiftDisplay(employee, day)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schicht bearbeiten
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && selectedDate && (
            <div className="space-y-4">
              {showSuggestion && suggestedEmployee && (
                <Alert className="border-orange-500 bg-orange-500/10">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="text-xs">
                    <p className="font-semibold mb-1">Intelligenter Vorschlag:</p>
                    <p className="mb-2">
                      <strong>{suggestedEmployee.vorname} {suggestedEmployee.nachname}</strong> hat {suggestedEmployee.ueberstunden_saldo}h Überstunden 
                      {suggestedEmployee.rejection_count > 0 && ` (${suggestedEmployee.rejection_count}/3 Ablehnungen)`}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" onClick={handleAcceptSuggestion} className="flex-1">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Annehmen
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleRejectSuggestion} className="flex-1">
                        <XCircle className="h-3 w-3 mr-1" />
                        Ablehnen
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground">
                {selectedEmployee.vorname} {selectedEmployee.nachname}
                <br />
                {format(selectedDate, 'EEEE, dd.MM.yyyy', { locale: de })}
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(ABSENCE_COLORS) as AbsenceReason[]).map((reason) => (
                  <Button
                    key={reason}
                    variant={shiftForm.abwesenheit === reason ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs p-1"
                    onClick={() => setShiftForm(prev => ({ ...prev, abwesenheit: reason }))}
                  >
                    {reason.slice(0, 3)}
                  </Button>
                ))}
              </div>

              {shiftForm.abwesenheit === 'Arbeit' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Vormittag</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="time"
                        value={shiftForm.vormittag_beginn}
                        onChange={(e) => setShiftForm(prev => ({ ...prev, vormittag_beginn: e.target.value }))}
                        className="text-sm"
                      />
                      <Input
                        type="time"
                        value={shiftForm.vormittag_ende}
                        onChange={(e) => setShiftForm(prev => ({ ...prev, vormittag_ende: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Nachmittag (optional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="time"
                        value={shiftForm.nachmittag_beginn}
                        onChange={(e) => setShiftForm(prev => ({ ...prev, nachmittag_beginn: e.target.value }))}
                        className="text-sm"
                      />
                      <Input
                        type="time"
                        value={shiftForm.nachmittag_ende}
                        onChange={(e) => setShiftForm(prev => ({ ...prev, nachmittag_ende: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Soll-Stunden</Label>
                    <Input
                      type="number"
                      value={shiftForm.soll_stunden}
                      onChange={(e) => setShiftForm(prev => ({ ...prev, soll_stunden: Number(e.target.value) }))}
                      className="text-sm"
                      step="0.5"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              setShowSuggestion(false);
              setSuggestedEmployee(null);
            }}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveShift} disabled={isLoading}>
              {isLoading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Begründung für Ablehnung
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                Sie lehnen den Vorschlag ab, {suggestedEmployee?.vorname} {suggestedEmployee?.nachname} einzuteilen, 
                obwohl diese/r {suggestedEmployee?.ueberstunden_saldo}h Überstunden hat.
                {suggestedEmployee && suggestedEmployee.rejection_count >= 2 && (
                  <p className="mt-2 font-semibold">
                    ⚠️ Dies ist die {suggestedEmployee.rejection_count + 1}. Ablehnung. Nach 3 Ablehnungen muss der Mitarbeiter Überstunden abbauen!
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Begründung *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Bitte geben Sie eine detaillierte Begründung an..."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectionDialog(false);
              setRejectionReason('');
            }}>
              Zurück
            </Button>
            <Button variant="destructive" onClick={handleSaveRejection} disabled={!rejectionReason.trim()}>
              Ablehnung speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};