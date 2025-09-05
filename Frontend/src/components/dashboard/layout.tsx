import { useEffect, useState } from "react"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "./components/app-sidebar"
import { SiteHeader } from "./components/site-header"

import "./theme.css"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [defaultOpen, setDefaultOpen] = useState(true)

  useEffect(() => {
    // Get sidebar state from localStorage or cookies
    const sidebarState = localStorage.getItem("sidebar_state")
    setDefaultOpen(sidebarState === "true")
  }, [])

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
