
import { useRef, useState } from 'react'
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
import {
  EMPLOYEE_EMAIL_MAX,
  EMPLOYEE_FULL_NAME_MAX,
  validateEmployeeEmail,
  validateEmployeeFullName,
} from '@/lib/employee-form-validation'
import { useHRMS } from '@/lib/store'
import { type Department, DEPARTMENTS } from '@/lib/types'

interface AddEmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormErrors {
  fullName?: string
  email?: string
  department?: string
}

export function AddEmployeeModal({ open, onOpenChange }: AddEmployeeModalProps) {
  const { addEmployee } = useHRMS()
  const [loading, setLoading] = useState(false)
  const submitGuardRef = useRef(false)
  const [errors, setErrors] = useState<FormErrors>({})
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: '' as Department | '',
  })

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    const fullNameErr = validateEmployeeFullName(formData.fullName)
    if (fullNameErr) newErrors.fullName = fullNameErr
    const emailErr = validateEmployeeEmail(formData.email)
    if (emailErr) newErrors.email = emailErr
    if (!formData.department) {
      newErrors.department = 'Department is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submitGuardRef.current) return
    if (!validateForm()) return

    submitGuardRef.current = true
    setLoading(true)

    try {
      await addEmployee({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        department: formData.department as Department,
      })

      toast.success('Employee added successfully')
      onOpenChange(false)
      setFormData({ fullName: '', email: '', department: '' })
      setErrors({})
    } catch {
      toast.error('Failed to add employee')
    } finally {
      setLoading(false)
      submitGuardRef.current = false
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && loading) return
    if (!isOpen) {
      setFormData({ fullName: '', email: '', department: '' })
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
            <Label htmlFor="fullName" className="text-sm text-foreground">Full Name</Label>
            <Input
              id="fullName"
              placeholder="e.g., Yatin Vohra"
              value={formData.fullName}
              maxLength={EMPLOYEE_FULL_NAME_MAX}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              aria-invalid={!!errors.fullName}
              className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.fullName.length}/{EMPLOYEE_FULL_NAME_MAX} · letters and spaces only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., john.doe@company.com"
              value={formData.email}
              maxLength={EMPLOYEE_EMAIL_MAX}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              aria-invalid={!!errors.email}
              className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.email.length}/{EMPLOYEE_EMAIL_MAX}
            </p>
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
