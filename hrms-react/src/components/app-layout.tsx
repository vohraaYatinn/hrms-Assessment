import { Outlet } from 'react-router-dom'
import { AppSidebar, SidebarNavPanel } from './app-sidebar'
import { InitialDataBanner } from './initial-data-banner'
import { MobileNavProvider, useMobileNav } from './mobile-nav-context'
import { Sheet, SheetContent } from '@/components/ui/sheet'

function AppLayoutInner() {
  const { open, setOpen } = useMobileNav()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8faff_0%,#f5f7fd_45%,#f3f6ff_100%)] text-foreground">
      <AppSidebar />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[min(100vw-1rem,16rem)] border-[#334887] bg-[#1f2f69] p-0 text-sidebar-foreground [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white"
        >
          <SidebarNavPanel onNavigate={() => setOpen(false)} className="pt-2" />
        </SheetContent>
      </Sheet>
      <main className="min-h-screen lg:ml-56">
        <InitialDataBanner />
        <Outlet />
      </main>
    </div>
  )
}

export function AppLayout() {
  return (
    <MobileNavProvider>
      <AppLayoutInner />
    </MobileNavProvider>
  )
}
