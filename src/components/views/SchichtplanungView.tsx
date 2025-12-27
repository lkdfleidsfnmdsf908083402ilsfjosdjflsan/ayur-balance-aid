import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Clock, Users, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Search, Sun, Moon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';

type AbsenceReason = Database["public"]["Enums"]["absence_reason"];

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
  vormittag_beginn: string | null;
  vormittag_ende: string | null;
  nachmittag_beginn: string | null;
  nachmittag_ende: string | null;
  ist_stunden: number | null;
  ist_beginn: string | null;
  ist_ende: string | null;
  ueberstunden: number | null;
  abwesenheit: AbsenceReason;
  abwesenheit_notiz: string | null;
  pause_minuten: number;
}

const ABTEILUNGEN = [
  'Logis', 'F&B', 'Spa', 'Ärztin', 'Shop', 
  'Verwaltung', 'Technik', 'Energie', 'Marketing', 
  'Personal', 'Finanzierung', 'Sonstiges',
  'Housekeeping', 'Küche', 'Service', 'Rezeption', 'Front Office'
];

interface FormData {
  soll_stunden: number;
  schicht_beginn: string;
  schicht_ende: string;
  vormittag_beginn: string;
  vormittag_ende: string;
  nachmittag_beginn: string;
  nachmittag_ende: string;
  ist_stunden: number | null;
  ist_beginn: string | null;
  ist_ende: string | null;
  abwesenheit: AbsenceReason;
  abwesenheit_notiz: string;
  pause_minuten: number;
  schichtTyp: 'einfach' | 'geteilt';
}

