import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/calculations';

interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number | null;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'accent';
  className?: string;
}

export function KPICard({ 
  title, 
  value, 
  previousValue, 
  icon: Icon,
  variant = 'default',
  className 
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
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-semibold font-mono text-foreground">
          {formatCurrency(value)}
        </p>
        
        {previousValue !== null && previousValue !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            Vormonat: {formatCurrency(previousValue)}
          </p>
        )}
      </div>
    </div>
  );
}
