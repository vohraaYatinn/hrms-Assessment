
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
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
import { useHRMS } from '@/lib/store'
import { type Department, DEPARTMENTS } from '@/lib/types'

interface AddEmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormErrors {
  employeeId?: string
  fullName?: string
  email?: string
  department?: string
}

export function AddEmployeeModal({ open, onOpenChange }: AddEmployeeModalProps) {
  const { employees, addEmployee } = useHRMS()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    department: '' as Department | '',
  })

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required'
    } else if (employees.some((e) => e.employeeId === formData.employeeId.trim())) {
      newErrors.employeeId = 'Employee ID already exists'
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.department) {
      newErrors.department = 'Department is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    try {
      addEmployee({
        employeeId: formData.employeeId.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        department: formData.department as Department,
      })
      
      toast.success('Employee added successfully')
      onOpenChange(false)
      setFormData({ employeeId: '', fullName: '', email: '', department: '' })
      setErrors({})
    } catch {
      toast.error('Failed to add employee')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setFormData({ employeeId: '', fullName: '', email: '', department: '' })
      setErrors({})
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Employee</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Fill in the details to add a new employee to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId" className="text-sm text-foreground">Employee ID</Label>
            <Input
              id="employeeId"
              placeholder="e.g., EMP008"
              value={formData.employeeId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, employeeId: e.target.value }))
              }
              aria-invalid={!!errors.employeeId}
              className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.employeeId && (
              <p className="text-xs text-destructive">{errors.employeeId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm text-foreground">Full Name</Label>
            <Input
              id="fullName"
              placeholder="e.g., John Doe"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              aria-invalid={!!errors.fullName}
              className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., john.doe@company.com"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              aria-invalid={!!errors.email}
              className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department" className="text-sm text-foreground">Department</Label>
            <Select
              value={formData.department}
              onValueChange={(value: Department) =>
                setFormData((prev) => ({ ...prev, department: value }))
              }
            >
              <SelectTrigger 
                aria-invalid={!!errors.department}
                className="bg-secondary border-0 focus:ring-1 focus:ring-ring"
              >
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
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
              onClick={() => handleClose(false)}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {loading ? 'Adding...' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
