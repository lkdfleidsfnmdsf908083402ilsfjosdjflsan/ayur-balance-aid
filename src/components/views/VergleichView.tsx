import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { Bereich } from '@/types/finance';
import { bereichColors } from '@/lib/bereichMapping';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateBereich, translateKostenarttTyp } from '@/lib/translationMappings';

const allBereiche: Bereich[] = [
  'Logis', 'F&B', 'Spa', 'Ärztin', 'Shop',
  'Verwaltung', 'Technik', 'Energie', 'Marketing', 'Personal', 'Finanzierung', 'Sonstiges'
];

export function VergleichView() {
  const { vergleiche, selectedYear, selectedMonth } = useFinanceStore();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [bereichFilter, setBereichFilter] = useState<string>('alle');
  const [typFilter, setTypFilter] = useState<string>('alle');
  
  const filteredVergleiche = useMemo(() => {
    return vergleiche
      .filter(v => {
        const matchesSearch = 
          v.kontonummer.toLowerCase().includes(search.toLowerCase()) ||
          v.kontobezeichnung.toLowerCase().includes(search.toLowerCase());
        
        const matchesBereich = bereichFilter === 'alle' || v.bereich === bereichFilter;
        const matchesTyp = typFilter === 'alle' || v.kostenarttTyp === typFilter;
        
        return matchesSearch && matchesBereich && matchesTyp;
      })
      .sort((a, b) => a.kontonummer.localeCompare(b.kontonummer, undefined, { numeric: true }));
  }, [vergleiche, search, bereichFilter, typFilter]);
  
  const monthKeys = ['', 'month.january', 'month.february', 'month.march', 'month.april', 'month.may', 'month.june', 'month.july', 'month.august', 'month.september', 'month.october', 'month.november', 'month.december'];

  function DiffCell({ diff, percent }: { diff: number | null; percent: number | null }) {
    if (diff === null) return <span className="text-muted-foreground">–</span>;
    
    const isPositive = diff > 0;
    const isNegative = diff < 0;
    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    
    return (
      <div className={cn(
        "flex items-center gap-1",
        isPositive && "text-success",
        isNegative && "text-destructive",
        !isPositive && !isNegative && "text-muted-foreground"
      )}>
        <Icon className="h-3 w-3" />
        <span className="font-mono text-xs">{formatPercent(percent)}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title={t('comparison.title')} 
        description={`${t('comparison.description')} ${t(monthKeys[selectedMonth])} ${selectedYear} ${t('comparison.vsPMAndPY')}`} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('comparison.searchAccount')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted border-border"
            />
          </div>
          
          <Select value={bereichFilter} onValueChange={setBereichFilter}>
            <SelectTrigger className="w-48 bg-muted border-border">
              <SelectValue placeholder={t('comparison.allAreas')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">{t('comparison.allAreas')}</SelectItem>
              {allBereiche.map(b => (
                <SelectItem key={b} value={b}>{translateBereich(b, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={typFilter} onValueChange={setTypFilter}>
            <SelectTrigger className="w-40 bg-muted border-border">
              <SelectValue placeholder={t('comparison.allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">{t('comparison.allTypes')}</SelectItem>
              <SelectItem value="Erlös">{translateKostenarttTyp('Erlös', t)}</SelectItem>
              <SelectItem value="Einkauf">{translateKostenarttTyp('Einkauf', t)}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-border touch-pan-x touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">{t('comparison.account')}</th>
                <th className="p-4 font-medium">{t('comparison.designation')}</th>
                <th className="p-4 font-medium text-right">{t('comparison.current')}</th>
                <th className="p-4 font-medium text-right">{t('comparison.prevMonth')}</th>
                <th className="p-4 font-medium text-center">{t('comparison.pmDiff')}</th>
                <th className="p-4 font-medium text-right">{t('comparison.prevYear')}</th>
                <th className="p-4 font-medium text-center">{t('comparison.pyDiff')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVergleiche.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {vergleiche.length === 0 
                      ? t('comparison.noData')
                      : t('comparison.noDataFiltered')}
                  </td>
                </tr>
              ) : (
                filteredVergleiche.map((v) => (
                  <tr 
                    key={`${v.kontonummer}-${v.jahr}-${v.monat}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4 font-mono text-sm text-foreground">
                      {v.kontonummer}
                    </td>
                    <td className="p-4 text-sm">
                      <div className="text-foreground">{v.kontobezeichnung}</div>
                      <div 
                        className="text-xs mt-0.5"
                        style={{ color: bereichColors[v.bereich] }}
                      >
                        {v.bereich}
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-foreground">
                      {formatCurrency(v.saldoAktuell)}
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(v.saldoVormonat)}
                    </td>
                    <td className="p-4 text-center">
                      <DiffCell diff={v.saldoVormonatDiff} percent={v.saldoVormonatDiffProzent} />
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(v.saldoVorjahr)}
                    </td>
                    <td className="p-4 text-center">
                      <DiffCell diff={v.saldoVorjahrDiff} percent={v.saldoVorjahrDiffProzent} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredVergleiche.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {filteredVergleiche.length} {t('comparison.ofPositions')} {vergleiche.length} {t('comparison.positionsShown')}
          </div>
        )}
      </div>
    </div>
  );
}
