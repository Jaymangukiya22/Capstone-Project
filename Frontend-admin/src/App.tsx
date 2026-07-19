import React, { lazy, Suspense } from 'react';
import { Layout } from "@/components/layout/Layout"
import { ThemeProvider } from "@/hooks/useTheme"
import { usePendingMatchCheck } from "@/components/student/PendingMatchModal"

// Import authentication components
import { AuthProvider } from "@/contexts/AuthContext"
import { useAuth } from "@/contexts/AuthContext"
import { AdminRoute, StudentRoute } from "@/components/auth/ProtectedRoute"

// Route-level code splitting: each page is its own lazily-loaded chunk so the
// initial load only ships the shell + the current route. Previously every page
// (incl. the admin question-bank pages that pull in xlsx/papaparse and dnd-kit)
// was eagerly imported here and bundled into the entry chunk, so a student
// downloaded the whole admin app on first paint. Named exports are unwrapped to
// a default for React.lazy.
const Categories = lazy(() => import("@/pages/Categories").then(m => ({ default: m.Categories })))
const QuizBuilder = lazy(() => import("@/pages/QuizBuilder").then(m => ({ default: m.QuizBuilder })))
const QuizManagement = lazy(() => import("@/pages/QuizManagement").then(m => ({ default: m.QuizManagement })))
const QuestionBank = lazy(() => import("@/pages/QuestionBank").then(m => ({ default: m.QuestionBank })))
const QuizPerformance = lazy(() => import("@/pages/QuizPerformance"))
const Students = lazy(() => import("@/pages/Students").then(m => ({ default: m.Students })))
const Profile = lazy(() => import("@/pages/Profile").then(m => ({ default: m.Profile })))
const MyResults = lazy(() => import("@/pages/MyResults").then(m => ({ default: m.MyResults })))
const AutoMatchmakingPage = lazy(() => import("@/pages/AutoMatchmakingPage").then(m => ({ default: m.AutoMatchmakingPage })))
const QuizCountdown = lazy(() => import("@/components/student/QuizCountdown"))
const QuizInterface = lazy(() => import("@/components/student/QuizInterface"))
const FriendMatchInterface = lazy(() => import("@/components/student/FriendMatchInterface"))
const QuizResults = lazy(() => import("@/components/student/QuizResults"))
const LoginForm = lazy(() => import("@/pages/login/login").then(m => ({ default: m.LoginForm })))
const SignUpForm = lazy(() => import("@/pages/login/signup").then(m => ({ default: m.SignUpForm })))
const AuthTestPage = lazy(() => import("@/pages/auth-test").then(m => ({ default: m.AuthTestPage })))
const NavigationGuardTest = lazy(() => import("@/components/test/NavigationGuardTest").then(m => ({ default: m.NavigationGuardTest })))
const StudentQuizContent = lazy(() => import("@/components/student/StudentQuizContent").then(m => ({ default: m.StudentQuizContent })))

// Full-screen spinner reused for auth gates and the Suspense fallback.
function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        {label ? <p className="mt-4">{label}</p> : null}
      </div>
    </div>
  );
}

// Simple protected route component
function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return <FullScreenSpinner />;
  }

  return <>{children}</>;
}

// Simple public route component
function PublicPage({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect based on role
      const redirectPath = user.role === 'ADMIN' ? '/categories' : '/student-quiz';
      window.location.replace(redirectPath);
    }
  }, [isAuthenticated, isLoading, user]);

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (isAuthenticated) {
    return <FullScreenSpinner label="You are already logged in. Redirecting..." />;
  }

  return <>{children}</>;
}

function AppContent() {
  // Check for pending matches on app load
  const { PendingMatchModal } = usePendingMatchCheck();
  
  // Simple routing based on current path
  const currentPath = window.location.pathname;

  // Check if current page should be full-screen (without layout)
  const isFullScreenPage = ['/quiz-countdown', '/quiz-interface', '/friend-match', '/quiz-results', '/login', '/signup', '/auth-test'].includes(currentPath);

  const renderPage = () => {
    switch (currentPath) {
      case '/login':
        return (
          <PublicPage>
            <LoginForm />
          </PublicPage>
        );
      case '/signup':
        return (
          <PublicPage>
            <SignUpForm />
          </PublicPage>
        );
      case '/auth-test':
        return <AuthTestPage />;
      case '/nav-guard-test':
        return <NavigationGuardTest />;
      case '/quiz-countdown':
        return (
          <ProtectedPage>
            <QuizCountdown />
          </ProtectedPage>
        );
      case '/quiz-interface':
        return (
          <ProtectedPage>
            <QuizInterface />
          </ProtectedPage>
        );
      case '/friend-match':
        return <FriendMatchInterface />
      case '/quiz-results':
        return (
          <ProtectedPage>
            <QuizResults />
          </ProtectedPage>
        );
      case '/student':
        return (
          <AdminRoute>
            <Students />
          </AdminRoute>
        );
      case '/student-quiz':
        return (
          <StudentRoute>
            <StudentQuizContent />
          </StudentRoute>
        );
      case '/my-results':
        return (
          <StudentRoute>
            <MyResults />
          </StudentRoute>
        );
      case '/matchmaking':
        return (
          <StudentRoute>
            <AutoMatchmakingPage />
          </StudentRoute>
        );
      case '/quiz-builder':
        return (
          <AdminRoute>
            <QuizBuilder />
          </AdminRoute>
        );
      case '/quiz-management':
        return (
          <AdminRoute>
            <QuizManagement />
          </AdminRoute>
        );
      case '/question-bank':
        return (
          <AdminRoute>
            <QuestionBank />
          </AdminRoute>
        );
      case '/quiz-performance':
        return (
          <AdminRoute>
            <QuizPerformance />
          </AdminRoute>
        );
      case '/faculties':
        return (
          <AdminRoute>
            <Students />
          </AdminRoute>
        );
      case '/profile':
        return (
          <ProtectedPage>
            <Profile />
          </ProtectedPage>
        );
      case '/categories':
      case '/':
      default:
        return (
          <AdminRoute>
            <Categories />
          </AdminRoute>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Pending Match Modal - shown when user has disconnected match */}
      {PendingMatchModal}
      
      {isFullScreenPage ? (
        // Full-screen pages without sidebar/topbar (quiz pages and login)
        <Suspense fallback={<FullScreenSpinner />}>
          {renderPage()}
        </Suspense>
      ) : (
        // Regular admin pages with layout - these need protection. The Suspense
        // is inside Layout so the shell stays visible while the page chunk loads.
        <ProtectedPage>
          <Layout>
            <Suspense fallback={<FullScreenSpinner />}>
              {renderPage()}
            </Suspense>
          </Layout>
        </ProtectedPage>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="quizup-admin-theme">
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App
