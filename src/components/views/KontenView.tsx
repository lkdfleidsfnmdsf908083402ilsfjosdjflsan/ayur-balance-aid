import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bereich, KostenarttTyp, KpiKategorie } from '@/types/finance';
import { bereichColors, kpiKategorieColors } from '@/lib/bereichMapping';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateBereich, translateKpiKategorie, translateKostenarttTyp } from '@/lib/translationMappings';

const allBereiche: Bereich[] = [
  'Logis', 'F&B', 'Rezeption', 'Spa', 'Ärztin', 'Shop',
  'Verwaltung', 'Technik', 'Energie', 'Marketing', 'Personal', 'Finanzierung', 'Sonstiges'
];

const allKpiKategorien: KpiKategorie[] = [
  'Erlös', 'Wareneinsatz', 'Personal', 'Betriebsaufwand', 
  'Energie', 'Marketing', 'Abschreibung', 'Zins', 'Sonstiges'
];

interface EditedKonto {
  bereich?: Bereich;
  kpiKategorie?: KpiKategorie;
}

export function KontenView() {
  const { konten, initialize } = useFinanceStore();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [bereichFilter, setBereichFilter] = useState<string>('alle');
  const [typFilter, setTypFilter] = useState<string>('alle');
  const [kpiFilter, setKpiFilter] = useState<string>('alle');
  const [editedKonten, setEditedKonten] = useState<Record<string, EditedKonto>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const filteredKonten = useMemo(() => {
    return konten
      .filter(konto => {
        const matchesSearch = 
          konto.kontonummer.toLowerCase().includes(search.toLowerCase()) ||
          konto.kontobezeichnung.toLowerCase().includes(search.toLowerCase());
        
        const matchesBereich = bereichFilter === 'alle' || konto.bereich === bereichFilter;
        const matchesTyp = typFilter === 'alle' || konto.kostenarttTyp === typFilter;
        const matchesKpi = kpiFilter === 'alle' || konto.kpiKategorie === kpiFilter;
        
        return matchesSearch && matchesBereich && matchesTyp && matchesKpi;
      })
      .sort((a, b) => a.kontonummer.localeCompare(b.kontonummer, undefined, { numeric: true }));
  }, [konten, search, bereichFilter, typFilter, kpiFilter]);
  
  const sonstigeKonten = konten.filter(k => k.bereich === 'Sonstiges');
  const hasChanges = Object.keys(editedKonten).length > 0;
  const changesCount = Object.values(editedKonten).reduce((sum, e) => 
    sum + (e.bereich ? 1 : 0) + (e.kpiKategorie ? 1 : 0), 0
  );

  const handleBereichChange = (kontonummer: string, newBereich: Bereich) => {
    const originalKonto = konten.find(k => k.kontonummer === kontonummer);
    
    setEditedKonten(prev => {
      const existing = prev[kontonummer] || {};
      
      if (originalKonto?.bereich === newBereich) {
        const { bereich, ...rest } = existing;
        if (Object.keys(rest).length === 0) {
          const { [kontonummer]: removed, ...others } = prev;
          return others;
        }
        return { ...prev, [kontonummer]: rest };
      }
      
      return { ...prev, [kontonummer]: { ...existing, bereich: newBereich } };
    });
  };

  const handleKpiKategorieChange = (kontonummer: string, newKpiKategorie: KpiKategorie) => {
    const originalKonto = konten.find(k => k.kontonummer === kontonummer);
    
    setEditedKonten(prev => {
      const existing = prev[kontonummer] || {};
      
      if (originalKonto?.kpiKategorie === newKpiKategorie) {
        const { kpiKategorie, ...rest } = existing;
        if (Object.keys(rest).length === 0) {
          const { [kontonummer]: removed, ...others } = prev;
          return others;
        }
        return { ...prev, [kontonummer]: rest };
      }
      
      return { ...prev, [kontonummer]: { ...existing, kpiKategorie: newKpiKategorie } };
    });
  };

  const saveChanges = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      let successCount = 0;
      
      for (const [kontonummer, changes] of Object.entries(editedKonten)) {
        const updateData: { bereich?: string; kpi_kategorie?: string } = {};
        if (changes.bereich) updateData.bereich = changes.bereich;
        if (changes.kpiKategorie) updateData.kpi_kategorie = changes.kpiKategorie;
        
        if (Object.keys(updateData).length === 0) continue;
        
        const { error } = await supabase
          .from('konten')
          .update(updateData)
          .eq('kontonummer', kontonummer);
        
        if (error) {
          console.error('Error saving:', error);
          toast.error(`${t('common.error')}: ${kontonummer}`);
        } else {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} ${t('common.save')}`);
        setEditedKonten({});
        await initialize();
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayBereich = (kontonummer: string, originalBereich: Bereich): Bereich => {
    return editedKonten[kontonummer]?.bereich ?? originalBereich;
  };

  const getDisplayKpiKategorie = (kontonummer: string, original: KpiKategorie): KpiKategorie => {
    return editedKonten[kontonummer]?.kpiKategorie ?? original;
  };

  const isEdited = (kontonummer: string): boolean => {
    return kontonummer in editedKonten;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title={t('accounts.title')} 
        description={`${konten.length} ${t('accounts.totalAccounts')}`} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('accounts.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted border-border"
            />
          </div>
          
          <Select value={bereichFilter} onValueChange={setBereichFilter}>
            <SelectTrigger className="w-44 bg-muted border-border">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('accounts.area')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">{t('accounts.all')} {t('accounts.area')}</SelectItem>
              {allBereiche.map(b => (
                <SelectItem key={b} value={b}>{translateBereich(b, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={kpiFilter} onValueChange={setKpiFilter}>
            <SelectTrigger className="w-44 bg-muted border-border">
              <SelectValue placeholder={t('accounts.kpiCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">{t('accounts.all')} {t('accounts.kpiCategory')}</SelectItem>
              {allKpiKategorien.map(k => (
                <SelectItem key={k} value={k}>{translateKpiKategorie(k, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={typFilter} onValueChange={setTypFilter}>
            <SelectTrigger className="w-36 bg-muted border-border">
              <SelectValue placeholder={t('accounts.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">{t('accounts.all')}</SelectItem>
              <SelectItem value="Erlös">{translateKostenarttTyp('Erlös', t)}</SelectItem>
              <SelectItem value="Einkauf">{translateKostenarttTyp('Einkauf', t)}</SelectItem>
              <SelectItem value="Neutral">{translateKostenarttTyp('Neutral', t)}</SelectItem>
            </SelectContent>
          </Select>

          {hasChanges && (
            <Button 
              onClick={saveChanges} 
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? `${t('common.loading')}` : `${changesCount} ${t('common.save')}`}
            </Button>
          )}
        </div>
        
        {/* Quality Alert */}
        {sonstigeKonten.length > 0 && bereichFilter === 'alle' && (
          <div className="mb-4 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm">
            <span className="font-medium text-warning">{t('dataQuality.incomplete')}:</span>
            <span className="text-muted-foreground ml-2">
              {sonstigeKonten.length} {t('accounts.totalAccounts')}
            </span>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-border">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">{t('accounts.accountNumber')}</th>
                <th className="p-4 font-medium">{t('accounts.description2')}</th>
                <th className="p-4 font-medium">{t('accounts.class')}</th>
                <th className="p-4 font-medium">{t('accounts.area')}</th>
                <th className="p-4 font-medium">{t('accounts.kpiCategory')}</th>
                <th className="p-4 font-medium">{t('accounts.type')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredKonten.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {konten.length === 0 
                      ? t('common.noData')
                      : t('common.noData')}
                  </td>
                </tr>
              ) : (
                filteredKonten.map((konto) => {
                  const displayBereich = getDisplayBereich(konto.kontonummer, konto.bereich);
                  const displayKpi = getDisplayKpiKategorie(konto.kontonummer, konto.kpiKategorie);
                  const edited = isEdited(konto.kontonummer);
                  
                  return (
                    <tr 
                      key={konto.kontonummer} 
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        edited && "bg-primary/5"
                      )}
                    >
                      <td className="p-4 font-mono text-sm text-foreground">
                        {konto.kontonummer}
                        {edited && (
                          <Check className="inline-block ml-2 h-4 w-4 text-primary" />
                        )}
                      </td>
                      <td className="p-4 text-sm text-foreground max-w-xs truncate" title={konto.kontobezeichnung}>
                        {konto.kontobezeichnung}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {konto.kontoklasse}
                      </td>
                      <td className="p-4">
                        <Select 
                          value={displayBereich} 
                          onValueChange={(value) => handleBereichChange(konto.kontonummer, value as Bereich)}
                        >
                          <SelectTrigger 
                            className={cn(
                              "w-36 h-8 text-xs border",
                              editedKonten[konto.kontonummer]?.bereich && "ring-2 ring-primary ring-offset-1"
                            )}
                            style={{ 
                              backgroundColor: `${bereichColors[displayBereich]}15`,
                              borderColor: `${bereichColors[displayBereich]}40`,
                              color: bereichColors[displayBereich]
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allBereiche.map(b => (
                              <SelectItem key={b} value={b}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: bereichColors[b] }}
                                  />
                                  {translateBereich(b, t)}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <Select 
                          value={displayKpi} 
                          onValueChange={(value) => handleKpiKategorieChange(konto.kontonummer, value as KpiKategorie)}
                        >
                          <SelectTrigger 
                            className={cn(
                              "w-36 h-8 text-xs border",
                              editedKonten[konto.kontonummer]?.kpiKategorie && "ring-2 ring-primary ring-offset-1"
                            )}
                            style={{ 
                              backgroundColor: `${kpiKategorieColors[displayKpi]}15`,
                              borderColor: `${kpiKategorieColors[displayKpi]}40`,
                              color: kpiKategorieColors[displayKpi]
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allKpiKategorien.map(k => (
                              <SelectItem key={k} value={k}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: kpiKategorieColors[k] }}
                                  />
                                  {translateKpiKategorie(k, t)}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "font-normal",
                            konto.kostenarttTyp === 'Erlös' && "text-success border-success/40",
                            konto.kostenarttTyp === 'Einkauf' && "text-destructive border-destructive/40",
                            konto.kostenarttTyp === 'Neutral' && "text-muted-foreground"
                          )}
                        >
                          {translateKostenarttTyp(konto.kostenarttTyp, t)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {filteredKonten.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredKonten.length} / {konten.length}</span>
            {hasChanges && (
              <span className="text-primary font-medium">
                {changesCount} {t('common.save')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
