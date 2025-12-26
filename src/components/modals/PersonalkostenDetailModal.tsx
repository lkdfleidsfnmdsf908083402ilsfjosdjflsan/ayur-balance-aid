import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Users, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportPersonalkostenToPdf } from '@/lib/pdfExport';

interface PersonalkostenNachBereich {
  bereich: string;
  value: number;
  valueVormonat: number;
  valueVorjahr: number;
  konten: {
    kontonummer: string;
    bezeichnung: string;
    saldoAktuell: number;
    saldoVormonat: number | null;
    saldoVorjahr: number | null;
  }[];
}

interface PersonalkostenDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personalkostenGesamt: number;
  personalkostenVormonat: number;
  personalkostenNachBereich: PersonalkostenNachBereich[];
  jahr: number;
  monat: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
};

const TrendIndicator = ({ current, previous }: { current: number; previous: number }) => {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  
  if (change > 2) {
    return (
      <span className="flex items-center gap-1 text-destructive text-sm">
        <TrendingUp className="h-3 w-3" />
        +{change.toFixed(1)}%
      </span>
    );
  } else if (change < -2) {
    return (
      <span className="flex items-center gap-1 text-emerald-600 text-sm">
        <TrendingDown className="h-3 w-3" />
        {change.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-sm">
      <Minus className="h-3 w-3" />
      {change > 0 ? '+' : ''}{change.toFixed(1)}%
    </span>
  );
};

export function PersonalkostenDetailModal({
  open,
  onOpenChange,
  personalkostenGesamt,
  personalkostenVormonat,
  personalkostenNachBereich,
  jahr,
  monat,
}: PersonalkostenDetailModalProps) {
  const months = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  
  const sortedBereiche = [...personalkostenNachBereich]
    .filter(b => b.value > 0)
    .sort((a, b) => b.value - a.value);
  
  const maxValue = Math.max(...sortedBereiche.map(b => b.value), 1);
  
  const topKonten = sortedBereiche
    .flatMap(b => b.konten.map(k => ({ ...k, bereich: b.bereich })))
    .filter(k => Math.abs(k.saldoAktuell) > 0)
    .sort((a, b) => Math.abs(b.saldoAktuell) - Math.abs(a.saldoAktuell))
    .slice(0, 10);

  const handleExportPdf = () => {
    exportPersonalkostenToPdf(
      personalkostenGesamt,
      personalkostenVormonat,
      sortedBereiche.map(b => ({
        bereich: b.bereich,
        value: b.value,
        valueVormonat: b.valueVormonat,
      })),
      topKonten.map(k => ({
        kontonummer: k.kontonummer,
        bezeichnung: k.bezeichnung,
        saldoAktuell: k.saldoAktuell,
      })),
      jahr,
      monat
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-chart-2" />
                Personalkosten {months[monat]} {jahr}
              </DialogTitle>
              <DialogDescription>
                Aufschlüsselung der Personalkosten (Kontoklasse 6) nach Abteilung
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Übersicht */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Personalkosten Gesamt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-chart-2">
                  {formatCurrency(personalkostenGesamt)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vormonat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(personalkostenVormonat)}
                </div>
                <TrendIndicator current={personalkostenGesamt} previous={personalkostenVormonat} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Differenz zum Vormonat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  personalkostenGesamt > personalkostenVormonat ? 'text-destructive' : 'text-emerald-600'
                }`}>
                  {personalkostenGesamt > personalkostenVormonat ? '+' : ''}
                  {formatCurrency(personalkostenGesamt - personalkostenVormonat)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nach Abteilung */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personalkosten nach Abteilung</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Abteilung</TableHead>
                    <TableHead className="text-right">Aktuell</TableHead>
                    <TableHead className="text-right">Vormonat</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                    <TableHead className="w-[200px]">Anteil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBereiche.map((bereich) => {
                    const anteil = (bereich.value / personalkostenGesamt) * 100;
                    return (
                      <TableRow key={bereich.bereich}>
                        <TableCell className="font-medium">{bereich.bereich}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bereich.value)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(bereich.valueVormonat)}
                        </TableCell>
                        <TableCell className="text-right">
                          <TrendIndicator current={bereich.value} previous={bereich.valueVormonat} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(bereich.value / maxValue) * 100} 
                              className="h-2 flex-1"
                            />
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {anteil.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top 10 Konten */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 Personalkonten</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Konto</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="text-right">Vormonat</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBereiche
                    .flatMap(b => b.konten.map(k => ({ ...k, bereich: b.bereich })))
                    .filter(k => Math.abs(k.saldoAktuell) > 0)
                    .sort((a, b) => Math.abs(b.saldoAktuell) - Math.abs(a.saldoAktuell))
                    .slice(0, 10)
                    .map((konto) => (
                      <TableRow key={konto.kontonummer}>
                        <TableCell className="font-mono text-sm">{konto.kontonummer}</TableCell>
                        <TableCell>{konto.bezeichnung}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(konto.saldoAktuell)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {konto.saldoVormonat ? formatCurrency(konto.saldoVormonat) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {konto.saldoVormonat && (
                            <TrendIndicator 
                              current={Math.abs(konto.saldoAktuell)} 
                              previous={Math.abs(konto.saldoVormonat)} 
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
