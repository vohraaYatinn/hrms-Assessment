import { createContext, useContext } from 'react'
import type { Employee, AttendanceRecord } from './types'

// Mock data for demonstration
export const mockEmployees: Employee[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    fullName: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    department: 'Engineering',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    fullName: 'Marcus Johnson',
    email: 'marcus.johnson@company.com',
    department: 'Design',
    createdAt: '2024-01-20T09:30:00Z',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    fullName: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    department: 'Product',
    createdAt: '2024-02-01T14:00:00Z',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    fullName: 'David Kim',
    email: 'david.kim@company.com',
    department: 'Marketing',
    createdAt: '2024-02-10T11:00:00Z',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    fullName: 'Rachel Thompson',
    email: 'rachel.thompson@company.com',
    department: 'HR',
    createdAt: '2024-02-15T08:30:00Z',
  },
  {
    id: '6',
    employeeId: 'EMP006',
    fullName: 'James Wilson',
    email: 'james.wilson@company.com',
    department: 'Finance',
    createdAt: '2024-03-01T13:00:00Z',
  },
  {
    id: '7',
    employeeId: 'EMP007',
    fullName: 'Lisa Park',
    email: 'lisa.park@company.com',
    department: 'Operations',
    createdAt: '2024-03-10T10:30:00Z',
  },
]

// Fixed reference date to avoid hydration mismatches
export const REFERENCE_DATE = '2026-03-26'

