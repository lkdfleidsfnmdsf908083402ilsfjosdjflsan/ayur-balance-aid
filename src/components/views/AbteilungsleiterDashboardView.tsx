import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigation } from '@/contexts/NavigationContext';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  ArrowRight,
  Building2,
  UserCheck,
  Thermometer
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface DepartmentStats {
  totalEmployees: number;
  activeToday: number;
  onVacation: number;
  sick: number;
  plannedHours: number;
  actualHours: number;
  overtime: number;
}

interface KpiAlert {
  id: string;
  kpiTyp: string;
  abteilung: string;
  schwellenwertMin: number | null;
  schwellenwertMax: number | null;
}

export function AbteilungsleiterDashboardView() {
  const { userProfile } = useAuth();
  const { setActiveView } = useNavigation();
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [alerts, setAlerts] = useState<KpiAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const abteilung = userProfile?.abteilung || 'Unbekannt';
  const today = new Date();

  useEffect(() => {
    loadDashboardData();
  }, [abteilung]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load employee stats
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .eq('abteilung', abteilung)
        .eq('aktiv', true);

      const { data: shifts } = await supabase
        .from('employee_shifts')
        .select('*')
        .eq('datum', format(today, 'yyyy-MM-dd'));

      const employeeIds = employees?.map(e => e.id) || [];
      const todayShifts = shifts?.filter(s => employeeIds.includes(s.employee_id)) || [];

      const activeToday = todayShifts.filter(s => s.abwesenheit === 'Arbeit').length;
      const onVacation = todayShifts.filter(s => s.abwesenheit === 'Urlaub').length;
      const sick = todayShifts.filter(s => s.abwesenheit === 'Krank').length;

      const plannedHours = todayShifts.reduce((sum, s) => sum + (s.soll_stunden || 0), 0);
      const actualHours = todayShifts.reduce((sum, s) => sum + (s.ist_stunden || 0), 0);
      const overtime = todayShifts.reduce((sum, s) => sum + (s.ueberstunden || 0), 0);

      setStats({
        totalEmployees: employees?.length || 0,
        activeToday,
        onVacation,
        sick,
        plannedHours,
        actualHours,
        overtime,
      });

      // Load active alerts for this department
      const { data: alertsData } = await supabase
        .from('kpi_schwellenwerte')
        .select('*')
        .eq('abteilung', abteilung)
        .eq('alarm_aktiv', true)
        .limit(5);

      setAlerts(alertsData?.map(a => ({
        id: a.id,
        kpiTyp: a.kpi_typ,
        abteilung: a.abteilung,
        schwellenwertMin: a.schwellenwert_min,
        schwellenwertMax: a.schwellenwert_max,
      })) || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      label: 'Schichtplanung', 
      icon: Calendar, 
      view: 'mobile-schichtplanung',
      description: 'Schichten verwalten'
    },
    { 
      label: 'Mitarbeiter', 
      icon: Users, 
      view: 'mitarbeiter-stammdaten',
      description: 'Mitarbeiterdaten'
    },
    { 
      label: 'Zeitkonten', 
      icon: Clock, 
      view: 'zeitkonten',
      description: 'Überstunden & Urlaub'
    },
    { 
      label: 'Abteilungs-KPIs', 
      icon: TrendingUp, 
      view: 'abteilung-kpi',
      description: 'Kennzahlen'
    },
  ];

  const attendanceRate = stats && stats.totalEmployees > 0
    ? ((stats.activeToday / stats.totalEmployees) * 100).toFixed(1)
    : '0';

  const hoursCompletion = stats && stats.plannedHours > 0
    ? ((stats.actualHours / stats.plannedHours) * 100).toFixed(1)
    : '0';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title={`Willkommen zurück!`} 
        description={`${abteilung} Dashboard - ${format(today, 'EEEE, d. MMMM yyyy', { locale: de })}`} 
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* Welcome Card */}
        <Card className="glass-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-primary/20">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{userProfile?.name || 'Abteilungsleiter'}</h2>
                <p className="text-muted-foreground">
                  Leitung {abteilung}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.activeToday || 0}</p>
                  <p className="text-xs text-muted-foreground">Anwesend</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.onVacation || 0}</p>
                  <p className="text-xs text-muted-foreground">Urlaub</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Thermometer className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.sick || 0}</p>
                  <p className="text-xs text-muted-foreground">Krank</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalEmployees || 0}</p>
                  <p className="text-xs text-muted-foreground">Gesamt</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Anwesenheitsquote heute
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{attendanceRate}%</span>
                {parseFloat(attendanceRate) >= 90 ? (
                  <Badge className="bg-green-500/20 text-green-600 mb-1">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Gut
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-600 mb-1">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Unterbesetzt
                  </Badge>
                )}
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(attendanceRate), 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Arbeitsstunden heute
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{stats?.actualHours?.toFixed(1) || 0}h</span>
                <span className="text-muted-foreground mb-1">
                  / {stats?.plannedHours?.toFixed(1) || 0}h geplant
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <span className={`${(stats?.overtime || 0) > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {(stats?.overtime || 0) > 0 ? '+' : ''}{stats?.overtime?.toFixed(1) || 0}h Überstunden
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Schnellzugriff
            </CardTitle>
            <CardDescription>
              Häufig genutzte Funktionen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.view}
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30"
                  onClick={() => setActiveView(action.view as any)}
                >
                  <action.icon className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.description}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <Card className="glass-card border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Aktive KPI-Alarme
              </CardTitle>
              <CardDescription>
                {alerts.length} Schwellenwert{alerts.length !== 1 ? 'e' : ''} konfiguriert
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{alert.kpiTyp.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.schwellenwertMin && `Min: ${alert.schwellenwertMin}`}
                        {alert.schwellenwertMin && alert.schwellenwertMax && ' | '}
                        {alert.schwellenwertMax && `Max: ${alert.schwellenwertMax}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                      Aktiv
                    </Badge>
                  </div>
                ))}
              </div>
              <Button 
                variant="link" 
                className="mt-3 px-0"
                onClick={() => setActiveView('kpi-alarme' as any)}
              >
                Alle Alarme verwalten <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help Card */}
        <Card className="glass-card bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Hilfe & Dokumentation</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Benötigen Sie Unterstützung? In der Dokumentation finden Sie alle Informationen zur App-Nutzung.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Trigger PDF download from existing function
                    import('@/lib/pdfExport').then(module => {
                      module.exportUserDocumentation();
                    });
                  }}
                >
                  Anleitung herunterladen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
