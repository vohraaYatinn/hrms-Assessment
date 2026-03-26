import type { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="ml-56">
        <div className="min-h-screen bg-background">{children}</div>
      </main>
    </div>
  )
}