export function SchichtplanungView() {
  const { t, language } = useLanguage();
  const dateLocale = language === 'de' ? de : enUS;

  const ABWESENHEIT_OPTIONS: { value: AbsenceReason; label: string; color: string }[] = [
    { value: 'Arbeit', label: t('shifts.work'), color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
    { value: 'Urlaub', label: t('shifts.vacation'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
    { value: 'Krank', label: t('shifts.sick'), color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
    { value: 'Fortbildung', label: t('shifts.training'), color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' },
    { value: 'Frei', label: t('shifts.free'), color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' },
    { value: 'Überstundenabbau', label: t('shifts.overtime'), color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' },
    { value: 'Elternzeit', label: t('shifts.parentalLeave'), color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100' },
    { value: 'Sonstiges', label: t('shifts.other'), color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
  ];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterAbteilung, setFilterAbteilung] = useState('alle');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState<FormData>({
    soll_stunden: 8,
    schicht_beginn: '08:00',
    schicht_ende: '16:30',
    vormittag_beginn: '08:00',
    vormittag_ende: '12:00',
    nachmittag_beginn: '13:00',
    nachmittag_ende: '17:00',
    ist_stunden: null,
    ist_beginn: null,
    ist_ende: null,
    abwesenheit: 'Arbeit',
    abwesenheit_notiz: '',
    pause_minuten: 30,
    schichtTyp: 'einfach',
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadData();
  }, [currentWeek]);

  const loadData = async () => {
    setLoading(true);
    
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('aktiv', true)
      .order('abteilung', { ascending: true })
      .order('nachname', { ascending: true });

    const { data: shiftData } = await supabase
      .from('employee_shifts')
      .select('*')
      .gte('datum', format(weekStart, 'yyyy-MM-dd'))
      .lte('datum', format(weekEnd, 'yyyy-MM-dd'));

    setEmployees(empData || []);
    setShifts((shiftData || []) as Shift[]);
    setLoading(false);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (filterAbteilung !== 'alle' && e.abteilung !== filterAbteilung) return false;
      if (searchTerm) {
        const suchbegriff = searchTerm.toLowerCase();
        const vollName = `${e.vorname} ${e.nachname}`.toLowerCase();
        const matchName = vollName.includes(suchbegriff);
        const matchNummer = e.personalnummer.toLowerCase().includes(suchbegriff);
        if (!matchName && !matchNummer) return false;
      }
      return true;
    });
  }, [employees, filterAbteilung, searchTerm]);

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
      const hasGeteilteSchicht = existingShift.vormittag_beginn || existingShift.nachmittag_beginn;
      setFormData({
        soll_stunden: existingShift.soll_stunden,
        schicht_beginn: existingShift.schicht_beginn || '08:00',
        schicht_ende: existingShift.schicht_ende || '16:30',
        vormittag_beginn: existingShift.vormittag_beginn || '08:00',
        vormittag_ende: existingShift.vormittag_ende || '12:00',
        nachmittag_beginn: existingShift.nachmittag_beginn || '13:00',
        nachmittag_ende: existingShift.nachmittag_ende || '17:00',
        ist_stunden: existingShift.ist_stunden,
        ist_beginn: existingShift.ist_beginn,
        ist_ende: existingShift.ist_ende,
        abwesenheit: existingShift.abwesenheit,
        abwesenheit_notiz: existingShift.abwesenheit_notiz || '',
        pause_minuten: existingShift.pause_minuten || 30,
        schichtTyp: hasGeteilteSchicht ? 'geteilt' : 'einfach',
      });
    } else {
      const dailyHours = employee.wochenstunden_soll / 5;
      setFormData({
        soll_stunden: dailyHours,
        schicht_beginn: '08:00',
        schicht_ende: '16:30',
        vormittag_beginn: '08:00',
        vormittag_ende: '12:00',
        nachmittag_beginn: '13:00',
        nachmittag_ende: '17:00',
        ist_stunden: null,
        ist_beginn: null,
        ist_ende: null,
        abwesenheit: 'Arbeit',
        abwesenheit_notiz: '',
        pause_minuten: 30,
        schichtTyp: 'einfach',
      });
    }
    
    setDialogOpen(true);
  };

  const handleSaveShift = async () => {
    if (!selectedEmployee || !selectedDate) return;

    const existingShift = getShiftForDay(selectedEmployee.id, selectedDate);
    
    const isArbeit = formData.abwesenheit === 'Arbeit';
    const isGeteilt = formData.schichtTyp === 'geteilt';
    
    const payload: any = {
      employee_id: selectedEmployee.id,
      datum: format(selectedDate, 'yyyy-MM-dd'),
      soll_stunden: formData.soll_stunden || 0,
      schicht_beginn: isArbeit && !isGeteilt ? formData.schicht_beginn : null,
      schicht_ende: isArbeit && !isGeteilt ? formData.schicht_ende : null,
      vormittag_beginn: isArbeit && isGeteilt ? formData.vormittag_beginn : null,
      vormittag_ende: isArbeit && isGeteilt ? formData.vormittag_ende : null,
      nachmittag_beginn: isArbeit && isGeteilt ? formData.nachmittag_beginn : null,
      nachmittag_ende: isArbeit && isGeteilt ? formData.nachmittag_ende : null,
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
        toast.error(t('common.error'));
        console.error(error);
      } else {
        toast.success(t('common.success'));
        loadData();
      }
    } else {
      const { error } = await supabase
        .from('employee_shifts')
        .insert([payload]);
      
      if (error) {
        toast.error(t('common.error'));
        console.error(error);
      } else {
        toast.success(t('common.success'));
        loadData();
      }
    }

    setDialogOpen(false);
  };

  const getAbwesenheitBadge = (shift: Shift) => {
    const option = ABWESENHEIT_OPTIONS.find(o => o.value === shift.abwesenheit);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const getAbwesenheitLabel = (abwesenheit: AbsenceReason) => {
    const option = ABWESENHEIT_OPTIONS.find(o => o.value === abwesenheit);
    return option?.label || abwesenheit;
  };

  const weekStats = useMemo(() => {
    const employeeStats = filteredEmployees.map(emp => {
      const empShifts = shifts.filter(s => s.employee_id === emp.id);
      const sollGesamt = empShifts.reduce((sum, s) => sum + (s.abwesenheit === 'Arbeit' ? s.soll_stunden : 0), 0);
      const istGesamt = empShifts.reduce((sum, s) => sum + (s.ist_stunden || 0), 0);
      const ueberstundenGesamt = empShifts.reduce((sum, s) => sum + (s.ueberstunden || 0), 0);
      const krankTage = empShifts.filter(s => s.abwesenheit === 'Krank').length;
      const urlaubTage = empShifts.filter(s => s.abwesenheit === 'Urlaub').length;

      return { employee: emp, sollGesamt, istGesamt, ueberstundenGesamt, krankTage, urlaubTage };
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

  const formatShiftDisplay = (shift: Shift) => {
    if (shift.abwesenheit !== 'Arbeit') {
      return shift.abwesenheit.slice(0, 3);
    }
    
    if (shift.vormittag_beginn && shift.nachmittag_beginn) {
      return (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-0.5">
            <Sun className="h-2.5 w-2.5" />
            {shift.vormittag_beginn?.slice(0, 5)}-{shift.vormittag_ende?.slice(0, 5)}
          </div>
          <div className="flex items-center gap-0.5">
            <Moon className="h-2.5 w-2.5" />
            {shift.nachmittag_beginn?.slice(0, 5)}-{shift.nachmittag_ende?.slice(0, 5)}
          </div>
        </div>
      );
    }
    
    return (
      <>
        <div>{shift.soll_stunden}h</div>
        {shift.schicht_beginn && (
          <div className="text-xs opacity-75">
            {shift.schicht_beginn.slice(0, 5)}-{shift.schicht_ende?.slice(0, 5)}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-foreground">{t('shifts.title')}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[200px] text-center">
            {format(weekStart, 'dd.MM.', { locale: dateLocale })} - {format(weekEnd, 'dd.MM.yyyy', { locale: dateLocale })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>{t('common.date')}</Button>
        </div>
      </div>

      {/* Farblegende */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">{t('shifts.legend')}</CardTitle>
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

      {/* Wochenstatistiken */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">{t('shifts.plannedHours')}</span>
            </div>
            <p className="text-2xl font-bold">{weekStats.totalSoll.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">{t('shifts.actualHours')}</span>
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
              <span className="text-sm text-muted-foreground">{t('shifts.overtimeHours')}</span>
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
              <span className="text-sm text-muted-foreground">{t('shifts.sickDays')}</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{weekStats.totalKrank}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">{t('shifts.vacationDays')}</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{weekStats.totalUrlaub}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="min-w-[250px] flex-1 max-w-md">
              <Label>{t('common.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('employees.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="min-w-[200px]">
              <Label>{t('employees.department')}</Label>
              <Select value={filterAbteilung} onValueChange={setFilterAbteilung}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">{t('accounts.all')}</SelectItem>
                  {ABTEILUNGEN.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground pb-2">
              {filteredEmployees.length} {t('nav.employees')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Schichtplan-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('shifts.week')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-muted-foreground p-6">{t('common.loading')}</p>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-20">
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-30 min-w-[150px]">{t('shifts.employee')}</TableHead>
                    <TableHead className="sticky left-[150px] bg-background z-30">{t('employees.department')}</TableHead>
                    {weekDays.map((day) => (
                      <TableHead key={day.toISOString()} className="text-center min-w-[100px]">
                        <div>{format(day, 'EEE', { locale: dateLocale })}</div>
                        <div className="text-xs">{format(day, 'dd.MM.')}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Σ {t('shifts.plannedHours').split('-')[0]}</TableHead>
                    <TableHead className="text-right">Σ {t('shifts.actualHours').split('-')[0]}</TableHead>
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
                                {formatShiftDisplay(shift)}
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
                        {t('common.noData')}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee?.vorname} {selectedEmployee?.nachname}
              {selectedDate && ` - ${format(selectedDate, 'EEEE, dd.MM.yyyy', { locale: dateLocale })}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Status-Auswahl mit Farblegende */}
            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {ABWESENHEIT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={formData.abwesenheit === option.value ? "default" : "outline"}
                    className={`justify-start ${formData.abwesenheit === option.value ? '' : option.color}`}
                    onClick={() => setFormData({ ...formData, abwesenheit: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {formData.abwesenheit === 'Arbeit' && (
              <>
                {/* Schichttyp-Auswahl */}
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Tabs 
                    value={formData.schichtTyp} 
                    onValueChange={(v) => setFormData({ ...formData, schichtTyp: v as 'einfach' | 'geteilt' })}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="einfach">Durchgehend</TabsTrigger>
                      <TabsTrigger value="geteilt">Geteilt</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="einfach" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start</Label>
                          <Input
                            type="time"
                            value={formData.schicht_beginn || ''}
                            onChange={(e) => setFormData({ ...formData, schicht_beginn: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ende</Label>
                          <Input
                            type="time"
                            value={formData.schicht_ende || ''}
                            onChange={(e) => setFormData({ ...formData, schicht_ende: e.target.value })}
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="geteilt" className="space-y-4 mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Sun className="h-4 w-4 text-yellow-500" />
                          AM
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start</Label>
                            <Input
                              type="time"
                              value={formData.vormittag_beginn || ''}
                              onChange={(e) => setFormData({ ...formData, vormittag_beginn: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ende</Label>
                            <Input
                              type="time"
                              value={formData.vormittag_ende || ''}
                              onChange={(e) => setFormData({ ...formData, vormittag_ende: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Moon className="h-4 w-4 text-indigo-500" />
                          PM
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start</Label>
                            <Input
                              type="time"
                              value={formData.nachmittag_beginn || ''}
                              onChange={(e) => setFormData({ ...formData, nachmittag_beginn: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ende</Label>
                            <Input
                              type="time"
                              value={formData.nachmittag_ende || ''}
                              onChange={(e) => setFormData({ ...formData, nachmittag_ende: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('shifts.plannedHours')}</Label>
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
                    <Label>Pause (min)</Label>
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
                  <h4 className="font-medium mb-2">{t('shifts.actualHours')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Input
                        type="time"
                        value={formData.ist_beginn || ''}
                        onChange={(e) => setFormData({ ...formData, ist_beginn: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ende</Label>
                      <Input
                        type="time"
                        value={formData.ist_ende || ''}
                        onChange={(e) => setFormData({ ...formData, ist_ende: e.target.value || null })}
                      />
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    <Label>{t('shifts.actualHours')} ({t('common.total')})</Label>
                    <Input
                      type="number"
                      min={0}
                      max={16}
                      step={0.25}
                      value={formData.ist_stunden ?? ''}
                      onChange={(e) => setFormData({ ...formData, ist_stunden: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                </div>
              </>
            )}

            {formData.abwesenheit !== 'Arbeit' && (
              <div className="space-y-2">
                <Label>{t('common.details')}</Label>
                <Textarea
                  value={formData.abwesenheit_notiz || ''}
                  onChange={(e) => setFormData({ ...formData, abwesenheit_notiz: e.target.value })}
                  placeholder={`${getAbwesenheitLabel(formData.abwesenheit)}...`}
                  rows={3}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveShift}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
