import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Hash,
  Mail,
  Pencil,
  Plus,
  Trash2,
  User,
  UserX,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from '@/components/app-header'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  EMPLOYEE_EMAIL_MAX,
  EMPLOYEE_FULL_NAME_MAX,
  validateEmployeeEmail,
  validateEmployeeFullName,
} from '@/lib/employee-form-validation'
import { DEPARTMENTS, type AttendanceRecord, type Department, type Employee } from '@/lib/types'
import { useHRMS } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  createAttendance,
  fetchAllEmployees,
  fetchAttendance,
  fetchAttendanceByEmployeeBusinessId,
  fetchEmployee,
  removeAttendance,
  removeEmployee,
  updateAttendance,
  updateEmployee,
  ApiRequestError,
} from '../../backend/api.js'

const EMPLOYEES_SYNC_CHANNEL = 'hrms-employees-sync'

type EmployeeLoadFailure =
  | { kind: 'invalid_id'; requestedId: string }
  | {
      kind: 'not_found'
      requestedId: string
      codeHint?: 'unknown_employee_ids'
    }
  | { kind: 'network' }
  | { kind: 'generic'; message: string }

function classifyEmployeeLoadFailure(
  id: string,
  error: unknown,
): EmployeeLoadFailure {
  if (!/^\d+$/.test(id)) {
    return { kind: 'invalid_id', requestedId: id }
  }
  if (error instanceof ApiRequestError) {
    if (error.httpStatus === 404 || error.code === 'NOT_FOUND') {
      return { kind: 'not_found', requestedId: id }
    }
    if (error.code === 'UNKNOWN_EMPLOYEE_IDS') {
      return {
        kind: 'not_found',
        requestedId: id,
        codeHint: 'unknown_employee_ids',
      }
    }
  }
  const msg = error instanceof Error ? error.message : ''
  if (msg.includes('Unable to connect')) {
    return { kind: 'network' }
  }
  return { kind: 'generic', message: msg || 'Could not load this employee.' }
}

