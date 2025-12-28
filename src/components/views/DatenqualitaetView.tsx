import { Header } from '@/components/layout/Header';
import { useFinanceStore } from '@/store/financeStore';
import { analyzeDataQuality, getMonthName } from '@/lib/dataQuality';
import { bereichColors } from '@/lib/bereichMapping';
import { Bereich } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Database,
  Calendar,
  FileWarning,
  PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

interface BereichStats {
  bereich: Bereich;
  anzahl: number;
  prozent: number;
}

export function DatenqualitaetView() {
  const { konten, salden, uploadedFiles } = useFinanceStore();
  const report = analyzeDataQuality(konten, salden, uploadedFiles);
  
  const hasData = konten.length > 0 || salden.length > 0;
  
  // Bereich-Statistiken berechnen
  const bereichStats: BereichStats[] = (() => {
    if (konten.length === 0) return [];
    
    const counts = konten.reduce((acc, konto) => {
      acc[konto.bereich] = (acc[konto.bereich] || 0) + 1;
      return acc;
    }, {} as Record<Bereich, number>);
    
    return Object.entries(counts)
      .map(([bereich, anzahl]) => ({
        bereich: bereich as Bereich,
        anzahl,
        prozent: (anzahl / konten.length) * 100
      }))
      .sort((a, b) => b.anzahl - a.anzahl);
  })();
  
  if (!hasData) {
    return (
      <>
        <Header 
          title="Datenqualität" 
          description="Prüfung der Datenkonsistenz und -vollständigkeit"
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <FileWarning className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Keine Daten vorhanden</h3>
            <p>Laden Sie Saldenlisten hoch, um die Datenqualität zu prüfen.</p>
          </div>
        </div>
      </>
    );
  }

  const problemsCount = 
    report.kontenOhneBereich.length + 
    report.fehlendePerioden.filter(p => !p.vorhanden).length;

  return (
    <>
      <Header 
        title="Datenqualität" 
        description="Prüfung der Datenkonsistenz und -vollständigkeit"
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Übersicht */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Konten gesamt</p>
                    <p className="text-2xl font-bold font-mono">{report.gesamtKonten}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Calendar className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Perioden</p>
                    <p className="text-2xl font-bold font-mono">{report.vorhandenePerioden.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    report.kontenOhneBereich.length > 0 
                      ? "bg-destructive/10" 
                      : "bg-success/10"
                  )}>
                    {report.kontenOhneBereich.length > 0 
                      ? <AlertTriangle className="h-5 w-5 text-destructive" />
                      : <CheckCircle2 className="h-5 w-5 text-success" />
                    }
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ohne Bereich</p>
                    <p className="text-2xl font-bold font-mono">{report.kontenOhneBereich.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    problemsCount > 0 
                      ? "bg-destructive/10" 
                      : "bg-success/10"
                  )}>
                    {problemsCount > 0 
                      ? <XCircle className="h-5 w-5 text-destructive" />
                      : <CheckCircle2 className="h-5 w-5 text-success" />
                    }
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Probleme</p>
                    <p className="text-2xl font-bold font-mono">{problemsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bereich-Zuordnungs-Vorschau */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-accent" />
                Bereich-Zuordnung Übersicht
                <Badge variant="outline" className="ml-2">
                  {konten.length} Konten
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bereichStats.length === 0 ? (
                <p className="text-muted-foreground">Keine Konten vorhanden.</p>
              ) : (
                <div className="space-y-4">
                  {/* Visuelle Balken */}
                  <div className="space-y-2">
                    {bereichStats.map((stat) => (
                      <div key={stat.bereich} className="flex items-center gap-3">
                        <div className="w-36 text-sm truncate" title={stat.bereich}>
                          {stat.bereich}
                        </div>
                        <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${stat.prozent}%`,
                              backgroundColor: bereichColors[stat.bereich],
                              opacity: stat.bereich === 'Sonstiges' ? 0.5 : 1
                            }}
                          />
                        </div>
                        <div className="w-16 text-right font-mono text-sm">
                          {stat.anzahl}
                        </div>
                        <div className="w-16 text-right font-mono text-sm text-muted-foreground">
                          {stat.prozent.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Zusammenfassung */}
                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {report.kontenOhneBereich.length === 0 ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <span className="text-success font-medium">100% der Konten zugeordnet</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <span className="text-amber-500 font-medium">
                            {((1 - report.kontenOhneBereich.length / konten.length) * 100).toFixed(1)}% zugeordnet
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {report.kontenOhneBereich.length > 0 && (
                        <span>{report.kontenOhneBereich.length} Konten in "Sonstiges"</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Perioden-Übersicht */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-secondary" />
                Perioden-Übersicht
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.fehlendePerioden.length === 0 ? (
                <p className="text-muted-foreground">Keine Perioden importiert.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {report.fehlendePerioden.map((periode) => (
                    <Badge 
                      key={`${periode.jahr}-${periode.monat}`}
                      variant={periode.vorhanden ? "default" : "destructive"}
                      className={cn(
                        "font-mono text-xs",
                        periode.vorhanden 
                          ? "bg-success/20 text-success hover:bg-success/30" 
                          : "bg-destructive/20 text-destructive hover:bg-destructive/30"
                      )}
                    >
                      {periode.vorhanden ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {getMonthName(periode.monat).substring(0, 3)} {periode.jahr}
                    </Badge>
                  ))}
                </div>
              )}
              {report.fehlendePerioden.filter(p => !p.vorhanden).length > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 inline mr-1 text-destructive" />
                  {report.fehlendePerioden.filter(p => !p.vorhanden).length} fehlende Periode(n) im Zeitraum erkannt.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Kontoklassen-Abstimmung */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Summenabstimmung nach Kontoklasse
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.kontoklassenAbstimmung.length === 0 ? (
                <p className="text-muted-foreground">Keine Salden vorhanden.</p>
              ) : (
                <div className="overflow-x-auto touch-pan-x touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kontoklasse</TableHead>
                        <TableHead className="text-right">Anzahl Buchungen</TableHead>
                        <TableHead className="text-right">Summe Soll</TableHead>
                        <TableHead className="text-right">Summe Haben</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.kontoklassenAbstimmung.map((kk) => (
                        <TableRow key={kk.kontoklasse}>
                          <TableCell className="font-medium">{kk.kontoklasse}</TableCell>
                          <TableCell className="text-right font-mono">{kk.anzahlKonten}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(kk.summeSaldoSoll)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(kk.summeSaldoHaben)}</TableCell>
                          <TableCell className={cn(
                            "text-right font-mono font-semibold",
                            kk.summeSaldo >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {formatCurrency(kk.summeSaldo)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-border font-bold">
                        <TableCell>Gesamt</TableCell>
                        <TableCell className="text-right font-mono">
                          {report.kontoklassenAbstimmung.reduce((s, k) => s + k.anzahlKonten, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(report.kontoklassenAbstimmung.reduce((s, k) => s + k.summeSaldoSoll, 0))}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(report.kontoklassenAbstimmung.reduce((s, k) => s + k.summeSaldoHaben, 0))}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          report.kontoklassenAbstimmung.reduce((s, k) => s + k.summeSaldo, 0) >= 0 
                            ? "text-success" 
                            : "text-destructive"
                        )}>
                          {formatCurrency(report.kontoklassenAbstimmung.reduce((s, k) => s + k.summeSaldo, 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Konten ohne Bereich */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  report.kontenOhneBereich.length > 0 ? "text-destructive" : "text-success"
                )} />
                Konten ohne Bereich-Zuordnung
                <Badge variant="outline" className="ml-2">
                  {report.kontenOhneBereich.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.kontenOhneBereich.length === 0 ? (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Alle Konten sind einem Bereich zugeordnet.</span>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto touch-pan-x touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kontonummer</TableHead>
                        <TableHead>Bezeichnung</TableHead>
                        <TableHead>Kontoklasse</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.kontenOhneBereich.map((konto) => (
                        <TableRow key={konto.kontonummer}>
                          <TableCell className="font-mono">{konto.kontonummer}</TableCell>
                          <TableCell>{konto.kontobezeichnung}</TableCell>
                          <TableCell>{konto.kontoklasse}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Konten mit Neutral-Typ */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-muted-foreground" />
                Konten mit Kostenart "Neutral"
                <Badge variant="outline" className="ml-2">
                  {report.kontenOhneKostenarttTyp.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.kontenOhneKostenarttTyp.length === 0 ? (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Alle Konten haben eine Kostenart-Zuordnung.</span>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto touch-pan-x touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kontonummer</TableHead>
                        <TableHead>Bezeichnung</TableHead>
                        <TableHead>Kontoklasse</TableHead>
                        <TableHead>Bereich</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.kontenOhneKostenarttTyp.map((konto) => (
                        <TableRow key={konto.kontonummer}>
                          <TableCell className="font-mono">{konto.kontonummer}</TableCell>
                          <TableCell>{konto.kontobezeichnung}</TableCell>
                          <TableCell>{konto.kontoklasse}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{konto.bereich}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
