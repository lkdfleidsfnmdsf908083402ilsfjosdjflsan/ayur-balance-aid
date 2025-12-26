import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/calculations';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RohertragDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  erloese: number;
  aufwand: number;
  aufwandNachKlassen: Array<{
    klasse: string;
    name: string;
    value: number;
    color: string;
  }>;
  rohertrag: number;
  rohmarge: number;
}

export function RohertragDetailModal({
  open,
  onOpenChange,
  erloese,
  aufwand,
  aufwandNachKlassen,
  rohertrag,
  rohmarge,
}: RohertragDetailModalProps) {
  const isPositive = rohertrag > 0;
  const isNegative = rohertrag < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Rohertrag-Berechnung
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Formel-Übersicht */}
          <div className="flex items-center justify-center gap-3 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Erlöse</p>
              <p className="text-lg font-semibold text-success">{formatCurrency(Math.abs(erloese))}</p>
            </div>
            <Minus className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Aufwand</p>
              <p className="text-lg font-semibold text-destructive">{formatCurrency(aufwand)}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Rohertrag</p>
              <p className={cn(
                "text-lg font-semibold",
                isPositive && "text-success",
                isNegative && "text-destructive"
              )}>
                {formatCurrency(rohertrag)}
              </p>
            </div>
          </div>

          {/* Aufwand-Aufschlüsselung */}
          <div>
            <h4 className="text-sm font-medium mb-3">Aufwand nach Kontoklassen</h4>
            <div className="space-y-2">
              {aufwandNachKlassen.map((klasse) => (
                <div
                  key={klasse.klasse}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: klasse.color }}
                    />
                    <div>
                      <p className="text-sm font-medium">Klasse {klasse.klasse}</p>
                      <p className="text-xs text-muted-foreground">{klasse.name}</p>
                    </div>
                  </div>
                  <p className="text-sm font-mono font-medium">{formatCurrency(klasse.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Zusammenfassung */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div>
              <p className="text-sm text-muted-foreground">Rohmarge</p>
              <p className="text-xs text-muted-foreground mt-0.5">(Rohertrag ÷ Erlöse × 100)</p>
            </div>
            <p className={cn(
              "text-xl font-semibold",
              rohmarge > 0 ? "text-success" : "text-destructive"
            )}>
              {rohmarge.toFixed(1)}%
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}