import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import type { Employee, AttendanceRecord } from '@/lib/types'
import { HRMSContext, type HRMSState, mockEmployees, mockAttendance, REFERENCE_DATE } from '@/lib/store'
import {
  fetchEmployees,
  fetchAttendance,
  fetchAttendanceByDate,
  createEmployee,
  removeEmployee,
  bulkAttendance,
} from '../../backend/api.js'

const EMPLOYEES_SYNC_CHANNEL = 'hrms-employees-sync'

function postEmployeesSync() {
  try {
    const bc = new BroadcastChannel(EMPLOYEES_SYNC_CHANNEL)
    bc.postMessage({ type: 'employees-changed' })
    bc.close()
  } catch {
    /* ignore */
  }
}

export function HRMSProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(mockAttendance)
  const [hasLoadedFromBackend, setHasLoadedFromBackend] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadInitialData() {
      try {
        const [remoteEmployees, remoteAttendance] = await Promise.all([
          fetchEmployees(),
          fetchAttendance(),
        ])
        if (!mounted) return
        setEmployees(remoteEmployees)
        setAttendance(remoteAttendance)
      } catch {
        // Keep mock data as fallback when backend is unavailable.
      } finally {
        if (mounted) {
          setHasLoadedFromBackend(true)
        }
      }
    }

    void loadInitialData()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(EMPLOYEES_SYNC_CHANNEL)
    ch.onmessage = () => {
      void (async () => {
        try {
          const [nextEmployees, nextAttendance] = await Promise.all([
            fetchEmployees(),
            fetchAttendance(),
          ])
          setEmployees(nextEmployees)
          setAttendance(nextAttendance)
        } catch {
          /* keep existing */
        }
      })()
    }
    return () => ch.close()
  }, [])

  const replaceEmployeesSnapshot = useCallback((next: Employee[]) => {
    setEmployees(next)
  }, [])

  const replaceAttendanceSnapshot = useCallback((rows: AttendanceRecord[]) => {
    setAttendance(rows)
  }, [])

  const addEmployee = useCallback(async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'employeeId'>) => {
    const created = await createEmployee(employeeData)
    setEmployees((prev) => [...prev, created])
    postEmployeesSync()
  }, [])

  const deleteEmployee = useCallback(async (id: string) => {
    await removeEmployee(id)
    setEmployees((prev) => prev.filter((e) => e.id !== id))
    setAttendance((prev) => prev.filter((a) => a.employeeId !== id))
    postEmployeesSync()
  }, [])

  const syncAttendanceForDate = useCallback(async (date: string) => {
    try {
      const rows = await fetchAttendanceByDate(date)
      setAttendance((prev) => [...prev.filter((a) => a.date !== date), ...rows])
    } catch {
      // Offline or legacy backend: keep existing client state for that date.
    }
  }, [])

  const markAttendance = useCallback(
    async (employeeId: string, date: string, status: 'present' | 'absent') => {
      const rec = attendance.find(
        (a) => a.employeeId === employeeId && a.date === date,
      )
      await bulkAttendance({
        date,
        status,
        employeeIds: [employeeId],
        employeeExpectations: [
          {
            employeeId,
            expectedCurrentStatus: rec ? rec.status : null,
          },
        ],
      })
      await syncAttendanceForDate(date)
    },
    [attendance, syncAttendanceForDate],
  )

  const bulkMarkAttendance = useCallback(
    async (params: {
      date: string
      status: 'present' | 'absent'
      employeeIds?: string[]
      employeeExpectations?: {
        employeeId: string
        expectedCurrentStatus: 'present' | 'absent' | null
      }[]
    }) => {
      let expectations = params.employeeExpectations
      if (!expectations && params.employeeIds?.length) {
        expectations = params.employeeIds.map((id) => {
          const rec = attendance.find((a) => a.employeeId === id && a.date === params.date)
          return {
            employeeId: id,
            expectedCurrentStatus: rec ? rec.status : null,
          }
        })
      }
      await bulkAttendance({
        ...params,
        employeeExpectations: expectations,
      })
      await syncAttendanceForDate(params.date)
    },
    [attendance, syncAttendanceForDate],
  )

  const getEmployeeAttendance = useCallback(
    (employeeId: string) => {
      return attendance
        .filter((a) => a.employeeId === employeeId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
    [attendance]
  )

  const todayDate = useMemo(() => {
    if (!hasLoadedFromBackend) {
      return REFERENCE_DATE
    }
    return new Date().toISOString().slice(0, 10)
  }, [hasLoadedFromBackend])

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
      replaceEmployeesSnapshot,
      replaceAttendanceSnapshot,
      addEmployee,
      deleteEmployee,
      markAttendance,
      bulkMarkAttendance,
      syncAttendanceForDate,
      getEmployeeAttendance,
      getTodayAttendance,
      getStats,
    }),
    [
      employees,
      attendance,
      replaceEmployeesSnapshot,
      replaceAttendanceSnapshot,
      addEmployee,
      deleteEmployee,
      markAttendance,
      bulkMarkAttendance,
      syncAttendanceForDate,
      getEmployeeAttendance,
      getTodayAttendance,
      getStats,
    ]
  )

  return <HRMSContext.Provider value={value}>{children}</HRMSContext.Provider>
}
