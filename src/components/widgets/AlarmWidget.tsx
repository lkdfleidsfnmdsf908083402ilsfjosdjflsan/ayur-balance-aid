import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFinanceStore } from '@/store/financeStore';
import { calculateAbteilungKpis } from '@/lib/kpiCalculations';

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

export const AlarmWidget = ({ schwellenwerte, onNavigateToAlarms }: AlarmWidgetProps) => {
  const { konten, salden, selectedYear, selectedMonth } = useFinanceStore();

  const abteilungKpis = useMemo(() => {
    if (konten.length === 0 || salden.length === 0) return [];
    return calculateAbteilungKpis(konten, salden, selectedYear, selectedMonth);
  }, [konten, salden, selectedYear, selectedMonth]);

  const getKpiValue = (abteilung: string, kpiTyp: string): number => {
    const kpi = abteilungKpis.find(k => k.abteilung === abteilung);
    if (!kpi) return 0;

    switch (kpiTyp) {
      case 'Umsatz': return kpi.umsatz;
      case 'Wareneinsatz': return kpi.wareneinsatz;
      case 'Personal': return kpi.personal;
      case 'DB I': return kpi.db1;
      case 'DB II': return kpi.db2;
      case 'Energie': return kpi.energie;
      case 'Marketing': return kpi.marketing;
      default: return 0;
    }
  };

  const checkAlarmStatus = (schwellenwert: KpiSchwellenwert): 'ok' | 'warning' | 'critical' => {
    if (!schwellenwert.alarm_aktiv) return 'ok';
    
    const aktuellerWert = getKpiValue(schwellenwert.abteilung, schwellenwert.kpi_typ);
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

  const activeAlarms = useMemo(() => {
    return schwellenwerte
      .filter(s => s.alarm_aktiv)
      .map(s => ({
        ...s,
        status: checkAlarmStatus(s),
        aktuellerWert: getKpiValue(s.abteilung, s.kpi_typ)
      }))
      .filter(s => s.status !== 'ok')
      .sort((a, b) => {
        if (a.status === 'critical' && b.status !== 'critical') return -1;
        if (a.status !== 'critical' && b.status === 'critical') return 1;
        return 0;
      });
  }, [schwellenwerte, abteilungKpis]);

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
                  <span className="text-muted-foreground">{alarm.kpi_typ}</span>
                </div>
                <span className={`font-mono ${
                  alarm.status === 'critical' ? 'text-destructive' : 'text-yellow-600'
                }`}>
                  {alarm.aktuellerWert.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
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
