import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isAfter, startOfDay } from 'date-fns'
import { toast } from 'sonner'
import {
  Search,
  CalendarDays,
  UserCheck,
  UserX,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { CollapsibleFilterBar } from '@/components/collapsible-filter-bar'
import { AttendanceSubNav } from '@/components/attendance-subnav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useHRMS } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  DEPARTMENTS,
  type Department,
  type Employee,
  type AttendanceRecord,
} from '@/lib/types'
import {
  createDemoPastAttendance,
  deleteAllAttendance,
  fetchAllEmployeesMatching,
  fetchAttendance,
  fetchEmployeesPage,
  removeAttendance,
} from '../../backend/api.js'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'

type ListDepartmentFilter = Department | '__all__'
type RosterAttendanceFilter = '__all__' | 'present' | 'absent'

function isFutureAttendanceDate(d: Date): boolean {
  return isAfter(startOfDay(d), startOfDay(new Date()))
}

export function AttendancePage() {
  const navigate = useNavigate()
  const {
    employees,
    attendance,
    bulkMarkAttendance,
    syncAttendanceForDate,
    replaceAttendanceSnapshot,
  } = useHRMS()
  const [clearAttendanceTarget, setClearAttendanceTarget] = useState<{
    recordId: string
    employeeName: string
  } | null>(null)
  const [isClearAttendanceLoading, setIsClearAttendanceLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [listDepartmentFilter, setListDepartmentFilter] =
    useState<ListDepartmentFilter>('__all__')
  const [rosterAttendanceFilter, setRosterAttendanceFilter] =
    useState<RosterAttendanceFilter>('__all__')
  const [attendanceDate, setAttendanceDate] = useState<Date>(new Date())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [rosterEmployees, setRosterEmployees] = useState<Employee[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isRosterLoading, setIsRosterLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [isSelectAllLoading, setIsSelectAllLoading] = useState(false)
  const [demoPastDays, setDemoPastDays] = useState('7')
  const [demoPastStatus, setDemoPastStatus] = useState<'present' | 'absent'>('present')
  const [isDemoPastLoading, setIsDemoPastLoading] = useState(false)
  const [isPurgeAttendanceLoading, setIsPurgeAttendanceLoading] = useState(false)
  const [mobileBulkOpen, setMobileBulkOpen] = useState(false)
  const [demoAttendanceOpen, setDemoAttendanceOpen] = useState(true)
  const skipSearchPageResetRef = useRef(true)
  const savingGuardRef = useRef(false)
  const clearAttendanceGuardRef = useRef(false)
  const selectAllGuardRef = useRef(false)
  const demoPastGuardRef = useRef(false)
  const purgeAttendanceGuardRef = useRef(false)

  const dateStr = format(attendanceDate, 'yyyy-MM-dd')
  const isWorkingDateFuture = useMemo(
    () => isFutureAttendanceDate(attendanceDate),
    [attendanceDate],
  )

  useEffect(() => {
    const today = startOfDay(new Date())
    if (isAfter(startOfDay(attendanceDate), today)) {
      setAttendanceDate(today)
    }
  }, [attendanceDate])

  useEffect(() => {
    void syncAttendanceForDate(dateStr)
  }, [dateStr, syncAttendanceForDate])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [dateStr, rosterAttendanceFilter])

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
        ...(rosterAttendanceFilter === '__all__'
          ? {}
          : {
              attendanceDate: dateStr,
              attendanceStatus: rosterAttendanceFilter,
            }),
      })
      setRosterEmployees(rows)
      setTotalCount(count)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load roster.')
    } finally {
      setIsRosterLoading(false)
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    listDepartmentFilter,
    rosterAttendanceFilter,
    dateStr,
  ])

  useEffect(() => {
    void loadRosterPage()
  }, [loadRosterPage])

  const dayMap = useMemo(() => {
    const m = new Map<string, AttendanceRecord>()
    for (const r of attendance) {
      if (r.date === dateStr) m.set(r.employeeId, r)
    }
    return m
  }, [attendance, dateStr])

  const rosterStats = useMemo(() => {
    let present = 0
    let absent = 0
    let unmarked = 0
    for (const e of employees) {
      const rec = dayMap.get(e.id)
      if (!rec) unmarked += 1
      else if (rec.status === 'present') present += 1
      else absent += 1
    }
    return { present, absent, unmarked, total: employees.length }
  }, [employees, dayMap])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const safePage = Math.min(page, totalPages)
  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, totalCount)

  const hasActiveListFilters =
    debouncedSearch.trim() !== '' ||
    listDepartmentFilter !== '__all__' ||
    rosterAttendanceFilter !== '__all__'
  const listFilterActiveCount =
    (debouncedSearch.trim() !== '' ? 1 : 0) +
    (listDepartmentFilter !== '__all__' ? 1 : 0) +
    (rosterAttendanceFilter !== '__all__' ? 1 : 0)

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllMatching = useCallback(async () => {
    if (
      totalCount === 0 ||
      isSelectAllLoading ||
      isRosterLoading ||
      selectAllGuardRef.current
    )
      return

    let clearedWithoutFetch = false
    setSelectedIds((prev) => {
      if (totalCount > 0 && prev.size === totalCount) {
        clearedWithoutFetch = true
        return new Set()
      }
      return prev
    })
    if (clearedWithoutFetch) return

    selectAllGuardRef.current = true
    setIsSelectAllLoading(true)
    try {
      const all = await fetchAllEmployeesMatching({
        search: debouncedSearch,
        department:
          listDepartmentFilter === '__all__' ? undefined : listDepartmentFilter,
        ...(rosterAttendanceFilter === '__all__'
          ? {}
          : {
              attendanceDate: dateStr,
              attendanceStatus: rosterAttendanceFilter,
            }),
      })
      setSelectedIds(new Set(all.map((e) => e.id)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load employees to select.')
    } finally {
      setIsSelectAllLoading(false)
      selectAllGuardRef.current = false
    }
  }, [
    dateStr,
    debouncedSearch,
    isRosterLoading,
    isSelectAllLoading,
    listDepartmentFilter,
    rosterAttendanceFilter,
    totalCount,
  ])

  const runBulk = useCallback(
    async (opts: {
      status: 'present' | 'absent'
      employeeIds?: string[]
      successMessage: string
    }) => {
      if (isFutureAttendanceDate(attendanceDate)) {
        toast.error('Attendance cannot be recorded for a future date.')
        return
      }
      if (savingGuardRef.current) return
      savingGuardRef.current = true
      setIsSaving(true)
      try {
        await bulkMarkAttendance({
          date: dateStr,
          status: opts.status,
          employeeIds: opts.employeeIds,
        })
        toast.success(opts.successMessage)
        setSelectedIds(new Set())
        await loadRosterPage()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not save attendance.')
      } finally {
        setIsSaving(false)
        savingGuardRef.current = false
      }
    },
    [attendanceDate, bulkMarkAttendance, dateStr, loadRosterPage],
  )

  const runBulkUnmarkedMatchingPresent = useCallback(async () => {
    if (isFutureAttendanceDate(attendanceDate)) {
      toast.error('Attendance cannot be recorded for a future date.')
      return
    }
    if (savingGuardRef.current) return
    savingGuardRef.current = true
    setIsSaving(true)
    try {
      const all = await fetchAllEmployeesMatching({
        search: debouncedSearch,
        department:
          listDepartmentFilter === '__all__' ? undefined : listDepartmentFilter,
        ...(rosterAttendanceFilter === '__all__'
          ? {}
          : {
              attendanceDate: dateStr,
              attendanceStatus: rosterAttendanceFilter,
            }),
      })
      const ids = all.filter((e) => !dayMap.has(e.id)).map((e) => e.id)
      if (ids.length === 0) {
        toast.info('No unmarked employees in this filter.')
        return
      }
      await bulkMarkAttendance({
        date: dateStr,
        status: 'present',
        employeeIds: ids,
      })
      toast.success(`Marked ${ids.length} unmarked employee(s) present.`)
      setSelectedIds(new Set())
      await loadRosterPage()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save attendance.')
    } finally {
      setIsSaving(false)
      savingGuardRef.current = false
    }
  }, [
    attendanceDate,
    bulkMarkAttendance,
    dateStr,
    dayMap,
    debouncedSearch,
    listDepartmentFilter,
    loadRosterPage,
    rosterAttendanceFilter,
  ])

  const runBulkUnmarkedMatchingAbsent = useCallback(async () => {
    if (isFutureAttendanceDate(attendanceDate)) {
      toast.error('Attendance cannot be recorded for a future date.')
      return
    }
    if (savingGuardRef.current) return
    savingGuardRef.current = true
    setIsSaving(true)
    try {
      const all = await fetchAllEmployeesMatching({
        search: debouncedSearch,
        department:
          listDepartmentFilter === '__all__' ? undefined : listDepartmentFilter,
        ...(rosterAttendanceFilter === '__all__'
          ? {}
          : {
              attendanceDate: dateStr,
              attendanceStatus: rosterAttendanceFilter,
            }),
      })
      const ids = all.filter((e) => !dayMap.has(e.id)).map((e) => e.id)
      if (ids.length === 0) {
        toast.info('No unmarked employees in this filter.')
        return
      }
      await bulkMarkAttendance({
        date: dateStr,
        status: 'absent',
        employeeIds: ids,
      })
      toast.success(`Marked ${ids.length} unmarked employee(s) absent.`)
      setSelectedIds(new Set())
      await loadRosterPage()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save attendance.')
    } finally {
      setIsSaving(false)
      savingGuardRef.current = false
    }
  }, [
    attendanceDate,
    bulkMarkAttendance,
    dateStr,
    dayMap,
    debouncedSearch,
    listDepartmentFilter,
    loadRosterPage,
    rosterAttendanceFilter,
  ])

  const allMatchingSelected =
    totalCount > 0 && selectedIds.size === totalCount
  const someMatchingSelected =
    selectedIds.size > 0 && !allMatchingSelected
  const headerCheckboxChecked: boolean | 'indeterminate' = allMatchingSelected
    ? true
    : someMatchingSelected
      ? 'indeterminate'
      : false

  const statusFor = (employee: Employee) => {
    const rec = dayMap.get(employee.id)
    if (!rec) return 'unmarked' as const
    return rec.status
  }

  const handleClearAttendance = useCallback(async () => {
    const target = clearAttendanceTarget
    if (!target || clearAttendanceGuardRef.current) return
    clearAttendanceGuardRef.current = true
    setIsClearAttendanceLoading(true)
    try {
      await removeAttendance(target.recordId)
      toast.success(`Cleared attendance for ${target.employeeName}.`)
      setClearAttendanceTarget(null)
      await syncAttendanceForDate(dateStr)
      await loadRosterPage()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not clear attendance.')
    } finally {
      setIsClearAttendanceLoading(false)
      clearAttendanceGuardRef.current = false
    }
  }, [clearAttendanceTarget, syncAttendanceForDate, dateStr, loadRosterPage])

  return (
    <div className="min-h-screen">
      <AppHeader
        title="Attendance"
        subtitle="Mark attendance by day — bulk actions for large teams"
      />
      <div className="space-y-6 p-4 sm:p-6">
        <AttendanceSubNav />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Working date</Label>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              Only today and past dates — future days cannot be marked.
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-full justify-start text-left text-sm font-normal sm:w-56"
                >
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(attendanceDate, 'EEE, MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={attendanceDate}
                  onSelect={(d) => {
                    if (!d) return
                    if (isFutureAttendanceDate(d)) {
                      toast.error('Attendance cannot be recorded for a future date.')
                      return
                    }
                    setAttendanceDate(d)
                  }}
                  disabled={(d) => isFutureAttendanceDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="border-[#dfe5f7] bg-white font-normal text-xs h-8 px-3"
            >
              <span className="text-muted-foreground">Present</span>
              <span className="ml-1.5 font-semibold text-success tabular-nums">
                {rosterStats.present}
              </span>
            </Badge>
            <Badge
              variant="secondary"
              className="border-[#dfe5f7] bg-white font-normal text-xs h-8 px-3"
            >
              <span className="text-muted-foreground">Absent</span>
              <span className="ml-1.5 font-semibold text-destructive tabular-nums">
                {rosterStats.absent}
              </span>
            </Badge>
            <Badge
              variant="secondary"
              className="border-[#dfe5f7] bg-white font-normal text-xs h-8 px-3"
            >
              <span className="text-muted-foreground">Unmarked</span>
              <span className="ml-1.5 font-semibold tabular-nums">
                {rosterStats.unmarked}
              </span>
            </Badge>
            <Badge
              variant="outline"
              className="font-normal text-xs h-8 px-3 border-[#d8deef]"
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              {rosterStats.total} employees
            </Badge>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[#dfe5f7] bg-white p-4 shadow-[0_8px_24px_rgba(43,65,140,0.05)]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#eef1f8] bg-[#fafbff] px-3 py-2.5 text-left md:hidden"
            onClick={() => setMobileBulkOpen((v) => !v)}
            aria-expanded={mobileBulkOpen}
          >
            <span className="text-sm font-medium text-foreground">Bulk actions</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                mobileBulkOpen && 'rotate-180',
              )}
            />
          </button>
          <h3 className="hidden text-sm font-medium text-foreground md:block">Bulk actions</h3>
          <div
            className={cn(
              'space-y-3',
              !mobileBulkOpen && 'max-md:hidden',
            )}
          >
          <p className="max-w-3xl text-xs text-muted-foreground">
            Filters apply to the roster below. Unmarked-only actions use the same search,
            department, and day-status filters as the table. Selected-row actions use your
            checkboxes. Org-wide counts for the day are in the badges above.
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedIds.size === 0 && (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving || totalCount === 0 || isWorkingDateFuture}
                  className="h-9 bg-success text-success-foreground shadow-none hover:bg-success/90"
                  onClick={() => void runBulkUnmarkedMatchingPresent()}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Unmarked only → present</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving || totalCount === 0 || isWorkingDateFuture}
                  className="h-9 bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90"
                  onClick={() => void runBulkUnmarkedMatchingAbsent()}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserX className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Unmarked only → absent</span>
                </Button>
              </>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSaving || selectedIds.size === 0 || isWorkingDateFuture}
              className="h-9 border-success/40 bg-success/5 text-success hover:bg-success/15 hover:text-success"
              onClick={() =>
                void runBulk({
                  status: 'present',
                  employeeIds: Array.from(selectedIds),
                  successMessage: `Marked ${selectedIds.size} selected employee(s) present.`,
                })
              }
            >
              <UserCheck className="h-4 w-4" />
              <span className="ml-1.5">Selected ({selectedIds.size}) → present</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSaving || selectedIds.size === 0 || isWorkingDateFuture}
              className="h-9 border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/15 hover:text-destructive"
              onClick={() =>
                void runBulk({
                  status: 'absent',
                  employeeIds: Array.from(selectedIds),
                  successMessage: `Marked ${selectedIds.size} selected employee(s) absent.`,
                })
              }
            >
              <UserX className="h-4 w-4" />
              <span className="ml-1.5">Selected ({selectedIds.size}) → absent</span>
            </Button>
          </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-dashed border-[#d8deef] bg-[#fafbff] p-4 shadow-none">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#e8ecf7] bg-white px-3 py-2.5 text-left"
            onClick={() => setDemoAttendanceOpen((v) => !v)}
            aria-expanded={demoAttendanceOpen}
          >
            <span className="text-sm font-medium text-foreground">Demo attendance</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                demoAttendanceOpen && 'rotate-180',
              )}
            />
          </button>
          <div className={cn('space-y-3', !demoAttendanceOpen && 'hidden')}>
          <p className="max-w-3xl text-xs text-muted-foreground">
            Fill the last N calendar days <span className="font-medium">before today</span> for every
            employee (useful for charts and testing). Today is left unchanged. You can remove every
            attendance row below without deleting employees.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="demo-past-days" className="text-xs text-muted-foreground">
                Past days to fill
              </Label>
              <Input
                id="demo-past-days"
                type="number"
                min={1}
                max={366}
                value={demoPastDays}
                onChange={(e) => setDemoPastDays(e.target.value)}
                className="h-9 w-full sm:w-28 rounded-lg border-[#d8deef] bg-white text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status for those days</Label>
              <Select
                value={demoPastStatus}
                onValueChange={(v) => setDemoPastStatus(v as 'present' | 'absent')}
              >
                <SelectTrigger className="h-9 w-full sm:w-40 border-[#d8deef] bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isDemoPastLoading || employees.length === 0}
              className="h-9"
              onClick={() => {
                if (demoPastGuardRef.current) return
                const n = Number.parseInt(demoPastDays, 10)
                if (!Number.isFinite(n) || n < 1 || n > 366) {
                  toast.error('Enter a number of days between 1 and 366.')
                  return
                }
                demoPastGuardRef.current = true
                void (async () => {
                  setIsDemoPastLoading(true)
                  try {
                    await createDemoPastAttendance(n, demoPastStatus)
                    toast.success(
                      `Demo attendance applied for the last ${n} day(s) before today.`,
                    )
                    const rows = await fetchAttendance()
                    replaceAttendanceSnapshot(rows)
                    await syncAttendanceForDate(dateStr)
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : 'Could not apply demo attendance.',
                    )
                  } finally {
                    setIsDemoPastLoading(false)
                    demoPastGuardRef.current = false
                  }
                })()
              }}
            >
              {isDemoPastLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Fill past days
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPurgeAttendanceLoading}
                  className="h-9 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Delete all attendance
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all attendance?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes every attendance record in the system. Employees are not deleted.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPurgeAttendanceLoading}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isPurgeAttendanceLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      if (purgeAttendanceGuardRef.current) return
                      purgeAttendanceGuardRef.current = true
                      void (async () => {
                        setIsPurgeAttendanceLoading(true)
                        try {
                          await deleteAllAttendance()
                          toast.success('All attendance records removed.')
                          replaceAttendanceSnapshot([])
                          await syncAttendanceForDate(dateStr)
                        } catch (e) {
                          toast.error(
                            e instanceof Error ? e.message : 'Could not delete attendance.',
                          )
                        } finally {
                          setIsPurgeAttendanceLoading(false)
                          purgeAttendanceGuardRef.current = false
                        }
                      })()
                    }}
                  >
                    {isPurgeAttendanceLoading ? 'Deleting…' : 'Delete all'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          </div>
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
            value={rosterAttendanceFilter}
            onValueChange={(value) => {
              setRosterAttendanceFilter(value as RosterAttendanceFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-full border-[#d8deef] bg-white text-sm md:w-44">
              <SelectValue placeholder="Day status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="present">Present only</SelectItem>
              <SelectItem value="absent">Absent only</SelectItem>
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

        <div className="overflow-hidden rounded-xl border border-[#dfe5f7] bg-white shadow-[0_8px_24px_rgba(43,65,140,0.05)]">
          <div className="flex items-center justify-between gap-2 border-b border-[#e7ecfa] px-3 py-2 text-xs text-muted-foreground sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className="flex shrink-0 items-center md:hidden"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={headerCheckboxChecked}
                  disabled={
                    totalCount === 0 || isRosterLoading || isSelectAllLoading
                  }
                  onCheckedChange={() => {
                    void toggleSelectAllMatching()
                  }}
                  aria-label="Select all employees matching current filters"
                  className="h-5 w-5 border-[#7a8fc4] shadow-sm data-[state=unchecked]:bg-white"
                />
              </div>
              <span className="min-w-0 leading-snug">
                Showing{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {rangeStart}–{rangeEnd}
                </span>{' '}
                of{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {totalCount}
                </span>
                {hasActiveListFilters ? ' (filtered)' : ''}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={safePage <= 1 || isRosterLoading}
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
                disabled={safePage >= totalPages || isRosterLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isRosterLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-60" />
              <p className="mt-2">Loading roster…</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {hasActiveListFilters
                ? 'No employees match your filters.'
                : 'No employees yet.'}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={headerCheckboxChecked}
                          disabled={
                            totalCount === 0 || isRosterLoading || isSelectAllLoading
                          }
                          onCheckedChange={() => {
                            void toggleSelectAllMatching()
                          }}
                          aria-label="Select all employees matching current filters"
                        />
                      </TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead className="hidden sm:table-cell">ID</TableHead>
                      <TableHead className="hidden md:table-cell">Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[260px] text-right">Quick set</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterEmployees.map((employee) => {
                      const st = statusFor(employee)
                      const dayRec = dayMap.get(employee.id)
                      return (
                        <TableRow
                          key={employee.id}
                          className="cursor-pointer hover:bg-[#f7f9ff]"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(employee.id)}
                              onCheckedChange={() => toggleSelect(employee.id)}
                              aria-label={`Select ${employee.fullName}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-[#d9e1f4]">
                                <AvatarFallback className="bg-[#edf2ff] text-[#2b418c] text-xs font-medium">
                                  {getInitials(employee.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {employee.fullName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground sm:hidden">
                                  {employee.employeeId} · {employee.department}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                            {employee.employeeId}
                          </TableCell>
                          <TableCell className="hidden text-sm md:table-cell">
                            {employee.department}
                          </TableCell>
                          <TableCell>
                            {st === 'unmarked' && (
                              <Badge variant="outline" className="text-xs font-normal">
                                Unmarked
                              </Badge>
                            )}
                            {st === 'present' && (
                              <Badge className="border-success/20 bg-success/10 text-xs text-success hover:bg-success/10">
                                Present
                              </Badge>
                            )}
                            {st === 'absent' && (
                              <Badge className="border-destructive/20 bg-destructive/10 text-xs text-destructive hover:bg-destructive/10">
                                Absent
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  'h-8 px-2 text-xs',
                                  st === 'present' && 'bg-success/10 text-success',
                                )}
                                disabled={isSaving || isWorkingDateFuture}
                                onClick={() =>
                                  void runBulk({
                                    status: 'present',
                                    employeeIds: [employee.id],
                                    successMessage: `${employee.fullName} marked present.`,
                                  })
                                }
                              >
                                Present
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  'h-8 px-2 text-xs',
                                  st === 'absent' && 'bg-destructive/10 text-destructive',
                                )}
                                disabled={isSaving || isWorkingDateFuture}
                                onClick={() =>
                                  void runBulk({
                                    status: 'absent',
                                    employeeIds: [employee.id],
                                    successMessage: `${employee.fullName} marked absent.`,
                                  })
                                }
                              >
                                Absent
                              </Button>
                              {dayRec && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  disabled={
                                    isSaving || isClearAttendanceLoading || isWorkingDateFuture
                                  }
                                  title="Clear attendance for this day"
                                  onClick={() =>
                                    setClearAttendanceTarget({
                                      recordId: dayRec.id,
                                      employeeName: employee.fullName,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="sr-only">Clear attendance</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <ul className="space-y-3 p-3 md:hidden" aria-label="Attendance roster">
                {rosterEmployees.map((employee) => {
                  const st = statusFor(employee)
                  const dayRec = dayMap.get(employee.id)
                  return (
                    <li
                      key={employee.id}
                      className="rounded-xl border border-[#dfe5f7] bg-[#fafbff] p-4 shadow-sm"
                    >
                      <div className="flex gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-lg border border-[#b8c4e6] bg-white shadow-sm active:bg-[#eef1fb]"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedIds.has(employee.id)}
                            onCheckedChange={() => toggleSelect(employee.id)}
                            aria-label={`Select ${employee.fullName}`}
                            className="h-5 w-5 border-[#7a8fc4] shadow-sm data-[state=unchecked]:bg-white"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/employees/${employee.id}`}
                              className="min-w-0 flex items-center gap-2 rounded-md text-left transition-colors hover:bg-[#f0f3fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/25"
                            >
                              <Avatar className="h-9 w-9 shrink-0 border border-[#d9e1f4]">
                                <AvatarFallback className="bg-[#edf2ff] text-[#2b418c] text-xs font-medium">
                                  {getInitials(employee.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#2b418c]">
                                  {employee.fullName}
                                </p>
                                <p className="truncate font-mono text-[11px] text-muted-foreground">
                                  {employee.employeeId} · {employee.department}
                                </p>
                              </div>
                            </Link>
                            <div className="shrink-0">
                              {st === 'unmarked' && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  Unmarked
                                </Badge>
                              )}
                              {st === 'present' && (
                                <Badge className="border-success/20 bg-success/10 text-xs text-success">
                                  Present
                                </Badge>
                              )}
                              {st === 'absent' && (
                                <Badge className="border-destructive/20 bg-destructive/10 text-xs text-destructive">
                                  Absent
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={cn(
                                'h-8 flex-1 text-xs sm:flex-none',
                                st === 'present' && 'border-success/40 bg-success/5 text-success',
                              )}
                              disabled={isSaving || isWorkingDateFuture}
                              onClick={() =>
                                void runBulk({
                                  status: 'present',
                                  employeeIds: [employee.id],
                                  successMessage: `${employee.fullName} marked present.`,
                                })
                              }
                            >
                              Present
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={cn(
                                'h-8 flex-1 text-xs sm:flex-none',
                                st === 'absent' && 'border-destructive/40 bg-destructive/5 text-destructive',
                              )}
                              disabled={isSaving || isWorkingDateFuture}
                              onClick={() =>
                                void runBulk({
                                  status: 'absent',
                                  employeeIds: [employee.id],
                                  successMessage: `${employee.fullName} marked absent.`,
                                })
                              }
                            >
                              Absent
                            </Button>
                            {dayRec ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                                disabled={
                                  isSaving || isClearAttendanceLoading || isWorkingDateFuture
                                }
                                title="Clear attendance for this day"
                                onClick={() =>
                                  setClearAttendanceTarget({
                                    recordId: dayRec.id,
                                    employeeName: employee.fullName,
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Clear</span>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={clearAttendanceTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isClearAttendanceLoading) setClearAttendanceTarget(null)
        }}
        title="Clear attendance for this day?"
        description={
          clearAttendanceTarget
            ? `Remove the record for ${clearAttendanceTarget.employeeName} on ${format(attendanceDate, 'MMM d, yyyy')}. They will show as unmarked.`
            : ''
        }
        confirmLabel={isClearAttendanceLoading ? 'Clearing…' : 'Clear record'}
        pending={isClearAttendanceLoading}
        onConfirm={() => void handleClearAttendance()}
        variant="destructive"
      />
    </div>
  )
}
