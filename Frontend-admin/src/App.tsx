import { Layout } from "@/components/layout/Layout"
import { Categories } from "@/pages/Categories"
import { QuizBuilder } from "@/pages/QuizBuilder"
import { QuizManagement } from "@/pages/QuizManagement"
import { QuestionBank } from "@/pages/QuestionBank"
import { Students } from "@/pages/Students"
import { Profile } from "@/pages/Profile"
import { MyResults } from "@/pages/MyResults"
import { ThemeProvider } from "@/hooks/useTheme"
import QuizCountdown from "@/components/student/QuizCountdown"
import QuizInterface from "@/components/student/QuizInterface"
import FriendMatchInterface from "@/components/student/FriendMatchInterface"
import QuizResults from "@/components/student/QuizResults"
import { LoginForm } from "@/pages/login/login"
import { SignUpForm } from "@/pages/login/signup"
import { AuthTestPage } from "@/pages/auth-test"
import React from 'react';
import { NavigationGuardTest } from "@/components/test/NavigationGuardTest"
import { StudentQuizContent } from "@/components/student/StudentQuizContent"

// Import authentication components
import { AuthProvider } from "@/contexts/AuthContext"
import { useAuth } from "@/contexts/AuthContext"
import { AdminRoute, StudentRoute } from "@/components/auth/ProtectedRoute"

// Simple protected route component
function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>You are already logged in. Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppContent() {
  // Simple routing based on current path
  const currentPath = window.location.pathname;
  
  // Debug logging
  console.log('AppContent - currentPath:', currentPath);
  
  // Check if current page should be full-screen (without layout)
  const isFullScreenPage = ['/quiz-countdown', '/quiz-interface', '/friend-match', '/quiz-results', '/login', '/signup', '/auth-test'].includes(currentPath);
  
  console.log('AppContent - isFullScreenPage:', isFullScreenPage);

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
      {isFullScreenPage ? (
        // Full-screen pages without sidebar/topbar (quiz pages and login)
        renderPage()
      ) : (
        // Regular admin pages with layout - these need protection
        <ProtectedPage>
          <Layout>
            {renderPage()}
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
