import { Layout } from "@/components/layout/Layout"
import { Categories } from "@/pages/Categories"
import { QuizBuilder } from "@/pages/QuizBuilder"
import { ThemeProvider } from "@/hooks/useTheme"

function App() {
  // Simple routing based on current path
  const currentPath = window.location.pathname
  
  const renderPage = () => {
    switch (currentPath) {
      case '/quiz-builder':
        return <QuizBuilder />
      case '/categories':
      default:
        return <Categories />
    }
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="quizup-admin-theme">
      <div className="min-h-screen bg-background">
        <Layout>
          {renderPage()}
        </Layout>
      </div>
    </ThemeProvider>
  )
}

export default App
