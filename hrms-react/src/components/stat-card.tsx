import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'accent' | 'success' | 'warning'
  className?: string
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  accent: {
    icon: 'bg-primary/15 text-primary',
    value: 'text-foreground',
  },
  success: {
    icon: 'bg-success/15 text-success',
    value: 'text-foreground',
  },
  warning: {
    icon: 'bg-warning/15 text-warning',
    value: 'text-foreground',
  },
}

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  variant = 'default',
  className 
}: StatCardProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        'rounded-xl border border-[#dfe5f7] bg-white p-4 shadow-[0_8px_24px_rgba(43,65,140,0.06)]',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('rounded-lg p-2', styles.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={cn('text-2xl font-semibold tracking-tight', styles.value)}>{value}</p>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  )
}
