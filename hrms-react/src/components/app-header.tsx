
import type { ReactNode } from 'react'
import { Search, Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AppHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function AppHeader({ title, subtitle, action }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <h1 className="text-[15px] font-semibold uppercase text-foreground tracking-wide">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            className="w-56 pl-9 h-9 text-sm bg-secondary border border-border focus-visible:ring-1"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            Ctrl K
          </kbd>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground">
          <Plus className="h-4 w-4" />
        </Button>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
