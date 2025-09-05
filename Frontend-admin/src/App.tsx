import { Layout } from "@/components/layout/Layout"
import { Categories } from "@/pages/Categories"
import { ThemeProvider } from "@/hooks/useTheme"

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="quizup-admin-theme">
      <div className="min-h-screen bg-background">
        <Layout>
          <Categories />
        </Layout>
      </div>
    </ThemeProvider>
  )
}

export default App
