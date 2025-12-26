import { useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { KPICard } from '@/components/cards/KPICard';
import { BereichChart } from '@/components/charts/BereichChart';
import { AufwandKlassenChart } from '@/components/charts/AufwandKlassenChart';
import { AlarmWidget } from '@/components/widgets/AlarmWidget';
import { RohertragDetailModal } from '@/components/modals/RohertragDetailModal';
import { Euro, TrendingUp, ShoppingCart, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function DashboardView() {
  const { bereichAggregationen, vergleiche, konten, selectedYear, selectedMonth, uploadedFiles } = useFinanceStore();
  const [schwellenwerte, setSchwellenwerte] = useState<any[]>([]);
  const [rohertragModalOpen, setRohertragModalOpen] = useState(false);

  useEffect(() => {
    const loadSchwellenwerte = async () => {
      const { data } = await supabase.from('kpi_schwellenwerte').select('*');
      setSchwellenwerte(data || []);
    };
    loadSchwellenwerte();
  }, []);
  
  // Erstelle Konten-Map für schnellen Zugriff auf Kontoklasse
  const kontenMap = useMemo(() => new Map(konten.map(k => [k.kontonummer, k])), [konten]);
  
  // Kontoklassen-Namen und Farben
  const klassenInfo: Record<string, { name: string; color: string }> = {
    '5': { name: 'Materialaufwand', color: 'hsl(var(--chart-1))' },
    '6': { name: 'Personalaufwand', color: 'hsl(var(--chart-2))' },
    '7': { name: 'Abschreibungen', color: 'hsl(var(--chart-3))' },
    '8': { name: 'Sonstiger Aufwand', color: 'hsl(var(--chart-4))' },
  };
  
  // Berechne Gesamt-KPIs
  const erlöseGesamt = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Erlös')
    .reduce((sum, b) => sum + b.saldoAktuell, 0);
  
  const erlöseVormonat = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Erlös')
    .reduce((sum, b) => sum + (b.saldoVormonat ?? 0), 0);
  
  // Gesamtaufwand = alle Konten der Klassen 5, 6, 7, 8 (Aufwandskonten)
  const aufwandsKlassen = ['5', '6', '7', '8'];
  const isAufwandskonto = (kontonummer: string) => {
    const konto = kontenMap.get(kontonummer);
    return konto && aufwandsKlassen.includes(konto.kontoklasse);
  };
  
  // Aufwand nach Kontoklassen berechnen mit Vormonat und Vorjahr
  const aufwandNachKlassen = useMemo(() => {
    const klassenSummen: Record<string, { aktuell: number; vormonat: number; vorjahr: number; konten: any[] }> = {
      '5': { aktuell: 0, vormonat: 0, vorjahr: 0, konten: [] },
      '6': { aktuell: 0, vormonat: 0, vorjahr: 0, konten: [] },
      '7': { aktuell: 0, vormonat: 0, vorjahr: 0, konten: [] },
      '8': { aktuell: 0, vormonat: 0, vorjahr: 0, konten: [] },
    };
    
    vergleiche.forEach(v => {
      const konto = kontenMap.get(v.kontonummer);
      if (konto && aufwandsKlassen.includes(konto.kontoklasse)) {
        const klasse = konto.kontoklasse;
        klassenSummen[klasse].aktuell += Math.abs(v.saldoAktuell);
        klassenSummen[klasse].vormonat += Math.abs(v.saldoVormonat ?? 0);
        klassenSummen[klasse].vorjahr += Math.abs(v.saldoVorjahr ?? 0);
        klassenSummen[klasse].konten.push({
          kontonummer: v.kontonummer,
          bezeichnung: konto.kontobezeichnung,
          saldoAktuell: v.saldoAktuell,
          saldoVormonat: v.saldoVormonat,
          saldoVorjahr: v.saldoVorjahr,
        });
      }
    });
    
    return aufwandsKlassen.map(klasse => ({
      klasse,
      name: klassenInfo[klasse].name,
      value: klassenSummen[klasse].aktuell,
      valueVormonat: klassenSummen[klasse].vormonat,
      valueVorjahr: klassenSummen[klasse].vorjahr,
      color: klassenInfo[klasse].color,
      konten: klassenSummen[klasse].konten,
    }));
  }, [vergleiche, kontenMap]);
  const aufwandGesamt = vergleiche
    .filter(v => isAufwandskonto(v.kontonummer))
    .reduce((sum, v) => sum + Math.abs(v.saldoAktuell), 0);
  
  const aufwandVormonat = vergleiche
    .filter(v => isAufwandskonto(v.kontonummer))
    .reduce((sum, v) => sum + Math.abs(v.saldoVormonat ?? 0), 0);
  
  const rohertrag = Math.abs(erlöseGesamt) - aufwandGesamt;
  const rohertragVormonat = Math.abs(erlöseVormonat) - aufwandVormonat;
  
  const months = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  if (uploadedFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Dashboard" description="Übersicht Ihrer Finanzkennzahlen" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Euro className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Keine Daten vorhanden
            </h3>
            <p className="text-muted-foreground mb-4">
              Laden Sie Ihre Saldenlisten hoch, um die Finanzanalyse zu starten.
            </p>
            <p className="text-sm text-muted-foreground">
              Erwartetes Format: <code className="bg-muted px-2 py-0.5 rounded">Saldenliste-MM-YYYY.csv</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Dashboard" 
        description={`Finanzübersicht ${months[selectedMonth]} ${selectedYear}`} 
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Gesamterlöse"
            value={Math.abs(erlöseGesamt)}
            previousValue={erlöseVormonat ? Math.abs(erlöseVormonat) : null}
            icon={Euro}
            variant="accent"
            tooltip="Summe aller Konten mit Kostenartt-Typ 'Erlös' (Umsatzerlöse, sonstige Erträge)"
          />
          <KPICard
            title="Gesamtaufwand"
            value={aufwandGesamt}
            previousValue={aufwandVormonat || null}
            icon={ShoppingCart}
            variant="default"
            tooltip="Summe aller Aufwandskonten der Klassen 5 (Material), 6 (Personal), 7 (Abschreibungen), 8 (Sonstiges)"
          />
          <div 
            className="cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setRohertragModalOpen(true)}
          >
            <KPICard
              title="Rohertrag"
              value={rohertrag}
              previousValue={rohertragVormonat || null}
              icon={TrendingUp}
              variant={rohertrag > 0 ? 'success' : 'warning'}
              tooltip="Erlöse − Aufwand (Klassen 5-8). Klicken für Details."
            />
          </div>
          <KPICard
            title="Rohmarge"
            value={erlöseGesamt !== 0 ? (rohertrag / Math.abs(erlöseGesamt)) * 100 : 0}
            icon={Wallet}
            variant="default"
            tooltip="Rohertrag ÷ Erlöse × 100 – zeigt die Rentabilität in Prozent"
          />
        </div>
        
        {/* Alarm Widget */}
        <div className="mb-6">
          <AlarmWidget schwellenwerte={schwellenwerte} />
        </div>
        
        {/* Aufwand nach Kontoklassen Chart */}
        <div className="mb-6">
          <AufwandKlassenChart 
            data={aufwandNachKlassen}
            title="Gesamtaufwand nach Kontoklassen"
          />
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BereichChart 
            data={bereichAggregationen.filter(b => b.kostenarttTyp === 'Erlös')} 
            title="Erlöse nach Bereich"
            type="erlös"
          />
          <BereichChart 
            data={bereichAggregationen.filter(b => b.kostenarttTyp === 'Einkauf')} 
            title="Aufwand nach Bereich"
            type="einkauf"
          />
        </div>
      </div>

      {/* Rohertrag Detail Modal */}
      <RohertragDetailModal
        open={rohertragModalOpen}
        onOpenChange={setRohertragModalOpen}
        erloese={erlöseGesamt}
        aufwand={aufwandGesamt}
        aufwandNachKlassen={aufwandNachKlassen}
        rohertrag={rohertrag}
        rohmarge={erlöseGesamt !== 0 ? (rohertrag / Math.abs(erlöseGesamt)) * 100 : 0}
      />
    </div>
  );
}
