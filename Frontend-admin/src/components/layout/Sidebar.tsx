import { 
  FolderTree, 
  FileQuestion, 
  Users, 
  GraduationCap,
  Settings,
  HelpCircle,
  ClipboardList
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

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
  const { user } = useAuth();

  console.log('🔍 UserProfile component - user data:', user);

  if (!user) {
    return (
      <div className="flex items-center space-x-3 px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">?</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Loading...</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Please wait</div>
        </div>
      </div>
    );
  }

  const initials = getUserInitials(user.firstName, user.lastName, user.username, user.email);
  const displayName = getDisplayName(user.firstName, user.lastName, user.username);

  console.log('🔍 UserProfile - initials:', initials, 'displayName:', displayName);
  console.log('🔍 UserProfile - user fields:', {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email
  });

  return (
    <div className="flex items-center space-x-3 px-3 py-2">
      <div className="h-8 w-8 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center">
        <span className="text-xs font-medium text-white">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
      </div>
    </div>
  );
}

const navigation = [
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
    current: false,
  },
  {
    name: "Faculties",
    href: "/faculties",
    icon: Users,
  },
  {
    name: "Students",
    href: "/student",
    icon: GraduationCap,
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
  // Get current path to determine active navigation item
  const currentPath = window.location.pathname
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

        <div className="pt-6">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
            Content Management
          </div>
          <a
            href="/question-bank"
            className={cn(
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150",
              currentPath === '/question-bank'
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <FileQuestion className={cn(
              "mr-3 h-5 w-5",
              currentPath === '/question-bank'
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-400 dark:text-gray-500"
            )} />
            Question Bank
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
        <UserProfile />
      </div>
    </div>
  )
}
