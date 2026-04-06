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
import { Bereich } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Target, Save, TrendingUp, TrendingDown, Minus,
  Euro, Calculator, AlertTriangle, CheckCircle2,
  Calendar, CalendarDays,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';

interface BudgetRow {
  id?: string;
  abteilung: Bereich;
  jahr: number;
  monat: number | null; // null = Jahresbudget
  umsatzBudget: number;
  wareneinsatzBudget: number;
  personalBudget: number;
  energieBudget: number;
  marketingBudget: number;
  betriebsaufwandBudget: number;
  db1Budget: number;
  db2Budget: number;
  gop2Budget: number;
}

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function calcDerived(row: BudgetRow): BudgetRow {
  const db1 = row.umsatzBudget - row.wareneinsatzBudget;
  const db2 = db1 - row.personalBudget;
  const gop2 = db2 - row.energieBudget - row.marketingBudget - row.betriebsaufwandBudget;
  return { ...row, db1Budget: db1, db2Budget: db2, gop2Budget: gop2 };
}

function emptyRow(abteilung: Bereich, jahr: number, monat: number | null): BudgetRow {
  return {
    abteilung, jahr, monat,
    umsatzBudget: 0, wareneinsatzBudget: 0, personalBudget: 0,
    energieBudget: 0, marketingBudget: 0, betriebsaufwandBudget: 0,
    db1Budget: 0, db2Budget: 0, gop2Budget: 0,
  };
}