// Pre-computed attendance records to avoid hydration mismatches
// Pattern: employees 1-7, days 0-29 (excluding weekends), ~85% present
export const mockAttendance: AttendanceRecord[] = [
  // Employee 1 - Sarah Chen
  { id: '1-2026-03-26', employeeId: '1', date: '2026-03-26', status: 'present' },
  { id: '1-2026-03-25', employeeId: '1', date: '2026-03-25', status: 'present' },
  { id: '1-2026-03-24', employeeId: '1', date: '2026-03-24', status: 'present' },
  { id: '1-2026-03-23', employeeId: '1', date: '2026-03-23', status: 'present' },
  { id: '1-2026-03-20', employeeId: '1', date: '2026-03-20', status: 'absent' },
  { id: '1-2026-03-19', employeeId: '1', date: '2026-03-19', status: 'present' },
  { id: '1-2026-03-18', employeeId: '1', date: '2026-03-18', status: 'present' },
  { id: '1-2026-03-17', employeeId: '1', date: '2026-03-17', status: 'present' },
  { id: '1-2026-03-16', employeeId: '1', date: '2026-03-16', status: 'present' },
  { id: '1-2026-03-13', employeeId: '1', date: '2026-03-13', status: 'present' },
  // Employee 2 - Marcus Johnson
  { id: '2-2026-03-26', employeeId: '2', date: '2026-03-26', status: 'present' },
  { id: '2-2026-03-25', employeeId: '2', date: '2026-03-25', status: 'present' },
  { id: '2-2026-03-24', employeeId: '2', date: '2026-03-24', status: 'absent' },
  { id: '2-2026-03-23', employeeId: '2', date: '2026-03-23', status: 'present' },
  { id: '2-2026-03-20', employeeId: '2', date: '2026-03-20', status: 'present' },
  { id: '2-2026-03-19', employeeId: '2', date: '2026-03-19', status: 'present' },
  { id: '2-2026-03-18', employeeId: '2', date: '2026-03-18', status: 'present' },
  { id: '2-2026-03-17', employeeId: '2', date: '2026-03-17', status: 'present' },
  { id: '2-2026-03-16', employeeId: '2', date: '2026-03-16', status: 'present' },
  { id: '2-2026-03-13', employeeId: '2', date: '2026-03-13', status: 'present' },
  // Employee 3 - Emily Rodriguez
  { id: '3-2026-03-26', employeeId: '3', date: '2026-03-26', status: 'present' },
  { id: '3-2026-03-25', employeeId: '3', date: '2026-03-25', status: 'present' },
  { id: '3-2026-03-24', employeeId: '3', date: '2026-03-24', status: 'present' },
  { id: '3-2026-03-23', employeeId: '3', date: '2026-03-23', status: 'absent' },
  { id: '3-2026-03-20', employeeId: '3', date: '2026-03-20', status: 'present' },
  { id: '3-2026-03-19', employeeId: '3', date: '2026-03-19', status: 'present' },
  { id: '3-2026-03-18', employeeId: '3', date: '2026-03-18', status: 'present' },
  { id: '3-2026-03-17', employeeId: '3', date: '2026-03-17', status: 'present' },
  { id: '3-2026-03-16', employeeId: '3', date: '2026-03-16', status: 'present' },
  { id: '3-2026-03-13', employeeId: '3', date: '2026-03-13', status: 'present' },
  // Employee 4 - David Kim
  { id: '4-2026-03-26', employeeId: '4', date: '2026-03-26', status: 'present' },
  { id: '4-2026-03-25', employeeId: '4', date: '2026-03-25', status: 'present' },
  { id: '4-2026-03-24', employeeId: '4', date: '2026-03-24', status: 'present' },
  { id: '4-2026-03-23', employeeId: '4', date: '2026-03-23', status: 'present' },
  { id: '4-2026-03-20', employeeId: '4', date: '2026-03-20', status: 'present' },
  { id: '4-2026-03-19', employeeId: '4', date: '2026-03-19', status: 'absent' },
  { id: '4-2026-03-18', employeeId: '4', date: '2026-03-18', status: 'present' },
  { id: '4-2026-03-17', employeeId: '4', date: '2026-03-17', status: 'present' },
  { id: '4-2026-03-16', employeeId: '4', date: '2026-03-16', status: 'present' },
  { id: '4-2026-03-13', employeeId: '4', date: '2026-03-13', status: 'present' },
  // Employee 5 - Rachel Thompson
  { id: '5-2026-03-26', employeeId: '5', date: '2026-03-26', status: 'present' },
  { id: '5-2026-03-25', employeeId: '5', date: '2026-03-25', status: 'present' },
  { id: '5-2026-03-24', employeeId: '5', date: '2026-03-24', status: 'present' },
  { id: '5-2026-03-23', employeeId: '5', date: '2026-03-23', status: 'present' },
  { id: '5-2026-03-20', employeeId: '5', date: '2026-03-20', status: 'present' },
  { id: '5-2026-03-19', employeeId: '5', date: '2026-03-19', status: 'present' },
  { id: '5-2026-03-18', employeeId: '5', date: '2026-03-18', status: 'absent' },
  { id: '5-2026-03-17', employeeId: '5', date: '2026-03-17', status: 'present' },
  { id: '5-2026-03-16', employeeId: '5', date: '2026-03-16', status: 'present' },
  { id: '5-2026-03-13', employeeId: '5', date: '2026-03-13', status: 'present' },
  // Employee 6 - James Wilson
  { id: '6-2026-03-26', employeeId: '6', date: '2026-03-26', status: 'present' },
  { id: '6-2026-03-25', employeeId: '6', date: '2026-03-25', status: 'absent' },
  { id: '6-2026-03-24', employeeId: '6', date: '2026-03-24', status: 'present' },
  { id: '6-2026-03-23', employeeId: '6', date: '2026-03-23', status: 'present' },
  { id: '6-2026-03-20', employeeId: '6', date: '2026-03-20', status: 'present' },
  { id: '6-2026-03-19', employeeId: '6', date: '2026-03-19', status: 'present' },
  { id: '6-2026-03-18', employeeId: '6', date: '2026-03-18', status: 'present' },
  { id: '6-2026-03-17', employeeId: '6', date: '2026-03-17', status: 'present' },
  { id: '6-2026-03-16', employeeId: '6', date: '2026-03-16', status: 'present' },
  { id: '6-2026-03-13', employeeId: '6', date: '2026-03-13', status: 'present' },
  // Employee 7 - Lisa Park
  { id: '7-2026-03-26', employeeId: '7', date: '2026-03-26', status: 'absent' },
  { id: '7-2026-03-25', employeeId: '7', date: '2026-03-25', status: 'present' },
  { id: '7-2026-03-24', employeeId: '7', date: '2026-03-24', status: 'present' },
  { id: '7-2026-03-23', employeeId: '7', date: '2026-03-23', status: 'present' },
  { id: '7-2026-03-20', employeeId: '7', date: '2026-03-20', status: 'present' },
  { id: '7-2026-03-19', employeeId: '7', date: '2026-03-19', status: 'present' },
  { id: '7-2026-03-18', employeeId: '7', date: '2026-03-18', status: 'present' },
  { id: '7-2026-03-17', employeeId: '7', date: '2026-03-17', status: 'absent' },
  { id: '7-2026-03-16', employeeId: '7', date: '2026-03-16', status: 'present' },
  { id: '7-2026-03-13', employeeId: '7', date: '2026-03-13', status: 'present' },
]

export interface HRMSState {
  employees: Employee[]
  attendance: AttendanceRecord[]
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
