import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number | null;
  previousYearValue?: number | null;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'accent';
  className?: string;
  tooltip?: string;
  /** Bei true wird bei Aufwand-KPIs die Farbe invertiert (Steigerung = schlecht) */
  invertTrend?: boolean;
}

export function KPICard({ 
  title, 
  value, 
  previousValue, 
  previousYearValue,
  icon: Icon,
  variant = 'default',
  className,
  tooltip,
  invertTrend = false
}: KPICardProps) {
  const { t } = useLanguage();
  
  // Vormonats-Trend
  const diffVormonat = previousValue !== null && previousValue !== undefined 
    ? value - previousValue 
    : null;
  const diffPercentVormonat = previousValue !== null && previousValue !== undefined && previousValue !== 0
    ? ((value - previousValue) / Math.abs(previousValue)) * 100
    : null;
  
  // Vorjahres-Trend
  const diffVorjahr = previousYearValue !== null && previousYearValue !== undefined 
    ? value - previousYearValue 
    : null;
  const diffPercentVorjahr = previousYearValue !== null && previousYearValue !== undefined && previousYearValue !== 0
    ? ((value - previousYearValue) / Math.abs(previousYearValue)) * 100
    : null;
  
  const getTrendColor = (diff: number | null, invert: boolean) => {
    if (diff === null) return "text-muted-foreground";
    if (invert) {
      // Bei Aufwand: Steigerung ist schlecht (rot), Senkung ist gut (grün)
      if (diff > 0) return "text-destructive";
      if (diff < 0) return "text-success";
    } else {
      // Normal: Steigerung ist gut (grün), Senkung ist schlecht (rot)
      if (diff > 0) return "text-success";
      if (diff < 0) return "text-destructive";
    }
    return "text-muted-foreground";
  };
  
  const TrendIcon = (diff: number | null) => {
    if (diff === null) return Minus;
    if (diff > 0) return TrendingUp;
    if (diff < 0) return TrendingDown;
    return Minus;
  };
  
  const variantStyles = {
    default: 'border-border',
    success: 'border-success/30 glow-primary',
    warning: 'border-warning/30',
    accent: 'border-secondary/30 glow-gold',
  };

  const VormonatTrendIcon = TrendIcon(diffVormonat);
  const VorjahrTrendIcon = TrendIcon(diffVorjahr);

  return (
    <div 
      className={cn(
        "glass-card rounded-xl p-5 border animate-slide-up",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-2.5 rounded-lg",
          variant === 'accent' ? 'bg-secondary/10' : 'bg-primary/10'
        )}>
          <Icon className={cn(
            "h-5 w-5",
            variant === 'accent' ? 'text-secondary' : 'text-primary'
          )} />
        </div>
        
        {/* Trend-Anzeigen */}
        <div className="flex flex-col items-end gap-0.5">
          {diffPercentVormonat !== null && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              getTrendColor(diffVormonat, invertTrend)
            )}>
              <VormonatTrendIcon className="h-3 w-3" />
              <span>{formatPercent(diffPercentVormonat)}</span>
              <span className="text-muted-foreground/60">{t('kpi.pm')}</span>
            </div>
          )}
          {diffPercentVorjahr !== null && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              getTrendColor(diffVorjahr, invertTrend)
            )}>
              <VorjahrTrendIcon className="h-3 w-3" />
              <span>{formatPercent(diffPercentVorjahr)}</span>
              <span className="text-muted-foreground/60">{t('kpi.py')}</span>
            </div>
          )}
        </div>
      </div>
      
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-2xl font-semibold font-mono text-foreground">
          {formatCurrency(value)}
        </p>
        
        {(previousValue !== null && previousValue !== undefined) && (
          <div className="flex flex-col gap-0.5 mt-1">
            <p className="text-xs text-muted-foreground">
              {t('kpi.previousMonth')}: {formatCurrency(previousValue)}
            </p>
            {previousYearValue !== null && previousYearValue !== undefined && (
              <p className="text-xs text-muted-foreground">
                {t('kpi.previousYear')}: {formatCurrency(previousYearValue)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