export function BudgetPlanungView() {
  const { konten, salden, selectedYear, selectedMonth, uploadedFiles } = useFinanceStore();
  const { t } = useLanguage();
  const { canEdit } = useAuth();
  const [activeTab, setActiveTab] = useState<'monat' | 'jahr'>('monat');
  const [monatsBudgets, setMonatsBudgets] = useState<Map<string, BudgetRow>>(new Map());
  const [jahresBudgets, setJahresBudgets] = useState<Map<string, BudgetRow>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Aktuelle IST-KPIs
  const abteilungKpis = useMemo(() => {
    if (konten.length === 0 || salden.length === 0) return [];
    return calculateAbteilungKpis(konten, salden, selectedYear, selectedMonth);
  }, [konten, salden, selectedYear, selectedMonth]);

  const gesamtKpis = useMemo(() => calculateGesamtKpis(abteilungKpis), [abteilungKpis]);

  // Jahres-IST (alle Monate summiert)
  const jahresIst = useMemo(() => {
    const result = new Map<string, { umsatz: number; wareneinsatz: number; personal: number; db1: number; db2: number }>();
    for (const abt of operativeAbteilungen) {
      let u = 0, we = 0, p = 0;
      for (let m = 1; m <= 12; m++) {
        const kpis = calculateAbteilungKpis(konten, salden, selectedYear, m);
        const k = kpis.find(k => k.abteilung === abt);
        if (k) { u += k.umsatz; we += k.wareneinsatz; p += k.personal; }
      }
      result.set(abt, { umsatz: u, wareneinsatz: we, personal: p, db1: u - we, db2: u - we - p });
    }
    return result;
  }, [konten, salden, selectedYear]);

  useEffect(() => { loadBudgets(); }, [selectedYear, selectedMonth]);

  const loadBudgets = async () => {
    setIsLoading(true);
    try {
      // Monatsbudgets
      const { data: mData } = await supabase
        .from('budget_planung')
        .select('*')
        .eq('jahr', selectedYear)
        .eq('monat', selectedMonth);

      const mMap = new Map<string, BudgetRow>();
      (mData || []).forEach((b: any) => {
        mMap.set(b.abteilung, {
          id: b.id,
          abteilung: b.abteilung as Bereich,
          jahr: b.jahr,
          monat: b.monat,
          umsatzBudget: Number(b.umsatz_budget),
          wareneinsatzBudget: Number(b.wareneinsatz_budget),
          personalBudget: Number(b.personal_budget),
          energieBudget: Number(b.energie_budget),
          marketingBudget: Number(b.marketing_budget),
          betriebsaufwandBudget: Number(b.betriebsaufwand_budget || 0),
          db1Budget: Number(b.db1_budget),
          db2Budget: Number(b.db2_budget),
          gop2Budget: Number(b.gop2_budget || 0),
        });
      });
      setMonatsBudgets(mMap);

      // Jahresbudgets (monat = null)
      const { data: jData } = await supabase
        .from('budget_planung')
        .select('*')
        .eq('jahr', selectedYear)
        .is('monat', null);

      const jMap = new Map<string, BudgetRow>();
      (jData || []).forEach((b: any) => {
        jMap.set(b.abteilung, {
          id: b.id,
          abteilung: b.abteilung as Bereich,
          jahr: b.jahr,
          monat: null,
          umsatzBudget: Number(b.umsatz_budget),
          wareneinsatzBudget: Number(b.wareneinsatz_budget),
          personalBudget: Number(b.personal_budget),
          energieBudget: Number(b.energie_budget),
          marketingBudget: Number(b.marketing_budget),
          betriebsaufwandBudget: Number(b.betriebsaufwand_budget || 0),
          db1Budget: Number(b.db1_budget),
          db2Budget: Number(b.db2_budget),
          gop2Budget: Number(b.gop2_budget || 0),
        });
      });
      setJahresBudgets(jMap);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRow = (
    abteilung: Bereich,
    field: keyof BudgetRow,
    value: number,
    isJahr: boolean
  ) => {
    const map = isJahr ? jahresBudgets : monatsBudgets;
    const setMap = isJahr ? setJahresBudgets : setMonatsBudgets;
    const current = map.get(abteilung) || emptyRow(abteilung, selectedYear, isJahr ? null : selectedMonth);
    const updated = calcDerived({ ...current, [field]: value });
    setMap(new Map(map.set(abteilung, updated)));
    setHasChanges(true);
  };

  const saveBudgets = async () => {
    setIsLoading(true);
    try {
      const allBudgets = [
        ...Array.from(monatsBudgets.values()),
        ...Array.from(jahresBudgets.values()),
      ];
      for (const b of allBudgets) {
        await supabase.from('budget_planung').upsert({
          abteilung: b.abteilung,
          jahr: b.jahr,
          monat: b.monat,
          umsatz_budget: b.umsatzBudget,
          wareneinsatz_budget: b.wareneinsatzBudget,
          personal_budget: b.personalBudget,
          energie_budget: b.energieBudget,
          marketing_budget: b.marketingBudget,
          betriebsaufwand_budget: b.betriebsaufwandBudget,
          db1_budget: b.db1Budget,
          db2_budget: b.db2Budget,
          gop2_budget: b.gop2Budget,
        }, { onConflict: 'abteilung,jahr,monat' });
      }
      toast.success('Budget gespeichert!');
      setHasChanges(false);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsLoading(false);
    }
  };

  const AbweichungBadge = ({ ist, soll, invert = false }: { ist: number; soll: number; invert?: boolean }) => {
    if (soll === 0) return <Badge variant="outline">-</Badge>;
    const diff = ist - soll;
    const prozent = (diff / Math.abs(soll)) * 100;
    const isPositive = invert ? diff < 0 : diff > 0;
    const isNegative = invert ? diff > 0 : diff < 0;
    return (
      <Badge variant="outline" className={cn(
        "gap-1 text-xs",
        isPositive && "border-green-500 text-green-600",
        isNegative && "border-red-500 text-red-600"
      )}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {prozent > 0 ? '+' : ''}{prozent.toFixed(1)}%
      </Badge>
    );
  };

  const pct = (part: number, total: number) =>
    total > 0 ? ((part / total) * 100).toFixed(1) + '%' : '-';

  const BudgetTabelle = ({ isJahr }: { isJahr: boolean }) => {
    const budgets = isJahr ? jahresBudgets : monatsBudgets;
    const gesamtSollUmsatz = Array.from(budgets.values()).reduce((s, b) => s + b.umsatzBudget, 0);
    const gesamtSollDB2 = Array.from(budgets.values()).reduce((s, b) => s + b.db2Budget, 0);
    const gesamtSollGOP2 = Array.from(budgets.values()).reduce((s, b) => s + b.gop2Budget, 0);

    return (
      <div className="space-y-6">
        {/* Gesamt-Übersicht */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Euro className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Umsatz Gesamt</span>
              </div>
              <div className="text-base font-bold">IST: {formatCurrency(isJahr ? Array.from(jahresIst.values()).reduce((s, k) => s + k.umsatz, 0) : gesamtKpis.gesamtUmsatz)}</div>
              <div className="text-xs text-muted-foreground">SOLL: {formatCurrency(gesamtSollUmsatz)}</div>
              <AbweichungBadge ist={isJahr ? Array.from(jahresIst.values()).reduce((s, k) => s + k.umsatz, 0) : gesamtKpis.gesamtUmsatz} soll={gesamtSollUmsatz} />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">DB II Gesamt</span>
              </div>
              <div className="text-base font-bold">IST: {formatCurrency(isJahr ? Array.from(jahresIst.values()).reduce((s, k) => s + k.db2, 0) : gesamtKpis.gesamtDB2)}</div>
              <div className="text-xs text-muted-foreground">SOLL: {formatCurrency(gesamtSollDB2)}</div>
              <AbweichungBadge ist={isJahr ? Array.from(jahresIst.values()).reduce((s, k) => s + k.db2, 0) : gesamtKpis.gesamtDB2} soll={gesamtSollDB2} />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">GOP II Gesamt</span>
              </div>
              <div className="text-base font-bold">IST: {formatCurrency(isJahr ? gesamtKpis.gop2 : gesamtKpis.gop2)}</div>
              <div className="text-xs text-muted-foreground">SOLL: {formatCurrency(gesamtSollGOP2)}</div>
              <AbweichungBadge ist={gesamtKpis.gop2} soll={gesamtSollGOP2} />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">GOP II Marge</span>
              </div>
              <div className="text-base font-bold">IST: {gesamtKpis.gop2Marge.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">
                SOLL: {pct(gesamtSollGOP2, gesamtSollUmsatz)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget-Tabelle */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" />
              {isJahr ? `Jahresbudget ${selectedYear}` : `Monatsbudget ${MONATE[selectedMonth - 1]} ${selectedYear}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abteilung</TableHead>
                  <TableHead className="text-right">Umsatz Budget</TableHead>
                  <TableHead className="text-right">Umsatz IST</TableHead>
                  <TableHead className="text-right">Δ Umsatz</TableHead>
                  <TableHead className="text-right">WE Budget</TableHead>
                  <TableHead className="text-right">WE %</TableHead>
                  <TableHead className="text-right">Personal Budget</TableHead>
                  <TableHead className="text-right">Personal %</TableHead>
                  <TableHead className="text-right">Energie</TableHead>
                  <TableHead className="text-right">Marketing</TableHead>
                  <TableHead className="text-right">Betriebs-aufwand</TableHead>
                  <TableHead className="text-right">DB I</TableHead>
                  <TableHead className="text-right">DB II</TableHead>
                  <TableHead className="text-right">GOP II</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operativeAbteilungen.map(abt => {
                  const kpi = isJahr ? jahresIst.get(abt) : abteilungKpis.find(k => k.abteilung === abt);
                  const budget = budgets.get(abt) || emptyRow(abt, selectedYear, isJahr ? null : selectedMonth);
                  const istUmsatz = kpi?.umsatz || 0;
                  const sollUmsatz = budget.umsatzBudget;
                  const abw = sollUmsatz > 0 ? ((istUmsatz - sollUmsatz) / sollUmsatz) * 100 : 0;

                  return (
                    <TableRow key={abt}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bereichColors[abt] }} />
                          <span className="font-medium text-sm">{abt}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={budget.umsatzBudget || ''}
                          onChange={e => updateRow(abt, 'umsatzBudget', Number(e.target.value), isJahr)}
                          className="w-28 text-right h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(istUmsatz)}</TableCell>
                      <TableCell className="text-right">
                        <AbweichungBadge ist={istUmsatz} soll={sollUmsatz} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={budget.wareneinsatzBudget || ''}
                          onChange={e => updateRow(abt, 'wareneinsatzBudget', Number(e.target.value), isJahr)}
                          className="w-24 text-right h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {pct(budget.wareneinsatzBudget, budget.umsatzBudget)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={budget.personalBudget || ''}
                          onChange={e => updateRow(abt, 'personalBudget', Number(e.target.value), isJahr)}
                          className="w-24 text-right h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {pct(budget.personalBudget, budget.umsatzBudget)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={budget.energieBudget || ''}
                          onChange={e => updateRow(abt, 'energieBudget', Number(e.target.value), isJahr)}
                          className="w-24 text-right h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={budget.marketingBudget || ''}
                          onChange={e => updateRow(abt, 'marketingBudget', Number(e.target.value), isJahr)}
                          className="w-24 text-right h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={budget.betriebsaufwandBudget || ''}
                          onChange={e => updateRow(abt, 'betriebsaufwandBudget', Number(e.target.value), isJahr)}
                          className="w-24 text-right h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">
                        {formatCurrency(budget.db1Budget)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-blue-600">
                        {formatCurrency(budget.db2Budget)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-purple-600">
                        {formatCurrency(budget.gop2Budget)}
                      </TableCell>
                      <TableCell className="text-center">
                        {sollUmsatz > 0 && (
                          abw >= 0 ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                          ) : abw > -10 ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-500 mx-auto" />
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Summenzeile */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>GESAMT</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(Array.from(budgets.values()).reduce((s, b) => s + b.umsatzBudget, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(isJahr ? Array.from(jahresIst.values()).reduce((s, k) => s + k.umsatz, 0) : gesamtKpis.gesamtUmsatz)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(Array.from(budgets.values()).reduce((s, b) => s + b.wareneinsatzBudget, 0))}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {pct(
                      Array.from(budgets.values()).reduce((s, b) => s + b.wareneinsatzBudget, 0),
                      Array.from(budgets.values()).reduce((s, b) => s + b.umsatzBudget, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(Array.from(budgets.values()).reduce((s, b) => s + b.personalBudget, 0))}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {pct(
                      Array.from(budgets.values()).reduce((s, b) => s + b.personalBudget, 0),
                      Array.from(budgets.values()).reduce((s, b) => s + b.umsatzBudget, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(Array.from(budgets.values()).reduce((s, b) => s + b.energieBudget, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(Array.from(budgets.values()).reduce((s, b) => s + b.marketingBudget, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(Array.from(budgets.values()).reduce((s, b) => s + b.betriebsaufwandBudget, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-green-600">
                    {formatCurrency(Array.from(budgets.values()).reduce((s, b) => s + b.db1Budget, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-blue-600">
                    {formatCurrency(Array.from(budgets.values()).reduce((s, b) => s + b.db2Budget, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-purple-600">
                    {formatCurrency(Array.from(budgets.values()).reduce((s, b) => s + b.gop2Budget, 0))}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Jahresübersicht Monate */}
        {isJahr && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-5 w-5 text-primary" />
                Monatsübersicht {selectedYear} — Umsatz IST vs. Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Monat</TableHead>
                    {operativeAbteilungen.map(abt => (
                      <TableHead key={abt} className="text-right text-xs">{abt}</TableHead>
                    ))}
                    <TableHead className="text-right font-semibold">Gesamt IST</TableHead>
                    <TableHead className="text-right font-semibold">Gesamt SOLL</TableHead>
                    <TableHead className="text-right">Δ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MONATE.map((mName, idx) => {
                    const m = idx + 1;
                    const mKpis = calculateAbteilungKpis(konten, salden, selectedYear, m);
                    const mIst = mKpis.filter(k => operativeAbteilungen.includes(k.abteilung)).reduce((s, k) => s + k.umsatz, 0);
                    const mSoll = 0; // Monatsbudgets müssten separat geladen werden
                    return (
                      <TableRow key={m} className={m === selectedMonth ? 'bg-primary/5' : ''}>
                        <TableCell className="font-medium text-sm">{mName}</TableCell>
                        {operativeAbteilungen.map(abt => {
                          const k = mKpis.find(k => k.abteilung === abt);
                          return (
                            <TableCell key={abt} className="text-right font-mono text-xs">
                              {formatCurrency(k?.umsatz || 0)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(mIst)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">-</TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  })}
                  {/* Jahressumme */}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell>JAHR {selectedYear}</TableCell>
                    {operativeAbteilungen.map(abt => {
                      const k = jahresIst.get(abt);
                      return (
                        <TableCell key={abt} className="text-right font-mono text-xs">
                          {formatCurrency(k?.umsatz || 0)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(Array.from(jahresIst.values()).reduce((s, k) => s + k.umsatz, 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(Array.from(jahresBudgets.values()).reduce((s, b) => s + b.umsatzBudget, 0))}
                    </TableCell>
                    <TableCell>
                      <AbweichungBadge
                        ist={Array.from(jahresIst.values()).reduce((s, k) => s + k.umsatz, 0)}
                        soll={Array.from(jahresBudgets.values()).reduce((s, b) => s + b.umsatzBudget, 0)}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Budgetplanung"
        description={`Monats- & Jahresbudget ${selectedYear}`}
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="secondary" className="gap-2">
                <AlertTriangle className="h-3 w-3" />
                Ungespeicherte Änderungen
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector />
            <Button onClick={saveBudgets} disabled={!canEdit || isLoading || !hasChanges} className="gap-2">
              <Save className="h-4 w-4" />
              Speichern
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'monat' | 'jahr')}>
          <TabsList>
            <TabsTrigger value="monat" className="gap-2">
              <Calendar className="h-4 w-4" />
              Monatsbudget
            </TabsTrigger>
            <TabsTrigger value="jahr" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Jahresbudget {selectedYear}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="monat" className="mt-6">
            <BudgetTabelle isJahr={false} />
          </TabsContent>
          <TabsContent value="jahr" className="mt-6">
            <BudgetTabelle isJahr={true} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