function EmployeeLoadFailureView({ failure }: { failure: EmployeeLoadFailure }) {
  const config =
    failure.kind === 'invalid_id'
      ? {
          Icon: Hash,
          iconWrap: 'bg-amber-100 text-amber-800 ring-amber-200/80',
          title: 'Invalid employee link',
          description:
            'The value in the URL is not a valid employee record number. Use the Employees directory to open a profile, or check that the link was copied correctly.',
        }
      : failure.kind === 'not_found'
        ? {
            Icon: UserX,
            iconWrap: 'bg-slate-100 text-[#2b418c] ring-[#d9e1f4]',
            title: 'Employee not found',
            description:
              'No one in the system matches this ID. They may have been deleted from the Employees tab, no longer appear in the directory, or the number in the URL may be wrong. If you use bookmarks, try opening the person again from the list.',
          }
        : failure.kind === 'network'
          ? {
              Icon: WifiOff,
              iconWrap: 'bg-rose-50 text-rose-700 ring-rose-200/70',
              title: "Can't reach the server",
              description:
                'The app could not contact the HRMS backend. Make sure the API server is running, then try again.',
            }
          : {
              Icon: AlertCircle,
              iconWrap: 'bg-rose-50 text-rose-700 ring-rose-200/70',
              title: 'Something went wrong',
              description: failure.message,
            }

  const showIdChip =
    failure.kind === 'invalid_id' ||
    failure.kind === 'not_found'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f7ff] via-white to-[#eef1f8]">
      <AppHeader title="Employee" subtitle="Profile unavailable" />
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <Card className="relative overflow-hidden border-[#dfe5f7] shadow-[0_12px_40px_rgba(43,65,140,0.08)]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_circle_at_50%_-20%,rgba(43,65,140,0.08),transparent_55%),radial-gradient(480px_circle_at_100%_100%,rgba(232,197,71,0.06),transparent_50%)]"
            aria-hidden
          />
          <CardContent className="relative px-6 pb-8 pt-10 sm:px-8">
            <div className="flex flex-col items-center text-center">
              <div
                className={cn(
                  'mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ring-2 ring-inset',
                  config.iconWrap,
                )}
              >
                <config.Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-[#1a2754] sm:text-2xl">
                {config.title}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {config.description}
              </p>
              {failure.kind === 'not_found' && failure.codeHint === 'unknown_employee_ids' && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  If you came from Attendance or another screen, that employee may have been removed
                  or is no longer in the list—open{' '}
                  <Link to="/employees" className="font-medium text-[#2b418c] underline-offset-4 hover:underline">
                    Employees
                  </Link>{' '}
                  to see who is available.
                </p>
              )}
              {showIdChip && (
                <div className="mt-6 w-full rounded-xl border border-[#e8ecf7] bg-[#f4f7ff]/80 px-4 py-3 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#2b418c]/70">
                    Requested record ID
                  </p>
                  <code className="mt-1 block font-mono text-sm font-medium text-[#1a2754]">
                    {failure.requestedId}
                  </code>
                </div>
              )}
              <Button
                asChild
                className="mt-8 h-10 w-full max-w-xs bg-[#2b418c] hover:bg-[#243777] sm:w-auto"
              >
                <Link to="/employees">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to directory
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function monthPrefix(d: Date): string {
  return format(d, 'yyyy-MM')
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { replaceEmployeesSnapshot, replaceAttendanceSnapshot } = useHRMS()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loadFailure, setLoadFailure] = useState<EmployeeLoadFailure | null>(null)
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true)
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRecord[]>([])
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)

  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))

  const [showEditEmployee, setShowEditEmployee] = useState(false)
  const [showDeleteEmployee, setShowDeleteEmployee] = useState(false)
  const [isSavingEmployee, setIsSavingEmployee] = useState(false)
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: '' as Department | '',
  })
  const [formErrors, setFormErrors] = useState<{
    fullName?: string
    email?: string
    department?: string
  }>({})

  const [showAttendanceForm, setShowAttendanceForm] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null)
  const [attFormDate, setAttFormDate] = useState(todayYmd())
  const [attFormStatus, setAttFormStatus] = useState<'present' | 'absent'>('present')
  const [isSavingAttendance, setIsSavingAttendance] = useState(false)
  const [deleteAttendanceId, setDeleteAttendanceId] = useState<string | null>(null)
  const [isDeletingAttendance, setIsDeletingAttendance] = useState(false)

  const syncChannelRef = useRef<BroadcastChannel | null>(null)
  const submitGuardRef = useRef(false)
  const attendanceSubmitGuardRef = useRef(false)
  const deleteEmployeeGuardRef = useRef(false)
  const deleteAttendanceGuardRef = useRef(false)

  const attendanceByDate = useMemo(() => {
    const m = new Map<string, AttendanceRecord>()
    for (const r of attendanceRows) m.set(r.date, r)
    return m
  }, [attendanceRows])

  const calendarGridDays = useMemo(() => {
    const ms = startOfMonth(calendarMonth)
    const me = endOfMonth(calendarMonth)
    const gridStart = startOfWeek(ms, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(me, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [calendarMonth])

  const viewedMonthStats = useMemo(() => {
    const prefix = monthPrefix(calendarMonth)
    let present = 0
    let absent = 0
    for (const r of attendanceRows) {
      if (!r.date.startsWith(prefix)) continue
      if (r.status === 'present') present += 1
      else absent += 1
    }
    return { present, absent, total: present + absent }
  }, [attendanceRows, calendarMonth])

  const thisMonthStats = useMemo(() => {
    const prefix = monthPrefix(new Date())
    let present = 0
    let absent = 0
    for (const r of attendanceRows) {
      if (!r.date.startsWith(prefix)) continue
      if (r.status === 'present') present += 1
      else absent += 1
    }
    return { present, absent, total: present + absent }
  }, [attendanceRows])

  const broadcastEmployeesChanged = useCallback(() => {
    try {
      syncChannelRef.current?.postMessage({ type: 'employees-changed' })
    } catch {
      /* ignore */
    }
  }, [])

  const refreshGlobalSnapshots = useCallback(async () => {
    const [all, attendance] = await Promise.all([
      fetchAllEmployees(),
      fetchAttendance(),
    ])
    replaceEmployeesSnapshot(all)
    replaceAttendanceSnapshot(attendance)
  }, [replaceEmployeesSnapshot, replaceAttendanceSnapshot])

  const loadAttendanceForEmployee = useCallback(async (emp: Employee) => {
    setIsLoadingAttendance(true)
    try {
      const rows = await fetchAttendanceByEmployeeBusinessId(emp.employeeId)
      rows.sort((a: AttendanceRecord, b: AttendanceRecord) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
      )
      setAttendanceRows(rows)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load attendance'
      toast.error(message)
      setAttendanceRows([])
    } finally {
      setIsLoadingAttendance(false)
    }
  }, [])

  const loadEmployee = useCallback(async () => {
    if (!id) {
      setLoadFailure(null)
      setIsLoadingEmployee(false)
      return
    }
    if (!/^\d+$/.test(id)) {
      setLoadFailure({ kind: 'invalid_id', requestedId: id })
      setEmployee(null)
      setAttendanceRows([])
      setIsLoadingEmployee(false)
      return
    }
    setIsLoadingEmployee(true)
    setLoadFailure(null)
    try {
      const data = await fetchEmployee(id)
      setEmployee(data)
      await loadAttendanceForEmployee(data)
    } catch (error) {
      setLoadFailure(classifyEmployeeLoadFailure(id, error))
      setEmployee(null)
      setAttendanceRows([])
    } finally {
      setIsLoadingEmployee(false)
    }
  }, [id, loadAttendanceForEmployee])

  useEffect(() => {
    void loadEmployee()
  }, [loadEmployee])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(EMPLOYEES_SYNC_CHANNEL)
    syncChannelRef.current = ch
    ch.onmessage = () => {
      void loadEmployee()
    }
    return () => {
      ch.close()
      syncChannelRef.current = null
    }
  }, [loadEmployee])

  const openEditEmployee = () => {
    if (!employee) return
    setFormData({
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
    })
    setFormErrors({})
    setShowEditEmployee(true)
  }

  const validateEmployeeForm = () => {
    const next: typeof formErrors = {}
    const fullNameErr = validateEmployeeFullName(formData.fullName)
    if (fullNameErr) next.fullName = fullNameErr
    const emailErr = validateEmployeeEmail(formData.email)
    if (emailErr) next.email = emailErr
    if (!formData.department) next.department = 'Department is required'
    setFormErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee || submitGuardRef.current) return
    if (!validateEmployeeForm()) return
    submitGuardRef.current = true
    setIsSavingEmployee(true)
    try {
      const updated = await updateEmployee(employee.id, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        department: formData.department as Department,
      })
      setEmployee(updated)
      toast.success('Employee updated successfully')
      setShowEditEmployee(false)
      await refreshGlobalSnapshots()
      broadcastEmployeesChanged()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update employee',
      )
    } finally {
      setIsSavingEmployee(false)
      submitGuardRef.current = false
    }
  }

  const handleDeleteEmployee = async () => {
    if (!employee || deleteEmployeeGuardRef.current) return
    deleteEmployeeGuardRef.current = true
    setIsDeletingEmployee(true)
    try {
      await removeEmployee(employee.id)
      toast.success('Employee deleted successfully')
      setShowDeleteEmployee(false)
      await refreshGlobalSnapshots()
      broadcastEmployeesChanged()
      navigate('/employees', { replace: true })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete employee',
      )
    } finally {
      setIsDeletingEmployee(false)
      deleteEmployeeGuardRef.current = false
    }
  }

  const openAddAttendance = () => {
    setEditingAttendance(null)
    setAttFormDate(todayYmd())
    setAttFormStatus('present')
    setShowAttendanceForm(true)
  }

  const openEditAttendance = (row: AttendanceRecord) => {
    setEditingAttendance(row)
    setAttFormDate(row.date)
    setAttFormStatus(row.status)
    setShowAttendanceForm(true)
  }

  const handleDayClick = (day: Date) => {
    const ymd = format(day, 'yyyy-MM-dd')
    const existing = attendanceByDate.get(ymd)
    if (existing) openEditAttendance(existing)
    else {
      setEditingAttendance(null)
      setAttFormDate(ymd)
      setAttFormStatus('present')
      setShowAttendanceForm(true)
    }
  }

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee || attendanceSubmitGuardRef.current) return
    attendanceSubmitGuardRef.current = true
    setIsSavingAttendance(true)
    try {
      if (editingAttendance) {
        await updateAttendance(editingAttendance.id, {
          date: attFormDate,
          status: attFormStatus,
          expectedCurrentStatus: editingAttendance.status,
        })
        toast.success('Attendance updated')
      } else {
        await createAttendance({
          employeeId: employee.id,
          date: attFormDate,
          status: attFormStatus,
          expectedCurrentStatus: null,
        })
        toast.success('Attendance recorded')
      }
      setShowAttendanceForm(false)
      await loadAttendanceForEmployee(employee)
      await refreshGlobalSnapshots()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save attendance',
      )
    } finally {
      setIsSavingAttendance(false)
      attendanceSubmitGuardRef.current = false
    }
  }

  const handleDeleteAttendance = async () => {
    if (!deleteAttendanceId || !employee || deleteAttendanceGuardRef.current) return
    deleteAttendanceGuardRef.current = true
    setIsDeletingAttendance(true)
    try {
      await removeAttendance(deleteAttendanceId)
      toast.success('Attendance removed')
      setDeleteAttendanceId(null)
      await loadAttendanceForEmployee(employee)
      await refreshGlobalSnapshots()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete attendance',
      )
    } finally {
      setIsDeletingAttendance(false)
      deleteAttendanceGuardRef.current = false
    }
  }

  if (!id) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-sm text-muted-foreground">Invalid link.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to="/employees">Back to employees</Link>
        </Button>
      </div>
    )
  }

  if (isLoadingEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f4f7ff] via-white to-[#eef1f8]">
        <AppHeader title="Employee" subtitle="Loading…" />
        <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <Skeleton className="h-12 w-2/3 max-w-xl rounded-xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (loadFailure || !employee) {
    return (
      <EmployeeLoadFailureView
        failure={
          loadFailure ?? {
            kind: 'generic',
            message: 'Employee could not be loaded.',
          }
        }
      />
    )
  }

  const rowToDelete = attendanceRows.find((r) => r.id === deleteAttendanceId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f7ff] via-white to-[#eef1f8]">
      <AppHeader
        title={employee.fullName}
        subtitle={`${employee.employeeId} · ${employee.department}`}
        action={
          <Button asChild variant="outline" size="sm" className="h-9 border-[#d8deef] bg-white">
            <Link to="/employees">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Directory
            </Link>
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-[#dfe5f7] bg-white/80 p-1 shadow-sm backdrop-blur sm:mb-8 sm:inline-flex sm:h-11 sm:w-auto sm:gap-0">
            <TabsTrigger
              value="basic"
              className="rounded-lg px-2 py-2.5 text-xs data-[state=active]:bg-[#2b418c] data-[state=active]:text-white data-[state=active]:shadow-md sm:px-5 sm:text-sm"
            >
              <User className="mr-1.5 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="truncate">Basic info</span>
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="rounded-lg px-2 py-2.5 text-xs data-[state=active]:bg-[#2b418c] data-[state=active]:text-white data-[state=active]:shadow-md sm:px-5 sm:text-sm"
            >
              <CalendarCheck className="mr-1.5 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="truncate">Attendance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-0 outline-none">
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="space-y-6 lg:col-span-8">
                <div className="relative overflow-hidden rounded-2xl border border-[#dfe5f7] bg-white shadow-[0_12px_40px_rgba(43,65,140,0.08)]">
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_0%_-20%,rgba(43,65,140,0.12),transparent_50%),radial-gradient(700px_circle_at_100%_120%,rgba(232,197,71,0.14),transparent_45%)]"
                    aria-hidden
                  />
                  <div className="relative flex flex-col gap-6 p-5 sm:gap-8 sm:p-8 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                      <Avatar className="h-28 w-28 shrink-0 border-4 border-white shadow-lg ring-2 ring-[#d9e1f4]">
                        <AvatarFallback className="bg-gradient-to-br from-[#2b418c] to-[#1f2f69] text-3xl font-semibold text-white">
                          {getInitials(employee.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2b418c]/80">
                          Employee profile
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#1a2754] md:text-3xl">
                          {employee.fullName}
                        </h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <code className="rounded-lg border border-[#d9e1f4] bg-[#f4f7ff] px-2.5 py-1 font-mono text-xs text-[#4d5e94]">
                            {employee.employeeId}
                          </code>
                          <Badge className="border-[#ead8a2] bg-[#fff8df] px-2.5 py-0.5 font-medium text-[#7a621e]">
                            {employee.department}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 md:flex-col md:items-stretch lg:flex-row">
                      <Button
                        type="button"
                        size="default"
                        variant="outline"
                        className="h-10 border-[#d8deef] bg-white/90"
                        onClick={openEditEmployee}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="default"
                        variant="outline"
                        className="h-10 border-destructive/35 text-destructive hover:bg-destructive/5"
                        onClick={() => setShowDeleteEmployee(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-[#dfe5f7] bg-white/90 shadow-sm sm:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base text-[#2b418c]">
                        <Mail className="h-4 w-4" />
                        Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="break-all text-sm font-medium text-foreground">
                        {employee.email}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-[#dfe5f7] bg-white/90 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-[#2b418c]">Record created</CardTitle>
                      <CardDescription>When this profile was added</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(employee.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-[#dfe5f7] bg-white/90 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-[#2b418c]">System ID</CardTitle>
                      <CardDescription>Internal reference for API and links</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <code className="rounded-md bg-[#f1f4ff] px-2 py-1 font-mono text-xs text-[#4d5e94]">
                        {employee.id}
                      </code>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-4 lg:col-span-4">
                <Card className="border-[#dfe5f7] bg-white/95 shadow-[0_8px_28px_rgba(43,65,140,0.07)]">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#2b418c]">Attendance snapshot</CardTitle>
                    <CardDescription>
                      This calendar month ({format(new Date(), 'MMMM yyyy')})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3">
                      <span className="text-sm font-medium text-emerald-900">Present</span>
                      <span className="text-2xl font-semibold tabular-nums text-emerald-800">
                        {thisMonthStats.present}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-rose-200/60 bg-rose-50/80 px-4 py-3">
                      <span className="text-sm font-medium text-rose-900">Absent</span>
                      <span className="text-2xl font-semibold tabular-nums text-rose-800">
                        {thisMonthStats.absent}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {thisMonthStats.total} day(s) marked this month ·{' '}
                      {attendanceRows.length} total records on file
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-[#dfe5f7] border-dashed bg-[#fafbff]/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-[#2b418c]">Tip</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Use the <strong className="font-medium text-foreground">Attendance calendar</strong>{' '}
                    tab to view and edit days in a month grid. Click any day to add or change a
                    record.
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-0 outline-none">
            <Card className="overflow-hidden border-[#dfe5f7] bg-white/95 shadow-[0_12px_48px_rgba(43,65,140,0.09)]">
              <CardHeader className="flex flex-col gap-4 border-b border-[#eef1f8] bg-gradient-to-r from-[#f8faff] to-white pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl text-[#2b418c]">Attendance calendar</CardTitle>
                  <CardDescription className="mt-1 max-w-xl">
                    {viewedMonthStats.total} day(s) marked in {format(calendarMonth, 'MMMM yyyy')}.
                    Click a day to add or edit; use the dialog to remove a row.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center rounded-xl border border-[#dfe5f7] bg-white p-1 shadow-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="min-w-[10.5rem] text-center text-sm font-semibold text-[#1a2754]">
                      {format(calendarMonth, 'MMMM yyyy')}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 border-[#d8deef]"
                    onClick={() => setCalendarMonth(startOfMonth(new Date()))}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 bg-[#2b418c] text-primary-foreground hover:bg-[#243777]"
                    onClick={openAddAttendance}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add record
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="mb-6 flex flex-wrap gap-4 text-xs sm:text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Present
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    Absent
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full border border-[#c5cce0] bg-white" />
                    No record
                  </span>
                </div>

                {isLoadingAttendance ? (
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-xl sm:min-h-[88px]" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
                      {WEEKDAYS.map((d) => (
                        <div
                          key={d}
                          className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {calendarGridDays.map((day) => {
                        const ymd = format(day, 'yyyy-MM-dd')
                        const record = attendanceByDate.get(ymd)
                        const inMonth = isSameMonth(day, calendarMonth)
                        const today = isToday(day)
                        return (
                          <button
                            key={ymd}
                            type="button"
                            onClick={() => handleDayClick(day)}
                            className={cn(
                              // w-full min-w-0: stay inside the 7-col grid on narrow viewports.
                              // (aspect-square + min-h-[72px] forces width ≥ height and overflows into the next column.)
                              'group flex min-h-[72px] w-full min-w-0 flex-col rounded-xl border p-1.5 text-left transition-all sm:min-h-[96px] sm:p-2 lg:aspect-square',
                              inMonth
                                ? 'border-[#e8ecf7] bg-white hover:border-[#2b418c]/35 hover:bg-[#f7f9ff] hover:shadow-md'
                                : 'border-transparent bg-[#f4f6fc]/60 text-muted-foreground hover:bg-[#eef1f8]',
                              today &&
                                'ring-2 ring-inset ring-[#2b418c]/50',
                            )}
                          >
                            <span
                              className={cn(
                                'text-xs font-semibold sm:text-sm',
                                inMonth ? 'text-[#1a2754]' : 'text-muted-foreground/80',
                              )}
                            >
                              {format(day, 'd')}
                            </span>
                            <span className="mt-auto">
                              {record ? (
                                <span
                                  className={cn(
                                    'inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs',
                                    record.status === 'present'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800',
                                  )}
                                >
                                  {record.status}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground sm:text-xs">
                                  + Add
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={showEditEmployee}
        onOpenChange={(open) => !isSavingEmployee && setShowEditEmployee(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit employee</DialogTitle>
            <DialogDescription>Update details and save.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEmployee} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Full name</Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                maxLength={EMPLOYEE_FULL_NAME_MAX}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, fullName: e.target.value }))
                }
                aria-invalid={!!formErrors.fullName}
                className="h-10 rounded-lg border-[#d8deef]"
              />
              {formErrors.fullName && (
                <p className="text-xs text-destructive">{formErrors.fullName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.fullName.length}/{EMPLOYEE_FULL_NAME_MAX} · letters and spaces only
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                maxLength={EMPLOYEE_EMAIL_MAX}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, email: e.target.value }))
                }
                aria-invalid={!!formErrors.email}
                className="h-10 rounded-lg border-[#d8deef]"
              />
              {formErrors.email && (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.email.length}/{EMPLOYEE_EMAIL_MAX}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={formData.department}
                onValueChange={(v: Department) =>
                  setFormData((p) => ({ ...p, department: v }))
                }
              >
                <SelectTrigger className="h-10 rounded-lg border-[#d8deef]">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.department && (
                <p className="text-xs text-destructive">{formErrors.department}</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                disabled={isSavingEmployee}
                onClick={() => setShowEditEmployee(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingEmployee}
                className="bg-[#2b418c] hover:bg-[#243777]"
              >
                {isSavingEmployee ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAttendanceForm}
        onOpenChange={(open) => !isSavingAttendance && setShowAttendanceForm(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAttendance ? 'Edit attendance' : 'Add attendance'}
            </DialogTitle>
            <DialogDescription>
              One record per calendar day per employee. Delete removes this row only.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="att-date">Date</Label>
              <Input
                id="att-date"
                type="date"
                value={attFormDate}
                onChange={(e) => setAttFormDate(e.target.value)}
                className="h-10 rounded-lg border-[#d8deef]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={attFormStatus}
                onValueChange={(v: 'present' | 'absent') => setAttFormStatus(v)}
              >
                <SelectTrigger className="h-10 rounded-lg border-[#d8deef]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingAttendance && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={() => {
                  setShowAttendanceForm(false)
                  setDeleteAttendanceId(editingAttendance.id)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete this record
              </Button>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                disabled={isSavingAttendance}
                onClick={() => setShowAttendanceForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingAttendance}
                className="bg-[#2b418c] hover:bg-[#243777]"
              >
                {isSavingAttendance ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteEmployee}
        onOpenChange={(open) => !isDeletingEmployee && setShowDeleteEmployee(open)}
        title="Delete employee?"
        description={`Remove ${employee.fullName} and all related attendance. This cannot be undone.`}
        confirmLabel={isDeletingEmployee ? 'Deleting…' : 'Delete'}
        pending={isDeletingEmployee}
        onConfirm={() => void handleDeleteEmployee()}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!deleteAttendanceId}
        onOpenChange={(open) => !open && !isDeletingAttendance && setDeleteAttendanceId(null)}
        title="Remove attendance row?"
        description={
          rowToDelete
            ? `Delete the ${rowToDelete.date} record (${rowToDelete.status})?`
            : 'This attendance row will be removed.'
        }
        confirmLabel={isDeletingAttendance ? 'Removing…' : 'Remove'}
        pending={isDeletingAttendance}
        onConfirm={() => void handleDeleteAttendance()}
        variant="destructive"
      />
    </div>
  )
}
