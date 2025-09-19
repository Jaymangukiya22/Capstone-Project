import { useState } from 'react'
import { toast } from '@/lib/toast'
import { CategoryTreePanel } from './CategoryTreePanel'
import { QuizOverviewPanel } from './QuizOverviewPanel'
import { mockStudentCategories, type StudentQuiz } from '@/data/mockStudentData'

export function StudentQuizContent() {
  const [selectedQuiz, setSelectedQuiz] = useState<StudentQuiz | null>(null)

  // Get the first quiz as default selection
  const defaultQuiz = mockStudentCategories[0]?.subcategories[0]?.quizzes[0] || null

  // Set default quiz on first load
  useState(() => {
    if (defaultQuiz && !selectedQuiz) {
      setSelectedQuiz(defaultQuiz)
    }
  })

  const handleQuizSelect = (quiz: StudentQuiz) => {
    setSelectedQuiz(quiz)
  }

  const handlePlayQuiz = (quizId: string, mode: string, gameCode?: string) => {
    // Store quiz info in sessionStorage for the quiz flow
    const quizInfo = {
      quizId,
      mode,
      gameCode,
      quizName: selectedQuiz?.name,
      startTime: Date.now()
    }
    sessionStorage.setItem('currentQuiz', JSON.stringify(quizInfo))
    
    toast({
      title: "Starting Quiz!",
      description: `Starting quiz "${selectedQuiz?.name}" in ${mode} mode`,
    })
    
    // Navigate to quiz countdown page
    window.location.pathname = '/quiz-countdown'
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Category Tree */}
      <div className="w-80 flex-shrink-0">
        <CategoryTreePanel
          selectedQuizId={selectedQuiz?.id}
          onQuizSelect={handleQuizSelect}
        />
      </div>
      
      {/* Right Panel - Quiz Overview */}
      <div className="flex-1">
        <QuizOverviewPanel
          selectedQuiz={selectedQuiz}
          onPlayQuiz={handlePlayQuiz}
        />
      </div>
    </div>
  )
}
