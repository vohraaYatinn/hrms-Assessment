import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Employee } from '@/lib/types'
import { fetchEmployeesPage } from '../../backend/api.js'
import { Button } from '@/components/ui/button'
import { useMobileNav } from '@/components/mobile-nav-context'

interface AppHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function HeaderEmployeeSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 300)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    const q = debounced.trim()
    if (!q) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    const id = ++requestIdRef.current
    setLoading(true)
    setOpen(true)

    fetchEmployeesPage({ page: 1, pageSize: 8, search: q })
      .then(({ employees }) => {
        if (id !== requestIdRef.current) return
        setResults(employees)
      })
      .catch(() => {
        if (id !== requestIdRef.current) return
        setResults([])
      })
      .finally(() => {
        if (id !== requestIdRef.current) return
        setLoading(false)
      })
  }, [debounced])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const selectEmployee = (emp: Employee) => {
    navigate(`/employees/${emp.id}`)
    setQuery('')
    setDebounced('')
    setResults([])
    setOpen(false)
  }

  const showPanel = open && debounced.trim().length > 0

  return (
    <div ref={containerRef} className="relative w-full min-w-0 sm:max-w-sm sm:flex-1 lg:w-56 lg:max-w-none lg:flex-none">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query.trim()) setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        autoComplete="off"
        className="h-9 w-full rounded-lg border-[#d8deef] bg-white pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/20"
      />
      {showPanel && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] z-50 max-h-80 w-full min-w-[16rem] overflow-auto rounded-lg border border-[#d8deef] bg-white py-1 shadow-lg"
          role="listbox"
          aria-label="Employee search results"
        >
          {loading ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">No employees found</p>
          ) : (
            <ul className="py-0.5">
              {results.map((emp) => (
                <li key={emp.id} role="option">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-[#eef3ff]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectEmployee(emp)}
                  >
                    <Avatar className="h-8 w-8 shrink-0 border border-[#e8ecf8]">
                      <AvatarFallback className="bg-[#edf1ff] text-[0.65rem] font-medium text-[#2b418c]">
                        {getInitials(emp.fullName || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[#2b418c]">
                        {emp.fullName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {emp.department}
                        {emp.employeeId ? ` · ${emp.employeeId}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function AppHeader({ title, subtitle, action }: AppHeaderProps) {
  const { openNav } = useMobileNav()

  return (
    <header className="sticky top-0 z-30 border-b border-[#dfe5f7] bg-white/90 px-4 py-3 backdrop-blur sm:px-6 sm:py-0">
      <div className="flex min-h-14 flex-col gap-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-2 sm:items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 h-9 w-9 shrink-0 text-[#2b418c] hover:bg-[#eef3ff] lg:hidden"
            onClick={openNav}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.05rem] font-semibold tracking-tight text-[#2b418c]">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground/90">{subtitle}</p>
            )}
          </div>
          {action ? (
            <div className="shrink-0 sm:hidden">{action}</div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <HeaderEmployeeSearch />
          {action ? <div className="hidden shrink-0 sm:block">{action}</div> : null}
        </div>
      </div>
    </header>
  )
}
