import { Outlet } from 'react-router-dom'
import { AppSidebar } from './app-sidebar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8faff_0%,#f5f7fd_45%,#f3f6ff_100%)] text-foreground">
      <AppSidebar />
      <main className="ml-56">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
