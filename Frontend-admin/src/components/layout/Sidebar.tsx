import { 
  LayoutDashboard, 
  FolderTree, 
  FileQuestion, 
  Users, 
  GraduationCap,
  Settings,
  HelpCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    current: false,
  },
  {
    name: "Categories",
    href: "/categories",
    icon: FolderTree,
    current: true,
  },
  {
    name: "Quiz Builder",
    href: "/quiz-builder",
    icon: FileQuestion,
    current: false,
  },
  {
    name: "Faculties",
    href: "/faculties",
    icon: Users,
    current: false,
  },
  {
    name: "Students",
    href: "/students",
    icon: GraduationCap,
    current: false,
  },
]

const bottomNavigation = [
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    current: false,
  },
  {
    name: "Help",
    href: "/help",
    icon: HelpCircle,
    current: false,
  },
]

export function Sidebar() {
  return (
    <div className="flex h-screen w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">Q</span>
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-white text-base">QuizMaster</span>
            <div className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
          Overview
        </div>
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150",
                item.current
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Icon className={cn(
                "mr-3 h-5 w-5",
                item.current 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-400 dark:text-gray-500"
              )} />
              {item.name}
            </a>
          )
        })}

        <div className="pt-6">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
            Content Management
          </div>
          <a
            href="/question-editor"
            className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          >
            <FileQuestion className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
            Question Editor
          </a>
        </div>

        <div className="pt-6">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
            Live Operations
          </div>
          <a
            href="/live-monitor"
            className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          >
            <div className="mr-3 h-5 w-5 flex items-center justify-center">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            Live Monitor
          </a>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
        {bottomNavigation.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            >
              <Icon className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
              {item.name}
            </a>
          )
        })}
      </div>

      {/* User Section */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">AU</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Admin User</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">admin@quizmaster.com</div>
          </div>
        </div>
      </div>
    </div>
  )
}
