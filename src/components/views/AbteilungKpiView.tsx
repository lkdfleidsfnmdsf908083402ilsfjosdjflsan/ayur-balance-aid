import { useMemo, useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PeriodSelector } from '@/components/PeriodSelector';
import { calculateAbteilungKpis, calculateGesamtKpis } from '@/lib/kpiCalculations';
import { formatCurrency } from '@/lib/calculations';
import { bereichColors, operativeAbteilungen, serviceAbteilungen, kpiKategorieColors } from '@/lib/bereichMapping';
import { AbteilungKpi, Bereich, Konto, SaldoMonat } from '@/types/finance';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportKpiToPdf } from '@/lib/pdfExport';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Building2, 
  Utensils, 
  Sparkles, 
  Stethoscope, 
  ShoppingBag,
  Euro,
  Users,
  Package,
  Zap,
  Download,
  Calendar,
  ArrowRight,
  ChevronRight,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const abteilungIcons: Record<Bereich, React.ElementType> = {
  'Logis': Building2,
  'F&B': Utensils,
  'Rezeption': Building2,
  'Spa': Sparkles,
  'Ärztin': Stethoscope,
  'Shop': ShoppingBag,
  'Verwaltung': Building2,
  'Technik': Building2,
  'Energie': Zap,
  'Marketing': Building2,
  'Personal': Users,
  'Finanzierung': Euro,
  'Sonstiges': Package,
};

