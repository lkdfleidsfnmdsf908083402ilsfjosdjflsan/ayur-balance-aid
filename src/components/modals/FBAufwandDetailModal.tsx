import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, UtensilsCrossed, Download, Percent, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BereichDaten {
  bereich: string;
  saldoAktuell: number;
  saldoVormonat: number | null;
  saldoVorjahr: number | null;
}

interface FBAufwandDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fbAufwand: number;
  fbAufwandVormonat: number;
  fbAufwandVorjahr: number;
  fbErloese: number;
  fbErloeseVormonat: number;
  fbErloeseVorjahr: number;
  fbBereiche: BereichDaten[];
  aktiveBereiche: string[];
  onBereicheChange: (bereiche: string[]) => void;
  alleBereiche: string[];
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

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

const TrendIndicator = ({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) => {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = invert ? change < -2 : change > 2;
  const isNegative = invert ? change > 2 : change < -2;
  
  if (isPositive) {
    return (
      <span className="flex items-center gap-1 text-emerald-600 text-sm">
        <TrendingUp className="h-3 w-3" />
        +{change.toFixed(1)}%
      </span>
    );
  } else if (isNegative) {
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

export function FBAufwandDetailModal({
  open,
  onOpenChange,
  fbAufwand,
  fbAufwandVormonat,
  fbAufwandVorjahr,
  fbErloese,
  fbErloeseVormonat,
  fbErloeseVorjahr,
  fbBereiche,
  aktiveBereiche,
  onBereicheChange,
  alleBereiche,
  jahr,
  monat,
}: FBAufwandDetailModalProps) {
  const { t } = useLanguage();
  const months = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  
  // Food Cost % berechnen
  const foodCostPct = fbErloese > 0 ? (fbAufwand / fbErloese) * 100 : 0;
  const foodCostPctVormonat = fbErloeseVormonat > 0 ? (fbAufwandVormonat / fbErloeseVormonat) * 100 : 0;
  const foodCostPctVorjahr = fbErloeseVorjahr > 0 ? (fbAufwandVorjahr / fbErloeseVorjahr) * 100 : 0;
  
  const sortedBereiche = [...fbBereiche]
    .filter(b => Math.abs(b.saldoAktuell) > 0)
    .sort((a, b) => Math.abs(b.saldoAktuell) - Math.abs(a.saldoAktuell));
  
  const maxValue = Math.max(...sortedBereiche.map(b => Math.abs(b.saldoAktuell)), 1);

  const handleBereichToggle = (bereich: string) => {
    if (aktiveBereiche.includes(bereich)) {
      onBereicheChange(aktiveBereiche.filter(b => b !== bereich));
    } else {
      onBereicheChange([...aktiveBereiche, bereich]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <UtensilsCrossed className="h-5 w-5 text-secondary" />
                {t('modal.fbExpenses')} {months[monat]} {jahr}
              </DialogTitle>
              <DialogDescription>
                {t('modal.fbExpensesDescription')}
              </DialogDescription>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  {t('common.configure')}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{t('modal.configureFbAreas')}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">{t('modal.selectFbAreas')}</p>
                  {alleBereiche.map((bereich) => (
                    <div key={bereich} className="flex items-center space-x-2">
                      <Checkbox
                        id={bereich}
                        checked={aktiveBereiche.includes(bereich)}
                        onCheckedChange={() => handleBereichToggle(bereich)}
                      />
                      <Label htmlFor={bereich} className="cursor-pointer">{bereich}</Label>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Übersicht mit Food Cost % */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('kpi.fbExpenses')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(fbAufwand)}
                </div>
                <TrendIndicator current={fbAufwand} previous={fbAufwandVormonat} invert />
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Food Cost %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatPercent(foodCostPct)}
                </div>
                <TrendIndicator current={foodCostPct} previous={foodCostPctVormonat} invert />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Food Cost % {t('common.previousMonth')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercent(foodCostPctVormonat)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Food Cost % {t('common.previousYear')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercent(foodCostPctVorjahr)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aufwand nach Bereich */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('modal.fbExpensesByArea')}</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedBereiche.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.area')}</TableHead>
                      <TableHead className="text-right">{t('common.current')}</TableHead>
                      <TableHead className="text-right">{t('common.previousMonth')}</TableHead>
                      <TableHead className="text-right">{t('common.previousYear')}</TableHead>
                      <TableHead className="text-right">{t('common.trend')}</TableHead>
                      <TableHead className="w-[150px]">{t('common.share')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBereiche.map((bereich) => {
                      const anteil = (Math.abs(bereich.saldoAktuell) / fbAufwand) * 100;
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
                                invert
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
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
