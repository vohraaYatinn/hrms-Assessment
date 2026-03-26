import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { HRMSProvider } from '@/components/hrms-provider'
import { AppLayout } from '@/components/app-layout'
import { AttendancePage } from '@/pages/AttendancePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmployeesPage } from '@/pages/EmployeesPage'

export default function App() {
  return (
    <BrowserRouter>
      <HRMSProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        <Toaster position="top-right" richColors />
      </HRMSProvider>
    </BrowserRouter>
  )
}
