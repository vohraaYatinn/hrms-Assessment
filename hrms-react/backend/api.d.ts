import type { AttendanceRecord, Employee } from '../src/lib/types'

export type EmployeeWritePayload = Pick<Employee, 'fullName' | 'email' | 'department'>

export type FetchEmployeesPageParams = {
  page?: number
  pageSize?: number
  search?: string
  department?: string
  ordering?: string
  employeeId?: string
}

export type EmployeesPageResult = {
  employees: Employee[]
  count: number
  next: string | null
  previous: string | null
}

export function fetchEmployeesPage(params?: FetchEmployeesPageParams): Promise<EmployeesPageResult>
export function fetchAllEmployees(): Promise<Employee[]>
export function fetchAllEmployeesMatching(params?: {
  search?: string
  department?: string
}): Promise<Employee[]>
export function fetchEmployees(): Promise<Employee[]>
export function createEmployee(employee: EmployeeWritePayload): Promise<Employee>
export function updateEmployee(id: string, employee: EmployeeWritePayload): Promise<Employee>
export function removeEmployee(id: string): Promise<void>

export function createDemoEmployees(count: number): Promise<{ created: number }>
export function deleteAllEmployees(): Promise<{ deleted_employees: number }>

export function fetchAttendance(): Promise<AttendanceRecord[]>
export function fetchAttendanceByDate(date: string): Promise<AttendanceRecord[]>
export function fetchAttendanceByRange(
  startDate: string,
  endDate: string,
): Promise<AttendanceRecord[]>
export function bulkAttendance(payload: {
  date: string
  status: 'present' | 'absent'
  employeeIds?: string[]
}): Promise<{ created: number; updated: number; total: number }>
export function createAttendance(payload: {
  employeeId: string
  date: string
  status: 'present' | 'absent'
}): Promise<AttendanceRecord>

export function createDemoPastAttendance(
  days: number,
  status?: 'present' | 'absent' | 'random',
): Promise<{
  days: number
  dates: string[]
  employees: number
  created: number
  updated: number
}>
export function deleteAllAttendance(): Promise<{ deleted: number }>
