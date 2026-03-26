import { Users, UserCheck, UserX, Percent, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
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
  const { employees, getStats, getTodayAttendance } = useHRMS()
  const stats = getStats()
  const todayAttendance = getTodayAttendance()

  const recentEmployees = [...employees]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Dashboard" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Employees"
            value={stats.totalEmployees}
            trend={{ value: 12, isPositive: true }}
            variant="accent"
          />
          <StatCard
            icon={UserCheck}
            label="Present Today"
            value={stats.presentToday}
            trend={{ value: 5, isPositive: true }}
            variant="success"
          />
          <StatCard
            icon={UserX}
            label="Absent Today"
            value={stats.absentToday}
            variant="warning"
          />
          <StatCard
            icon={Percent}
            label="Attendance Rate"
            value={`${stats.attendanceRate}%`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">Recent Employees</h2>
              <Link to="/employees">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {getInitials(employee.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{employee.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{employee.department}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{employee.id}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">Today&apos;s Attendance</h2>
              <Link to="/attendance">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs text-muted-foreground font-medium h-9">Name</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium h-9">Department</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium h-9 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAttendance.slice(0, 5).map(({ employee, status }) => (
                  <TableRow key={employee.id} className="border-border hover:bg-muted/50">
                    <TableCell className="py-2.5">
                      <span className="text-sm text-foreground">{employee.fullName}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-sm text-muted-foreground">{employee.department}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
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
                        {status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Unmarked'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
