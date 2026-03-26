
import type { ReactNode } from 'react'
import { Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AppHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function AppHeader({ title, subtitle, action }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dfe5f7] bg-white/90 px-6 backdrop-blur">
      <div>
        <h1 className="text-[1.05rem] font-semibold tracking-tight text-[#2b418c]">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground/90">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            className="h-9 w-56 rounded-lg border-[#d8deef] bg-white pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/20"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border border-[#e0e5f3] bg-white px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            Ctrl K
          </kbd>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-[#edf1ff] text-[#2b418c] hover:bg-[#e3e9ff]">
          <Plus className="h-4 w-4" />
        </Button>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
