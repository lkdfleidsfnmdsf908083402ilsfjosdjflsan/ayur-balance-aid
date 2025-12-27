import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, UtensilsCrossed, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportFBToPdf } from '@/lib/pdfExport';

interface BereichDaten {
  bereich: string;
  saldoAktuell: number;
  saldoVormonat: number | null;
  saldoVorjahr: number | null;
}

interface FBDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fbGesamt: number;
  fbVormonat: number;
  fbVorjahr: number;
  fbBereiche: BereichDaten[];
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
      <span className="flex items-center gap-1 text-emerald-600 text-sm">
        <TrendingUp className="h-3 w-3" />
        +{change.toFixed(1)}%
      </span>
    );
  } else if (change < -2) {
    return (
      <span className="flex items-center gap-1 text-destructive text-sm">
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

export function FBDetailModal({
  open,
  onOpenChange,
  fbGesamt,
  fbVormonat,
  fbVorjahr,
  fbBereiche,
  jahr,
  monat,
}: FBDetailModalProps) {
  const months = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  
  const sortedBereiche = [...fbBereiche]
    .filter(b => Math.abs(b.saldoAktuell) > 0)
    .sort((a, b) => Math.abs(b.saldoAktuell) - Math.abs(a.saldoAktuell));
  
  const maxValue = Math.max(...sortedBereiche.map(b => Math.abs(b.saldoAktuell)), 1);

  const handleExportPdf = () => {
    exportFBToPdf(
      fbGesamt,
      fbVormonat,
      fbVorjahr,
      sortedBereiche.map(b => ({
        bereich: b.bereich,
        value: Math.abs(b.saldoAktuell),
        valueVormonat: Math.abs(b.saldoVormonat ?? 0),
        valueVorjahr: Math.abs(b.saldoVorjahr ?? 0),
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
                <UtensilsCrossed className="h-5 w-5 text-secondary" />
                F&B Erlöse {months[monat]} {jahr}
              </DialogTitle>
              <DialogDescription>
                Aufschlüsselung der Food & Beverage Erlöse nach Bereich
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
                  F&B Erlöse Gesamt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">
                  {formatCurrency(fbGesamt)}
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
                  {formatCurrency(fbVormonat)}
                </div>
                <TrendIndicator current={fbGesamt} previous={fbVormonat} />
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
                  {formatCurrency(fbVorjahr)}
                </div>
                <TrendIndicator current={fbGesamt} previous={fbVorjahr} />
              </CardContent>
            </Card>
          </div>

          {/* Nach Bereich */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">F&B Erlöse nach Bereich</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bereich</TableHead>
                    <TableHead className="text-right">Aktuell</TableHead>
                    <TableHead className="text-right">Vormonat</TableHead>
                    <TableHead className="text-right">Vorjahr</TableHead>
                    <TableHead className="text-right">Trend VM</TableHead>
                    <TableHead className="w-[150px]">Anteil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBereiche.map((bereich) => {
                    const anteil = (Math.abs(bereich.saldoAktuell) / fbGesamt) * 100;
                    return (
                      <TableRow key={bereich.bereich}>
                        <TableCell className="font-medium">{bereich.bereich}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bereich.saldoAktuell)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {bereich.saldoVormonat ? formatCurrency(bereich.saldoVormonat) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {bereich.saldoVorjahr ? formatCurrency(bereich.saldoVorjahr) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {bereich.saldoVormonat && (
                            <TrendIndicator 
                              current={Math.abs(bereich.saldoAktuell)} 
                              previous={Math.abs(bereich.saldoVormonat)} 
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(Math.abs(bereich.saldoAktuell) / maxValue) * 100} 
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
