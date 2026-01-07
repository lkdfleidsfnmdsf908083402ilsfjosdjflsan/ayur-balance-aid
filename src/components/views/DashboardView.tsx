import { useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { KPICard } from '@/components/cards/KPICard';
import { YTDKPICard } from '@/components/cards/YTDKPICard';
import { BereichChart } from '@/components/charts/BereichChart';
import { AufwandKlassenChart } from '@/components/charts/AufwandKlassenChart';
import { AlarmWidget } from '@/components/widgets/AlarmWidget';
import { BudgetAbweichungWidget } from '@/components/widgets/BudgetAbweichungWidget';
import { RohertragDetailModal } from '@/components/modals/RohertragDetailModal';
import { ErloesDetailModal } from '@/components/modals/ErloesDetailModal';
import { PersonalkostenDetailModal } from '@/components/modals/PersonalkostenDetailModal';
import { FBDetailModal } from '@/components/modals/FBDetailModal';
import { FBAufwandDetailModal } from '@/components/modals/FBAufwandDetailModal';
import { AufwandDetailModal } from '@/components/modals/AufwandDetailModal';
import { HandbuchPreviewModal } from '@/components/modals/HandbuchPreviewModal';
import { Euro, TrendingUp, ShoppingCart, Wallet, Users, UtensilsCrossed, Eye, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

// Standard F&B-Bereiche
const DEFAULT_FB_BEREICHE = ['Restaurant', 'Küche', 'Bar', 'Bankett', 'F&B'];

export function DashboardView() {
  const { bereichAggregationen, vergleiche, konten, salden, selectedYear, selectedMonth, uploadedFiles } = useFinanceStore();
  const { t, language } = useLanguage();
  const [schwellenwerte, setSchwellenwerte] = useState<any[]>([]);
  const [rohertragModalOpen, setRohertragModalOpen] = useState(false);
  const [erloeseModalOpen, setErloeseModalOpen] = useState(false);
  const [personalkostenModalOpen, setPersonalkostenModalOpen] = useState(false);
  const [fbModalOpen, setFbModalOpen] = useState(false);
  const [fbAufwandModalOpen, setFbAufwandModalOpen] = useState(false);
  const [aufwandModalOpen, setAufwandModalOpen] = useState(false);
  const [handbuchPreviewOpen, setHandbuchPreviewOpen] = useState(false);
  
  // Konfigurierbare F&B-Bereiche (persistent im localStorage)
  const [aktiveFbBereiche, setAktiveFbBereiche] = useState<string[]>(() => {
    const saved = localStorage.getItem('fbBereiche');
    return saved ? JSON.parse(saved) : DEFAULT_FB_BEREICHE;
  });
  
  // Alle verfügbaren Bereiche aus den Daten ermitteln
  const alleBereiche = useMemo(() => {
    const bereiche = new Set<string>();
    konten.forEach(k => {
      if (k.bereich) bereiche.add(k.bereich);
    });
    return Array.from(bereiche).sort();
  }, [konten]);
  
  // F&B-Bereiche ändern und speichern
  const handleFbBereicheChange = (bereiche: string[]) => {
    setAktiveFbBereiche(bereiche);
    localStorage.setItem('fbBereiche', JSON.stringify(bereiche));
  };

  // Localized months
  const monthKeys = ['', 'month.january', 'month.february', 'month.march', 'month.april', 'month.may', 'month.june', 'month.july', 'month.august', 'month.september', 'month.october', 'month.november', 'month.december'];

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

  const erlöseVorjahr = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Erlös')
    .reduce((sum, b) => sum + (b.saldoVorjahr ?? 0), 0);
  
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
  
  // Personalkosten nach Bereich berechnen (nur Klasse 6)
  const personalkostenNachBereich = useMemo(() => {
    const bereichSummen: Record<string, { aktuell: number; vormonat: number; vorjahr: number; konten: any[] }> = {};
    
    vergleiche.forEach(v => {
      const konto = kontenMap.get(v.kontonummer);
      if (konto && konto.kontoklasse === '6') {
        const bereich = konto.bereich;
        if (!bereichSummen[bereich]) {
          bereichSummen[bereich] = { aktuell: 0, vormonat: 0, vorjahr: 0, konten: [] };
        }
        bereichSummen[bereich].aktuell += Math.abs(v.saldoAktuell);
        bereichSummen[bereich].vormonat += Math.abs(v.saldoVormonat ?? 0);
        bereichSummen[bereich].vorjahr += Math.abs(v.saldoVorjahr ?? 0);
        bereichSummen[bereich].konten.push({
          kontonummer: v.kontonummer,
          bezeichnung: konto.kontobezeichnung,
          saldoAktuell: v.saldoAktuell,
          saldoVormonat: v.saldoVormonat,
          saldoVorjahr: v.saldoVorjahr,
        });
      }
    });
    
    return Object.entries(bereichSummen).map(([bereich, data]) => ({
      bereich,
      value: data.aktuell,
      valueVormonat: data.vormonat,
      valueVorjahr: data.vorjahr,
      konten: data.konten,
    }));
  }, [vergleiche, kontenMap]);
  
  // Personalkosten gesamt (Klasse 6)
  const personalkostenGesamt = aufwandNachKlassen.find(k => k.klasse === '6')?.value ?? 0;
  const personalkostenVormonat = aufwandNachKlassen.find(k => k.klasse === '6')?.valueVormonat ?? 0;
  const personalkostenVorjahr = aufwandNachKlassen.find(k => k.klasse === '6')?.valueVorjahr ?? 0;
  
  const aufwandGesamt = vergleiche
    .filter(v => isAufwandskonto(v.kontonummer))
    .reduce((sum, v) => sum + Math.abs(v.saldoAktuell), 0);
  
  const aufwandVormonat = vergleiche
    .filter(v => isAufwandskonto(v.kontonummer))
    .reduce((sum, v) => sum + Math.abs(v.saldoVormonat ?? 0), 0);

  const aufwandVorjahr = vergleiche
    .filter(v => isAufwandskonto(v.kontonummer))
    .reduce((sum, v) => sum + Math.abs(v.saldoVorjahr ?? 0), 0);
  
  const rohertrag = Math.abs(erlöseGesamt) - aufwandGesamt;
  const rohertragVormonat = Math.abs(erlöseVormonat) - aufwandVormonat;
  const rohertragVorjahr = Math.abs(erlöseVorjahr) - aufwandVorjahr;

  // F&B Bereich (konfigurierbar)
  const fbErloese = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Erlös' && aktiveFbBereiche.some(fb => b.bereich.includes(fb)))
    .reduce((sum, b) => sum + Math.abs(b.saldoAktuell), 0);
  const fbErloeseVormonat = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Erlös' && aktiveFbBereiche.some(fb => b.bereich.includes(fb)))
    .reduce((sum, b) => sum + Math.abs(b.saldoVormonat ?? 0), 0);
  const fbErloeseVorjahr = bereichAggregationen
    .filter(b => b.kostenarttTyp === 'Erlös' && aktiveFbBereiche.some(fb => b.bereich.includes(fb)))
    .reduce((sum, b) => sum + Math.abs(b.saldoVorjahr ?? 0), 0);

  // F&B Aufwand (Wareneinsatz Klasse 5 für konfigurierbare F&B-Bereiche)
  const fbAufwand = useMemo(() => {
    return vergleiche
      .filter(v => {
        const konto = kontenMap.get(v.kontonummer);
        return konto && konto.kontoklasse === '5' && aktiveFbBereiche.some(fb => konto.bereich.includes(fb));
      })
      .reduce((sum, v) => sum + Math.abs(v.saldoAktuell), 0);
  }, [vergleiche, kontenMap, aktiveFbBereiche]);
  
  const fbAufwandVormonat = useMemo(() => {
    return vergleiche
      .filter(v => {
        const konto = kontenMap.get(v.kontonummer);
        return konto && konto.kontoklasse === '5' && aktiveFbBereiche.some(fb => konto.bereich.includes(fb));
      })
      .reduce((sum, v) => sum + Math.abs(v.saldoVormonat ?? 0), 0);
  }, [vergleiche, kontenMap, aktiveFbBereiche]);
  
  const fbAufwandVorjahr = useMemo(() => {
    return vergleiche
      .filter(v => {
        const konto = kontenMap.get(v.kontonummer);
        return konto && konto.kontoklasse === '5' && aktiveFbBereiche.some(fb => konto.bereich.includes(fb));
      })
      .reduce((sum, v) => sum + Math.abs(v.saldoVorjahr ?? 0), 0);
  }, [vergleiche, kontenMap, aktiveFbBereiche]);
  
  // Food Cost % berechnen
  const foodCostPct = fbErloese > 0 ? (fbAufwand / fbErloese) * 100 : 0;
  const foodCostPctVormonat = fbErloeseVormonat > 0 ? (fbAufwandVormonat / fbErloeseVormonat) * 100 : 0;
  const foodCostPctVorjahr = fbErloeseVorjahr > 0 ? (fbAufwandVorjahr / fbErloeseVorjahr) * 100 : 0;
  
  // F&B Aufwand nach Bereich für Modal
  const fbAufwandBereiche = useMemo(() => {
    const bereichSummen: Record<string, { aktuell: number; vormonat: number; vorjahr: number }> = {};
    
    vergleiche.forEach(v => {
      const konto = kontenMap.get(v.kontonummer);
      if (konto && konto.kontoklasse === '5' && aktiveFbBereiche.some(fb => konto.bereich.includes(fb))) {
        const bereich = konto.bereich;
        if (!bereichSummen[bereich]) {
          bereichSummen[bereich] = { aktuell: 0, vormonat: 0, vorjahr: 0 };
        }
        bereichSummen[bereich].aktuell += Math.abs(v.saldoAktuell);
        bereichSummen[bereich].vormonat += Math.abs(v.saldoVormonat ?? 0);
        bereichSummen[bereich].vorjahr += Math.abs(v.saldoVorjahr ?? 0);
      }
    });
    
    return Object.entries(bereichSummen).map(([bereich, data]) => ({
      bereich,
      saldoAktuell: data.aktuell,
      saldoVormonat: data.vormonat,
      saldoVorjahr: data.vorjahr,
    }));
  }, [vergleiche, kontenMap, aktiveFbBereiche]);

  // YTD-Berechnung (Januar bis ausgewähltem Monat)
  const ytdData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const periodLabel = `${monthNames[0]}-${monthNames[selectedMonth - 1]} ${selectedYear}`;
    const periodLabelVorjahr = `${monthNames[0]}-${monthNames[selectedMonth - 1]} ${selectedYear - 1}`;
    
    // Sammle alle Salden für das aktuelle Jahr (Januar bis selectedMonth)
    const ytdSalden = salden.filter(s => 
      s.jahr === selectedYear && s.monat >= 1 && s.monat <= selectedMonth
    );
    
    // Sammle alle Salden für das Vorjahr (Januar bis selectedMonth)
    const ytdSaldenVorjahr = salden.filter(s => 
      s.jahr === selectedYear - 1 && s.monat >= 1 && s.monat <= selectedMonth
    );
    
    // Hilfsfunktion um YTD-Summe pro Konto zu berechnen
    const sumByKonten = (saldenList: typeof salden) => {
      return saldenList.reduce((sum, s) => sum + s.saldoMonat, 0);
    };
    
    // YTD Erlöse (Klasse 4 - Erlöskonten)
    const erlösKontonummern = konten
      .filter(k => k.kostenarttTyp === 'Erlös')
      .map(k => k.kontonummer);
    
    const ytdErloese = Math.abs(sumByKonten(ytdSalden.filter(s => erlösKontonummern.includes(s.kontonummer))));
    const ytdErloeseVorjahr = Math.abs(sumByKonten(ytdSaldenVorjahr.filter(s => erlösKontonummern.includes(s.kontonummer))));
    
    // YTD F&B Erlöse
    const fbKontonummern = konten
      .filter(k => k.kostenarttTyp === 'Erlös' && aktiveFbBereiche.some(fb => k.bereich.includes(fb)))
      .map(k => k.kontonummer);
    
    const ytdFbErloese = Math.abs(sumByKonten(ytdSalden.filter(s => fbKontonummern.includes(s.kontonummer))));
    const ytdFbErloeseVorjahr = Math.abs(sumByKonten(ytdSaldenVorjahr.filter(s => fbKontonummern.includes(s.kontonummer))));
    
    // YTD Aufwand (Klassen 5, 6, 7, 8)
    const aufwandKontonummern = konten
      .filter(k => aufwandsKlassen.includes(k.kontoklasse))
      .map(k => k.kontonummer);
    
    const ytdAufwand = Math.abs(sumByKonten(ytdSalden.filter(s => aufwandKontonummern.includes(s.kontonummer))));
    const ytdAufwandVorjahr = Math.abs(sumByKonten(ytdSaldenVorjahr.filter(s => aufwandKontonummern.includes(s.kontonummer))));
    
    // YTD Personalkosten (Klasse 6)
    const personalKontonummern = konten
      .filter(k => k.kontoklasse === '6')
      .map(k => k.kontonummer);
    
    const ytdPersonal = Math.abs(sumByKonten(ytdSalden.filter(s => personalKontonummern.includes(s.kontonummer))));
    const ytdPersonalVorjahr = Math.abs(sumByKonten(ytdSaldenVorjahr.filter(s => personalKontonummern.includes(s.kontonummer))));
    
    // YTD Rohertrag
    const ytdRohertrag = ytdErloese - ytdAufwand;
    const ytdRohertragVorjahr = ytdErloeseVorjahr - ytdAufwandVorjahr;
    
    // YTD Rohmarge
    const ytdRohmarge = ytdErloese !== 0 ? (ytdRohertrag / ytdErloese) * 100 : 0;
    const ytdRohmargeVorjahr = ytdErloeseVorjahr !== 0 ? (ytdRohertragVorjahr / ytdErloeseVorjahr) * 100 : 0;
    
    // YTD F&B Aufwand (Klasse 5 für F&B-Bereiche)
    const fbAufwandKontonummern = konten
      .filter(k => k.kontoklasse === '5' && aktiveFbBereiche.some(fb => k.bereich.includes(fb)))
      .map(k => k.kontonummer);
    
    const ytdFbAufwand = Math.abs(sumByKonten(ytdSalden.filter(s => fbAufwandKontonummern.includes(s.kontonummer))));
    const ytdFbAufwandVorjahr = Math.abs(sumByKonten(ytdSaldenVorjahr.filter(s => fbAufwandKontonummern.includes(s.kontonummer))));
    
    return {
      periodLabel,
      periodLabelVorjahr,
      erloese: ytdErloese,
      erloeseVorjahr: ytdErloeseVorjahr,
      fbErloese: ytdFbErloese,
      fbErloeseVorjahr: ytdFbErloeseVorjahr,
      fbAufwand: ytdFbAufwand,
      fbAufwandVorjahr: ytdFbAufwandVorjahr,
      aufwand: ytdAufwand,
      aufwandVorjahr: ytdAufwandVorjahr,
      personal: ytdPersonal,
      personalVorjahr: ytdPersonalVorjahr,
      rohertrag: ytdRohertrag,
      rohertragVorjahr: ytdRohertragVorjahr,
      rohmarge: ytdRohmarge,
      rohmargeVorjahr: ytdRohmargeVorjahr,
    };
  }, [salden, konten, selectedYear, selectedMonth, aktiveFbBereiche, aufwandsKlassen]);
  
  if (uploadedFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <Header 
          title={t('dashboard')} 
          description={t('dashboard.description')}
          actions={<LanguageSwitcher />}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Euro className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t('dashboard.noData')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('dashboard.uploadHint')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.expectedFormat')}: <code className="bg-muted px-2 py-0.5 rounded">Saldenliste-MM-YYYY.csv</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title={t('dashboard')} 
        description={`${t('dashboard.financialOverview')} ${t(monthKeys[selectedMonth])} ${selectedYear}`}
        actions={
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHandbuchPreviewOpen(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.handbook')}</span>
            </Button>
          </div>
        }
      />
      
      <HandbuchPreviewModal 
        open={handbuchPreviewOpen} 
        onOpenChange={setHandbuchPreviewOpen} 
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div 
            className="cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setErloeseModalOpen(true)}
          >
            <KPICard
              title={t('kpi.totalRevenue')}
              value={Math.abs(erlöseGesamt)}
              previousValue={erlöseVormonat ? Math.abs(erlöseVormonat) : null}
              previousYearValue={erlöseVorjahr ? Math.abs(erlöseVorjahr) : null}
              icon={Euro}
              variant="accent"
              tooltip={t('tooltip.revenue')}
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setFbModalOpen(true)}
          >
            <KPICard
              title={t('kpi.fbRevenue')}
              value={fbErloese}
              previousValue={fbErloeseVormonat || null}
              previousYearValue={fbErloeseVorjahr || null}
              icon={UtensilsCrossed}
              variant="accent"
              tooltip={t('tooltip.fb')}
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setAufwandModalOpen(true)}
          >
            <KPICard
              title={t('kpi.totalExpenses')}
              value={aufwandGesamt}
              previousValue={aufwandVormonat || null}
              previousYearValue={aufwandVorjahr || null}
              icon={ShoppingCart}
              variant="default"
              invertTrend
              tooltip={t('tooltip.expenses')}
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setFbAufwandModalOpen(true)}
          >
            <KPICard
              title={t('kpi.fbExpenses')}
              value={fbAufwand}
              previousValue={fbAufwandVormonat || null}
              previousYearValue={fbAufwandVorjahr || null}
              icon={UtensilsCrossed}
              variant="default"
              invertTrend
              tooltip="Wareneinsatz für F&B-Bereiche (konfigurierbar)"
            />
          </div>
          <KPICard
            title={t('kpi.foodCost')}
            value={foodCostPct}
            previousValue={foodCostPctVormonat || null}
            previousYearValue={foodCostPctVorjahr || null}
            icon={Percent}
            variant={foodCostPct > 35 ? 'warning' : 'success'}
            invertTrend
            tooltip="Food Cost % = F&B Aufwand / F&B Erlöse × 100"
          />
          <div 
            className="cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setPersonalkostenModalOpen(true)}
          >
            <KPICard
              title={t('kpi.personnelCosts')}
              value={personalkostenGesamt}
              previousValue={personalkostenVormonat || null}
              previousYearValue={personalkostenVorjahr || null}
              icon={Users}
              variant="default"
              invertTrend
              tooltip={t('tooltip.personnel')}
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setRohertragModalOpen(true)}
          >
            <KPICard
              title={t('kpi.grossProfit')}
              value={rohertrag}
              previousValue={rohertragVormonat || null}
              previousYearValue={rohertragVorjahr || null}
              icon={TrendingUp}
              variant={rohertrag > 0 ? 'success' : 'warning'}
              tooltip={t('tooltip.grossProfit')}
            />
          </div>
          <KPICard
            title={t('kpi.grossMargin')}
            value={erlöseGesamt !== 0 ? (rohertrag / Math.abs(erlöseGesamt)) * 100 : 0}
            icon={Wallet}
            variant="default"
            tooltip={t('tooltip.grossMargin')}
          />
        </div>
        
        {/* YTD KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <YTDKPICard
            title={t('kpi.totalRevenue')}
            value={ytdData.erloese}
            previousYearValue={ytdData.erloeseVorjahr || null}
            icon={Euro}
            variant="accent"
            periodLabel={ytdData.periodLabel}
            tooltip={`Kumulierte Erlöse von Januar bis ${selectedMonth}. ${selectedYear}`}
          />
          <YTDKPICard
            title={t('kpi.fbRevenue')}
            value={ytdData.fbErloese}
            previousYearValue={ytdData.fbErloeseVorjahr || null}
            icon={UtensilsCrossed}
            variant="accent"
            periodLabel={ytdData.periodLabel}
            tooltip={`Kumulierte F&B Erlöse von Januar bis ${selectedMonth}. ${selectedYear}`}
          />
          <YTDKPICard
            title={t('kpi.totalExpenses')}
            value={ytdData.aufwand}
            previousYearValue={ytdData.aufwandVorjahr || null}
            icon={ShoppingCart}
            variant="default"
            invertTrend
            periodLabel={ytdData.periodLabel}
            tooltip={`Kumulierter Gesamtaufwand von Januar bis ${selectedMonth}. ${selectedYear}`}
          />
          <YTDKPICard
            title={t('kpi.fbExpenses')}
            value={ytdData.fbAufwand}
            previousYearValue={ytdData.fbAufwandVorjahr || null}
            icon={UtensilsCrossed}
            variant="default"
            invertTrend
            periodLabel={ytdData.periodLabel}
            tooltip={`Kumulierter F&B-Wareneinsatz von Januar bis ${selectedMonth}. ${selectedYear}`}
          />
          <YTDKPICard
            title={t('kpi.personnelCosts')}
            value={ytdData.personal}
            previousYearValue={ytdData.personalVorjahr || null}
            icon={Users}
            variant="default"
            invertTrend
            periodLabel={ytdData.periodLabel}
            tooltip={`Kumulierte Personalkosten von Januar bis ${selectedMonth}. ${selectedYear}`}
          />
          <YTDKPICard
            title={t('kpi.grossProfit')}
            value={ytdData.rohertrag}
            previousYearValue={ytdData.rohertragVorjahr || null}
            icon={TrendingUp}
            variant={ytdData.rohertrag > 0 ? 'success' : 'warning'}
            periodLabel={ytdData.periodLabel}
            tooltip={`Kumulierter Rohertrag von Januar bis ${selectedMonth}. ${selectedYear}`}
          />
          <YTDKPICard
            title={t('kpi.grossMargin')}
            value={ytdData.rohmarge}
            previousYearValue={ytdData.rohmargeVorjahr || null}
            icon={Wallet}
            variant="default"
            periodLabel={ytdData.periodLabel}
            tooltip={`Durchschnittliche Rohmarge von Januar bis ${selectedMonth}. ${selectedYear}`}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AlarmWidget schwellenwerte={schwellenwerte} />
          <BudgetAbweichungWidget jahr={selectedYear} monat={selectedMonth} />
        </div>
        
        {/* Aufwand nach Kontoklassen Chart */}
        <div className="mb-6">
          <AufwandKlassenChart 
            data={aufwandNachKlassen}
            title={t('chart.expensesByClass')}
          />
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BereichChart 
            data={bereichAggregationen.filter(b => b.kostenarttTyp === 'Erlös')} 
            title={t('chart.revenueByArea')}
            type="erlös"
          />
          <BereichChart 
            data={bereichAggregationen.filter(b => b.kostenarttTyp === 'Einkauf')} 
            title={t('chart.expensesByArea')}
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
        bereicheErloese={bereichAggregationen.filter(b => b.kostenarttTyp === 'Erlös')}
        jahr={selectedYear}
        monat={selectedMonth}
      />

      {/* Erlöse Detail Modal */}
      <ErloesDetailModal
        open={erloeseModalOpen}
        onOpenChange={setErloeseModalOpen}
        erloeseGesamt={erlöseGesamt}
        erloeseVormonat={erlöseVormonat}
        bereicheDaten={bereichAggregationen.filter(b => b.kostenarttTyp === 'Erlös')}
        aufwandGesamt={aufwandGesamt}
        rohertrag={rohertrag}
        rohmarge={erlöseGesamt !== 0 ? (rohertrag / Math.abs(erlöseGesamt)) * 100 : 0}
        aufwandNachKlassen={aufwandNachKlassen}
        jahr={selectedYear}
        monat={selectedMonth}
      />

      {/* Personalkosten Detail Modal */}
      <PersonalkostenDetailModal
        open={personalkostenModalOpen}
        onOpenChange={setPersonalkostenModalOpen}
        personalkostenGesamt={personalkostenGesamt}
        personalkostenVormonat={personalkostenVormonat}
        personalkostenNachBereich={personalkostenNachBereich}
        jahr={selectedYear}
        monat={selectedMonth}
      />

      {/* F&B Erlöse Detail Modal */}
      <FBDetailModal
        open={fbModalOpen}
        onOpenChange={setFbModalOpen}
        fbGesamt={fbErloese}
        fbVormonat={fbErloeseVormonat}
        fbVorjahr={fbErloeseVorjahr}
        fbBereiche={bereichAggregationen.filter(b => 
          b.kostenarttTyp === 'Erlös' && aktiveFbBereiche.some(fb => b.bereich.includes(fb))
        )}
        jahr={selectedYear}
        monat={selectedMonth}
      />

      {/* F&B Aufwand Detail Modal */}
      <FBAufwandDetailModal
        open={fbAufwandModalOpen}
        onOpenChange={setFbAufwandModalOpen}
        fbAufwand={fbAufwand}
        fbAufwandVormonat={fbAufwandVormonat}
        fbAufwandVorjahr={fbAufwandVorjahr}
        fbErloese={fbErloese}
        fbErloeseVormonat={fbErloeseVormonat}
        fbErloeseVorjahr={fbErloeseVorjahr}
        fbBereiche={fbAufwandBereiche}
        aktiveBereiche={aktiveFbBereiche}
        onBereicheChange={handleFbBereicheChange}
        alleBereiche={alleBereiche}
        jahr={selectedYear}
        monat={selectedMonth}
      />

      {/* Aufwand Detail Modal */}
      <AufwandDetailModal
        open={aufwandModalOpen}
        onOpenChange={setAufwandModalOpen}
        aufwandGesamt={aufwandGesamt}
        aufwandVormonat={aufwandVormonat}
        aufwandVorjahr={aufwandVorjahr}
        aufwandNachKlassen={aufwandNachKlassen}
        jahr={selectedYear}
        monat={selectedMonth}
      />
    </div>
  );
}
