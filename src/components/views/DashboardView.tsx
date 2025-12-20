import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { KPICard } from '@/components/cards/KPICard';
import { BereichChart } from '@/components/charts/BereichChart';
import { Euro, TrendingUp, ShoppingCart, Wallet } from 'lucide-react';

export function DashboardView() {
  const { bereichAggregationen, selectedYear, selectedMonth, uploadedFiles } = useFinanceStore();
  
  // Berechne Gesamt-KPIs
  const erlöseGesamt = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Erlös')
    .reduce((sum, b) => sum + b.saldoAktuell, 0);
  
  const erlöseVormonat = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Erlös')
    .reduce((sum, b) => sum + (b.saldoVormonat ?? 0), 0);
  
  const einkaufGesamt = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Einkauf')
    .reduce((sum, b) => sum + Math.abs(b.saldoAktuell), 0);
  
  const einkaufVormonat = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Einkauf')
    .reduce((sum, b) => sum + Math.abs(b.saldoVormonat ?? 0), 0);
  
  const rohertrag = erlöseGesamt - einkaufGesamt;
  const rohertragVormonat = erlöseVormonat - einkaufVormonat;
  
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
          />
          <KPICard
            title="Gesamtaufwand"
            value={einkaufGesamt}
            previousValue={einkaufVormonat || null}
            icon={ShoppingCart}
            variant="default"
          />
          <KPICard
            title="Rohertrag"
            value={rohertrag}
            previousValue={rohertragVormonat || null}
            icon={TrendingUp}
            variant={rohertrag > 0 ? 'success' : 'warning'}
          />
          <KPICard
            title="Rohmarge"
            value={erlöseGesamt !== 0 ? (rohertrag / Math.abs(erlöseGesamt)) * 100 : 0}
            icon={Wallet}
            variant="default"
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
    </div>
  );
}
