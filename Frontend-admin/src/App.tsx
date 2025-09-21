import { Layout } from "@/components/layout/Layout"
import { Categories } from "@/pages/Categories"
import { QuizBuilder } from "@/pages/QuizBuilder"
import { QuestionBank } from "@/pages/QuestionBank"
import { Students } from "@/pages/Students"
import { ThemeProvider } from "@/hooks/useTheme"
import QuizCountdown from "@/components/student/QuizCountdown"
import QuizInterface from "@/components/student/QuizInterface"
import QuizResults from "@/components/student/QuizResults"
import { LoginForm } from "@/pages/login/login"

function App() {
  // Simple routing based on current path
  const currentPath = window.location.pathname
  
  // Check if current page should be full-screen (without layout)
  const isFullScreenPage = ['/quiz-countdown', '/quiz-interface', '/quiz-results', '/login'].includes(currentPath)

  const renderPage = () => {
    switch (currentPath) {
      case '/student':
        return <Students />
      case '/quiz-countdown':
        return <QuizCountdown />
      case '/quiz-interface':
        return <QuizInterface />
      case '/quiz-results':
        return <QuizResults />
      case '/quiz-builder':
        return <QuizBuilder />
      case '/question-bank':
        return <QuestionBank />
      case '/login':
        return <LoginForm />
      case '/categories':
      default:
        return <Categories />
    }
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="quizup-admin-theme">
      <div className="min-h-screen bg-background">
        {isFullScreenPage ? (
          // Full-screen pages without sidebar/topbar (quiz pages and login)
          renderPage()
        ) : (
          // Regular admin pages with layout
          <Layout>
            {renderPage()}
          </Layout>
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
