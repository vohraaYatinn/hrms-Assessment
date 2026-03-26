import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type CollapsibleFilterBarProps = {
  /** Shown on the mobile toggle when filters differ from defaults */
  activeCount?: number
  /** When true, filter row starts expanded on small screens */
  defaultMobileOpen?: boolean
  children: ReactNode
  className?: string
  label?: string
}

/**
 * Below `md`, children sit behind a single toggle. From `md` up, the bar is always visible.
 */
export function CollapsibleFilterBar({
  activeCount = 0,
  defaultMobileOpen = false,
  children,
  className,
  label = 'Filters & options',
}: CollapsibleFilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(defaultMobileOpen)

  return (
    <div className={cn('space-y-3', className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#dfe5f7] bg-white px-4 py-3 text-left text-sm font-medium text-[#2b418c] shadow-sm md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0" />
          {label}
          {activeCount > 0 ? (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 justify-center border-[#dfe5f7] bg-[#eef3ff] px-1.5 text-xs font-semibold text-[#2b418c]"
            >
              {activeCount}
            </Badge>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            mobileOpen && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'flex flex-col flex-wrap gap-3 md:flex md:flex-row md:items-center',
          !mobileOpen && 'max-md:hidden',
        )}
      >
        {children}
      </div>
    </div>
  )
}
