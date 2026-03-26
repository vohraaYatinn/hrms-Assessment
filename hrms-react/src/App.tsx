import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import type { ReactElement } from 'react'
import { HRMSProvider } from '@/components/hrms-provider'
import { AppLayout } from '@/components/app-layout'
import { AttendanceCalendarPage } from '@/pages/AttendanceCalendarPage'
import { AttendancePage } from '@/pages/AttendancePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { LoginPage } from '@/pages/LoginPage'

const AUTH_STORAGE_KEY = 'hrmsLoggedIn'

function ProtectedRoute({ children }: { children: ReactElement }) {
  const isLoggedIn = localStorage.getItem(AUTH_STORAGE_KEY) === 'true'
  if (!isLoggedIn) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <HRMSProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/attendance/calendar" element={<AttendanceCalendarPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
        <Toaster position="top-right" richColors />
      </HRMSProvider>
    </BrowserRouter>
  )
}
