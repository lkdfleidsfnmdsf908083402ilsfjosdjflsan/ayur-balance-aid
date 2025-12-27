import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { FileDown, Loader2, BookOpen, Users, Target, Euro, Building2 } from 'lucide-react';
import { exportHandbuch } from '@/lib/handbuchExport';
import { toast } from 'sonner';

interface HandbuchPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewData {
  schwellenwerte: any[];
  abteilungsleiter: any[];
  employees: any[];
  guests: any[];
  budgetPlanung: any[];
}

export function HandbuchPreviewModal({ open, onOpenChange }: HandbuchPreviewModalProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open) {
      loadPreviewData();
    }
  }, [open]);

  const loadPreviewData = async () => {
    setLoading(true);
    try {
      const [schwellenwerteRes, abteilungsleiterRes, employeesRes, guestsRes, budgetRes] = await Promise.all([
        supabase.from('kpi_schwellenwerte').select('*').order('abteilung'),
        supabase.from('abteilungsleiter').select('*').eq('aktiv', true),
        supabase.from('employees').select('*').eq('aktiv', true),
        supabase.from('guests').select('id, gast_nummer, vorname, nachname, vip_status').limit(100),
        supabase.from('budget_planung').select('*').order('jahr', { ascending: false }).order('monat', { ascending: false }),
      ]);

      setData({
        schwellenwerte: schwellenwerteRes.data || [],
        abteilungsleiter: abteilungsleiterRes.data || [],
        employees: employeesRes.data || [],
        guests: guestsRes.data || [],
        budgetPlanung: budgetRes.data || [],
      });
    } catch (error) {
      console.error('Fehler beim Laden der Vorschau:', error);
      toast.error('Fehler beim Laden der Vorschau-Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportHandbuch();
      toast.success('Handbuch erfolgreich exportiert');
      onOpenChange(false);
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      toast.error('Fehler beim Exportieren des Handbuchs');
    } finally {
      setExporting(false);
    }
  };

  // Group employees by department
  const employeesByDept = data?.employees.reduce((acc: Record<string, number>, e: any) => {
    acc[e.abteilung] = (acc[e.abteilung] || 0) + 1;
    return acc;
  }, {}) || {};

  // Group schwellenwerte by department
  const schwellenwerteByDept = data?.schwellenwerte.reduce((acc: Record<string, number>, s: any) => {
    acc[s.abteilung] = (acc[s.abteilung] || 0) + 1;
    return acc;
  }, {}) || {};

  // Group budget by department
  const budgetByDept = data?.budgetPlanung.reduce((acc: Record<string, number>, b: any) => {
    acc[b.abteilung] = (acc[b.abteilung] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Handbuch-Vorschau
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{data.schwellenwerte.length}</p>
                  <p className="text-xs text-muted-foreground">KPI-Schwellenwerte</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{data.employees.length}</p>
                  <p className="text-xs text-muted-foreground">Mitarbeiter</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{data.abteilungsleiter.length}</p>
                  <p className="text-xs text-muted-foreground">Abteilungsleiter</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Euro className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{data.budgetPlanung.length}</p>
                  <p className="text-xs text-muted-foreground">Budget-Einträge</p>
                </div>
              </div>

              <Separator />

              {/* Inhaltsverzeichnis */}
              <div>
                <h3 className="font-semibold mb-3">Inhaltsverzeichnis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {[
                    '1. Einleitung & Systemübersicht',
                    '2. Finanz-KPIs',
                    '3. Operative KPIs nach Abteilung',
                    '4. Konfigurierte Schwellenwerte',
                    '5. Budget-Planung & Soll-Ist-Vergleich',
                    '6. Branchenübliche Benchmarks',
                    '7. Organisationsstruktur',
                    '8. Mitarbeiterübersicht',
                    '9. Gästeverwaltung',
                    '10. Formeln & Berechnungen',
                    '11. Glossar',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-primary/50" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* KPI-Schwellenwerte nach Abteilung */}
              <div>
                <h3 className="font-semibold mb-3">KPI-Schwellenwerte nach Abteilung</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(schwellenwerteByDept).map(([dept, count]) => (
                    <Badge key={dept} variant="secondary" className="text-xs">
                      {dept}: {count as number} KPIs
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Budget-Planung */}
              <div>
                <h3 className="font-semibold mb-3">Budget-Planung nach Abteilung</h3>
                {Object.keys(budgetByDept).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(budgetByDept).map(([dept, count]) => (
                      <Badge key={dept} variant="outline" className="text-xs">
                        {dept}: {count as number} Einträge
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine Budget-Daten vorhanden</p>
                )}
              </div>

              <Separator />

              {/* Mitarbeiter nach Abteilung */}
              <div>
                <h3 className="font-semibold mb-3">Mitarbeiter nach Abteilung</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(employeesByDept).map(([dept, count]) => (
                    <Badge key={dept} variant="outline" className="text-xs">
                      {dept}: {count as number}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Abteilungsleiter */}
              <div>
                <h3 className="font-semibold mb-3">Abteilungsleiter</h3>
                {data.abteilungsleiter.length > 0 ? (
                  <div className="space-y-2">
                    {data.abteilungsleiter.map((al: any) => (
                      <div key={al.id} className="flex items-center justify-between text-sm bg-muted/30 rounded p-2">
                        <span className="font-medium">{al.name}</span>
                        <Badge variant="secondary">{al.abteilung}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine Abteilungsleiter konfiguriert</p>
                )}
              </div>

              <Separator />

              {/* Gäste-Info */}
              <div>
                <h3 className="font-semibold mb-3">Gästeverwaltung</h3>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Registrierte Gäste:</span>{' '}
                    <span className="font-medium">{data.guests.length}+</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VIP-Gäste:</span>{' '}
                    <span className="font-medium">{data.guests.filter((g: any) => g.vip_status).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Keine Daten verfügbar
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          <Button onClick={handleExport} disabled={exporting || loading} className="gap-2">
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            PDF exportieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
