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
  
  // Statistik für Qualitätsprüfung
  const sonstigeKonten = konten.filter(k => k.bereich === 'Sonstiges');
  const hasChanges = Object.keys(editedKonten).length > 0;
  const changesCount = Object.values(editedKonten).reduce((sum, e) => 
    sum + (e.bereich ? 1 : 0) + (e.kpiKategorie ? 1 : 0), 0
  );

  const handleBereichChange = (kontonummer: string, newBereich: Bereich) => {
    const originalKonto = konten.find(k => k.kontonummer === kontonummer);
    
    setEditedKonten(prev => {
      const existing = prev[kontonummer] || {};
      
      // Prüfe ob auf Original zurückgesetzt
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
      
      // Prüfe ob auf Original zurückgesetzt
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
          console.error('Fehler beim Speichern:', error);
          toast.error(`Fehler bei Konto ${kontonummer}`);
        } else {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} Kontozuordnung${successCount > 1 ? 'en' : ''} gespeichert`);
        setEditedKonten({});
        await initialize();
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Änderungen');
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
        title="Kontenstamm" 
        description={`${konten.length} Konten mit Bereich- und KPI-Zuordnung`} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Konto suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted border-border"
            />
          </div>
          
          <Select value={bereichFilter} onValueChange={setBereichFilter}>
            <SelectTrigger className="w-44 bg-muted border-border">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Bereich" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Bereiche</SelectItem>
              {allBereiche.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={kpiFilter} onValueChange={setKpiFilter}>
            <SelectTrigger className="w-44 bg-muted border-border">
              <SelectValue placeholder="KPI-Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle KPI-Kategorien</SelectItem>
              {allKpiKategorien.map(k => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={typFilter} onValueChange={setTypFilter}>
            <SelectTrigger className="w-36 bg-muted border-border">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Typen</SelectItem>
              <SelectItem value="Erlös">Erlös</SelectItem>
              <SelectItem value="Einkauf">Einkauf</SelectItem>
              <SelectItem value="Neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>

          {hasChanges && (
            <Button 
              onClick={saveChanges} 
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Speichern...' : `${changesCount} Änderung${changesCount > 1 ? 'en' : ''} speichern`}
            </Button>
          )}
        </div>
        
        {/* Quality Alert */}
        {sonstigeKonten.length > 0 && bereichFilter === 'alle' && (
          <div className="mb-4 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm">
            <span className="font-medium text-warning">Qualitätshinweis:</span>
            <span className="text-muted-foreground ml-2">
              {sonstigeKonten.length} Konten ohne spezifische Bereichszuordnung (Sonstiges) - 
              Klicken Sie auf den Bereich oder die KPI-Kategorie, um sie manuell zu ändern.
            </span>
          </div>
        )}

        {/* Info Box */}
        <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <span className="font-medium text-primary">Tipp:</span>
          <span className="text-muted-foreground ml-2">
            Wählen Sie in den Spalten "Bereich" oder "KPI-Kategorie" einen neuen Wert aus dem Dropdown. 
            Änderungen werden erst gespeichert, wenn Sie auf "Änderungen speichern" klicken.
          </span>
        </div>
        
        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-border">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Konto-Nr</th>
                <th className="p-4 font-medium">Bezeichnung</th>
                <th className="p-4 font-medium">Klasse</th>
                <th className="p-4 font-medium">Bereich</th>
                <th className="p-4 font-medium">KPI-Kategorie</th>
                <th className="p-4 font-medium">Typ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredKonten.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {konten.length === 0 
                      ? 'Keine Konten vorhanden. Bitte Saldenlisten hochladen.'
                      : 'Keine Konten gefunden mit diesen Filterkriterien.'}
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
                                  {b}
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
                                  {k}
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
                          {konto.kostenarttTyp}
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
            <span>{filteredKonten.length} von {konten.length} Konten angezeigt</span>
            {hasChanges && (
              <span className="text-primary font-medium">
                {changesCount} ungespeicherte Änderung{changesCount > 1 ? 'en' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
