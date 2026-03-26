import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Sparkles, Trash2, Users, MoreHorizontal, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from '@/components/app-header'
import { CollapsibleFilterBar } from '@/components/collapsible-filter-bar'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  EMPLOYEE_EMAIL_MAX,
  EMPLOYEE_FULL_NAME_MAX,
  validateEmployeeEmail,
  validateEmployeeFullName,
} from '@/lib/employee-form-validation'
import { DEPARTMENTS, type Department, type Employee } from '@/lib/types'
import { useHRMS } from '@/lib/store'
import {
  createDemoEmployees,
  createEmployee,
  deleteAllEmployees,
  fetchAllEmployees,
  fetchAttendance,
  fetchEmployeesPage,
  removeEmployee,
  updateEmployee,
} from '../../backend/api.js'

const EMPLOYEES_SYNC_CHANNEL = 'hrms-employees-sync'

type ListDepartmentFilter = Department | '__all__'

export function EmployeesPage() {
  const {
    replaceEmployeesSnapshot,
    replaceAttendanceSnapshot,
    employees: globalEmployees,
    initialDataStatus,
  } = useHRMS()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [listDepartmentFilter, setListDepartmentFilter] =
    useState<ListDepartmentFilter>('__all__')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showPurgeAllConfirm, setShowPurgeAllConfirm] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [demoCount, setDemoCount] = useState('10')
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [isPurgeLoading, setIsPurgeLoading] = useState(false)
  const [isDeletingOne, setIsDeletingOne] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: '' as Department | '',
  })
  const [errors, setErrors] = useState<{
    fullName?: string
    email?: string
    department?: string
  }>({})
  const submitGuardRef = useRef(false)
  const purgeGuardRef = useRef(false)
  const deleteGuardRef = useRef(false)
  const demoGuardRef = useRef(false)
  const syncChannelRef = useRef<BroadcastChannel | null>(null)
  const skipSearchPageResetRef = useRef(true)

  const broadcastEmployeesChanged = useCallback(() => {
    try {
      syncChannelRef.current?.postMessage({ type: 'employees-changed' })
    } catch {
      /* ignore */
    }
  }, [])

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

  const loadTable = useCallback(async () => {
    setIsLoading(true)
    try {
      const { employees: rows, count } = await fetchEmployeesPage({
        page,
        pageSize,
        search: debouncedSearch.trim() || undefined,
        department:
          listDepartmentFilter === '__all__' ? undefined : listDepartmentFilter,
        ordering: 'full_name,employee_id',
      })
      setEmployees(rows)
      setTotalCount(count)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load employees'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, debouncedSearch, listDepartmentFilter])

  const refreshAfterMutation = useCallback(async () => {
    try {
      const [all, attendanceRows] = await Promise.all([
        fetchAllEmployees(),
        fetchAttendance(),
      ])
      replaceEmployeesSnapshot(all)
      replaceAttendanceSnapshot(attendanceRows)
      await loadTable()
      broadcastEmployeesChanged()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh'
      toast.error(message)
    }
  }, [
    loadTable,
    replaceEmployeesSnapshot,
    replaceAttendanceSnapshot,
    broadcastEmployeesChanged,
  ])

  useEffect(() => {
    if (initialDataStatus !== 'ready') return
    void loadTable()
  }, [loadTable, initialDataStatus])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(EMPLOYEES_SYNC_CHANNEL)
    syncChannelRef.current = ch
    ch.onmessage = () => {
      void (async () => {
        try {
          const [all, attendanceRows] = await Promise.all([
            fetchAllEmployees(),
            fetchAttendance(),
          ])
          replaceEmployeesSnapshot(all)
          replaceAttendanceSnapshot(attendanceRows)
        } catch {
          /* keep existing */
        }
        await loadTable()
      })()
    }
    return () => {
      ch.close()
      syncChannelRef.current = null
    }
  }, [loadTable, replaceEmployeesSnapshot, replaceAttendanceSnapshot])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasActiveListFilters =
    debouncedSearch.trim() !== '' || listDepartmentFilter !== '__all__'
  const listFilterActiveCount =
    (debouncedSearch.trim() !== '' ? 1 : 0) +
    (listDepartmentFilter !== '__all__' ? 1 : 0)

  const openAddModal = () => {
    setEditingEmployee(null)
    setFormData({ fullName: '', email: '', department: '' })
    setErrors({})
    setShowFormModal(true)
  }

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
    })
    setErrors({})
    setShowFormModal(true)
  }

  const validateForm = () => {
    const nextErrors: typeof errors = {}
    const fullNameErr = validateEmployeeFullName(formData.fullName)
    if (fullNameErr) nextErrors.fullName = fullNameErr

    const emailErr = validateEmployeeEmail(formData.email)
    if (emailErr) nextErrors.email = emailErr

    if (!formData.department) {
      nextErrors.department = 'Department is required'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitGuardRef.current) return
    if (!validateForm()) return
    submitGuardRef.current = true
    setIsSaving(true)
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          department: formData.department as Department,
        })
        toast.success('Employee updated successfully')
      } else {
        await createEmployee({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          department: formData.department as Department,
        })
        toast.success('Employee added successfully')
      }
      await refreshAfterMutation()
      setShowFormModal(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save employee'
      toast.error(message)
    } finally {
      setIsSaving(false)
      submitGuardRef.current = false
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleteGuardRef.current) return
    deleteGuardRef.current = true
    setIsDeletingOne(true)
    try {
      await removeEmployee(deleteTarget)
      toast.success('Employee deleted successfully')
      setDeleteTarget(null)
      await refreshAfterMutation()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete employee'
      toast.error(message)
    } finally {
      setIsDeletingOne(false)
      deleteGuardRef.current = false
    }
  }

  const handleAddDemo = async () => {
    if (demoGuardRef.current) return
    const parsed = Number.parseInt(demoCount.trim(), 10)
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error('Enter a whole number from 1 to 200.')
      return
    }
    const n = Math.min(200, Math.max(1, parsed))
    demoGuardRef.current = true
    setIsDemoLoading(true)
    try {
      const result = await createDemoEmployees(n)
      const created =
        result && typeof result.created === 'number' ? result.created : n
      toast.success(`Created ${created} demo employee(s).`)
      setShowDemoModal(false)
      setDemoCount('10')
      await refreshAfterMutation()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create demo employees'
      toast.error(message)
    } finally {
      setIsDemoLoading(false)
      demoGuardRef.current = false
    }
  }

  const handlePurgeAll = async () => {
    if (purgeGuardRef.current) return
    purgeGuardRef.current = true
    setIsPurgeLoading(true)
    try {
      const result = await deleteAllEmployees()
      const n =
        result && typeof result.deleted_employees === 'number'
          ? result.deleted_employees
          : 0
      toast.success(
        n === 0 ? 'No employees to delete.' : `Deleted ${n} employee(s).`,
      )
      setShowPurgeAllConfirm(false)
      await refreshAfterMutation()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete employees'
      toast.error(message)
    } finally {
      setIsPurgeLoading(false)
      purgeGuardRef.current = false
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const employeeToDelete = employees.find((e) => e.id === deleteTarget)

  const showTableSkeleton =
    initialDataStatus === 'loading' ||
    (initialDataStatus === 'ready' && isLoading)

  return (
    <div className="min-h-screen">
      <AppHeader
        title="Employees"
        subtitle={
          initialDataStatus === 'loading'
            ? 'Loading…'
            : initialDataStatus === 'error'
              ? 'Could not load employee summary'
              : `${globalEmployees.length} total employees`
        }
      />
      <div className="p-4 sm:p-6">
        <CollapsibleFilterBar
          activeCount={listFilterActiveCount}
          className="mb-4"
          label="Search & filters"
        >
          <div className="relative w-full min-w-0 md:max-w-sm md:flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border-[#d8deef] bg-white pl-9 shadow-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/20"
            />
          </div>
          <Select
            value={listDepartmentFilter}
            onValueChange={(value) => {
              setListDepartmentFilter(value as ListDepartmentFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-full rounded-lg border-[#d8deef] bg-white shadow-none md:w-[min(100%,11rem)]">
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
            <SelectTrigger className="h-9 w-full rounded-lg border-[#d8deef] bg-white shadow-none md:w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <Badge
            variant="secondary"
            className="h-9 w-fit border-[#dfe5f7] bg-white px-3 font-normal text-[#2b418c]"
          >
            {totalCount} results
          </Badge>
          <Badge className="h-9 w-fit border-[#ead8a2] bg-[#fff8df] px-3 font-medium text-[#7a621e]">
            Employee Directory
          </Badge>
          <div className="flex w-full flex-wrap gap-2 md:ml-auto md:w-auto">
            <Button
              type="button"
              size="sm"
              className="h-9 flex-1 bg-[#2b418c] text-white hover:bg-[#243a75] sm:flex-none"
              onClick={openAddModal}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add employee
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 border-[#d8deef] bg-white text-[#2b418c] hover:bg-[#f4f6fc] sm:flex-none"
              onClick={() => {
                setDemoCount('10')
                setShowDemoModal(true)
              }}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Add demo data
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 border-destructive/40 bg-white text-destructive hover:bg-destructive/5 sm:flex-none"
              onClick={() => setShowPurgeAllConfirm(true)}
              disabled={globalEmployees.length === 0}
            >
              Delete all
            </Button>
          </div>
        </CollapsibleFilterBar>

        <div className="overflow-hidden rounded-xl border border-[#dfe5f7] bg-white shadow-[0_8px_24px_rgba(43,65,140,0.05)]">
          {showTableSkeleton ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 ml-auto" />
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <Empty className="py-16">
              <EmptyMedia variant="icon">
                <Users className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {hasActiveListFilters ? 'No matches' : 'No employees yet'}
              </EmptyTitle>
              <EmptyDescription>
                {hasActiveListFilters
                  ? 'Try different search or department filters.'
                  : 'Add your first employee to get started.'}
              </EmptyDescription>
              {!hasActiveListFilters && (
                <EmptyContent>
                  <Button
                    onClick={openAddModal}
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Employee
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Employee</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow
                        key={employee.id}
                        className="group hover:bg-[#f7f9ff]"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-[#d9e1f4]">
                              <AvatarFallback className="bg-[#edf2ff] text-[#2b418c] text-xs font-medium">
                                {getInitials(employee.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <Link
                              to={`/employees/${employee.id}`}
                              className="rounded-sm text-sm font-medium text-[#2b418c] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/30"
                            >
                              {employee.fullName}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-[#f1f4ff] px-1.5 py-0.5 font-mono text-xs text-[#4d5e94]">
                            {employee.employeeId}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {employee.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="border-[#dfe5f7] bg-[#f4f7ff] font-normal text-xs text-[#405186]"
                          >
                            {employee.department}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md opacity-100 transition-opacity hover:bg-[#eef3ff] hover:text-[#2b418c] md:opacity-0 md:group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions for {employee.fullName}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                className="text-sm"
                                onClick={() => openEditModal(employee)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Employee
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-sm text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(employee.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Employee
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="space-y-3 p-3 md:hidden" aria-label="Employee list">
                {employees.map((employee) => (
                  <li
                    key={employee.id}
                    className="rounded-xl border border-[#dfe5f7] bg-[#fafbff] p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0 border border-[#d9e1f4]">
                        <AvatarFallback className="bg-[#edf2ff] text-[#2b418c] text-xs font-medium">
                          {getInitials(employee.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/employees/${employee.id}`}
                          className="text-sm font-semibold text-[#2b418c] underline-offset-2 hover:underline"
                        >
                          {employee.fullName}
                        </Link>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {employee.email}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <code className="rounded bg-[#f1f4ff] px-1.5 py-0.5 font-mono text-xs text-[#4d5e94]">
                            {employee.employeeId}
                          </code>
                          <Badge
                            variant="secondary"
                            className="border-[#dfe5f7] bg-white font-normal text-xs text-[#405186]"
                          >
                            {employee.department}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 rounded-md hover:bg-[#eef3ff] hover:text-[#2b418c]"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions for {employee.fullName}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            className="text-sm"
                            onClick={() => openEditModal(employee)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Employee
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-sm text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(employee.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!isLoading && employees.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-[#dfe5f7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {totalCount} total
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#d8deef] bg-white"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#d8deef] bg-white"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={showFormModal}
        onOpenChange={(open) => {
          if (!isSaving) setShowFormModal(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingEmployee
                ? 'Update employee details and save your changes.'
                : 'Employee ID is assigned automatically when you save.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm text-foreground">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                maxLength={EMPLOYEE_FULL_NAME_MAX}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                }
                aria-invalid={!!errors.fullName}
                className="h-10 rounded-lg border-[#d8deef] bg-white shadow-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/20"
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.fullName.length}/{EMPLOYEE_FULL_NAME_MAX} · letters and spaces only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                maxLength={EMPLOYEE_EMAIL_MAX}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                aria-invalid={!!errors.email}
                className="h-10 rounded-lg border-[#d8deef] bg-white shadow-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/20"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.email.length}/{EMPLOYEE_EMAIL_MAX}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value: Department) =>
                  setFormData((prev) => ({ ...prev, department: value }))
                }
              >
                <SelectTrigger
                  aria-invalid={!!errors.department}
                  className="h-10 rounded-lg border-[#d8deef] bg-white shadow-none"
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-xs text-destructive">{errors.department}</p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowFormModal(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#2b418c] text-white hover:bg-[#243777]"
              >
                {isSaving
                  ? editingEmployee
                    ? 'Saving...'
                    : 'Adding...'
                  : editingEmployee
                    ? 'Save Changes'
                    : 'Add Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDemoModal}
        onOpenChange={(open) => {
          if (!isDemoLoading) setShowDemoModal(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add demo employees</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Creates synthetic employees with unique demo emails and auto-assigned IDs.
              Maximum 200 per request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="demoCount" className="text-sm text-foreground">
              How many to add
            </Label>
            <Input
              id="demoCount"
              type="number"
              min={1}
              max={200}
              value={demoCount}
              onChange={(e) => setDemoCount(e.target.value)}
              disabled={isDemoLoading}
              className="h-10 rounded-lg border-[#d8deef] bg-white shadow-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/20"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDemoModal(false)}
              disabled={isDemoLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDemoLoading}
              className="bg-[#2b418c] text-white hover:bg-[#243777]"
              onClick={() => {
                void handleAddDemo()
              }}
            >
              {isDemoLoading ? 'Adding…' : 'Add demo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showPurgeAllConfirm}
        onOpenChange={(open) => !open && !isPurgeLoading && setShowPurgeAllConfirm(false)}
        title="Delete all employees?"
        description="This removes every employee from the database. Related attendance records are removed as well. This cannot be undone."
        confirmLabel={isPurgeLoading ? 'Deleting…' : 'Delete all'}
        pending={isPurgeLoading}
        onConfirm={() => {
          void handlePurgeAll()
        }}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeletingOne && setDeleteTarget(null)}
        title="Delete Employee"
        description={`Are you sure you want to delete ${employeeToDelete?.fullName}? This action cannot be undone.`}
        confirmLabel={isDeletingOne ? 'Deleting…' : 'Delete'}
        pending={isDeletingOne}
        onConfirm={() => {
          void handleDelete()
        }}
        variant="destructive"
      />
    </div>
  )
}
