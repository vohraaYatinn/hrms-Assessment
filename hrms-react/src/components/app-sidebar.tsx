import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
]

type SidebarNavPanelProps = {
  className?: string
  onNavigate?: () => void
}

export function SidebarNavPanel({ className, onNavigate }: SidebarNavPanelProps) {
  const { pathname } = useLocation()

  return (
    <div className={cn('flex h-full flex-col bg-[#1f2f69]', className)}>
      <div className="flex h-16 items-center gap-2.5 border-b border-[#334887] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e8c547]">
          <span className="text-sm font-bold text-primary-foreground">H</span>
        </div>
        <span className="text-sm font-semibold tracking-wide text-sidebar-foreground">HRMS</span>
      </div>

      <div className="px-3 py-4">
        <div className="flex w-full items-center gap-2.5 rounded-lg bg-[#2d4181] px-3 py-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#e8c547]/20 text-[#f7d868] text-xs font-medium">
              JD
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-sidebar-foreground">Yatin Vohra</p>
            <p className="truncate text-xs text-[color:var(--sidebar-muted)]">Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/attendance'
                ? pathname === '/attendance' || pathname.startsWith('/attendance/')
                : pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => onNavigate?.()}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#3a5098] text-sidebar-foreground shadow-[inset_3px_0_0_#e8c547]'
                    : 'text-[color:var(--sidebar-muted)] hover:bg-[#2b3f7a] hover:text-sidebar-foreground',
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col bg-[#1f2f69] shadow-[2px_0_14px_rgba(16,24,40,0.2)] lg:flex">
      <SidebarNavPanel className="h-full w-full" />
    </aside>
  )
}
