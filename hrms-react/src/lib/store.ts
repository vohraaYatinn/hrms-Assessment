import { createContext, useContext } from 'react'
import type { Employee, AttendanceRecord } from './types'

export type InitialDataStatus = 'loading' | 'ready' | 'error'

export interface HRMSState {
  employees: Employee[]
  attendance: AttendanceRecord[]
  initialDataStatus: InitialDataStatus
  initialDataError: string | null
  retryInitialData: () => void
  /** Keeps dashboard / attendance in sync when EmployeesPage loads or mutates its own copy. */
  replaceEmployeesSnapshot: (employees: Employee[]) => void
  replaceAttendanceSnapshot: (rows: AttendanceRecord[]) => void
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'employeeId'>) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  markAttendance: (employeeId: string, date: string, status: 'present' | 'absent') => Promise<void>
  bulkMarkAttendance: (params: {
    date: string
    status: 'present' | 'absent'
    employeeIds?: string[]
    employeeExpectations?: {
      employeeId: string
      expectedCurrentStatus: 'present' | 'absent' | null
    }[]
  }) => Promise<void>
  syncAttendanceForDate: (date: string) => Promise<void>
  getEmployeeAttendance: (employeeId: string) => AttendanceRecord[]
  getTodayAttendance: () => { employee: Employee; status: 'present' | 'absent' | 'unmarked' }[]
  getStats: () => {
    totalEmployees: number
    presentToday: number
    absentToday: number
    attendanceRate: number
  }
}

export const HRMSContext = createContext<HRMSState | null>(null)

export function useHRMS() {
  const context = useContext(HRMSContext)
  if (!context) {
    throw new Error('useHRMS must be used within HRMSProvider')
  }
  return context
}
