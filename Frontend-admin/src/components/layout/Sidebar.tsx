import { 
  FolderTree, 
  FileQuestion, 
  Users, 
  GraduationCap,
  Settings,
  HelpCircle,
  ClipboardList,
  LogOut,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

// Helper function to generate user initials
function getUserInitials(firstName?: string, lastName?: string, username?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  if (firstName) {
    return firstName.charAt(0).toUpperCase();
  }
  if (username) {
    return username.charAt(0).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return 'U'; // Default fallback
}

// Helper function to get display name
function getDisplayName(firstName?: string, lastName?: string, username?: string): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  if (username) {
    return username;
  }
  return 'User';
}

// User Profile Component
function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">?</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Loading...</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Please wait</div>
          </div>
        </div>
      </div>
    );
  }

  const initials = getUserInitials(user.firstName, user.lastName, user.username, user.email);
  const displayName = getDisplayName(user.firstName, user.lastName, user.username);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="space-y-2">
      {/* User Info */}
      <div className="flex items-center space-x-3 px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center">
          <span className="text-xs font-medium text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => window.location.href = '/profile'}
        >
          <User className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
          Profile
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

// Admin navigation items
const adminNavigation = [
  {
    name: "Categories",
    href: "/categories",
    icon: FolderTree,
  },
  {
    name: "Quiz Builder",
    href: "/quiz-builder",
    icon: FileQuestion,
  },
  {
    name: "Quiz Management",
    href: "/quiz-management",
    icon: ClipboardList,
  },
  {
    name: "Question Bank",
    href: "/question-bank",
    icon: FileQuestion,
  },
  {
    name: "Faculties",
    href: "/faculties",
    icon: Users,
  },
]

// Student navigation items
const studentNavigation = [
  {
    name: "Available Quizzes",
    href: "/student-quiz",
    icon: GraduationCap,
  },
  {
    name: "My Results",
    href: "/my-results",
    icon: ClipboardList,
  },
]

const bottomNavigation = [
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    name: "Help",
    href: "/help",
    icon: HelpCircle,
  },
]

export function Sidebar() {
  const { user } = useAuth();
  const currentPath = window.location.pathname;
  
  // Determine which navigation to show based on user role
  const navigation = user?.role === 'ADMIN' ? adminNavigation : studentNavigation;
  const panelTitle = user?.role === 'ADMIN' ? 'Admin Panel' : 'Student Portal';
  
  return (
    <div className="flex h-screen w-full lg:w-64 flex-col bg-white dark:bg-gray-900 lg:border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">Q</span>
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-white text-base">QuizMaster</span>
            <div className="text-xs text-gray-500 dark:text-gray-400">{panelTitle}</div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
          {user?.role === 'ADMIN' ? 'Management' : 'My Dashboard'}
        </div>
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.href || (item.href === '/categories' && currentPath === '/')
          return (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150",
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Icon className={cn(
                "mr-3 h-5 w-5",
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-400 dark:text-gray-500"
              )} />
              {item.name}
            </a>
          )
        })}
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
        <UserProfile />
      </div>
    </div>
  )
}
