import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Search, CalendarDays, UserCheck, UserX, Users, Check } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
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
import type { Employee } from '@/lib/types'

export function AttendancePage() {
  const { employees, markAttendance, getEmployeeAttendance } = useHRMS()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [attendanceDate, setAttendanceDate] = useState<Date>(new Date())
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent'>('present')
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all')

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees
    const query = searchQuery.toLowerCase()
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query)
    )
  }, [employees, searchQuery])

  const employeeAttendance = useMemo(() => {
    if (!selectedEmployee) return []
    const records = getEmployeeAttendance(selectedEmployee.id)
    if (statusFilter === 'all') return records
    return records.filter((r) => r.status === statusFilter)
  }, [selectedEmployee, getEmployeeAttendance, statusFilter])

  const attendanceStats = useMemo(() => {
    if (!selectedEmployee) return { present: 0, total: 0, rate: 0 }
    const records = getEmployeeAttendance(selectedEmployee.id)
    const present = records.filter((r) => r.status === 'present').length
    const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0
    return { present, total: records.length, rate }
  }, [selectedEmployee, getEmployeeAttendance])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleMarkAttendance = () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first')
      return
    }

    const dateStr = format(attendanceDate, 'yyyy-MM-dd')
    markAttendance(selectedEmployee.id, dateStr, attendanceStatus)
    toast.success(
      `Marked ${selectedEmployee.fullName} as ${attendanceStatus} for ${format(attendanceDate, 'MMM dd, yyyy')}`
    )
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Attendance" subtitle="Track and manage employee attendance" />
      <div className="flex h-[calc(100vh-3.5rem)]">
        <div className="w-72 flex-shrink-0 border-r border-border bg-card/50">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="overflow-y-auto h-[calc(100%-53px)]">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No employees found</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredEmployees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => setSelectedEmployee(employee)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-150',
                      selectedEmployee?.id === employee.id
                        ? 'bg-accent/10 ring-1 ring-accent/20'
                        : 'hover:bg-secondary'
                    )}
                  >
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className={cn(
                        'text-xs font-medium',
                        selectedEmployee?.id === employee.id
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary text-foreground'
                      )}>
                        {getInitials(employee.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium truncate',
                        selectedEmployee?.id === employee.id ? 'text-foreground' : 'text-foreground'
                      )}>
                        {employee.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {employee.department}
                      </p>
                    </div>
                    {selectedEmployee?.id === employee.id && (
                      <Check className="h-4 w-4 text-accent flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedEmployee ? (
            <div className="h-full flex items-center justify-center">
              <Empty>
                <EmptyMedia variant="icon">
                  <CalendarDays className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>Select an Employee</EmptyTitle>
                <EmptyDescription>
                  Choose an employee from the list to view and manage their attendance.
                </EmptyDescription>
              </Empty>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                      {getInitials(selectedEmployee.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {selectedEmployee.fullName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.department} &middot; {selectedEmployee.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {attendanceStats.rate}% attendance
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 mb-6">
                <h3 className="text-sm font-medium text-foreground mb-4">
                  Mark Attendance
                </h3>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-44 justify-start text-left font-normal h-9 text-sm"
                        >
                          <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                          {format(attendanceDate, 'MMM dd, yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={attendanceDate}
                          onSelect={(date) => date && setAttendanceDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={attendanceStatus === 'present' ? 'default' : 'outline'}
                        onClick={() => setAttendanceStatus('present')}
                        size="sm"
                        className={cn(
                          'h-9',
                          attendanceStatus === 'present' &&
                            'bg-success text-success-foreground hover:bg-success/90'
                        )}
                      >
                        <UserCheck className="mr-1.5 h-4 w-4" />
                        Present
                      </Button>
                      <Button
                        variant={attendanceStatus === 'absent' ? 'default' : 'outline'}
                        onClick={() => setAttendanceStatus('absent')}
                        size="sm"
                        className={cn(
                          'h-9',
                          attendanceStatus === 'absent' &&
                            'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        )}
                      >
                        <UserX className="mr-1.5 h-4 w-4" />
                        Absent
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleMarkAttendance}
                    size="sm"
                    className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Submit
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">{attendanceStats.present}</span> days present out of <span className="text-foreground font-medium">{attendanceStats.total}</span> total records
                </p>
                <Select
                  value={statusFilter}
                  onValueChange={(v: 'all' | 'present' | 'absent') => setStatusFilter(v)}
                >
                  <SelectTrigger className="w-32 h-8 text-sm bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {employeeAttendance.length === 0 ? (
                  <Empty className="py-12">
                    <EmptyMedia variant="icon">
                      <CalendarDays className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyTitle>No attendance records</EmptyTitle>
                    <EmptyDescription>
                      {statusFilter !== 'all'
                        ? 'No records match the selected filter.'
                        : 'Start by marking attendance for this employee.'}
                    </EmptyDescription>
                  </Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeAttendance.map((record) => (
                        <TableRow key={record.id} className="border-border">
                          <TableCell className="py-3">
                            <span className="text-sm text-foreground">
                              {format(new Date(record.date), 'EEEE, MMM dd, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Badge
                              className={cn(
                                record.status === 'present'
                                  ? 'bg-success/10 text-success border-success/20 hover:bg-success/10'
                                  : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10'
                              )}
                            >
                              {record.status === 'present' ? 'Present' : 'Absent'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
