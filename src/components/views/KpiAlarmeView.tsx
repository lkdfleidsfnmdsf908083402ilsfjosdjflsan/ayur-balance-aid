import { useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { calculateAbteilungKpis, calculateGesamtKpis } from '@/lib/kpiCalculations';
import { formatCurrency } from '@/lib/calculations';
import { operativeAbteilungen, bereichColors } from '@/lib/bereichMapping';
import { KpiSchwellenwert, kpiTypLabels } from '@/types/budget';
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

const kpiTypOptions: KpiSchwellenwert['kpiTyp'][] = ['umsatz', 'db1', 'db2', 'db1_marge', 'db2_marge'];

export function KpiAlarmeView() {
  const { konten, salden, selectedYear, selectedMonth, uploadedFiles } = useFinanceStore();
  const [schwellenwerte, setSchwellenwerte] = useState<KpiSchwellenwert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
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

  // Lade Schwellenwerte aus DB
  useEffect(() => {
    loadSchwellenwerte();
  }, []);

  const loadSchwellenwerte = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('kpi_schwellenwerte')
        .select('*');

      if (error) throw error;

      setSchwellenwerte((data || []).map((s: any) => ({
        id: s.id,
        abteilung: s.abteilung as Bereich | 'Gesamt',
        kpiTyp: s.kpi_typ as KpiSchwellenwert['kpiTyp'],
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

  const getKpiValue = (abteilung: string, kpiTyp: KpiSchwellenwert['kpiTyp']): number => {
    if (abteilung === 'Gesamt') {
      switch (kpiTyp) {
        case 'umsatz': return gesamtKpis.gesamtUmsatz;
        case 'db1': return gesamtKpis.gesamtDB1;
        case 'db2': return gesamtKpis.gesamtDB2;
        case 'db1_marge': return gesamtKpis.gesamtUmsatz > 0 ? (gesamtKpis.gesamtDB1 / gesamtKpis.gesamtUmsatz) * 100 : 0;
        case 'db2_marge': return gesamtKpis.gesamtUmsatz > 0 ? (gesamtKpis.gesamtDB2 / gesamtKpis.gesamtUmsatz) * 100 : 0;
      }
    }
    
    const kpi = abteilungKpis.find(k => k.abteilung === abteilung);
    if (!kpi) return 0;
    
    switch (kpiTyp) {
      case 'umsatz': return kpi.umsatz;
      case 'db1': return kpi.db1;
      case 'db2': return kpi.db2;
      case 'db1_marge': return kpi.umsatz > 0 ? (kpi.db1 / kpi.umsatz) * 100 : 0;
      case 'db2_marge': return kpi.umsatz > 0 ? (kpi.db2 / kpi.umsatz) * 100 : 0;
    }
  };

  const checkAlarm = (schwellenwert: KpiSchwellenwert): 'ok' | 'warning' | 'critical' => {
    if (!schwellenwert.alarmAktiv) return 'ok';
    
    const value = getKpiValue(schwellenwert.abteilung, schwellenwert.kpiTyp);
    
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

  const activeAlarms = schwellenwerte.filter(s => s.alarmAktiv && checkAlarm(s) !== 'ok');

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
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Schwellenwert konfigurieren</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Abteilung</label>
                  <Select 
                    value={newSchwellenwert.abteilung} 
                    onValueChange={(v) => setNewSchwellenwert({...newSchwellenwert, abteilung: v as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gesamt">Gesamt</SelectItem>
                      {operativeAbteilungen.map(abt => (
                        <SelectItem key={abt} value={abt}>{abt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">KPI</label>
                  <Select 
                    value={newSchwellenwert.kpiTyp} 
                    onValueChange={(v) => setNewSchwellenwert({...newSchwellenwert, kpiTyp: v as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kpiTypOptions.map(typ => (
                        <SelectItem key={typ} value={typ}>{kpiTypLabels[typ]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Minimum (Warnung bei Unterschreitung)</label>
                    <Input
                      type="number"
                      placeholder="z.B. 50000"
                      value={newSchwellenwert.schwellenwertMin || ''}
                      onChange={(e) => setNewSchwellenwert({
                        ...newSchwellenwert, 
                        schwellenwertMin: e.target.value ? Number(e.target.value) : undefined
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Maximum (Warnung bei Überschreitung)</label>
                    <Input
                      type="number"
                      placeholder="z.B. 100000"
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
                  const isMarge = alarm.kpiTyp.includes('marge');
                  
                  return (
                    <div 
                      key={alarm.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/10"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingDown className="h-5 w-5 text-destructive" />
                        <div>
                          <span className="font-medium">{alarm.abteilung}</span>
                          <span className="text-muted-foreground"> - {kpiTypLabels[alarm.kpiTyp]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-mono font-bold text-destructive">
                            {isMarge ? `${value.toFixed(1)}%` : formatCurrency(value)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Min: {alarm.schwellenwertMin !== undefined 
                              ? (isMarge ? `${alarm.schwellenwertMin}%` : formatCurrency(alarm.schwellenwertMin))
                              : '-'}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aktiv</TableHead>
                    <TableHead>Abteilung</TableHead>
                    <TableHead>KPI</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">Aktueller Wert</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schwellenwerte.map(s => {
                    const value = getKpiValue(s.abteilung, s.kpiTyp);
                    const status = checkAlarm(s);
                    const isMarge = s.kpiTyp.includes('marge');
                    
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
                            {s.abteilung !== 'Gesamt' && (
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
                          {s.schwellenwertMin !== undefined 
                            ? (isMarge ? `${s.schwellenwertMin}%` : formatCurrency(s.schwellenwertMin))
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {s.schwellenwertMax !== undefined 
                            ? (isMarge ? `${s.schwellenwertMax}%` : formatCurrency(s.schwellenwertMax))
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {isMarge ? `${value.toFixed(1)}%` : formatCurrency(value)}
                        </TableCell>
                        <TableCell className="text-center">
                          {status === 'ok' ? (
                            <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
