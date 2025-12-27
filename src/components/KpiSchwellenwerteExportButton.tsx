import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { exportSchwellenwerteVergleich, Schwellenwert } from '@/lib/kpiSchwellenwerteExport';
import { toast } from 'sonner';

export function KpiSchwellenwerteExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const { data, error } = await supabase
        .from('kpi_schwellenwerte')
        .select('*')
        .order('abteilung')
        .order('kpi_typ');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.error('Keine Schwellenwerte zum Exportieren vorhanden');
        return;
      }
      
      const schwellenwerte: Schwellenwert[] = data.map(row => ({
        id: row.id,
        abteilung: row.abteilung,
        kpi_typ: row.kpi_typ,
        schwellenwert_min: row.schwellenwert_min,
        schwellenwert_max: row.schwellenwert_max,
        alarm_aktiv: row.alarm_aktiv
      }));
      
      exportSchwellenwerteVergleich(schwellenwerte);
      toast.success('PDF Export erfolgreich erstellt');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Exportieren der Schwellenwerte');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      onClick={handleExport} 
      disabled={isExporting}
      variant="outline"
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Export Schwellenwerte (PDF)
    </Button>
  );
}
