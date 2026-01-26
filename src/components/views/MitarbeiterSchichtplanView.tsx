import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Calendar, Clock, TrendingUp, Umbrella, Thermometer, AlertCircle } from 'lucide-react';

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

interface Shift {
  id: string;
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

interface TimeBalance {
  ueberstunden_saldo: number;
  urlaub_anspruch_tage: number;
  urlaub_genommen_tage: number;
  urlaub_rest_tage: number;
  krankheitstage: number;
}

export const MitarbeiterSchichtplanView = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeBalance, setTimeBalance] = useState<TimeBalance | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single();

      if (empError) {
        console.error('Error fetching employee:', empError);
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Mitarbeiterdaten konnten nicht geladen werden',
        });
        setIsLoading(false);
        return;
      }

      setEmployee(empData);
      
      const { data: balanceData } = await supabase
        .from('employee_time_balances')
        .select('*')
        .eq('employee_id', empData.id)
        .eq('jahr', currentYear)
        .eq('monat', currentMonth)
        .single();

      setTimeBalance(balanceData || {
        ueberstunden_saldo: 0,
        urlaub_anspruch_tage: 0,
        urlaub_genommen_tage: 0,
        urlaub_rest_tage: 0,
        krankheitstage: 0,
      });

      setIsLoading(false);
    };

    fetchEmployeeData();
  }, [user, currentMonth, currentYear]);

  useEffect(() => {
    if (!employee) return;

    const fetchShifts = async () => {
      const weekStart = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEnd = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('employee_shifts')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('datum', weekStart)
        .lte('datum', weekEnd)
        .order('datum');

      if (error) {
        console.error('Error fetching shifts:', error);
        return;
      }

      setShifts(data || []);
    };

    fetchShifts();
  }, [employee, currentWeekStart]);

  const getShiftForDate = (date: Date) => {
    return shifts.find(s => s.datum === format(date, 'yyyy-MM-dd'));
  };

  const getShiftDisplay = (date: Date) => {
    const shift = getShiftForDate(date);
    
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

    return <span className="text-muted-foreground text-xs">Geplant</span>;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Lade Daten...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="glass-card max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
            <p className="text-lg font-semibold mb-2">Mitarbeiterprofil nicht gefunden</p>
            <p className="text-muted-foreground text-sm">
              Ihr Account ist noch keinem Mitarbeiter zugeordnet. Bitte kontaktieren Sie Ihren Administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Mein Schichtplan</h1>
            <p className="text-sm text-muted-foreground">
              {employee.vorname} {employee.nachname} · {employee.abteilung}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="glass-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Überstunden</p>
                  <p className="text-lg font-bold">{timeBalance?.ueberstunden_saldo || 0}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Umbrella className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Resturlaub</p>
                  <p className="text-lg font-bold">{timeBalance?.urlaub_rest_tage || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">Krankheitstage</p>
                  <p className="text-lg font-bold">{timeBalance?.krankheitstage || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Wochenstunden</p>
                  <p className="text-lg font-bold">{employee.wochenstunden_soll}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
        {Object.entries(ABSENCE_COLORS).slice(0, 5).map(([key, value]) => (
          <Badge key={key} variant="outline" className={`text-xs ${value}`}>
            {key}
          </Badge>
        ))}
      </div>

      <Card className="glass-card flex-1">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Wochenübersicht
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const shift = getShiftForDate(day);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div
                  key={day.toISOString()}
                  className={`text-center p-2 rounded border ${
                    isToday ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {format(day, 'EE', { locale: de })}
                  </div>
                  <div className="text-sm font-bold mb-2">
                    {format(day, 'dd')}
                  </div>
                  <div className="min-h-[40px] flex items-center justify-center">
                    {getShiftDisplay(day)}
                  </div>
                  {shift && shift.ueberstunden !== 0 && (
                    <div className={`text-xs mt-1 ${shift.ueberstunden > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {shift.ueberstunden > 0 ? '+' : ''}{shift.ueberstunden}h
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {timeBalance && timeBalance.ueberstunden_saldo > 20 && (
        <Card className="glass-card mt-4 border-orange-500/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Hoher Überstundensaldo</p>
                <p className="text-xs text-muted-foreground">
                  Sie haben {timeBalance.ueberstunden_saldo} Überstunden angesammelt. 
                  Bitte sprechen Sie mit Ihrem Abteilungsleiter über den Abbau.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
