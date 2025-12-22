import { useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PeriodSelector } from '@/components/PeriodSelector';
import { supabase } from '@/integrations/supabase/client';
import { calculateAbteilungKpis, calculateGesamtKpis } from '@/lib/kpiCalculations';
import { formatCurrency } from '@/lib/calculations';
import { operativeAbteilungen, bereichColors } from '@/lib/bereichMapping';
import { BudgetPlanung } from '@/types/budget';
import { Bereich } from '@/types/finance';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Target,
  Save,
  TrendingUp,
  TrendingDown,
  Minus,
  Euro,
  Calculator,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const months = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function BudgetPlanungView() {
  const { konten, salden, selectedYear, selectedMonth, uploadedFiles } = useFinanceStore();
  const [budgets, setBudgets] = useState<Map<string, BudgetPlanung>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Lade aktuelle KPIs
  const abteilungKpis = useMemo(() => {
    if (konten.length === 0 || salden.length === 0) return [];
    return calculateAbteilungKpis(konten, salden, selectedYear, selectedMonth);
  }, [konten, salden, selectedYear, selectedMonth]);

  const gesamtKpis = useMemo(() => calculateGesamtKpis(abteilungKpis), [abteilungKpis]);

  // Lade Budgets aus DB
  useEffect(() => {
    loadBudgets();
  }, [selectedYear, selectedMonth]);

  const loadBudgets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('budget_planung')
        .select('*')
        .eq('jahr', selectedYear)
        .eq('monat', selectedMonth);

      if (error) throw error;

      const budgetMap = new Map<string, BudgetPlanung>();
      (data || []).forEach((b: any) => {
        budgetMap.set(b.abteilung, {
          id: b.id,
          abteilung: b.abteilung as Bereich,
          jahr: b.jahr,
          monat: b.monat,
          umsatzBudget: Number(b.umsatz_budget),
          wareneinsatzBudget: Number(b.wareneinsatz_budget),
          personalBudget: Number(b.personal_budget),
          energieBudget: Number(b.energie_budget),
          marketingBudget: Number(b.marketing_budget),
          db1Budget: Number(b.db1_budget),
          db2Budget: Number(b.db2_budget),
        });
      });
      setBudgets(budgetMap);
    } catch (error) {
      console.error('Fehler beim Laden der Budgets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBudget = (abteilung: Bereich, field: keyof BudgetPlanung, value: number) => {
    const current = budgets.get(abteilung) || {
      abteilung,
      jahr: selectedYear,
      monat: selectedMonth,
      umsatzBudget: 0,
      wareneinsatzBudget: 0,
      personalBudget: 0,
      energieBudget: 0,
      marketingBudget: 0,
      db1Budget: 0,
      db2Budget: 0,
    };
    
    const updated = { ...current, [field]: value };
    // Auto-calculate DB1 and DB2 budgets
    updated.db1Budget = updated.umsatzBudget - updated.wareneinsatzBudget;
    updated.db2Budget = updated.db1Budget - updated.personalBudget;
    
    setBudgets(new Map(budgets.set(abteilung, updated)));
    setHasChanges(true);
  };

  const saveBudgets = async () => {
    setIsLoading(true);
    try {
      for (const budget of budgets.values()) {
        const { error } = await supabase
          .from('budget_planung')
          .upsert({
            abteilung: budget.abteilung,
            jahr: selectedYear,
            monat: selectedMonth,
            umsatz_budget: budget.umsatzBudget,
            wareneinsatz_budget: budget.wareneinsatzBudget,
            personal_budget: budget.personalBudget,
            energie_budget: budget.energieBudget,
            marketing_budget: budget.marketingBudget,
            db1_budget: budget.db1Budget,
            db2_budget: budget.db2Budget,
          }, { onConflict: 'abteilung,jahr,monat' });

        if (error) throw error;
      }
      toast.success('Budgets erfolgreich gespeichert');
      setHasChanges(false);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Budgets');
    } finally {
      setIsLoading(false);
    }
  };

  const getAbweichung = (ist: number, soll: number) => {
    if (soll === 0) return { diff: 0, prozent: 0 };
    const diff = ist - soll;
    const prozent = (diff / Math.abs(soll)) * 100;
    return { diff, prozent };
  };

  const AbweichungBadge = ({ ist, soll, invert = false }: { ist: number; soll: number; invert?: boolean }) => {
    if (soll === 0) return <Badge variant="outline">-</Badge>;
    
    const { diff, prozent } = getAbweichung(ist, soll);
    const isPositive = invert ? diff < 0 : diff > 0;
    const isNegative = invert ? diff > 0 : diff < 0;
    
    return (
      <Badge 
        variant="outline"
        className={cn(
          "gap-1",
          isPositive && "border-success text-success",
          isNegative && "border-destructive text-destructive"
        )}
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : 
         isNegative ? <TrendingDown className="h-3 w-3" /> : 
         <Minus className="h-3 w-3" />}
        {prozent > 0 ? '+' : ''}{prozent.toFixed(1)}%
      </Badge>
    );
  };

  if (uploadedFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Budgetplanung" description="Soll-Ist-Vergleich für KPIs" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Target className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Keine Daten vorhanden
            </h3>
            <p className="text-muted-foreground">
              Laden Sie Ihre Saldenlisten hoch, um Budgets zu planen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Berechne Gesamt-Soll-Ist
  const gesamtBudget = {
    umsatz: Array.from(budgets.values()).reduce((sum, b) => sum + b.umsatzBudget, 0),
    db1: Array.from(budgets.values()).reduce((sum, b) => sum + b.db1Budget, 0),
    db2: Array.from(budgets.values()).reduce((sum, b) => sum + b.db2Budget, 0),
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Budgetplanung" 
        description={`Soll-Ist-Vergleich ${months[selectedMonth]} ${selectedYear}`}
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <Target className="h-3 w-3" />
              Budget {selectedYear}
            </Badge>
            {hasChanges && (
              <Badge variant="secondary" className="gap-2">
                <AlertTriangle className="h-3 w-3" />
                Ungespeicherte Änderungen
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <PeriodSelector />
            <Button onClick={saveBudgets} disabled={isLoading || !hasChanges} className="gap-2">
              <Save className="h-4 w-4" />
              Speichern
            </Button>
          </div>
        </div>

        {/* Gesamt-Übersicht */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Umsatz Gesamt</span>
                <Euro className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">IST: {formatCurrency(gesamtKpis.gesamtUmsatz)}</div>
                  <div className="text-sm text-muted-foreground">SOLL: {formatCurrency(gesamtBudget.umsatz)}</div>
                </div>
                <AbweichungBadge ist={gesamtKpis.gesamtUmsatz} soll={gesamtBudget.umsatz} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">DB I Gesamt</span>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">IST: {formatCurrency(gesamtKpis.gesamtDB1)}</div>
                  <div className="text-sm text-muted-foreground">SOLL: {formatCurrency(gesamtBudget.db1)}</div>
                </div>
                <AbweichungBadge ist={gesamtKpis.gesamtDB1} soll={gesamtBudget.db1} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">DB II Gesamt</span>
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">IST: {formatCurrency(gesamtKpis.gesamtDB2)}</div>
                  <div className="text-sm text-muted-foreground">SOLL: {formatCurrency(gesamtBudget.db2)}</div>
                </div>
                <AbweichungBadge ist={gesamtKpis.gesamtDB2} soll={gesamtBudget.db2} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget-Tabelle */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Abteilungs-Budgets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abteilung</TableHead>
                  <TableHead className="text-right">Umsatz Budget</TableHead>
                  <TableHead className="text-right">Umsatz IST</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead className="text-right">WE Budget</TableHead>
                  <TableHead className="text-right">Personal Budget</TableHead>
                  <TableHead className="text-right">DB I (berechnet)</TableHead>
                  <TableHead className="text-right">DB II (berechnet)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operativeAbteilungen.map(abt => {
                  const kpi = abteilungKpis.find(k => k.abteilung === abt);
                  const budget = budgets.get(abt);
                  const istUmsatz = kpi?.umsatz || 0;
                  const sollUmsatz = budget?.umsatzBudget || 0;
                  const { prozent } = getAbweichung(istUmsatz, sollUmsatz);
                  
                  return (
                    <TableRow key={abt}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: bereichColors[abt] }}
                          />
                          <span className="font-medium">{abt}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={budget?.umsatzBudget || 0}
                          onChange={(e) => updateBudget(abt, 'umsatzBudget', Number(e.target.value))}
                          className="w-28 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(istUmsatz)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AbweichungBadge ist={istUmsatz} soll={sollUmsatz} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={budget?.wareneinsatzBudget || 0}
                          onChange={(e) => updateBudget(abt, 'wareneinsatzBudget', Number(e.target.value))}
                          className="w-28 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={budget?.personalBudget || 0}
                          onChange={(e) => updateBudget(abt, 'personalBudget', Number(e.target.value))}
                          className="w-28 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">
                        {formatCurrency(budget?.db1Budget || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(budget?.db2Budget || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {sollUmsatz > 0 && (
                          prozent >= 0 ? (
                            <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                          ) : prozent > -10 ? (
                            <AlertTriangle className="h-5 w-5 text-warning mx-auto" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-destructive mx-auto" />
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
