import { useState, useMemo } from 'react'
import { Plus, Search, Trash2, Users, MoreHorizontal, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from '@/components/app-header'
import { AddEmployeeModal } from '@/components/add-employee-modal'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
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
import { useHRMS } from '@/lib/store'

export function EmployeesPage() {
  const { employees, deleteEmployee } = useHRMS()
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isLoading] = useState(false)

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees
    const query = searchQuery.toLowerCase()
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query) ||
        e.employeeId.toLowerCase().includes(query)
    )
  }, [employees, searchQuery])

  const handleDelete = () => {
    if (deleteTarget) {
      deleteEmployee(deleteTarget)
      toast.success('Employee deleted successfully')
      setDeleteTarget(null)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const employeeToDelete = employees.find((e) => e.id === deleteTarget)

  return (
    <div className="min-h-screen">
      <AppHeader
        title="Employees"
        subtitle={`${employees.length} total employees`}
        action={
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Employee
          </Button>
        }
      />
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Badge variant="secondary" className="h-9 px-3 font-normal">
            {filteredEmployees.length} results
          </Badge>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isLoading ? (
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
          ) : filteredEmployees.length === 0 ? (
            <Empty className="py-16">
              <EmptyMedia variant="icon">
                <Users className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {searchQuery ? 'No employees found' : 'No employees yet'}
              </EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? 'Try adjusting your search query.'
                  : 'Add your first employee to get started.'}
              </EmptyDescription>
              {!searchQuery && (
                <EmptyContent>
                  <Button
                    onClick={() => setShowAddModal(true)}
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
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground">Employee</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">ID</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Department</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="border-border group">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="bg-secondary text-foreground text-xs font-medium">
                            {getInitials(employee.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">
                          {employee.fullName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <code className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {employee.employeeId}
                      </code>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-muted-foreground">
                        {employee.email}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="secondary" className="font-normal text-xs">
                        {employee.department}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions for {employee.fullName}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="text-sm">
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
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
          )}
        </div>
      </div>

      <AddEmployeeModal open={showAddModal} onOpenChange={setShowAddModal} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Employee"
        description={`Are you sure you want to delete ${employeeToDelete?.fullName}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  )
}
