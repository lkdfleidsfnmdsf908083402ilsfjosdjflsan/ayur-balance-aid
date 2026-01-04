import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus, Info, Calendar } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface YTDKPICardProps {
  title: string;
  value: number;
  previousYearValue?: number | null;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'accent';
  className?: string;
  tooltip?: string;
  /** Bei true wird bei Aufwand-KPIs die Farbe invertiert (Steigerung = schlecht) */
  invertTrend?: boolean;
  /** Label für den Zeitraum, z.B. "Jan-Jun 2024" */
  periodLabel?: string;
}

export function YTDKPICard({ 
  title, 
  value, 
  previousYearValue,
  icon: Icon,
  variant = 'default',
  className,
  tooltip,
  invertTrend = false,
  periodLabel
}: YTDKPICardProps) {
  const { t } = useLanguage();
  
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
  
  const TrendIconComponent = (diff: number | null) => {
    if (diff === null) return Minus;
    if (diff > 0) return TrendingUp;
    if (diff < 0) return TrendingDown;
    return Minus;
  };
  
  const variantStyles = {
    default: 'border-border bg-muted/30',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    accent: 'border-secondary/30 bg-secondary/5',
  };

  const VorjahrTrendIcon = TrendIconComponent(diffVorjahr);

  return (
    <div 
      className={cn(
        "rounded-lg p-3 border animate-slide-up",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded",
            variant === 'accent' ? 'bg-secondary/10' : 'bg-primary/10'
          )}>
            <Calendar className={cn(
              "h-3.5 w-3.5",
              variant === 'accent' ? 'text-secondary' : 'text-primary'
            )} />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">{title} YTD</p>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {periodLabel && (
              <p className="text-[10px] text-muted-foreground/60">{periodLabel}</p>
            )}
          </div>
        </div>
        
        {/* Trend-Anzeige */}
        {diffPercentVorjahr !== null && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            getTrendColor(diffVorjahr, invertTrend)
          )}>
            <VorjahrTrendIcon className="h-3 w-3" />
            <span>{formatPercent(diffPercentVorjahr)}</span>
          </div>
        )}
      </div>
      
      <div className="mt-2 flex items-baseline justify-between">
        <p className="text-lg font-semibold font-mono text-foreground">
          {formatCurrency(value)}
        </p>
        {previousYearValue !== null && previousYearValue !== undefined && (
          <p className="text-[10px] text-muted-foreground">
            VJ: {formatCurrency(previousYearValue)}
          </p>
        )}
      </div>
    </div>
  );
}
