import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarCheck, Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 bg-sidebar flex flex-col">
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">H</span>
        </div>
        <span className="text-base font-semibold text-sidebar-foreground">HRMS</span>
      </div>

      <div className="px-3 py-3">
        <button type="button" className="flex w-full items-center gap-2.5 rounded-lg bg-sidebar-accent px-3 py-2.5 transition-colors hover:bg-sidebar-accent/80">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
              JD
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-sidebar-foreground truncate">John Doe</p>
            <p className="text-xs text-[color:var(--sidebar-muted)] truncate">Admin</p>
          </div>
          <ChevronDown className="h-4 w-4 text-[color:var(--sidebar-muted)]" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-[color:var(--sidebar-muted)] hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="px-3 pb-4">
        <a
          href="#"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--sidebar-muted)] transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </a>
      </div>
    </aside>
  )
}
