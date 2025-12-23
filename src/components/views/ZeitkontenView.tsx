import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Calendar, TrendingUp, TrendingDown, Palmtree, Heart, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { de } from 'date-fns/locale';

interface Employee {
  id: string;
  personalnummer: string;
  vorname: string;
  nachname: string;
  abteilung: string;
  wochenstunden_soll: number;
  aktiv: boolean;
}

interface TimeBalance {
  id: string;
  employee_id: string;
  jahr: number;
  monat: number;
  ueberstunden_saldo: number;
  ueberstunden_neu: number;
  ueberstunden_abgebaut: number;
  urlaub_anspruch_tage: number;
  urlaub_genommen_tage: number;
  urlaub_rest_tage: number;
  krankheitstage: number;
}

interface Shift {
  employee_id: string;
  datum: string;
  soll_stunden: number;
  ist_stunden: number | null;
  ueberstunden: number | null;
  abwesenheit: string;
}

const ABTEILUNGEN = [
  'Logis', 'F&B', 'Spa', 'Ärztin', 'Shop', 
  'Verwaltung', 'Technik', 'Energie', 'Marketing', 
  'Personal', 'Finanzierung', 'Sonstiges',
  'Housekeeping', 'Küche', 'Service', 'Rezeption'
];

const MONTHS = [
  { value: 1, label: 'Januar' },
  { value: 2, label: 'Februar' },
  { value: 3, label: 'März' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Dezember' },
];

export function ZeitkontenView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeBalances, setTimeBalances] = useState<TimeBalance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [filterAbteilung, setFilterAbteilung] = useState('alle');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<TimeBalance>>({
    ueberstunden_saldo: 0,
    urlaub_anspruch_tage: 30,
    urlaub_genommen_tage: 0,
    urlaub_rest_tage: 30,
    krankheitstage: 0,
  });

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    
    const monthStart = format(new Date(selectedYear, selectedMonth - 1, 1), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');

    // Load employees
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('aktiv', true)
      .order('abteilung', { ascending: true })
      .order('nachname', { ascending: true });

    // Load time balances
    const { data: balanceData } = await supabase
      .from('employee_time_balances')
      .select('*')
      .eq('jahr', selectedYear)
      .eq('monat', selectedMonth);

    // Load shifts for the month
    const { data: shiftData } = await supabase
      .from('employee_shifts')
      .select('employee_id, datum, soll_stunden, ist_stunden, ueberstunden, abwesenheit')
      .gte('datum', monthStart)
      .lte('datum', monthEnd);

    setEmployees(empData || []);
    setTimeBalances(balanceData || []);
    setShifts(shiftData || []);
    setLoading(false);
  };

  const calculateMonthStats = (employeeId: string) => {
    const empShifts = shifts.filter(s => s.employee_id === employeeId);
    
    return {
      arbeitstage: empShifts.filter(s => s.abwesenheit === 'Arbeit').length,
      sollStunden: empShifts.reduce((sum, s) => sum + (s.abwesenheit === 'Arbeit' ? s.soll_stunden : 0), 0),
      istStunden: empShifts.reduce((sum, s) => sum + (s.ist_stunden || 0), 0),
      ueberstunden: empShifts.reduce((sum, s) => sum + (s.ueberstunden || 0), 0),
      urlaubstage: empShifts.filter(s => s.abwesenheit === 'Urlaub').length,
      krankheitstage: empShifts.filter(s => s.abwesenheit === 'Krank').length,
      fortbildungstage: empShifts.filter(s => s.abwesenheit === 'Fortbildung').length,
    };
  };

  const getTimeBalance = (employeeId: string): TimeBalance | undefined => {
    return timeBalances.find(tb => tb.employee_id === employeeId);
  };

  const filteredEmployees = useMemo(() => {
    if (filterAbteilung === 'alle') return employees;
    return employees.filter(e => e.abteilung === filterAbteilung);
  }, [employees, filterAbteilung]);

  const openBalanceDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    const existing = getTimeBalance(employee.id);
    const monthStats = calculateMonthStats(employee.id);
    
    if (existing) {
      setFormData({
        ueberstunden_saldo: existing.ueberstunden_saldo,
        urlaub_anspruch_tage: existing.urlaub_anspruch_tage,
        urlaub_genommen_tage: existing.urlaub_genommen_tage,
        urlaub_rest_tage: existing.urlaub_rest_tage,
        krankheitstage: existing.krankheitstage,
      });
    } else {
      setFormData({
        ueberstunden_saldo: monthStats.ueberstunden,
        urlaub_anspruch_tage: 30,
        urlaub_genommen_tage: monthStats.urlaubstage,
        urlaub_rest_tage: 30 - monthStats.urlaubstage,
        krankheitstage: monthStats.krankheitstage,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveBalance = async () => {
    if (!selectedEmployee) return;

    const existing = getTimeBalance(selectedEmployee.id);
    const payload = {
      employee_id: selectedEmployee.id,
      jahr: selectedYear,
      monat: selectedMonth,
      ueberstunden_saldo: formData.ueberstunden_saldo || 0,
      ueberstunden_neu: calculateMonthStats(selectedEmployee.id).ueberstunden,
      ueberstunden_abgebaut: 0, // Can be manually adjusted
      urlaub_anspruch_tage: formData.urlaub_anspruch_tage || 0,
      urlaub_genommen_tage: formData.urlaub_genommen_tage || 0,
      urlaub_rest_tage: (formData.urlaub_anspruch_tage || 0) - (formData.urlaub_genommen_tage || 0),
      krankheitstage: formData.krankheitstage || 0,
    };

    if (existing) {
      const { error } = await supabase
        .from('employee_time_balances')
        .update(payload)
        .eq('id', existing.id);
      
      if (error) {
        toast.error('Fehler beim Aktualisieren');
        console.error(error);
      } else {
        toast.success('Zeitkonto aktualisiert');
        loadData();
      }
    } else {
      const { error } = await supabase
        .from('employee_time_balances')
        .insert([payload]);
      
      if (error) {
        toast.error('Fehler beim Speichern');
        console.error(error);
      } else {
        toast.success('Zeitkonto gespeichert');
        loadData();
      }
    }

    setDialogOpen(false);
  };

  const recalculateFromShifts = async () => {
    const updates = filteredEmployees.map(async (emp) => {
      const monthStats = calculateMonthStats(emp.id);
      const existing = getTimeBalance(emp.id);
      
      const payload = {
        employee_id: emp.id,
        jahr: selectedYear,
        monat: selectedMonth,
        ueberstunden_saldo: (existing?.ueberstunden_saldo || 0) + monthStats.ueberstunden,
        ueberstunden_neu: monthStats.ueberstunden,
        ueberstunden_abgebaut: 0,
        urlaub_anspruch_tage: existing?.urlaub_anspruch_tage || 30,
        urlaub_genommen_tage: monthStats.urlaubstage,
        urlaub_rest_tage: (existing?.urlaub_anspruch_tage || 30) - monthStats.urlaubstage,
        krankheitstage: monthStats.krankheitstage,
      };

      if (existing) {
        return supabase.from('employee_time_balances').update(payload).eq('id', existing.id);
      } else {
        return supabase.from('employee_time_balances').insert([payload]);
      }
    });

    await Promise.all(updates);
    toast.success('Zeitkonten aus Schichten neu berechnet');
    loadData();
  };

  // Gesamtstatistiken
  const totalStats = useMemo(() => {
    return filteredEmployees.reduce((acc, emp) => {
      const stats = calculateMonthStats(emp.id);
      const balance = getTimeBalance(emp.id);
      
      return {
        sollStunden: acc.sollStunden + stats.sollStunden,
        istStunden: acc.istStunden + stats.istStunden,
        ueberstundenNeu: acc.ueberstundenNeu + stats.ueberstunden,
        ueberstundenSaldo: acc.ueberstundenSaldo + (balance?.ueberstunden_saldo || 0),
        urlaubstage: acc.urlaubstage + stats.urlaubstage,
        krankheitstage: acc.krankheitstage + stats.krankheitstage,
      };
    }, { sollStunden: 0, istStunden: 0, ueberstundenNeu: 0, ueberstundenSaldo: 0, urlaubstage: 0, krankheitstage: 0 });
  }, [filteredEmployees, shifts, timeBalances]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-foreground">Zeitkonten</h2>
        <Button variant="outline" onClick={recalculateFromShifts}>
          <RefreshCw className="h-4 w-4 mr-2" /> Aus Schichten berechnen
        </Button>
      </div>

      {/* Monat/Jahr Auswahl */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="min-w-[120px]">
              <Label>Jahr</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px]">
              <Label>Monat</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Gesamtstatistiken */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Soll-Stunden</span>
            </div>
            <p className="text-2xl font-bold">{totalStats.sollStunden.toFixed(0)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Ist-Stunden</span>
            </div>
            <p className="text-2xl font-bold">{totalStats.istStunden.toFixed(0)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Überstunden (neu)</span>
            </div>
            <p className={`text-2xl font-bold ${totalStats.ueberstundenNeu >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
              {totalStats.ueberstundenNeu >= 0 ? '+' : ''}{totalStats.ueberstundenNeu.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Überstunden (Saldo)</span>
            </div>
            <p className={`text-2xl font-bold ${totalStats.ueberstundenSaldo >= 0 ? 'text-purple-600' : 'text-blue-600'}`}>
              {totalStats.ueberstundenSaldo >= 0 ? '+' : ''}{totalStats.ueberstundenSaldo.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Palmtree className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Urlaubstage</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{totalStats.urlaubstage}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Krankheitstage</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{totalStats.krankheitstage}</p>
          </CardContent>
        </Card>
      </div>

      {/* Zeitkonten-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Zeitkonten {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead>Abteilung</TableHead>
                    <TableHead className="text-right">Soll</TableHead>
                    <TableHead className="text-right">Ist</TableHead>
                    <TableHead className="text-right">+/- Monat</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-center">Urlaub</TableHead>
                    <TableHead className="text-center">Krank</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const stats = calculateMonthStats(emp.id);
                    const balance = getTimeBalance(emp.id);
                    const urlaubProgress = balance ? (balance.urlaub_genommen_tage / balance.urlaub_anspruch_tage) * 100 : 0;
                    
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.nachname}, {emp.vorname}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{emp.abteilung}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{stats.sollStunden.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">{stats.istStunden.toFixed(1)}h</TableCell>
                        <TableCell className={`text-right font-medium ${stats.ueberstunden >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                          {stats.ueberstunden >= 0 ? '+' : ''}{stats.ueberstunden.toFixed(1)}h
                        </TableCell>
                        <TableCell className={`text-right font-bold ${(balance?.ueberstunden_saldo || 0) >= 0 ? 'text-purple-600' : 'text-blue-600'}`}>
                          {(balance?.ueberstunden_saldo || 0) >= 0 ? '+' : ''}{(balance?.ueberstunden_saldo || 0).toFixed(1)}h
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm">
                              {balance?.urlaub_genommen_tage || stats.urlaubstage} / {balance?.urlaub_anspruch_tage || 30}
                            </span>
                            <Progress value={urlaubProgress} className="w-16 h-1" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={stats.krankheitstage > 0 ? 'destructive' : 'secondary'}>
                            {stats.krankheitstage} Tage
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openBalanceDialog(emp)}>
                            Bearbeiten
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
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

      {/* Bearbeiten-Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Zeitkonto: {selectedEmployee?.vorname} {selectedEmployee?.nachname}
              <span className="text-muted-foreground text-sm ml-2">
                ({MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear})
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Überstunden Saldo (gesamt)</Label>
              <Input
                type="number"
                step={0.5}
                value={formData.ueberstunden_saldo || 0}
                onChange={(e) => setFormData({ ...formData, ueberstunden_saldo: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Gesamter Überstunden-Stand inkl. Vormonat</p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Urlaub</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jahresanspruch (Tage)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.urlaub_anspruch_tage || 0}
                    onChange={(e) => {
                      const anspruch = parseInt(e.target.value) || 0;
                      setFormData({ 
                        ...formData, 
                        urlaub_anspruch_tage: anspruch,
                        urlaub_rest_tage: anspruch - (formData.urlaub_genommen_tage || 0)
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Genommen (Tage)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.urlaub_genommen_tage || 0}
                    onChange={(e) => {
                      const genommen = parseInt(e.target.value) || 0;
                      setFormData({ 
                        ...formData, 
                        urlaub_genommen_tage: genommen,
                        urlaub_rest_tage: (formData.urlaub_anspruch_tage || 0) - genommen
                      });
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 p-2 bg-muted rounded">
                <span className="text-sm">Resturlaub: </span>
                <span className="font-bold">{formData.urlaub_rest_tage || 0} Tage</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <Label>Krankheitstage (gesamt im Monat)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.krankheitstage || 0}
                  onChange={(e) => setFormData({ ...formData, krankheitstage: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveBalance}>Speichern</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
