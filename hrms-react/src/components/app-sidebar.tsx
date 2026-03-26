import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarCheck, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col bg-[#1f2f69] shadow-[2px_0_14px_rgba(16,24,40,0.2)]">
      <div className="flex h-16 items-center gap-2.5 border-b border-[#334887] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e8c547]">
          <span className="text-sm font-bold text-primary-foreground">H</span>
        </div>
        <span className="text-sm font-semibold tracking-wide text-sidebar-foreground">HRMS</span>
      </div>

      <div className="px-3 py-4">
        <button type="button" className="flex w-full items-center gap-2.5 rounded-lg bg-[#2d4181] px-3 py-2.5 transition-colors hover:bg-[#344a8f]">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#e8c547]/20 text-[#f7d868] text-xs font-medium">
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
            const isActive =
              item.href === '/attendance'
                ? pathname === '/attendance' || pathname.startsWith('/attendance/')
                : pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#3a5098] text-sidebar-foreground shadow-[inset_3px_0_0_#e8c547]'
                    : 'text-[color:var(--sidebar-muted)] hover:bg-[#2b3f7a] hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