export function AbteilungKpiView() {
  const { konten, salden, selectedYear, selectedMonth, uploadedFiles } = useFinanceStore();
  const { t } = useLanguage();
  const [selectedAbteilung, setSelectedAbteilung] = useState<Bereich | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  
  // Localized months
  const monthKeys = ['', 'month.january', 'month.february', 'month.march', 'month.april', 'month.may', 'month.june', 'month.july', 'month.august', 'month.september', 'month.october', 'month.november', 'month.december'];
  
  // Aktuelle KPIs
  const abteilungKpis = useMemo(() => {
    if (konten.length === 0 || salden.length === 0) return [];
    return calculateAbteilungKpis(konten, salden, selectedYear, selectedMonth);
  }, [konten, salden, selectedYear, selectedMonth]);
  
  // Vorjahres-KPIs für Jahresvergleich
  const vorjahrKpis = useMemo(() => {
    if (konten.length === 0 || salden.length === 0) return [];
    return calculateAbteilungKpis(konten, salden, selectedYear - 1, selectedMonth);
  }, [konten, salden, selectedYear, selectedMonth]);
  
  const gesamtKpis = useMemo(() => {
    return calculateGesamtKpis(abteilungKpis);
  }, [abteilungKpis]);
  
  const gesamtKpisVorjahr = useMemo(() => {
    return calculateGesamtKpis(vorjahrKpis);
  }, [vorjahrKpis]);
  
  // Daten für das Balkendiagramm mit Vorjahresvergleich
  const chartData = useMemo(() => {
    const revCurrentKey = t('deptKpi.revenueCurrent');
    const revPYKey = t('deptKpi.revenuePY');
    const db2CurrentKey = t('deptKpi.db2Current');
    const db2PYKey = t('deptKpi.db2PY');
    
    return abteilungKpis
      .filter(k => operativeAbteilungen.includes(k.abteilung))
      .filter(k => k.umsatz > 0 || k.db1 !== 0 || k.db2 !== 0)
      .map(k => {
        const vorjahr = vorjahrKpis.find(v => v.abteilung === k.abteilung);
        return {
          name: k.abteilung,
          [revCurrentKey]: k.umsatz,
          [revPYKey]: vorjahr?.umsatz || 0,
          [db2CurrentKey]: k.db2,
          [db2PYKey]: vorjahr?.db2 || 0,
          color: bereichColors[k.abteilung],
          _revCurrent: k.umsatz, // for sorting
        };
      })
      .sort((a, b) => b._revCurrent - a._revCurrent);
  }, [abteilungKpis, vorjahrKpis, t]);

  // Daten für Drill-Down
  const drillDownData = useMemo(() => {
    if (!selectedAbteilung) return { konten: [], salden: [] };
    
    const abteilungKonten = konten.filter(k => k.bereich === selectedAbteilung);
    const abteilungSalden = salden.filter(s => 
      s.jahr === selectedYear && 
      s.monat === selectedMonth &&
      abteilungKonten.some(k => k.kontonummer === s.kontonummer)
    );
    
    return {
      konten: abteilungKonten,
      salden: abteilungSalden.map(s => {
        const konto = abteilungKonten.find(k => k.kontonummer === s.kontonummer);
        return { ...s, konto };
      }).sort((a, b) => Math.abs(b.saldoMonat) - Math.abs(a.saldoMonat))
    };
  }, [selectedAbteilung, konten, salden, selectedYear, selectedMonth]);

  // CSV Export Funktion
  const exportToCSV = () => {
    const headers = [
      'Abteilung',
      'Umsatz',
      'Wareneinsatz', 
      'DB I',
      'DB I Marge %',
      'Personal',
      'DB II',
      'DB II Marge %',
      'Energie',
      'Marketing',
      'Betriebsaufwand',
      'Umsatz Vorjahr',
      'Umsatz Δ',
      'Umsatz Δ %'
    ];

    const rows = abteilungKpis
      .filter(k => k.umsatz > 0 || k.wareneinsatz > 0 || k.personal > 0)
      .map(kpi => {
        const db1Marge = kpi.umsatz > 0 ? (kpi.db1 / kpi.umsatz) * 100 : 0;
        const db2Marge = kpi.umsatz > 0 ? (kpi.db2 / kpi.umsatz) * 100 : 0;
        
        return [
          kpi.abteilung,
          kpi.umsatz.toFixed(2),
          kpi.wareneinsatz.toFixed(2),
          kpi.db1.toFixed(2),
          db1Marge.toFixed(1),
          kpi.personal.toFixed(2),
          kpi.db2.toFixed(2),
          db2Marge.toFixed(1),
          kpi.energie.toFixed(2),
          kpi.marketing.toFixed(2),
          kpi.betriebsaufwand.toFixed(2),
          kpi.umsatzVorjahr?.toFixed(2) || '',
          kpi.umsatzDiff?.toFixed(2) || '',
          kpi.umsatzDiffProzent?.toFixed(1) || ''
        ];
      });

    // Gesamtzeile hinzufügen
    rows.push([
      'GESAMT',
      gesamtKpis.gesamtUmsatz.toFixed(2),
      gesamtKpis.gesamtWareneinsatz.toFixed(2),
      gesamtKpis.gesamtDB1.toFixed(2),
      gesamtKpis.gesamtUmsatz > 0 ? ((gesamtKpis.gesamtDB1 / gesamtKpis.gesamtUmsatz) * 100).toFixed(1) : '0',
      gesamtKpis.gesamtPersonal.toFixed(2),
      gesamtKpis.gesamtDB2.toFixed(2),
      gesamtKpis.gesamtUmsatz > 0 ? ((gesamtKpis.gesamtDB2 / gesamtKpis.gesamtUmsatz) * 100).toFixed(1) : '0',
      gesamtKpis.gesamtEnergie.toFixed(2),
      gesamtKpis.gesamtMarketing.toFixed(2),
      '',
      '',
      '',
      ''
    ]);

    const csvContent = [
      `Abteilungs-KPIs ${t(monthKeys[selectedMonth])} ${selectedYear}`,
      '',
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Abteilungs-KPIs_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
    link.click();
    
    toast.success(t('deptKpi.exportSuccess'));
  };

  const handleAbteilungClick = (abteilung: Bereich) => {
    setSelectedAbteilung(abteilung);
    setShowDrillDown(true);
  };

  if (uploadedFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title={t('deptKpi.title')} description={t('deptKpi.description')} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Euro className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t('deptKpi.noData')}
            </h3>
            <p className="text-muted-foreground">
              {t('deptKpi.uploadHint')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title={t('deptKpi.title')} 
        description={`${t('deptKpi.description')} ${t(monthKeys[selectedMonth])} ${selectedYear}`}
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header mit Export-Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <Calendar className="h-3 w-3" />
              {t(monthKeys[selectedMonth])} {selectedYear}
            </Badge>
            {vorjahrKpis.length > 0 && (
              <Badge variant="secondary" className="gap-2">
                {t('deptKpi.vs')} {selectedYear - 1}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PeriodSelector />
            <Button onClick={() => exportKpiToPdf(abteilungKpis, gesamtKpis, selectedYear, selectedMonth)} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* Gesamt-KPIs mit Vorjahresvergleich */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <GesamtKpiCard 
            title={t('deptKpi.totalRevenue')} 
            value={gesamtKpis.gesamtUmsatz}
            vorjahr={gesamtKpisVorjahr.gesamtUmsatz}
            icon={Euro}
            variant="accent"
          />
          <GesamtKpiCard 
            title={t('deptKpi.cogs')} 
            value={gesamtKpis.gesamtWareneinsatz}
            vorjahr={gesamtKpisVorjahr.gesamtWareneinsatz}
            icon={Package}
          />
          <GesamtKpiCard 
            title={t('deptKpi.db1Total')} 
            value={gesamtKpis.gesamtDB1}
            vorjahr={gesamtKpisVorjahr.gesamtDB1}
            icon={TrendingUp}
            variant={gesamtKpis.gesamtDB1 > 0 ? 'success' : 'warning'}
          />
          <GesamtKpiCard 
            title={t('deptKpi.personnel')} 
            value={gesamtKpis.gesamtPersonal}
            vorjahr={gesamtKpisVorjahr.gesamtPersonal}
            icon={Users}
          />
          <GesamtKpiCard 
            title={t('deptKpi.db2Total')} 
            value={gesamtKpis.gesamtDB2}
            vorjahr={gesamtKpisVorjahr.gesamtDB2}
            icon={TrendingUp}
            variant={gesamtKpis.gesamtDB2 > 0 ? 'success' : 'warning'}
          />
          <GesamtKpiCard 
            title={t('deptKpi.energy')} 
            value={gesamtKpis.gesamtEnergie}
            vorjahr={gesamtKpisVorjahr.gesamtEnergie}
            icon={Zap}
          />
        </div>

        {/* Jahresvergleich Chart */}
        {chartData.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {t('deptKpi.yearComparison')}: {selectedYear} {t('deptKpi.vs')} {selectedYear - 1}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey={t('deptKpi.revenueCurrent')} fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t('deptKpi.revenuePY')} fill="hsl(142, 76%, 36%, 0.3)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t('deptKpi.db2Current')} fill="hsl(280, 70%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t('deptKpi.db2PY')} fill="hsl(280, 70%, 60%, 0.3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Operative Abteilungen */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t('deptKpi.operativeDepts')}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {t('deptKpi.clickForDetails')}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {abteilungKpis
              .filter(k => operativeAbteilungen.includes(k.abteilung))
              .filter(k => k.umsatz > 0 || k.wareneinsatz > 0 || k.personal > 0)
              .sort((a, b) => b.umsatz - a.umsatz)
              .map(kpi => {
                const vorjahr = vorjahrKpis.find(v => v.abteilung === kpi.abteilung);
                return (
                  <AbteilungKpiCard 
                    key={kpi.abteilung} 
                    kpi={kpi} 
                    vorjahr={vorjahr}
                    onClick={() => handleAbteilungClick(kpi.abteilung)}
                    t={t}
                  />
                );
              })}
          </div>
        </div>

        {/* Service-Abteilungen */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('deptKpi.serviceDepts')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {abteilungKpis
              .filter(k => serviceAbteilungen.includes(k.abteilung))
              .filter(k => k.personal > 0 || k.betriebsaufwand > 0 || k.energie > 0)
              .map(kpi => (
                <ServiceKpiCard 
                  key={kpi.abteilung} 
                  kpi={kpi}
                  onClick={() => handleAbteilungClick(kpi.abteilung)}
                  t={t}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Drill-Down Sheet */}
      <Sheet open={showDrillDown} onOpenChange={setShowDrillDown}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedAbteilung && (
                <>
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${bereichColors[selectedAbteilung]}20` }}
                  >
                    {(() => {
                      const Icon = abteilungIcons[selectedAbteilung] || Building2;
                      return <Icon className="h-4 w-4" style={{ color: bereichColors[selectedAbteilung] }} />;
                    })()}
                  </div>
                  {selectedAbteilung} - {t('deptKpi.accountDetails')}
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {t(monthKeys[selectedMonth])} {selectedYear} · {drillDownData.salden.length} {t('deptKpi.accountsWithBalance')}
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-150px)] mt-6">
            <div className="space-y-2 pr-4">
              {drillDownData.salden.map((saldo: any) => (
                <div 
                  key={saldo.kontonummer}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{saldo.kontonummer}</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: kpiKategorieColors[saldo.konto?.kpiKategorie as keyof typeof kpiKategorieColors] || 'hsl(var(--border))',
                          color: kpiKategorieColors[saldo.konto?.kpiKategorie as keyof typeof kpiKategorieColors] || 'inherit'
                        }}
                      >
                        {saldo.konto?.kpiKategorie || 'Sonstiges'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {saldo.konto?.kontobezeichnung || 'Unbekannt'}
                    </p>
                  </div>
                  <span className={cn(
                    "font-semibold tabular-nums",
                    saldo.saldoMonat < 0 ? "text-success" : "text-foreground"
                  )}>
                    {formatCurrency(Math.abs(saldo.saldoMonat))}
                  </span>
                </div>
              ))}
              
              {drillDownData.salden.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Kontensalden für diesen Zeitraum
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function GesamtKpiCard({ 
  title, 
  value,
  vorjahr,
  icon: Icon,
  variant = 'default' 
}: { 
  title: string; 
  value: number;
  vorjahr?: number;
  icon: React.ElementType;
  variant?: 'default' | 'accent' | 'success' | 'warning';
}) {
  const diff = vorjahr && vorjahr !== 0 ? ((value - vorjahr) / vorjahr) * 100 : null;
  
  return (
    <Card className={cn(
      "glass-card transition-all hover:scale-[1.02]",
      variant === 'accent' && "border-primary/30 bg-primary/5",
      variant === 'success' && "border-success/30 bg-success/5",
      variant === 'warning' && "border-warning/30 bg-warning/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn(
            "h-4 w-4",
            variant === 'accent' && "text-primary",
            variant === 'success' && "text-success",
            variant === 'warning' && "text-warning"
          )} />
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        <p className={cn(
          "text-lg font-bold",
          variant === 'success' && value > 0 && "text-success",
          variant === 'warning' && value < 0 && "text-warning"
        )}>
          {formatCurrency(value)}
        </p>
        {diff !== null && (
          <div className={cn(
            "flex items-center gap-1 text-xs mt-1",
            diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            <span>{diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs. Vorjahr</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AbteilungKpiCard({ kpi, vorjahr, onClick, t }: { kpi: AbteilungKpi; vorjahr?: AbteilungKpi; onClick: () => void; t: (key: string) => string }) {
  const Icon = abteilungIcons[kpi.abteilung] || Building2;
  const db1Marge = kpi.umsatz > 0 ? (kpi.db1 / kpi.umsatz) * 100 : 0;
  const db2Marge = kpi.umsatz > 0 ? (kpi.db2 / kpi.umsatz) * 100 : 0;
  
  const umsatzDiff = vorjahr && vorjahr.umsatz > 0 ? ((kpi.umsatz - vorjahr.umsatz) / vorjahr.umsatz) * 100 : null;
  const db2Diff = vorjahr && vorjahr.db2 !== 0 ? kpi.db2 - vorjahr.db2 : null;
  
  return (
    <Card 
      className="glass-card hover:border-primary/30 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${bereichColors[kpi.abteilung]}20` }}
            >
              <Icon className="h-4 w-4" style={{ color: bereichColors[kpi.abteilung] }} />
            </div>
            <CardTitle className="text-base">{kpi.abteilung}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {umsatzDiff !== null && <DiffBadge value={umsatzDiff} />}
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Umsatz mit Vorjahr */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-muted-foreground">{t('deptKpi.revenue')}</span>
            {vorjahr && vorjahr.umsatz > 0 && (
              <span className="text-xs text-muted-foreground/70 ml-2">
                ({t('deptKpi.pyShort')}: {formatCurrency(vorjahr.umsatz)})
              </span>
            )}
          </div>
          <span className="font-semibold text-success">{formatCurrency(kpi.umsatz)}</span>
        </div>
        
        {/* Wareneinsatz */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('deptKpi.cogs')}</span>
          <span className="font-medium text-warning">- {formatCurrency(kpi.wareneinsatz)}</span>
        </div>
        
        {/* DB I */}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('deptKpi.db1')}</span>
            <Badge variant="outline" className="text-xs">
              {db1Marge.toFixed(1)}%
            </Badge>
          </div>
          <span className={cn(
            "font-bold",
            kpi.db1 > 0 ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(kpi.db1)}
          </span>
        </div>
        
        {/* Personal */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('deptKpi.personnel')}</span>
          <span className="font-medium text-warning">- {formatCurrency(kpi.personal)}</span>
        </div>
        
        {/* DB II mit Vorjahresvergleich */}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('deptKpi.db2')}</span>
            <Badge variant="outline" className="text-xs">
              {db2Marge.toFixed(1)}%
            </Badge>
          </div>
          <div className="text-right">
            <span className={cn(
              "font-bold text-lg",
              kpi.db2 > 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(kpi.db2)}
            </span>
            {db2Diff !== null && (
              <div className={cn(
                "text-xs flex items-center justify-end gap-1",
                db2Diff > 0 ? "text-success" : db2Diff < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {db2Diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {db2Diff > 0 ? '+' : ''}{formatCurrency(db2Diff)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceKpiCard({ kpi, onClick, t }: { kpi: AbteilungKpi; onClick: () => void; t: (key: string) => string }) {
  const Icon = abteilungIcons[kpi.abteilung] || Building2;
  const totalKosten = kpi.personal + kpi.betriebsaufwand + kpi.energie + kpi.marketing;
  
  return (
    <Card 
      className="glass-card hover:border-primary/30 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${bereichColors[kpi.abteilung]}20` }}
            >
              <Icon className="h-4 w-4" style={{ color: bereichColors[kpi.abteilung] }} />
            </div>
            <CardTitle className="text-base">{kpi.abteilung}</CardTitle>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {kpi.personal > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('deptKpi.personnel')}</span>
            <span className="font-medium">{formatCurrency(kpi.personal)}</span>
          </div>
        )}
        {kpi.betriebsaufwand > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('deptKpi.operatingExpenses')}</span>
            <span className="font-medium">{formatCurrency(kpi.betriebsaufwand)}</span>
          </div>
        )}
        {kpi.energie > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('deptKpi.energy')}</span>
            <span className="font-medium">{formatCurrency(kpi.energie)}</span>
          </div>
        )}
        {kpi.marketing > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('deptKpi.marketing')}</span>
            <span className="font-medium">{formatCurrency(kpi.marketing)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-medium">{t('deptKpi.total')}</span>
          <span className="font-bold">{formatCurrency(totalKosten)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DiffBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : value < 0 ? TrendingDown : Minus;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs",
        isPositive && "border-success/50 text-success bg-success/10",
        value < 0 && "border-destructive/50 text-destructive bg-destructive/10"
      )}
    >
      <Icon className="h-3 w-3 mr-1" />
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </Badge>
  );
}
