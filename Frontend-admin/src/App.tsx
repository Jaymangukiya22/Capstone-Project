import { Layout } from "@/components/layout/Layout"
import { Categories } from "@/pages/Categories"
import { QuizBuilder } from "@/pages/QuizBuilder"
import { QuizManagement } from "@/pages/QuizManagement"
import { QuestionBank } from "@/pages/QuestionBank"
import { Students } from "@/pages/Students"
import { ThemeProvider } from "@/hooks/useTheme"
import QuizCountdown from "@/components/student/QuizCountdown"
import QuizInterface from "@/components/student/QuizInterface"
import QuizResults from "@/components/student/QuizResults"
import { LoginForm } from "@/pages/login/login"
import { SignUpForm } from "@/pages/login/signup"
import { AuthTestPage } from "@/pages/auth-test"

// Import authentication components
import { AuthProvider } from "@/contexts/AuthContext"
import { useAuth } from "@/contexts/AuthContext"

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
  const { isAuthenticated, isLoading } = useAuth();

  // Debug logging
  console.log('PublicPage - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('User is authenticated, redirecting to categories');
    // Use setTimeout to avoid immediate redirect issues
    setTimeout(() => {
      window.location.href = '/categories';
    }, 100);
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
  const isFullScreenPage = ['/quiz-countdown', '/quiz-interface', '/quiz-results', '/login', '/signup', '/auth-test'].includes(currentPath);
  
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
      case '/quiz-results':
        return (
          <ProtectedPage>
            <QuizResults />
          </ProtectedPage>
        );
      case '/student':
        return (
          <ProtectedPage>
            <Students />
          </ProtectedPage>
        );
      case '/quiz-builder':
        return (
          <ProtectedPage>
            <QuizBuilder />
          </ProtectedPage>
        );
      case '/quiz-management':
        return (
          <ProtectedPage>
            <QuizManagement />
          </ProtectedPage>
        );
      case '/question-bank':
        return (
          <ProtectedPage>
            <QuestionBank />
          </ProtectedPage>
        );
      case '/categories':
      case '/':
      default:
        return (
          <ProtectedPage>
            <Categories />
          </ProtectedPage>
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
