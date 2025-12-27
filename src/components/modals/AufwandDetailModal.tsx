import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, ShoppingCart, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportAufwandToPdf } from '@/lib/pdfExport';

interface AufwandNachKlasse {
  klasse: string;
  name: string;
  value: number;
  valueVormonat: number;
  valueVorjahr: number;
  color: string;
  konten?: any[];
}

interface AufwandDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aufwandGesamt: number;
  aufwandVormonat: number;
  aufwandVorjahr: number;
  aufwandNachKlassen: AufwandNachKlasse[];
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

const TrendIndicator = ({ current, previous, inverted = false }: { current: number; previous: number; inverted?: boolean }) => {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  
  // Bei Aufwand: Steigerung ist negativ (rot), Senkung ist positiv (grün)
  if (change > 2) {
    return (
      <span className={`flex items-center gap-1 text-sm ${inverted ? 'text-destructive' : 'text-emerald-600'}`}>
        <TrendingUp className="h-3 w-3" />
        +{change.toFixed(1)}%
      </span>
    );
  } else if (change < -2) {
    return (
      <span className={`flex items-center gap-1 text-sm ${inverted ? 'text-emerald-600' : 'text-destructive'}`}>
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

export function AufwandDetailModal({
  open,
  onOpenChange,
  aufwandGesamt,
  aufwandVormonat,
  aufwandVorjahr,
  aufwandNachKlassen,
  jahr,
  monat,
}: AufwandDetailModalProps) {
  const months = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  
  const sortedKlassen = [...aufwandNachKlassen]
    .filter(k => k.value > 0)
    .sort((a, b) => b.value - a.value);
  
  const maxValue = Math.max(...sortedKlassen.map(k => k.value), 1);

  const handleExportPdf = () => {
    exportAufwandToPdf(
      aufwandGesamt,
      aufwandVormonat,
      aufwandVorjahr,
      sortedKlassen.map(k => ({
        name: k.name,
        value: k.value,
        valueVormonat: k.valueVormonat,
        valueVorjahr: k.valueVorjahr,
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
                <ShoppingCart className="h-5 w-5 text-chart-1" />
                Gesamtaufwand {months[monat]} {jahr}
              </DialogTitle>
              <DialogDescription>
                Aufschlüsselung des Gesamtaufwands nach Kontoklassen (5-8)
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
                  Gesamtaufwand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-chart-1">
                  {formatCurrency(aufwandGesamt)}
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
                  {formatCurrency(aufwandVormonat)}
                </div>
                <TrendIndicator current={aufwandGesamt} previous={aufwandVormonat} inverted />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vorjahr
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(aufwandVorjahr)}
                </div>
                <TrendIndicator current={aufwandGesamt} previous={aufwandVorjahr} inverted />
              </CardContent>
            </Card>
          </div>

          {/* Nach Kontoklasse */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aufwand nach Kontoklasse</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kontoklasse</TableHead>
                    <TableHead className="text-right">Aktuell</TableHead>
                    <TableHead className="text-right">Vormonat</TableHead>
                    <TableHead className="text-right">Vorjahr</TableHead>
                    <TableHead className="text-right">Trend VM</TableHead>
                    <TableHead className="w-[150px]">Anteil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedKlassen.map((klasse) => {
                    const anteil = (klasse.value / aufwandGesamt) * 100;
                    return (
                      <TableRow key={klasse.klasse}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: klasse.color }}
                            />
                            {klasse.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(klasse.value)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(klasse.valueVormonat)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(klasse.valueVorjahr)}
                        </TableCell>
                        <TableCell className="text-right">
                          <TrendIndicator 
                            current={klasse.value} 
                            previous={klasse.valueVormonat}
                            inverted
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(klasse.value / maxValue) * 100} 
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

          {/* Differenzen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Differenz zum Vormonat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  aufwandGesamt > aufwandVormonat ? 'text-destructive' : 'text-emerald-600'
                }`}>
                  {aufwandGesamt > aufwandVormonat ? '+' : ''}
                  {formatCurrency(aufwandGesamt - aufwandVormonat)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Differenz zum Vorjahr
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  aufwandGesamt > aufwandVorjahr ? 'text-destructive' : 'text-emerald-600'
                }`}>
                  {aufwandGesamt > aufwandVorjahr ? '+' : ''}
                  {formatCurrency(aufwandGesamt - aufwandVorjahr)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
