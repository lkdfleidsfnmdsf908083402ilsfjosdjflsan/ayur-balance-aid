import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { BereichChart } from '@/components/charts/BereichChart';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { bereichColors } from '@/lib/bereichMapping';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateBereich } from '@/lib/translationMappings';

export function BereicheView() {
  const { bereichAggregationen, selectedYear, selectedMonth } = useFinanceStore();
  const { t } = useLanguage();
  
  const erlöse = bereichAggregationen.filter(b => b.kostenarttTyp === 'Erlös');
  const einkauf = bereichAggregationen.filter(b => b.kostenarttTyp === 'Einkauf');
  
  const monthKeys = ['', 'month.january', 'month.february', 'month.march', 'month.april', 'month.may', 'month.june', 'month.july', 'month.august', 'month.september', 'month.october', 'month.november', 'month.december'];

  function DiffIndicator({ diff, percent }: { diff: number | null; percent: number | null }) {
    if (diff === null) return <span className="text-muted-foreground text-sm">–</span>;
    
    const isPositive = diff > 0;
    const isNegative = diff < 0;
    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-sm",
        isPositive && "text-success",
        isNegative && "text-destructive",
        !isPositive && !isNegative && "text-muted-foreground"
      )}>
        <Icon className="h-3 w-3" />
        <span className="font-mono">{formatPercent(percent)}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title={t('areas.title')} 
        description={`${t('areas.description')} – ${t(monthKeys[selectedMonth])} ${selectedYear}`} 
      />
      
      <div className="flex-1 overflow-auto p-6">
        {bereichAggregationen.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {t('areas.noData')}
          </div>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <BereichChart data={erlöse} title={t('areas.revenueByArea')} type="erlös" translateFn={t} />
              <BereichChart data={einkauf} title={t('areas.expensesByArea')} type="einkauf" translateFn={t} />
            </div>
            
            {/* Detail Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Erlöse Table */}
              <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-success/5">
                  <h3 className="font-medium text-foreground">{t('areas.revenueByArea')}</h3>
                </div>
                <div className="divide-y divide-border">
                  {erlöse.map(b => (
                    <div key={`${b.bereich}-erlös`} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bereichColors[b.bereich] }}
                        />
                        <span className="text-sm text-foreground">{translateBereich(b.bereich, t)}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-foreground">
                          {formatCurrency(Math.abs(b.saldoAktuell))}
                        </div>
                        <DiffIndicator diff={b.saldoVormonatDiff} percent={b.saldoVormonatDiffProzent} />
                      </div>
                    </div>
                  ))}
                  {erlöse.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {t('areas.noRevenueData')}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Einkauf Table */}
              <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-destructive/5">
                  <h3 className="font-medium text-foreground">{t('areas.expensesByArea')}</h3>
                </div>
                <div className="divide-y divide-border">
                  {einkauf.map(b => (
                    <div key={`${b.bereich}-einkauf`} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bereichColors[b.bereich] }}
                        />
                        <span className="text-sm text-foreground">{translateBereich(b.bereich, t)}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-foreground">
                          {formatCurrency(Math.abs(b.saldoAktuell))}
                        </div>
                        <DiffIndicator diff={b.saldoVormonatDiff} percent={b.saldoVormonatDiffProzent} />
                      </div>
                    </div>
                  ))}
                  {einkauf.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {t('areas.noExpenseData')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
