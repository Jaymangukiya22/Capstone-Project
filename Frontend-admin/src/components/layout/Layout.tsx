import { useState } from 'react'
import { Sidebar } from "./Sidebar"
import { TopNavigation } from "./TopNavigation"
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar - Sheet */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[85vw] max-w-[320px]">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b bg-background sticky top-0 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <h1 className="text-base font-semibold">QuizMaster</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Desktop Top Navigation */}
        <div className="hidden lg:block">
          <TopNavigation />
        </div>
        
        <main className="flex-1 overflow-y-auto p-2 sm:p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
