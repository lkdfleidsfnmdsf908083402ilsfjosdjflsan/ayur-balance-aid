import { useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { calculateAbteilungKpis, calculateGesamtKpis } from '@/lib/kpiCalculations';
import { formatCurrency } from '@/lib/calculations';
import { operativeAbteilungen, serviceAbteilungen, bereichColors } from '@/lib/bereichMapping';
import { KpiSchwellenwert, KpiTyp, kpiTypLabels, kpiTypGroups, dailyReportAbteilungen } from '@/types/budget';
import { Bereich } from '@/types/finance';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellOff,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  Settings,
  TrendingDown,
  AlertCircle,
  Building2,
  ChefHat,
  Bed,
  Sparkles,
  Users,
  Wrench,
  ClipboardList,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Alle verfügbaren Abteilungen
const allAbteilungen = ['Gesamt', ...operativeAbteilungen, ...serviceAbteilungen, ...dailyReportAbteilungen];

// Interface für Daily Report Daten
interface DailyReportData {
  housekeeping: any | null;
  kitchen: any | null;
  service: any | null;
  spa: any | null;
  frontoffice: any | null;
  technical: any | null;
  admin: any | null;
}

export function KpiAlarmeView() {
  const { konten, salden, selectedYear, selectedMonth, uploadedFiles } = useFinanceStore();
  const [schwellenwerte, setSchwellenwerte] = useState<KpiSchwellenwert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dailyReports, setDailyReports] = useState<DailyReportData>({
    housekeeping: null,
    kitchen: null,
    service: null,
    spa: null,
    frontoffice: null,
    technical: null,
    admin: null,
  });
  const [newSchwellenwert, setNewSchwellenwert] = useState<Partial<KpiSchwellenwert>>({
    abteilung: 'Gesamt',
    kpiTyp: 'umsatz',
    alarmAktiv: true,
  });

  // Lade aktuelle KPIs
  const abteilungKpis = useMemo(() => {
    if (konten.length === 0 || salden.length === 0) return [];
    return calculateAbteilungKpis(konten, salden, selectedYear, selectedMonth);
  }, [konten, salden, selectedYear, selectedMonth]);

  const gesamtKpis = useMemo(() => calculateGesamtKpis(abteilungKpis), [abteilungKpis]);

  // Lade Schwellenwerte und Daily Reports
  useEffect(() => {
    loadSchwellenwerte();
    loadDailyReports();
  }, [selectedYear, selectedMonth]);

  const loadSchwellenwerte = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('kpi_schwellenwerte')
        .select('*');

      if (error) throw error;

      setSchwellenwerte((data || []).map((s: any) => ({
        id: s.id,
        abteilung: s.abteilung,
        kpiTyp: s.kpi_typ as KpiTyp,
        schwellenwertMin: s.schwellenwert_min ? Number(s.schwellenwert_min) : undefined,
        schwellenwertMax: s.schwellenwert_max ? Number(s.schwellenwert_max) : undefined,
        alarmAktiv: s.alarm_aktiv,
      })));
    } catch (error) {
      console.error('Fehler beim Laden der Schwellenwerte:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDailyReports = async () => {
    // Hole den letzten Tag des gewählten Monats
    const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0);
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;

    try {
      const [hk, kitchen, service, spa, fo, tech, admin] = await Promise.all([
        supabase.from('hk_daily_reports').select('*').gte('report_date', startDate).lte('report_date', endDate).order('report_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('kitchen_daily_reports').select('*').gte('report_date', startDate).lte('report_date', endDate).order('report_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('service_daily_reports').select('*').gte('report_date', startDate).lte('report_date', endDate).order('report_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('spa_daily_reports').select('*').gte('report_date', startDate).lte('report_date', endDate).order('report_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('frontoffice_daily_reports').select('*').gte('report_date', startDate).lte('report_date', endDate).order('report_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('technical_daily_reports').select('*').gte('report_date', startDate).lte('report_date', endDate).order('report_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('admin_daily_reports').select('*').gte('report_date', startDate).lte('report_date', endDate).order('report_date', { ascending: false }).limit(1).maybeSingle(),
      ]);

      setDailyReports({
        housekeeping: hk.data,
        kitchen: kitchen.data,
        service: service.data,
        spa: spa.data,
        frontoffice: fo.data,
        technical: tech.data,
        admin: admin.data,
      });
    } catch (error) {
      console.error('Fehler beim Laden der Daily Reports:', error);
    }
  };

  const getKpiValue = (abteilung: string, kpiTyp: KpiTyp): number | null => {
    // Finanz-KPIs
    if (['umsatz', 'db1', 'db2', 'db1_marge', 'db2_marge', 'wareneinsatz', 'wareneinsatz_pct', 'personal', 'personal_pct', 'energie', 'marketing', 'betriebsaufwand'].includes(kpiTyp)) {
      if (abteilung === 'Gesamt') {
        switch (kpiTyp) {
          case 'umsatz': return gesamtKpis.gesamtUmsatz;
          case 'db1': return gesamtKpis.gesamtDB1;
          case 'db2': return gesamtKpis.gesamtDB2;
          case 'db1_marge': return gesamtKpis.gesamtUmsatz > 0 ? (gesamtKpis.gesamtDB1 / gesamtKpis.gesamtUmsatz) * 100 : 0;
          case 'db2_marge': return gesamtKpis.gesamtUmsatz > 0 ? (gesamtKpis.gesamtDB2 / gesamtKpis.gesamtUmsatz) * 100 : 0;
          case 'wareneinsatz': return gesamtKpis.gesamtWareneinsatz;
          case 'wareneinsatz_pct': return gesamtKpis.gesamtUmsatz > 0 ? (gesamtKpis.gesamtWareneinsatz / gesamtKpis.gesamtUmsatz) * 100 : 0;
          case 'personal': return gesamtKpis.gesamtPersonal;
          case 'personal_pct': return gesamtKpis.gesamtUmsatz > 0 ? (gesamtKpis.gesamtPersonal / gesamtKpis.gesamtUmsatz) * 100 : 0;
          case 'energie': return gesamtKpis.gesamtEnergie;
          case 'marketing': return gesamtKpis.gesamtMarketing;
          default: return 0;
        }
      }
      
      const kpi = abteilungKpis.find(k => k.abteilung === abteilung);
      if (!kpi) return null;
      
      switch (kpiTyp) {
        case 'umsatz': return kpi.umsatz;
        case 'db1': return kpi.db1;
        case 'db2': return kpi.db2;
        case 'db1_marge': return kpi.umsatz > 0 ? (kpi.db1 / kpi.umsatz) * 100 : 0;
        case 'db2_marge': return kpi.umsatz > 0 ? (kpi.db2 / kpi.umsatz) * 100 : 0;
        case 'wareneinsatz': return kpi.wareneinsatz;
        case 'wareneinsatz_pct': return kpi.umsatz > 0 ? (kpi.wareneinsatz / kpi.umsatz) * 100 : 0;
        case 'personal': return kpi.personal;
        case 'personal_pct': return kpi.umsatz > 0 ? (kpi.personal / kpi.umsatz) * 100 : 0;
        case 'energie': return kpi.energie;
        case 'marketing': return kpi.marketing;
        case 'betriebsaufwand': return kpi.betriebsaufwand;
        default: return 0;
      }
    }

    // Housekeeping KPIs
    if (kpiTyp.startsWith('hk_')) {
      const hk = dailyReports.housekeeping;
      if (!hk) return null;
      switch (kpiTyp) {
        case 'hk_rooms_per_attendant': return hk.rooms_per_attendant;
        case 'hk_inspection_pass_rate': return hk.inspection_pass_rate;
        case 'hk_complaint_rate': return hk.complaint_rate;
        case 'hk_avg_minutes_per_room': return hk.avg_minutes_per_room;
        default: return null;
      }
    }

    // Kitchen KPIs
    if (kpiTyp.startsWith('kitchen_')) {
      const kitchen = dailyReports.kitchen;
      if (!kitchen) return null;
      switch (kpiTyp) {
        case 'kitchen_food_cost_pct': return kitchen.food_cost_pct;
        case 'kitchen_labour_pct': return kitchen.kitchen_labour_pct;
        case 'kitchen_prime_cost_pct': return kitchen.prime_cost_pct;
        case 'kitchen_complaint_rate': return kitchen.complaint_rate_pct;
        case 'kitchen_order_accuracy': return kitchen.order_accuracy_pct;
        case 'kitchen_food_waste_pct': return kitchen.food_waste_pct;
        default: return null;
      }
    }

    // Service KPIs
    if (kpiTyp.startsWith('service_')) {
      const service = dailyReports.service;
      if (!service) return null;
      switch (kpiTyp) {
        case 'service_sales_per_cover': return service.sales_per_cover;
        case 'service_complaint_rate': return service.service_complaint_rate_pct;
        case 'service_error_rate': return service.service_error_rate_pct;
        case 'service_avg_rating': return service.avg_service_rating;
        case 'service_table_turnover': return service.table_turnover_rate;
        default: return null;
      }
    }

    // Spa KPIs
    if (kpiTyp.startsWith('spa_')) {
      const spa = dailyReports.spa;
      if (!spa) return null;
      switch (kpiTyp) {
        case 'spa_room_utilization': return spa.room_utilization_pct;
        case 'spa_therapist_utilization': return spa.therapist_utilization_pct;
        case 'spa_revenue_per_guest': return spa.revenue_per_guest;
        case 'spa_no_show_rate': return spa.no_show_rate_pct;
        case 'spa_complaint_rate': return spa.complaint_rate_pct;
        case 'spa_avg_rating': return spa.avg_spa_rating;
        default: return null;
      }
    }

    // Front Office KPIs
    if (kpiTyp.startsWith('fo_')) {
      const fo = dailyReports.frontoffice;
      if (!fo) return null;
      switch (kpiTyp) {
        case 'fo_avg_checkin_time': return fo.avg_checkin_time_sec;
        case 'fo_complaint_rate': return fo.fo_complaint_rate_pct;
        case 'fo_upsell_conversion': return fo.upsell_conversion_pct;
        case 'fo_fcr_rate': return fo.fcr_pct;
        case 'fo_avg_rating': return fo.avg_fo_rating;
        default: return null;
      }
    }

    // Technical KPIs
    if (kpiTyp.startsWith('tech_')) {
      const tech = dailyReports.technical;
      if (!tech) return null;
      switch (kpiTyp) {
        case 'tech_ticket_backlog': return tech.ticket_backlog_rate_pct;
        case 'tech_same_day_resolution': return tech.same_day_resolution_pct;
        case 'tech_preventive_maintenance': return tech.preventive_maintenance_pct;
        case 'tech_emergency_rate': return tech.emergency_rate_pct;
        case 'tech_energy_per_room': return tech.energy_per_room;
        default: return null;
      }
    }

    // Admin KPIs
    if (kpiTyp.startsWith('admin_')) {
      const admin = dailyReports.admin;
      if (!admin) return null;
      switch (kpiTyp) {
        case 'admin_sick_rate': return admin.sick_rate_pct;
        case 'admin_open_positions_rate': return admin.open_positions_rate_pct;
        case 'admin_turnover_rate': return admin.monthly_turnover_rate_pct;
        case 'admin_it_availability': return admin.it_availability_pct;
        case 'admin_payment_compliance': return admin.payment_compliance_pct;
        default: return null;
      }
    }

    return null;
  };

  const checkAlarm = (schwellenwert: KpiSchwellenwert): 'ok' | 'warning' | 'critical' | 'no_data' => {
    if (!schwellenwert.alarmAktiv) return 'ok';
    
    const value = getKpiValue(schwellenwert.abteilung, schwellenwert.kpiTyp);
    if (value === null) return 'no_data';
    
    if (schwellenwert.schwellenwertMin !== undefined && value < schwellenwert.schwellenwertMin) {
      return 'critical';
    }
    if (schwellenwert.schwellenwertMax !== undefined && value > schwellenwert.schwellenwertMax) {
      return 'warning';
    }
    return 'ok';
  };

  const addSchwellenwert = async () => {
    if (!newSchwellenwert.abteilung || !newSchwellenwert.kpiTyp) return;

    try {
      const { error } = await supabase
        .from('kpi_schwellenwerte')
        .upsert({
          abteilung: newSchwellenwert.abteilung,
          kpi_typ: newSchwellenwert.kpiTyp,
          schwellenwert_min: newSchwellenwert.schwellenwertMin,
          schwellenwert_max: newSchwellenwert.schwellenwertMax,
          alarm_aktiv: newSchwellenwert.alarmAktiv ?? true,
        }, { onConflict: 'abteilung,kpi_typ' });

      if (error) throw error;

      toast.success('Schwellenwert gespeichert');
      setShowAddDialog(false);
      setNewSchwellenwert({ abteilung: 'Gesamt', kpiTyp: 'umsatz', alarmAktiv: true });
      loadSchwellenwerte();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const toggleAlarm = async (schwellenwert: KpiSchwellenwert) => {
    try {
      const { error } = await supabase
        .from('kpi_schwellenwerte')
        .update({ alarm_aktiv: !schwellenwert.alarmAktiv })
        .eq('id', schwellenwert.id);

      if (error) throw error;
      loadSchwellenwerte();
    } catch (error) {
      console.error('Fehler:', error);
    }
  };

  const deleteSchwellenwert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('kpi_schwellenwerte')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Schwellenwert gelöscht');
      loadSchwellenwerte();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const activeAlarms = schwellenwerte.filter(s => s.alarmAktiv && ['warning', 'critical'].includes(checkAlarm(s)));

  const formatValue = (kpiTyp: KpiTyp, value: number | null): string => {
    if (value === null) return 'Keine Daten';
    
    // Prozent-KPIs
    if (kpiTyp.includes('_pct') || kpiTyp.includes('_marge') || kpiTyp.includes('_rate')) {
      return `${value.toFixed(1)}%`;
    }
    
    // Währungs-KPIs
    if (['umsatz', 'db1', 'db2', 'wareneinsatz', 'personal', 'energie', 'marketing', 'betriebsaufwand', 'service_sales_per_cover', 'spa_revenue_per_guest'].includes(kpiTyp)) {
      return formatCurrency(value);
    }
    
    // Zeit in Sekunden
    if (kpiTyp === 'fo_avg_checkin_time') {
      return `${Math.round(value)} Sek.`;
    }
    
    // Rating (1-5)
    if (kpiTyp.includes('_rating')) {
      return value.toFixed(1);
    }
    
    return value.toFixed(1);
  };

  const getAbteilungIcon = (abteilung: string) => {
    switch (abteilung) {
      case 'Housekeeping': return <Bed className="h-4 w-4" />;
      case 'Kitchen': return <ChefHat className="h-4 w-4" />;
      case 'Service': return <ClipboardList className="h-4 w-4" />;
      case 'Spa': return <Sparkles className="h-4 w-4" />;
      case 'FrontOffice': return <Building2 className="h-4 w-4" />;
      case 'Technical': return <Wrench className="h-4 w-4" />;
      case 'Admin': return <Users className="h-4 w-4" />;
      default: return null;
    }
  };

  // Relevante KPI-Typen basierend auf Abteilung
  const getRelevantKpiTypes = (abteilung: string): KpiTyp[] => {
    switch (abteilung) {
      case 'Housekeeping':
        return ['hk_rooms_per_attendant', 'hk_inspection_pass_rate', 'hk_complaint_rate', 'hk_avg_minutes_per_room'];
      case 'Kitchen':
        return ['kitchen_food_cost_pct', 'kitchen_labour_pct', 'kitchen_prime_cost_pct', 'kitchen_complaint_rate', 'kitchen_order_accuracy', 'kitchen_food_waste_pct'];
      case 'Service':
        return ['service_sales_per_cover', 'service_complaint_rate', 'service_error_rate', 'service_avg_rating', 'service_table_turnover'];
      case 'Spa':
        return ['spa_room_utilization', 'spa_therapist_utilization', 'spa_revenue_per_guest', 'spa_no_show_rate', 'spa_complaint_rate', 'spa_avg_rating'];
      case 'FrontOffice':
        return ['fo_avg_checkin_time', 'fo_complaint_rate', 'fo_upsell_conversion', 'fo_fcr_rate', 'fo_avg_rating'];
      case 'Technical':
        return ['tech_ticket_backlog', 'tech_same_day_resolution', 'tech_preventive_maintenance', 'tech_emergency_rate', 'tech_energy_per_room'];
      case 'Admin':
        return ['admin_sick_rate', 'admin_open_positions_rate', 'admin_turnover_rate', 'admin_it_availability', 'admin_payment_compliance'];
      default:
        // Finanz-Abteilungen
        if (operativeAbteilungen.includes(abteilung as Bereich)) {
          return ['umsatz', 'db1', 'db2', 'db1_marge', 'db2_marge', 'wareneinsatz', 'wareneinsatz_pct', 'personal', 'personal_pct'];
        }
        if (serviceAbteilungen.includes(abteilung as Bereich)) {
          return ['personal', 'personal_pct', 'energie', 'marketing', 'betriebsaufwand'];
        }
        // Gesamt
        return ['umsatz', 'db1', 'db2', 'db1_marge', 'db2_marge', 'wareneinsatz_pct', 'personal_pct'];
    }
  };

  if (uploadedFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="KPI-Alarme" description="Schwellenwerte und Warnungen" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Bell className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Keine Daten vorhanden
            </h3>
            <p className="text-muted-foreground">
              Laden Sie Ihre Saldenlisten hoch, um Alarme zu konfigurieren.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="KPI-Alarme" 
        description="Schwellenwerte und Warnungen konfigurieren"
      />
      
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {activeAlarms.length > 0 ? (
              <Badge variant="destructive" className="gap-2">
                <AlertTriangle className="h-3 w-3" />
                {activeAlarms.length} Alarm{activeAlarms.length !== 1 ? 'e' : ''} aktiv
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-2 border-success text-success">
                <CheckCircle2 className="h-3 w-3" />
                Alle KPIs im Zielbereich
              </Badge>
            )}
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Schwellenwert hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Neuen Schwellenwert konfigurieren</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bereich / Abteilung</label>
                  <Select 
                    value={newSchwellenwert.abteilung} 
                    onValueChange={(v) => {
                      const relevantTypes = getRelevantKpiTypes(v);
                      setNewSchwellenwert({
                        ...newSchwellenwert, 
                        abteilung: v as any,
                        kpiTyp: relevantTypes[0] || 'umsatz'
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Übergreifend</SelectLabel>
                        <SelectItem value="Gesamt">Gesamt</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Operative Abteilungen</SelectLabel>
                        {operativeAbteilungen.map(abt => (
                          <SelectItem key={abt} value={abt}>{abt}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Service-Abteilungen</SelectLabel>
                        {serviceAbteilungen.map(abt => (
                          <SelectItem key={abt} value={abt}>{abt}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Daily Report Bereiche</SelectLabel>
                        {dailyReportAbteilungen.map(abt => (
                          <SelectItem key={abt} value={abt}>
                            <div className="flex items-center gap-2">
                              {getAbteilungIcon(abt)}
                              {abt}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">KPI</label>
                  <Select 
                    value={newSchwellenwert.kpiTyp} 
                    onValueChange={(v) => setNewSchwellenwert({...newSchwellenwert, kpiTyp: v as KpiTyp})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-60">
                        {getRelevantKpiTypes(newSchwellenwert.abteilung || 'Gesamt').map(typ => (
                          <SelectItem key={typ} value={typ}>{kpiTypLabels[typ]}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Minimum</label>
                    <Input
                      type="number"
                      placeholder="Bei Unterschreitung warnen"
                      value={newSchwellenwert.schwellenwertMin || ''}
                      onChange={(e) => setNewSchwellenwert({
                        ...newSchwellenwert, 
                        schwellenwertMin: e.target.value ? Number(e.target.value) : undefined
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Maximum</label>
                    <Input
                      type="number"
                      placeholder="Bei Überschreitung warnen"
                      value={newSchwellenwert.schwellenwertMax || ''}
                      onChange={(e) => setNewSchwellenwert({
                        ...newSchwellenwert, 
                        schwellenwertMax: e.target.value ? Number(e.target.value) : undefined
                      })}
                    />
                  </div>
                </div>
                <Button onClick={addSchwellenwert} className="w-full gap-2">
                  <Save className="h-4 w-4" />
                  Speichern
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Aktive Alarme */}
        {activeAlarms.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Aktive Warnungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeAlarms.map(alarm => {
                  const value = getKpiValue(alarm.abteilung, alarm.kpiTyp);
                  
                  return (
                    <div 
                      key={alarm.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/10"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingDown className="h-5 w-5 text-destructive" />
                        <div>
                          <div className="flex items-center gap-2">
                            {getAbteilungIcon(alarm.abteilung)}
                            <span className="font-medium">{alarm.abteilung}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{kpiTypLabels[alarm.kpiTyp]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-mono font-bold text-destructive">
                            {formatValue(alarm.kpiTyp, value)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {alarm.schwellenwertMin !== undefined && `Min: ${alarm.schwellenwertMin}`}
                            {alarm.schwellenwertMax !== undefined && ` Max: ${alarm.schwellenwertMax}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schwellenwert-Tabelle */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Konfigurierte Schwellenwerte
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schwellenwerte.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Noch keine Schwellenwerte konfiguriert. Klicken Sie auf "Schwellenwert hinzufügen".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Aktiv</TableHead>
                      <TableHead>Bereich</TableHead>
                      <TableHead>KPI</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Max</TableHead>
                      <TableHead className="text-right">Aktueller Wert</TableHead>
                      <TableHead className="text-center w-20">Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schwellenwerte.map(s => {
                      const value = getKpiValue(s.abteilung, s.kpiTyp);
                      const status = checkAlarm(s);
                      
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Switch 
                              checked={s.alarmAktiv} 
                              onCheckedChange={() => toggleAlarm(s)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getAbteilungIcon(s.abteilung)}
                              {!dailyReportAbteilungen.includes(s.abteilung as any) && s.abteilung !== 'Gesamt' && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: bereichColors[s.abteilung as Bereich] }}
                                />
                              )}
                              <span className="font-medium">{s.abteilung}</span>
                            </div>
                          </TableCell>
                          <TableCell>{kpiTypLabels[s.kpiTyp]}</TableCell>
                          <TableCell className="text-right font-mono">
                            {s.schwellenwertMin !== undefined ? s.schwellenwertMin : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {s.schwellenwertMax !== undefined ? s.schwellenwertMax : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatValue(s.kpiTyp, value)}
                          </TableCell>
                          <TableCell className="text-center">
                            {status === 'ok' ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : status === 'no_data' ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : status === 'warning' ? (
                              <AlertTriangle className="h-5 w-5 text-warning mx-auto" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-destructive mx-auto" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => s.id && deleteSchwellenwert(s.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
      </div>
    </div>
  );
}
