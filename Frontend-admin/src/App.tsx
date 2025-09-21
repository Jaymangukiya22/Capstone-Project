import { Layout } from "@/components/layout/Layout"
import { Categories } from "@/pages/Categories"
import { QuizBuilder } from "@/pages/QuizBuilder"
import { QuizManagement } from "@/pages/QuizManagement"
import { QuestionBank } from "@/pages/QuestionBank"
import { Students } from "@/pages/Students"
import { ThemeProvider } from "@/hooks/useTheme"
// import { ApiTest } from '@/components/ApiTest' // Unused for now
import QuizCountdown from "@/components/student/QuizCountdown"
import QuizInterface from "@/components/student/QuizInterface"
import QuizResults from "@/components/student/QuizResults"

function App() {
  // Simple routing based on current path
  const currentPath = window.location.pathname
  
  // Check if current page is a quiz page that should be full-screen
  const isQuizPage = ['/quiz-countdown', '/quiz-interface', '/quiz-results'].includes(currentPath)

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
      case '/quiz-management':
        return <QuizManagement />
      case '/question-bank':
        return <QuestionBank />
      case '/categories':
      default:
        return <Categories />
    }
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="quizup-admin-theme">
      <div className="min-h-screen bg-background">
        {isQuizPage ? (
          // Full-screen quiz pages without sidebar/topbar
          renderPage()
        ) : (
          // Regular pages with layout
          <Layout>
            {renderPage()}
          </Layout>
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
