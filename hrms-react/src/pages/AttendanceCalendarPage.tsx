import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  format,
  parseISO,
  eachDayOfInterval,
  subDays,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from 'date-fns'
import { toast } from 'sonner'
import {
  Search,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Grid3X3,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { CollapsibleFilterBar } from '@/components/collapsible-filter-bar'
import { AttendanceSubNav } from '@/components/attendance-subnav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DEPARTMENTS,
  type Department,
  type Employee,
  type AttendanceRecord,
} from '@/lib/types'
import { useNavigate } from 'react-router-dom'
import { useHRMS } from '@/lib/store'
import {
  bulkAttendance,
  fetchAttendanceByRange,
  fetchEmployeesPage,
} from '../../backend/api.js'

type ListDepartmentFilter = Department | '__all__'
type RangeMode = 'seven' | 'month'

function buildMatrix(records: AttendanceRecord[]) {
  const m = new Map<string, 'present' | 'absent'>()
  for (const r of records) {
    m.set(`${r.employeeId}\t${r.date}`, r.status)
  }
  return m
}

type MarkDialogState = { employee: Employee; dateStr: string } | null

export function AttendanceCalendarPage() {
  const navigate = useNavigate()
  const { syncAttendanceForDate } = useHRMS()
  const [rangeMode, setRangeMode] = useState<RangeMode>('seven')
  const [focusDate, setFocusDate] = useState<Date>(() => new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [listDepartmentFilter, setListDepartmentFilter] =
    useState<ListDepartmentFilter>('__all__')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [rosterEmployees, setRosterEmployees] = useState<Employee[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isRosterLoading, setIsRosterLoading] = useState(true)
  const [rangeRecords, setRangeRecords] = useState<AttendanceRecord[]>([])
  const [isRangeLoading, setIsRangeLoading] = useState(true)
  const [markDialog, setMarkDialog] = useState<MarkDialogState>(null)
  const [pendingMarkStatus, setPendingMarkStatus] = useState<
    'present' | 'absent' | null
  >(null)
  const [isMarking, setIsMarking] = useState(false)
  const markingGuardRef = useRef(false)
  const skipSearchPageResetRef = useRef(true)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => window.clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    if (skipSearchPageResetRef.current) {
      skipSearchPageResetRef.current = false
      return
    }
    setPage(1)
  }, [debouncedSearch])

  const dateColumns = useMemo(() => {
    if (rangeMode === 'seven') {
      const end = focusDate
      const start = subDays(end, 6)
      return eachDayOfInterval({ start, end })
    }
    const start = startOfMonth(focusDate)
    const end = endOfMonth(focusDate)
    return eachDayOfInterval({ start, end })
  }, [rangeMode, focusDate])

  const rangeStartStr = format(dateColumns[0], 'yyyy-MM-dd')
  const rangeEndStr = format(dateColumns[dateColumns.length - 1], 'yyyy-MM-dd')

  const loadRosterPage = useCallback(async () => {
    setIsRosterLoading(true)
    try {
      const { employees: rows, count } = await fetchEmployeesPage({
        page,
        pageSize,
        search: debouncedSearch.trim() || undefined,
        department:
          listDepartmentFilter === '__all__' ? undefined : listDepartmentFilter,
        ordering: 'full_name,employee_id',
      })
      setRosterEmployees(rows)
      setTotalCount(count)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load employees.')
    } finally {
      setIsRosterLoading(false)
    }
  }, [page, pageSize, debouncedSearch, listDepartmentFilter])

  useEffect(() => {
    void loadRosterPage()
  }, [loadRosterPage])

  useEffect(() => {
    let cancelled = false
    async function loadRange() {
      setIsRangeLoading(true)
      try {
        const rows = await fetchAttendanceByRange(rangeStartStr, rangeEndStr)
        if (!cancelled) setRangeRecords(rows)
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Could not load attendance range.')
          setRangeRecords([])
        }
      } finally {
        if (!cancelled) setIsRangeLoading(false)
      }
    }
    void loadRange()
    return () => {
      cancelled = true
    }
  }, [rangeStartStr, rangeEndStr])

  const matrix = useMemo(() => buildMatrix(rangeRecords), [rangeRecords])

  const refreshRangeRecords = useCallback(async () => {
    try {
      const rows = await fetchAttendanceByRange(rangeStartStr, rangeEndStr)
      setRangeRecords(rows)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not refresh attendance.')
    }
  }, [rangeStartStr, rangeEndStr])

  const closeMarkDialog = useCallback(() => {
    if (isMarking) return
    setMarkDialog(null)
    setPendingMarkStatus(null)
  }, [isMarking])

  const confirmMarkAttendance = useCallback(async () => {
    if (!markDialog || !pendingMarkStatus || markingGuardRef.current) return
    markingGuardRef.current = true
    setIsMarking(true)
    try {
      const matrixKey = `${markDialog.employee.id}\t${markDialog.dateStr}`
      const prior = matrix.get(matrixKey)
      await bulkAttendance({
        date: markDialog.dateStr,
        status: pendingMarkStatus,
        employeeIds: [markDialog.employee.id],
        employeeExpectations: [
          {
            employeeId: markDialog.employee.id,
            expectedCurrentStatus:
              prior === 'present' || prior === 'absent' ? prior : null,
          },
        ],
      })
      await syncAttendanceForDate(markDialog.dateStr)
      await refreshRangeRecords()
      toast.success(
        `Marked ${markDialog.employee.fullName} ${pendingMarkStatus} on ${format(parseISO(markDialog.dateStr), 'MMM d, yyyy')}.`,
      )
      setMarkDialog(null)
      setPendingMarkStatus(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save attendance.')
    } finally {
      setIsMarking(false)
      markingGuardRef.current = false
    }
  }, [markDialog, matrix, pendingMarkStatus, refreshRangeRecords, syncAttendanceForDate])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const safePage = Math.min(page, totalPages)
  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, totalCount)

  const periodTitle =
    rangeMode === 'seven'
      ? `${format(dateColumns[0], 'MMM d')} – ${format(dateColumns[6], 'MMM d, yyyy')}`
      : format(focusDate, 'MMMM yyyy')

  const isLoadingGrid = isRosterLoading || isRangeLoading

  const listFilterActiveCount =
    (debouncedSearch.trim() !== '' ? 1 : 0) +
    (listDepartmentFilter !== '__all__' ? 1 : 0)

  return (
    <div className="min-h-screen">
      <AppHeader
        title="Attendance"
        subtitle="Calendar matrix — scan recent days or a full month per employee"
      />
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
        <AttendanceSubNav />

        <div className="flex flex-col gap-4 rounded-xl border border-[#dfe5f7] bg-white p-4 shadow-[0_8px_24px_rgba(43,65,140,0.05)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[#2b418c]">
              <Grid3X3 className="h-5 w-5" />
              <h2 className="text-sm font-semibold text-foreground">Period</h2>
            </div>
            <Select
              value={rangeMode}
              onValueChange={(v) => setRangeMode(v as RangeMode)}
            >
              <SelectTrigger className="h-9 w-[11rem] border-[#d8deef] bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seven">Last 7 days</SelectItem>
                <SelectItem value="month">Full month</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm font-medium text-foreground tabular-nums">
              {periodTitle}
            </span>
            {rangeMode === 'month' && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-[#d8deef]"
                  onClick={() => setFocusDate((d) => subMonths(d, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-[#d8deef]"
                  onClick={() => setFocusDate((d) => addMonths(d, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {rangeMode === 'seven' && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-[#d8deef]"
                  onClick={() => setFocusDate((d) => subWeeks(d, 1))}
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-[#d8deef]"
                  onClick={() => setFocusDate((d) => addWeeks(d, 1))}
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-[#d8deef] bg-white text-sm"
                >
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  {rangeMode === 'seven' ? 'Week ends' : 'Jump to month'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={focusDate}
                  onSelect={(d) => d && setFocusDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">P</span> present ·{' '}
            <span className="font-medium text-foreground">A</span> absent ·{' '}
            <span className="text-muted-foreground">—</span> no record. Click any cell to mark
            present or absent (with confirmation). Columns: {dateColumns.length} days.
          </p>
        </div>

        <CollapsibleFilterBar activeCount={listFilterActiveCount} label="Roster filters">
          <div className="relative w-full min-w-0 md:max-w-md md:flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border-[#d8deef] bg-white pl-9 text-sm"
            />
          </div>
          <Select
            value={listDepartmentFilter}
            onValueChange={(value) => {
              setListDepartmentFilter(value as ListDepartmentFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-full border-[#d8deef] bg-white text-sm md:w-48">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-full border-[#d8deef] bg-white text-sm md:w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </CollapsibleFilterBar>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Employees{' '}
            <span className="font-medium text-foreground tabular-nums">
              {rangeStart}–{rangeEnd}
            </span>{' '}
            of <span className="font-medium text-foreground tabular-nums">{totalCount}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={safePage <= 1 || isLoadingGrid}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums px-1">
              {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={safePage >= totalPages || isLoadingGrid}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#dfe5f7] bg-white shadow-[0_8px_24px_rgba(43,65,140,0.05)]">
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            {isLoadingGrid ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin opacity-60" />
                Loading calendar…
              </div>
            ) : totalCount === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No employees match your filters.
              </div>
            ) : (
              <>
              <Table className="hidden min-w-max border-collapse lg:table">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-[#e7ecfa]">
                    <TableHead className="sticky left-0 z-20 min-w-[200px] bg-white px-3 py-2 text-xs font-medium shadow-[4px_0_12px_rgba(43,65,140,0.06)]">
                      Employee
                    </TableHead>
                    {dateColumns.map((d) => {
                      const ds = format(d, 'yyyy-MM-dd')
                      return (
                        <TableHead
                          key={ds}
                          className="w-11 min-w-[2.75rem] px-0.5 py-2 text-center align-bottom"
                        >
                          <div className="flex flex-col items-center gap-0.5 leading-none">
                            <span className="text-[10px] font-medium uppercase text-[#2b418c]">
                              {format(d, 'EEE')}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-[#2b418c]">
                              {format(d, 'd')}
                            </span>
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rosterEmployees.map((emp) => (
                    <TableRow key={emp.id} className="border-[#f0f3fb]">
                      <TableCell className="sticky left-0 z-10 bg-white px-3 py-1.5 shadow-[4px_0_12px_rgba(43,65,140,0.06)]">
                        <button
                          type="button"
                          onClick={() => navigate(`/employees/${emp.id}`)}
                          className="min-w-0 w-full rounded-md text-left transition-colors hover:bg-[#f7f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/25 -mx-1 px-1 py-0.5"
                        >
                          <p className="truncate text-sm font-medium text-foreground">
                            {emp.fullName}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {emp.employeeId} · {emp.department}
                          </p>
                        </button>
                      </TableCell>
                      {dateColumns.map((d) => {
                        const ds = format(d, 'yyyy-MM-dd')
                        const st = matrix.get(`${emp.id}\t${ds}`)
                        return (
                          <TableCell key={ds} className="p-0.5 text-center">
                            <button
                              type="button"
                              disabled={isLoadingGrid}
                              onClick={() => {
                                setMarkDialog({ employee: emp, dateStr: ds })
                                setPendingMarkStatus(null)
                              }}
                              className="group mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-all duration-200 ease-out hover:scale-110 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(43,65,140,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/35 active:scale-95 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                              aria-label={`Attendance for ${emp.fullName} on ${format(parseISO(ds), 'MMM d')}: ${st === 'present' ? 'present' : st === 'absent' ? 'absent' : 'unmarked'}. Click to change.`}
                            >
                              {st === 'present' && (
                                <Badge
                                  className="pointer-events-none h-7 w-7 shrink-0 rounded-md border-success/25 bg-success/15 px-0 text-[11px] font-semibold text-success transition-all duration-200 group-hover:border-success/50 group-hover:bg-success/25 group-hover:shadow-sm"
                                  title="Present — click to change"
                                >
                                  P
                                </Badge>
                              )}
                              {st === 'absent' && (
                                <Badge
                                  className="pointer-events-none h-7 w-7 shrink-0 rounded-md border-destructive/25 bg-destructive/10 px-0 text-[11px] font-semibold text-destructive transition-all duration-200 group-hover:border-destructive/50 group-hover:bg-destructive/20 group-hover:shadow-sm"
                                  title="Absent — click to change"
                                >
                                  A
                                </Badge>
                              )}
                              {!st && (
                                <span
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-[#dfe5f7] bg-[#fafbff] text-xs text-muted-foreground transition-all duration-200 group-hover:border-[#2b418c]/35 group-hover:bg-[#eef3ff] group-hover:text-[#2b418c] group-hover:shadow-sm"
                                  title="No record — click to mark"
                                >
                                  —
                                </span>
                              )}
                            </button>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ul className="space-y-4 p-4 lg:hidden" aria-label="Attendance by employee">
                {rosterEmployees.map((emp) => (
                  <li
                    key={emp.id}
                    className="rounded-xl border border-[#dfe5f7] bg-[#fafbff] p-4 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="mb-3 w-full rounded-lg text-left transition-colors hover:bg-[#f0f3fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/25"
                    >
                      <p className="truncate text-sm font-semibold text-[#2b418c]">
                        {emp.fullName}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {emp.employeeId} · {emp.department}
                      </p>
                    </button>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {dateColumns.length} days · tap a cell to mark
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {dateColumns.map((d) => {
                        const ds = format(d, 'yyyy-MM-dd')
                        const st = matrix.get(`${emp.id}\t${ds}`)
                        return (
                          <button
                            key={ds}
                            type="button"
                            disabled={isLoadingGrid}
                            onClick={() => {
                              setMarkDialog({ employee: emp, dateStr: ds })
                              setPendingMarkStatus(null)
                            }}
                            className="flex min-w-[2.25rem] flex-col items-center gap-0.5 rounded-md border border-[#e8ecf7] bg-white px-1 py-1.5 text-center transition-all hover:border-[#2b418c]/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/30 disabled:pointer-events-none disabled:opacity-50"
                            aria-label={`${format(d, 'EEE d')}: ${st === 'present' ? 'present' : st === 'absent' ? 'absent' : 'unmarked'}`}
                          >
                            <span className="text-[9px] font-medium uppercase text-[#2b418c]">
                              {format(d, 'EEE')}
                            </span>
                            <span className="text-[10px] font-semibold tabular-nums text-[#2b418c]">
                              {format(d, 'd')}
                            </span>
                            <span className="mt-0.5">
                              {st === 'present' && (
                                <Badge className="h-5 min-w-[1.25rem] border-success/25 bg-success/15 px-0 text-[10px] font-semibold text-success">
                                  P
                                </Badge>
                              )}
                              {st === 'absent' && (
                                <Badge className="h-5 min-w-[1.25rem] border-destructive/25 bg-destructive/10 px-0 text-[10px] font-semibold text-destructive">
                                  A
                                </Badge>
                              )}
                              {!st && (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-dashed border-[#dfe5f7] text-[10px] text-muted-foreground">
                                  —
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={markDialog !== null}
        onOpenChange={(open) => {
          if (!open && !isMarking) {
            setMarkDialog(null)
            setPendingMarkStatus(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isMarking}>
          {markDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {pendingMarkStatus ? 'Confirm attendance' : 'Mark attendance'}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {!pendingMarkStatus ? (
                      <>
                        <p>
                          <span className="font-medium text-foreground">
                            {markDialog.employee.fullName}
                          </span>{' '}
                          <span className="font-mono text-xs">
                            ({markDialog.employee.employeeId})
                          </span>
                        </p>
                        <p>
                          {format(parseISO(markDialog.dateStr), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p>
                          Current:{' '}
                          <span className="text-foreground">
                            {(() => {
                              const s = matrix.get(
                                `${markDialog.employee.id}\t${markDialog.dateStr}`,
                              )
                              if (!s) return 'Unmarked'
                              return s === 'present' ? 'Present' : 'Absent'
                            })()}
                          </span>
                        </p>
                        <p>Choose present or absent, then confirm on the next step.</p>
                      </>
                    ) : (
                      <p>
                        Mark{' '}
                        <span className="font-medium text-foreground">
                          {markDialog.employee.fullName}
                        </span>{' '}
                        as{' '}
                        <span
                          className={
                            pendingMarkStatus === 'present'
                              ? 'font-semibold text-success'
                              : 'font-semibold text-destructive'
                          }
                        >
                          {pendingMarkStatus === 'present' ? 'present' : 'absent'}
                        </span>{' '}
                        on{' '}
                        {format(parseISO(markDialog.dateStr), 'MMMM d, yyyy')}?
                      </p>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
                {!pendingMarkStatus ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={closeMarkDialog}
                      disabled={isMarking}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setPendingMarkStatus('absent')}
                      disabled={isMarking}
                    >
                      Mark absent
                    </Button>
                    <Button
                      type="button"
                      className="bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => setPendingMarkStatus('present')}
                      disabled={isMarking}
                    >
                      Mark present
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setPendingMarkStatus(null)}
                      disabled={isMarking}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeMarkDialog}
                      disabled={isMarking}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={isMarking}
                      className={
                        pendingMarkStatus === 'present'
                          ? 'bg-success text-success-foreground hover:bg-success/90'
                          : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      }
                      onClick={() => {
                        void confirmMarkAttendance()
                      }}
                    >
                      {isMarking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Confirm'
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
