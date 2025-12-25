import { useMemo, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFinanceStore } from '@/store/financeStore';
import { calculateAbteilungKpis, calculateGesamtKpis } from '@/lib/kpiCalculations';
import { supabase } from '@/integrations/supabase/client';
import { KpiTyp, kpiTypLabels } from '@/types/budget';
import { operativeAbteilungen, serviceAbteilungen } from '@/lib/bereichMapping';
import { Bereich } from '@/types/finance';

interface KpiSchwellenwert {
  id: string;
  abteilung: string;
  kpi_typ: string;
  schwellenwert_min: number | null;
  schwellenwert_max: number | null;
  alarm_aktiv: boolean;
}

interface AlarmWidgetProps {
  schwellenwerte: KpiSchwellenwert[];
  onNavigateToAlarms?: () => void;
}

interface DailyReportData {
  housekeeping: any | null;
  kitchen: any | null;
  service: any | null;
  spa: any | null;
  frontoffice: any | null;
  technical: any | null;
  admin: any | null;
}

export const AlarmWidget = ({ schwellenwerte, onNavigateToAlarms }: AlarmWidgetProps) => {
  const { konten, salden, selectedYear, selectedMonth } = useFinanceStore();
  const [dailyReports, setDailyReports] = useState<DailyReportData>({
    housekeeping: null,
    kitchen: null,
    service: null,
    spa: null,
    frontoffice: null,
    technical: null,
    admin: null,
  });

  const abteilungKpis = useMemo(() => {
    if (konten.length === 0 || salden.length === 0) return [];
    return calculateAbteilungKpis(konten, salden, selectedYear, selectedMonth);
  }, [konten, salden, selectedYear, selectedMonth]);

  const gesamtKpis = useMemo(() => calculateGesamtKpis(abteilungKpis), [abteilungKpis]);

  useEffect(() => {
    loadDailyReports();
  }, [selectedYear, selectedMonth]);

  const loadDailyReports = async () => {
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

  const getKpiValue = (abteilung: string, kpiTyp: string): number | null => {
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

    // Daily Report KPIs
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

  const checkAlarmStatus = (schwellenwert: KpiSchwellenwert): 'ok' | 'warning' | 'critical' | 'no_data' => {
    if (!schwellenwert.alarm_aktiv) return 'ok';
    
    const aktuellerWert = getKpiValue(schwellenwert.abteilung, schwellenwert.kpi_typ);
    if (aktuellerWert === null) return 'no_data';
    
    const { schwellenwert_min, schwellenwert_max } = schwellenwert;

    if (schwellenwert_min !== null && aktuellerWert < schwellenwert_min) {
      return 'critical';
    }
    if (schwellenwert_max !== null && aktuellerWert > schwellenwert_max) {
      return 'critical';
    }

    // Warning if within 10% of threshold
    if (schwellenwert_min !== null) {
      const warningThreshold = schwellenwert_min * 1.1;
      if (aktuellerWert < warningThreshold) return 'warning';
    }
    if (schwellenwert_max !== null) {
      const warningThreshold = schwellenwert_max * 0.9;
      if (aktuellerWert > warningThreshold) return 'warning';
    }

    return 'ok';
  };

  const formatValue = (kpiTyp: string, value: number | null): string => {
    if (value === null) return '-';
    
    // Prozent-KPIs
    if (kpiTyp.includes('_pct') || kpiTyp.includes('_marge') || kpiTyp.includes('_rate')) {
      return `${value.toFixed(1)}%`;
    }
    
    // Währungs-KPIs
    if (['umsatz', 'db1', 'db2', 'wareneinsatz', 'personal', 'energie', 'marketing', 'betriebsaufwand', 'service_sales_per_cover', 'spa_revenue_per_guest'].includes(kpiTyp)) {
      return `${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`;
    }
    
    return value.toFixed(1);
  };

  const activeAlarms = useMemo(() => {
    return schwellenwerte
      .filter(s => s.alarm_aktiv)
      .map(s => ({
        ...s,
        status: checkAlarmStatus(s),
        aktuellerWert: getKpiValue(s.abteilung, s.kpi_typ)
      }))
      .filter(s => s.status === 'critical' || s.status === 'warning')
      .sort((a, b) => {
        if (a.status === 'critical' && b.status !== 'critical') return -1;
        if (a.status !== 'critical' && b.status === 'critical') return 1;
        return 0;
      });
  }, [schwellenwerte, abteilungKpis, gesamtKpis, dailyReports]);

  const criticalCount = activeAlarms.filter(a => a.status === 'critical').length;
  const warningCount = activeAlarms.filter(a => a.status === 'warning').length;

  if (schwellenwerte.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            KPI-Alarme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Keine Schwellenwerte konfiguriert
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="bg-card border-border cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onNavigateToAlarms}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            KPI-Alarme
          </span>
          <div className="flex gap-1">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} kritisch
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs">
                {warningCount} Warnung
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeAlarms.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">Alle KPIs im Normalbereich</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {activeAlarms.slice(0, 5).map((alarm) => (
              <div 
                key={alarm.id}
                className={`flex items-center justify-between p-2 rounded text-xs ${
                  alarm.status === 'critical' 
                    ? 'bg-destructive/10 border border-destructive/20' 
                    : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-3 w-3 ${
                    alarm.status === 'critical' ? 'text-destructive' : 'text-yellow-600'
                  }`} />
                  <span className="font-medium">{alarm.abteilung}</span>
                  <span className="text-muted-foreground">
                    {kpiTypLabels[alarm.kpi_typ as KpiTyp] || alarm.kpi_typ}
                  </span>
                </div>
                <span className={`font-mono ${
                  alarm.status === 'critical' ? 'text-destructive' : 'text-yellow-600'
                }`}>
                  {formatValue(alarm.kpi_typ, alarm.aktuellerWert)}
                </span>
              </div>
            ))}
            {activeAlarms.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{activeAlarms.length - 5} weitere Alarme
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
