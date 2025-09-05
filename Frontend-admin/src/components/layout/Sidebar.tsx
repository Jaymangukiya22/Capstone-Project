import { 
  LayoutDashboard, 
  FolderTree, 
  FileQuestion, 
  Users, 
  GraduationCap 
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
    name: "Quizzes",
    href: "/quizzes",
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

export function Sidebar() {
  return (
    <div className="flex h-screen w-56 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-3">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">Q</span>
          </div>
          <span className="font-semibold text-sm">QuizUP</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.name}
              variant={item.current ? "secondary" : "ghost"}
              className="w-full justify-start text-sm h-9"
              asChild
            >
              <a href={item.href}>
                <Icon className="mr-2 h-4 w-4" />
                {item.name}
              </a>
            </Button>
          )
        })}
      </nav>
    </div>
  )
}
