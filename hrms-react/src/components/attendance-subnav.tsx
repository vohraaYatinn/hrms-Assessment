import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const links = [
  { to: '/attendance', label: 'Daily roster', end: true },
  { to: '/attendance/calendar', label: 'Calendar view', end: false },
]

export function AttendanceSubNav() {
  return (
    <nav
      className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto border-b border-[#dfe5f7] pb-3"
      aria-label="Attendance views"
    >
      {links.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#2b418c] text-white shadow-sm'
                : 'text-muted-foreground hover:bg-[#f4f6fc] hover:text-foreground',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
