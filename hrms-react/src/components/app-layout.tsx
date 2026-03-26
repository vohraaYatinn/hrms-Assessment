import type { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-56">{children}</main>
    </div>
  )
}
