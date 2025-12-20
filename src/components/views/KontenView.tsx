import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bereich, KostenarttTyp } from '@/types/finance';
import { bereichColors } from '@/lib/bereichMapping';

const allBereiche: Bereich[] = [
  'Food & Beverage', 'Logis', 'Wellness/Spa', 'Ärztin/Medizin', 'Shop',
  'Marketing/Vertrieb', 'Verwaltung', 'Technik/Instandhaltung', 'Energie', 'Personal', 'Sonstiges'
];

export function KontenView() {
  const { konten } = useFinanceStore();
  const [search, setSearch] = useState('');
  const [bereichFilter, setBereichFilter] = useState<string>('alle');
  const [typFilter, setTypFilter] = useState<string>('alle');
  
  const filteredKonten = useMemo(() => {
    return konten.filter(konto => {
      const matchesSearch = 
        konto.kontonummer.toLowerCase().includes(search.toLowerCase()) ||
        konto.kontobezeichnung.toLowerCase().includes(search.toLowerCase());
      
      const matchesBereich = bereichFilter === 'alle' || konto.bereich === bereichFilter;
      const matchesTyp = typFilter === 'alle' || konto.kostenarttTyp === typFilter;
      
      return matchesSearch && matchesBereich && matchesTyp;
    });
  }, [konten, search, bereichFilter, typFilter]);
  
  // Statistik für Qualitätsprüfung
  const sonstigeKonten = konten.filter(k => k.bereich === 'Sonstiges');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Kontenstamm" 
        description={`${konten.length} Konten mit Bereich-Zuordnung`} 
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
            <SelectTrigger className="w-48 bg-muted border-border">
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
          
          <Select value={typFilter} onValueChange={setTypFilter}>
            <SelectTrigger className="w-40 bg-muted border-border">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Typen</SelectItem>
              <SelectItem value="Erlös">Erlös</SelectItem>
              <SelectItem value="Einkauf">Einkauf</SelectItem>
              <SelectItem value="Neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Quality Alert */}
        {sonstigeKonten.length > 0 && bereichFilter === 'alle' && (
          <div className="mb-4 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm">
            <span className="font-medium text-warning">Qualitätshinweis:</span>
            <span className="text-muted-foreground ml-2">
              {sonstigeKonten.length} Konten ohne spezifische Bereichszuordnung (Sonstiges)
            </span>
          </div>
        )}
        
        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-border">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Konto-Nr</th>
                <th className="p-4 font-medium">Bezeichnung</th>
                <th className="p-4 font-medium">Klasse</th>
                <th className="p-4 font-medium">Bereich</th>
                <th className="p-4 font-medium">Typ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredKonten.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {konten.length === 0 
                      ? 'Keine Konten vorhanden. Bitte Saldenlisten hochladen.'
                      : 'Keine Konten gefunden mit diesen Filterkriterien.'}
                  </td>
                </tr>
              ) : (
                filteredKonten.map((konto) => (
                  <tr 
                    key={konto.kontonummer} 
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4 font-mono text-sm text-foreground">
                      {konto.kontonummer}
                    </td>
                    <td className="p-4 text-sm text-foreground">
                      {konto.kontobezeichnung}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {konto.kontoklasse}
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant="secondary"
                        className="font-normal"
                        style={{ 
                          backgroundColor: `${bereichColors[konto.bereich]}20`,
                          color: bereichColors[konto.bereich],
                          borderColor: `${bereichColors[konto.bereich]}40`
                        }}
                      >
                        {konto.bereich}
                      </Badge>
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
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredKonten.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {filteredKonten.length} von {konten.length} Konten angezeigt
          </div>
        )}
      </div>
    </div>
  );
}
