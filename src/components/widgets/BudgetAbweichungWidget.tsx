import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetAbweichung {
  abteilung: string;
  umsatz_ist: number;
  umsatz_budget: number;
  umsatz_abweichung: number;
  umsatz_abweichung_pct: number;
  personal_ist: number;
  personal_budget: number;
  personal_abweichung: number;
  personal_abweichung_pct: number;
}

interface BudgetAbweichungWidgetProps {
  jahr: number;
  monat: number;
}

export function BudgetAbweichungWidget({ jahr, monat }: BudgetAbweichungWidgetProps) {
  const [abweichungen, setAbweichungen] = useState<BudgetAbweichung[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [jahr, monat]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load budget data
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_planung')
        .select('*')
        .eq('jahr', jahr)
        .eq('monat', monat);

      if (budgetError) throw budgetError;

      // Load actual KPI data
      const { data: kpiData, error: kpiError } = await supabase
        .from('abteilung_kpi_monat')
        .select('*')
        .eq('jahr', jahr)
        .eq('monat', monat);

      if (kpiError) throw kpiError;

      // Calculate deviations
      const result: BudgetAbweichung[] = [];
      
      (budgetData || []).forEach(budget => {
        const kpi = (kpiData || []).find(k => k.abteilung === budget.abteilung);
        
        const umsatz_ist = Number(kpi?.umsatz || 0);
        const umsatz_budget = Number(budget.umsatz_budget || 0);
        const personal_ist = Number(kpi?.personal || 0);
        const personal_budget = Number(budget.personal_budget || 0);

        result.push({
          abteilung: budget.abteilung,
          umsatz_ist,
          umsatz_budget,
          umsatz_abweichung: umsatz_ist - umsatz_budget,
          umsatz_abweichung_pct: umsatz_budget > 0 
            ? ((umsatz_ist - umsatz_budget) / umsatz_budget) * 100 
            : 0,
          personal_ist,
          personal_budget,
          personal_abweichung: personal_ist - personal_budget,
          personal_abweichung_pct: personal_budget > 0 
            ? ((personal_ist - personal_budget) / personal_budget) * 100 
            : 0,
        });
      });

      // Sort by largest absolute deviation
      result.sort((a, b) => 
        Math.abs(b.umsatz_abweichung_pct) - Math.abs(a.umsatz_abweichung_pct)
      );

      setAbweichungen(result);
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getAbweichungBadge = (value: number, invert = false) => {
    const isPositive = invert ? value < 0 : value > 0;
    const isNegative = invert ? value > 0 : value < 0;
    
    if (Math.abs(value) < 1) {
      return (
        <Badge variant="outline" className="gap-1">
          <Minus className="h-3 w-3" />
          {formatPercent(value)}
        </Badge>
      );
    }
    
    if (isPositive) {
      return (
        <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <TrendingUp className="h-3 w-3" />
          {formatPercent(value)}
        </Badge>
      );
    }
    
    return (
      <Badge className="gap-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <TrendingDown className="h-3 w-3" />
        {formatPercent(value)}
      </Badge>
    );
  };

  const hasWarnings = abweichungen.some(a => 
    Math.abs(a.umsatz_abweichung_pct) > 10 || Math.abs(a.personal_abweichung_pct) > 10
  );

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Budget-Abweichungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            Laden...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (abweichungen.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Budget-Abweichungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            Keine Budgetdaten für diesen Monat vorhanden
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(hasWarnings && "border-orange-200 dark:border-orange-800")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {hasWarnings && <AlertTriangle className="h-4 w-4 text-orange-500" />}
          Budget-Abweichungen (Soll-Ist)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {abweichungen.slice(0, 5).map((a) => (
            <div 
              key={a.abteilung} 
              className={cn(
                "p-3 rounded-lg border",
                (Math.abs(a.umsatz_abweichung_pct) > 10 || Math.abs(a.personal_abweichung_pct) > 10)
                  ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800"
                  : "bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{a.abteilung}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Umsatz</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">
                      {formatCurrency(a.umsatz_ist)} / {formatCurrency(a.umsatz_budget)}
                    </span>
                    {getAbweichungBadge(a.umsatz_abweichung_pct)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Personal</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">
                      {formatCurrency(a.personal_ist)} / {formatCurrency(a.personal_budget)}
                    </span>
                    {getAbweichungBadge(a.personal_abweichung_pct, true)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
