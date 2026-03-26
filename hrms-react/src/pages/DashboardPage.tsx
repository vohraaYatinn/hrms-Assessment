import { Users, UserCheck, UserX, Percent, ArrowRight, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/app-header'
import { StatCard } from '@/components/stat-card'
import { useHRMS } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function DashboardPage() {
  const navigate = useNavigate()
  const { employees, getStats, getTodayAttendance } = useHRMS()
  const stats = getStats()
  const todayAttendance = getTodayAttendance()
  const AUTH_STORAGE_KEY = 'hrmsLoggedIn'

  const recentEmployees = [...employees]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        title="Dashboard"
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-md border-[#d8deef] bg-white text-[#2b418c] hover:bg-[#eef3ff] hover:text-[#2b418c]"
            onClick={handleLogout}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Logout
          </Button>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="m-0 flex flex-wrap items-center gap-2">
          <Badge className="border-[#d9e2fa] bg-white px-3.5 py-1.5 text-[0.84rem] text-[#2b418c] sm:px-4 sm:py-2 sm:text-[0.865rem]">
            Overview
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Employees"
            value={stats.totalEmployees}
            trend={{ value: 12, isPositive: true }}
            variant="accent"
            to="/employees"
          />
          <StatCard
            icon={UserCheck}
            label="Present Today"
            value={stats.presentToday}
            trend={{ value: 5, isPositive: true }}
            variant="success"
            to="/attendance"
          />
          <StatCard
            icon={UserX}
            label="Absent Today"
            value={stats.absentToday}
            variant="warning"
            to="/attendance"
          />
          <StatCard
            icon={Percent}
            label="Attendance Rate"
            value={`${stats.attendanceRate}%`}
            to="/attendance/calendar"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 overflow-hidden rounded-xl border border-[#dfe5f7] bg-white shadow-[0_8px_24px_rgba(43,65,140,0.05)]">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#2a3a72] bg-[#1f2f69] p-4">
              <h2 className="min-w-0 truncate text-sm font-medium text-white">Recent Employees</h2>
              <Link to="/employees">
                <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-md px-3 text-xs text-white/90 hover:bg-white/10 hover:text-white">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            {recentEmployees.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No recent employees yet.
              </div>
            ) : (
              <div className="divide-y divide-[#edf1fc]">
                {recentEmployees.map((employee) => (
                  <Link
                    key={employee.id}
                    to={`/employees/${employee.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f7f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b418c]/25 focus-visible:ring-inset"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf2ff] text-xs font-medium text-[#2b418c]">
                      {getInitials(employee.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{employee.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{employee.department}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{employee.id}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-[#dfe5f7] bg-white shadow-[0_8px_24px_rgba(43,65,140,0.05)]">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#2a3a72] bg-[#1f2f69] p-4">
              <h2 className="min-w-0 truncate text-sm font-medium text-white">
                Today&apos;s Attendance
              </h2>
              <Link to="/attendance">
                <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-md px-3 text-xs text-white/90 hover:bg-white/10 hover:text-white">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10">Name</TableHead>
                    <TableHead className="h-10">Department</TableHead>
                    <TableHead className="h-10 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAttendance.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                        No attendance records for today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    todayAttendance.slice(0, 5).map(({ employee, status }) => (
                      <TableRow
                        key={employee.id}
                        className="cursor-pointer hover:bg-[#f7f9ff]"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        <TableCell>
                          <span className="text-sm text-foreground">{employee.fullName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{employee.department}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="secondary"
                            className={
                              status === 'present'
                                ? 'bg-success/10 text-success border-0'
                                : status === 'absent'
                                  ? 'bg-destructive/10 text-destructive border-0'
                                  : 'bg-muted text-muted-foreground border-0'
                            }
                          >
                            {status === 'present'
                              ? 'Present'
                              : status === 'absent'
                                ? 'Absent'
                                : 'Unmarked'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden">
              {todayAttendance.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No attendance records for today.
                </div>
              ) : (
                <ul className="divide-y divide-[#edf1fc]" aria-label="Today&apos;s attendance">
                  {todayAttendance.slice(0, 5).map(({ employee, status }) => (
                    <li key={employee.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col gap-2 rounded-none px-4 py-3.5 text-left transition-colors hover:bg-[#f7f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2b418c]/25"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{employee.fullName}</span>
                          <Badge
                            variant="secondary"
                            className={
                              status === 'present'
                                ? 'shrink-0 bg-success/10 text-success border-0'
                                : status === 'absent'
                                  ? 'shrink-0 bg-destructive/10 text-destructive border-0'
                                  : 'shrink-0 bg-muted text-muted-foreground border-0'
                            }
                          >
                            {status === 'present'
                              ? 'Present'
                              : status === 'absent'
                                ? 'Absent'
                                : 'Unmarked'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{employee.department}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
