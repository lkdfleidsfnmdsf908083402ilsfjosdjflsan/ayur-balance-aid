import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/calculations';
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
}

export function KPICard({ 
  title, 
  value, 
  previousValue, 
  previousYearValue,
  icon: Icon,
  variant = 'default',
  className,
  tooltip
}: KPICardProps) {
  const diff = previousValue !== null && previousValue !== undefined 
    ? value - previousValue 
    : null;
  const diffPercent = previousValue !== null && previousValue !== undefined && previousValue !== 0
    ? ((value - previousValue) / Math.abs(previousValue)) * 100
    : null;
  
  const isPositive = diff !== null && diff > 0;
  const isNegative = diff !== null && diff < 0;
  
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  
  const variantStyles = {
    default: 'border-border',
    success: 'border-success/30 glow-primary',
    warning: 'border-warning/30',
    accent: 'border-secondary/30 glow-gold',
  };

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
        
        {diff !== null && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositive && "text-success",
            isNegative && "text-destructive",
            !isPositive && !isNegative && "text-muted-foreground"
          )}>
            <TrendIcon className="h-4 w-4" />
            <span>{formatPercent(diffPercent)}</span>
          </div>
        )}
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
              Vormonat: {formatCurrency(previousValue)}
            </p>
            {previousYearValue !== null && previousYearValue !== undefined && (
              <p className="text-xs text-muted-foreground">
                Vorjahr: {formatCurrency(previousYearValue)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
