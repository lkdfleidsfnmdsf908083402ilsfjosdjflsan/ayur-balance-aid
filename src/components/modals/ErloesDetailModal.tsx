import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/calculations';
import { Euro, Download } from 'lucide-react';
import { BereichAggregation } from '@/types/finance';
import { exportRohertragToPdf } from '@/lib/pdfExport';

interface ErloesDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  erloeseGesamt: number;
  erloeseVormonat: number | null;
  bereicheDaten: BereichAggregation[];
  aufwandGesamt?: number;
  rohertrag?: number;
  rohmarge?: number;
  aufwandNachKlassen?: Array<{
    klasse: string;
    name: string;
    value: number;
    color: string;
  }>;
  jahr?: number;
  monat?: number;
}

const bereichColors: Record<string, string> = {
  'Restaurant': 'hsl(var(--chart-1))',
  'Bar': 'hsl(var(--chart-2))',
  'Logis': 'hsl(var(--chart-3))',
  'Spa': 'hsl(var(--chart-4))',
  'Events': 'hsl(var(--chart-5))',
  'Sonstiges': 'hsl(var(--muted-foreground))',
};

export function ErloesDetailModal({
  open,
  onOpenChange,
  erloeseGesamt,
  erloeseVormonat,
  bereicheDaten,
  aufwandGesamt = 0,
  rohertrag = 0,
  rohmarge = 0,
  aufwandNachKlassen = [],
  jahr = new Date().getFullYear(),
  monat = new Date().getMonth() + 1,
}: ErloesDetailModalProps) {
  const sortedBereiche = [...bereicheDaten].sort((a, b) => 
    Math.abs(b.saldoAktuell) - Math.abs(a.saldoAktuell)
  );

  const maxValue = Math.max(...sortedBereiche.map(b => Math.abs(b.saldoAktuell)), 1);

  const handleExportPdf = () => {
    const bereicheData = bereicheDaten.map(b => ({
      bereich: b.bereich,
      saldoAktuell: b.saldoAktuell,
      saldoVormonat: b.saldoVormonat,
    }));
    
    exportRohertragToPdf(
      erloeseGesamt,
      aufwandGesamt,
      rohertrag,
      rohmarge,
      aufwandNachKlassen,
      bereicheData,
      jahr,
      monat
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-secondary" />
              Erlöse nach Bereich
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Gesamt-Übersicht */}
          <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gesamterlöse</p>
                {erloeseVormonat !== null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vormonat: {formatCurrency(Math.abs(erloeseVormonat))}
                  </p>
                )}
              </div>
              <p className="text-2xl font-semibold text-secondary">
                {formatCurrency(Math.abs(erloeseGesamt))}
              </p>
            </div>
          </div>

          {/* Bereiche-Aufschlüsselung */}
          <div>
            <h4 className="text-sm font-medium mb-3">Aufschlüsselung nach Bereich</h4>
            <div className="space-y-3">
              {sortedBereiche.map((bereich) => {
                const value = Math.abs(bereich.saldoAktuell);
                const percentage = erloeseGesamt !== 0 
                  ? (value / Math.abs(erloeseGesamt)) * 100 
                  : 0;
                const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const color = bereichColors[bereich.bereich] || bereichColors['Sonstiges'];

                return (
                  <div
                    key={bereich.bereich}
                    className="p-3 rounded-lg bg-muted/20 border border-border/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{bereich.bereich}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-medium">{formatCurrency(value)}</p>
                        <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${barWidth}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    {bereich.saldoVormonat !== null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vormonat: {formatCurrency(Math.abs(bereich.saldoVormonat))}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}