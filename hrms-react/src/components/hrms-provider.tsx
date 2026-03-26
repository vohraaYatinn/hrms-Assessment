import { useState, useCallback, useMemo, type ReactNode } from 'react'
import type { Employee, AttendanceRecord } from '@/lib/types'
import { HRMSContext, type HRMSState, mockEmployees, mockAttendance, REFERENCE_DATE } from '@/lib/store'

export function HRMSProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(mockAttendance)
  
  // Use reference date consistently to avoid hydration mismatch
  // In production, this would come from a server timestamp
  const todayDate = REFERENCE_DATE

  const addEmployee = useCallback((employeeData: Omit<Employee, 'id' | 'createdAt'>) => {
    const newEmployee: Employee = {
      ...employeeData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setEmployees((prev) => [...prev, newEmployee])
  }, [])

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id))
    setAttendance((prev) => prev.filter((a) => a.employeeId !== id))
  }, [])

  const markAttendance = useCallback(
    (employeeId: string, date: string, status: 'present' | 'absent') => {
      setAttendance((prev) => {
        const existingIndex = prev.findIndex(
          (a) => a.employeeId === employeeId && a.date === date
        )
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = { ...updated[existingIndex], status }
          return updated
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            employeeId,
            date,
            status,
          },
        ]
      })
    },
    []
  )

  const getEmployeeAttendance = useCallback(
    (employeeId: string) => {
      return attendance
        .filter((a) => a.employeeId === employeeId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
    [attendance]
  )

  const getTodayAttendance = useCallback(() => {
    return employees.map((employee) => {
      const record = attendance.find(
        (a) => a.employeeId === employee.id && a.date === todayDate
      )
      return {
        employee,
        status: record?.status ?? ('unmarked' as const),
      }
    })
  }, [employees, attendance, todayDate])

  const getStats = useCallback(() => {
    const todayRecords = attendance.filter((a) => a.date === todayDate)
    const presentToday = todayRecords.filter((a) => a.status === 'present').length
    const absentToday = todayRecords.filter((a) => a.status === 'absent').length
    const totalEmployees = employees.length
    const attendanceRate =
      todayRecords.length > 0
        ? Math.round((presentToday / todayRecords.length) * 100)
        : 0

    return {
      totalEmployees,
      presentToday,
      absentToday,
      attendanceRate,
    }
  }, [employees, attendance, todayDate])

  const value: HRMSState = useMemo(
    () => ({
      employees,
      attendance,
      addEmployee,
      deleteEmployee,
      markAttendance,
      getEmployeeAttendance,
      getTodayAttendance,
      getStats,
    }),
    [
      employees,
      attendance,
      addEmployee,
      deleteEmployee,
      markAttendance,
      getEmployeeAttendance,
      getTodayAttendance,
      getStats,
    ]
  )

  return <HRMSContext.Provider value={value}>{children}</HRMSContext.Provider>
}
