"use client"

import * as React from "react"
import {
  BookOpen,
  BarChart3,
  LayoutDashboard,
  GraduationCap,
  HelpCircle,
  Plus,
  FileQuestion,
  FileText,
  Search,
  Settings,
  Users,
  Zap,
  Database,
  Folder,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavDocuments } from "./nav-documents"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"

const data = {
  user: {
    name: "Admin",
    email: "admin@quizup.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboard,
    },
    {
      title: "Courses",
      url: "#",
      icon: BookOpen,
    },
    {
      title: "Students",
      url: "#",
      icon: GraduationCap,
    },
    {
      title: "Faculties",
      url: "#",
      icon: Users,
    },
    {
      title: "Analytics",
      url: "#",
      icon: BarChart3,
    },
  ],
  navClouds: [
    {
      title: "Quiz Management",
      icon: FileQuestion,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Quizzes",
          url: "#",
        },
        {
          title: "Draft Quizzes",
          url: "#",
        },
      ],
    },
    {
      title: "Course Content",
      icon: BookOpen,
      url: "#",
      items: [
        {
          title: "Course Materials",
          url: "#",
        },
        {
          title: "Assignments",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircle,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Quiz Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: FileText,
    },
    {
      name: "Course Templates",
      url: "#",
      icon: Folder,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Zap className="!size-5" />
                <span className="text-base font-semibold">QuizUP</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
