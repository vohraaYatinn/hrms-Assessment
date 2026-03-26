export interface Employee {
  id: string
  employeeId: string
  fullName: string
  email: string
  department: Department
  createdAt: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  status: 'present' | 'absent'
}

export type Department =
  | 'Engineering'
  | 'Design'
  | 'Product'
  | 'Marketing'
  | 'HR'
  | 'Finance'
  | 'Operations'

export const DEPARTMENTS: Department[] = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'HR',
  'Finance',
  'Operations',
]
