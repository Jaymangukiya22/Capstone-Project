import { useState, useEffect } from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { DragEndEvent } from "@dnd-kit/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Search,
  Upload,
  RotateCcw,
  Save
} from "lucide-react"
import type { Question, QuestionsState } from "@/types/question"
import { ImportCsvDialog } from "@/components/questions/ImportCsvDialog"
import { EditQuestionModal } from "@/components/questions/EditQuestionModal"
import { QuestionCard } from "@/components/questions/QuestionCard"
import { BulkActionBar } from "@/components/questions/BulkActionBar"
import { QuestionBankModal } from "@/components/questions/QuestionBankModal"
import { quizService } from "@/services/quizService"
import { apiClient } from "@/services/api"
import { questionBankService } from "@/services/questionBankService"

// Mock data for development
const mockQuestions: Question[] = [
  {
    id: "1",
    text: "What is the capital of France?",
    options: [
      { id: "1a", text: "Paris" },
      { id: "1b", text: "London" },
      { id: "1c", text: "Berlin" },
      { id: "1d", text: "Madrid" }
    ],
    correctOptionId: "1a",
    type: "multiple-choice",
    difficulty: "easy",
    tags: ["geography", "capitals"],
    points: 10,
    timeLimit: 30,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "2",
    text: "Which programming language is known for its use in web development?",
    options: [
      { id: "2a", text: "Java" },
      { id: "2b", text: "C++" },
      { id: "2c", text: "Python" },
      { id: "2d", text: "JavaScript" }
    ],
    correctOptionId: "2d",
    type: "multiple-choice",
    difficulty: "intermediate",
    tags: ["technology", "programming", "web"],
    points: 15,
    timeLimit: 45,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

interface QuestionsTabProps {
  quizId?: number | null
  onQuestionsChange?: (questions: Question[]) => void
}

export function QuestionsTab({ quizId, onQuestionsChange }: QuestionsTabProps) {
  const [state, setState] = useState<QuestionsState>({
    questions: [],
    selectedQuestionIds: [],
    searchQuery: "",
    filterType: "all",
    isLoading: false
  })
  
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false)

  // Load questions from backend when quiz ID is available
  useEffect(() => {
    const loadQuestions = async () => {
      if (!quizId) {
        console.log('No quiz ID available, skipping question load')
        setState(prev => ({ ...prev, questions: [], isLoading: false }))
        return
      }

      console.log('Loading questions for quiz ID:', quizId)
      try {
        setState(prev => ({ ...prev, isLoading: true }))
        
        // Fetch quiz with questions from backend
        const response = await apiClient.get(`/quizzes/${quizId}`)
        console.log('Quiz data response:', response.data)
        const quizData = response.data.data.quiz || response.data.data
        
        if (quizData.questions && quizData.questions.length > 0) {
          console.log('Found', quizData.questions.length, 'questions for quiz')
          // Convert backend format to frontend format
          const convertedQuestions: Question[] = quizData.questions.map((q: any) => ({
            id: String(q.id || q.questionId), // Use id (question bank ID) or fallback to questionId
            text: q.questionText,
            options: q.options.map((opt: any) => ({
              id: String(opt.id),
              text: opt.optionText
            })),
            correctOptionId: String(q.options.find((opt: any) => opt.isCorrect)?.id || ''),
            type: 'multiple-choice' as const,
            difficulty: (q.difficulty || 'MEDIUM').toLowerCase().replace('medium', 'intermediate') as 'easy' | 'intermediate' | 'hard',
            tags: [],
            points: 10, // Default value
            timeLimit: 30, // Default value
            createdAt: new Date(),
            updatedAt: new Date()
          }))
          
          setState(prev => ({ ...prev, questions: convertedQuestions, isLoading: false }))
          
          // Save to localStorage for offline persistence
          localStorage.setItem(`quiz_builder_${quizId}_questions`, JSON.stringify(convertedQuestions))
          
          // Notify parent
          if (onQuestionsChange) {
            onQuestionsChange(convertedQuestions)
          }
        } else {
          console.log('No questions found in database for quiz', quizId)
          // No questions in database, try loading from localStorage
          const savedQuestions = localStorage.getItem(`quiz_builder_${quizId}_questions`)
          if (savedQuestions) {
            console.log('Loading questions from localStorage')
            const questions = JSON.parse(savedQuestions)
            setState(prev => ({ ...prev, questions, isLoading: false }))
            if (onQuestionsChange) {
              onQuestionsChange(questions)
            }
          } else {
            setState(prev => ({ ...prev, questions: [], isLoading: false }))
          }
        }
      } catch (error) {
        console.error("Failed to load questions:", error)
        // Fallback to localStorage
        const savedQuestions = localStorage.getItem(`quiz_builder_${quizId}_questions`)
        if (savedQuestions) {
          const questions = JSON.parse(savedQuestions)
          setState(prev => ({ ...prev, questions, isLoading: false }))
        } else {
          setState(prev => ({ ...prev, questions: [], isLoading: false }))
        }
      }
    }

    loadQuestions()
  }, [quizId, onQuestionsChange])

  // Filter and search questions
  const filteredQuestions = state.questions.filter(question => {
    const matchesSearch = question.text.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      question.tags.some(tag => tag.toLowerCase().includes(state.searchQuery.toLowerCase()))
    
    const matchesFilter = state.filterType === "all" || 
      question.difficulty === state.filterType ||
      question.type === state.filterType

    return matchesSearch && matchesFilter
  })

  const handleSelectAll = (checked: boolean) => {
    setState(prev => ({
      ...prev,
      selectedQuestionIds: checked ? filteredQuestions.map(q => q.id) : []
    }))
  }

  const handleQuestionSelect = (questionId: string, checked: boolean) => {
    setState(prev => ({
      ...prev,
      selectedQuestionIds: checked 
        ? [...prev.selectedQuestionIds, questionId]
        : prev.selectedQuestionIds.filter(id => id !== questionId)
    }))
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setShowEditModal(true)
  }

  const handleSaveEditedQuestion = async (updatedQuestion: Question) => {
    // Check if this is a new question (ID starts with "new_")
    const isNewQuestion = updatedQuestion.id.startsWith('new_')
    
    if (isNewQuestion && quizId) {
      try {
        // First, we need to get the quiz's category ID
        const quizResponse = await apiClient.get(`/quizzes/${quizId}`)
        const categoryId = quizResponse.data.data.quiz.categoryId
        
        if (!categoryId) {
          alert('Quiz must have a category before adding questions.')
          return
        }

        // Find the correct option
        const correctOption = updatedQuestion.options.find(opt => opt.id === updatedQuestion.correctOptionId)
        if (!correctOption) {
          alert('Please select a correct answer.')
          return
        }

        // Create question in Question Bank
        const questionBankData = {
          questionText: updatedQuestion.text,
          categoryId: categoryId,
          difficulty: updatedQuestion.difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD',
          options: updatedQuestion.options.map(opt => ({
            optionText: opt.text,
            isCorrect: opt.id === updatedQuestion.correctOptionId
          }))
        }

        console.log('Creating question in Question Bank:', questionBankData)
        const createdQuestion = await questionBankService.createQuestion(questionBankData)
        console.log('Question created with ID:', createdQuestion.id)
        console.log('Created question object:', createdQuestion)

        // Update the question with the real ID and options from Question Bank
        const questionWithRealId: Question = {
          ...updatedQuestion,
          id: String(createdQuestion.id),
          options: createdQuestion.options ? createdQuestion.options.map(opt => ({
            id: String(opt.id),
            text: opt.optionText
          })) : updatedQuestion.options,
          correctOptionId: createdQuestion.options ? 
            String(createdQuestion.options.find(opt => opt.isCorrect)?.id || '') :
            updatedQuestion.correctOptionId
        }

        setState(prev => {
          const updatedQuestions = prev.questions.map(q => 
            q.id === updatedQuestion.id ? questionWithRealId : q
          )
          
          console.log('Updated questions after creation:', updatedQuestions)
          
          // Save to localStorage
          if (quizId) {
            localStorage.setItem(`quiz_builder_${quizId}_questions`, JSON.stringify(updatedQuestions))
          }
          
          // Notify parent
          if (onQuestionsChange) {
            onQuestionsChange(updatedQuestions)
          }
          
          return {
            ...prev,
            questions: updatedQuestions
          }
        })

        console.log('Question created successfully with ID:', createdQuestion.id)
        alert('Question created and added successfully! You can now see it in the list.')
      } catch (error) {
        console.error('Failed to create question:', error)
        alert('Failed to create question. Please try again.')
        return
      }
    } else {
      // Existing question, just update locally
      setState(prev => {
        const updatedQuestions = prev.questions.map(q => 
          q.id === updatedQuestion.id ? updatedQuestion : q
        )
        
        // Save to localStorage
        if (quizId) {
          localStorage.setItem(`quiz_builder_${quizId}_questions`, JSON.stringify(updatedQuestions))
        }
        
        // Notify parent
        if (onQuestionsChange) {
          onQuestionsChange(updatedQuestions)
        }
        
        return {
          ...prev,
          questions: updatedQuestions
        }
      })
    }
    
    setShowEditModal(false)
    setEditingQuestion(null)
  }

  const handleDeleteQuestion = (questionId: string) => {
    setState(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId),
      selectedQuestionIds: prev.selectedQuestionIds.filter(id => id !== questionId)
    }))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setState(prev => {
        const oldIndex = prev.questions.findIndex(q => q.id === active.id)
        const newIndex = prev.questions.findIndex(q => q.id === over.id)
        
        return {
          ...prev,
          questions: arrayMove(prev.questions, oldIndex, newIndex)
        }
      })
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleSaveQuestion = (question: Question) => {
    setState(prev => {
      const existingIndex = prev.questions.findIndex(q => q.id === question.id)
      let updatedQuestions
      
      if (existingIndex >= 0) {
        // Update existing question
        updatedQuestions = prev.questions.map(q => q.id === question.id ? question : q)
      } else {
        // Add new question
        updatedQuestions = [...prev.questions, question]
      }
      
      return {
        ...prev,
        questions: updatedQuestions
      }
    })
    setShowEditModal(false)
    setEditingQuestion(null)
  }

  const handleAddQuestion = () => {
    const timestamp = Date.now()
    const newQuestion: Question = {
      id: `new_${timestamp}`,
      text: "",
      options: [
        { id: `${timestamp}_a`, text: "" },
        { id: `${timestamp}_b`, text: "" },
        { id: `${timestamp}_c`, text: "" },
        { id: `${timestamp}_d`, text: "" }
      ],
      correctOptionId: "",
      type: "multiple-choice",
      difficulty: "easy",
      tags: [],
      points: 10,
      timeLimit: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setEditingQuestion(newQuestion)
    setShowEditModal(true)
  }

  const handleImportQuestions = async (questions: Question[]) => {
    if (!quizId) {
      alert('Please save the quiz details first before importing questions.')
      return
    }

    try {
      // Get the quiz's category ID
      const quizResponse = await apiClient.get(`/quizzes/${quizId}`)
      const categoryId = quizResponse.data.data.quiz.categoryId
      
      if (!categoryId) {
        alert('Quiz must have a category before adding questions.')
        return
      }

      // Create all questions in Question Bank
      const createdQuestions: Question[] = []
      for (const question of questions) {
        try {
          const questionBankData = {
            questionText: question.text,
            categoryId: categoryId,
            difficulty: (question.difficulty?.toUpperCase() || 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD',
            options: question.options.map(opt => ({
              optionText: opt.text,
              isCorrect: opt.id === question.correctOptionId
            }))
          }

          const createdQuestion = await questionBankService.createQuestion(questionBankData)
          
          // Update the question with the real ID and options from Question Bank
          createdQuestions.push({
            ...question,
            id: String(createdQuestion.id),
            options: createdQuestion.options ? createdQuestion.options.map(opt => ({
              id: String(opt.id),
              text: opt.optionText
            })) : question.options,
            correctOptionId: createdQuestion.options ? 
              String(createdQuestion.options.find(opt => opt.isCorrect)?.id || '') :
              question.correctOptionId
          })
        } catch (error) {
          console.error('Failed to create question:', question.text, error)
          // Continue with other questions
        }
      }

      if (createdQuestions.length > 0) {
        setState(prev => {
          const updatedQuestions = [...prev.questions, ...createdQuestions]
          
          console.log('Questions after CSV import:', updatedQuestions)
          
          // Save to localStorage
          if (quizId) {
            localStorage.setItem(`quiz_builder_${quizId}_questions`, JSON.stringify(updatedQuestions))
          }
          
          // Notify parent
          if (onQuestionsChange) {
            onQuestionsChange(updatedQuestions)
          }
          
          return {
            ...prev,
            questions: updatedQuestions
          }
        })

        console.log('CSV import completed:', createdQuestions.length, 'questions')
        alert(`Successfully imported ${createdQuestions.length} out of ${questions.length} questions! They should now be visible in the list.`)
      } else {
        alert('Failed to import questions. Please check the CSV format.')
      }
    } catch (error) {
      console.error('Failed to import questions:', error)
      alert('Failed to import questions. Please try again.')
    }
  }

  const handleAddFromQuestionBank = (questionBankQuestions: any[]) => {
    // Convert Question Bank questions to Quiz Builder format
    // Use the actual question bank ID (as string) so it can be parsed later
    const convertedQuestions = questionBankQuestions.map(q => ({
      id: String(q.id), // Keep the original question bank ID
      text: q.text,
      options: [
        { id: `${q.id}_a`, text: q.options.A },
        { id: `${q.id}_b`, text: q.options.B },
        { id: `${q.id}_c`, text: q.options.C },
        { id: `${q.id}_d`, text: q.options.D }
      ],
      correctOptionId: `${q.id}_${q.correctOption.toLowerCase()}`,
      type: 'multiple-choice' as const,
      difficulty: q.difficulty,
      tags: q.tags,
      points: q.points,
      timeLimit: q.timeLimit,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
    
    setState(prev => {
      const updatedQuestions = [...prev.questions, ...convertedQuestions]
      // Save to localStorage immediately
      if (quizId) {
        localStorage.setItem(`quiz_builder_${quizId}_questions`, JSON.stringify(updatedQuestions))
      }
      // Notify parent component
      if (onQuestionsChange) {
        onQuestionsChange(updatedQuestions)
      }
      return {
        ...prev,
        questions: updatedQuestions
      }
    })
    
    console.log(`Added ${convertedQuestions.length} questions from Question Bank`)
  }

  const handleBulkDelete = () => {
    setState(prev => ({
      ...prev,
      questions: prev.questions.filter(q => !prev.selectedQuestionIds.includes(q.id)),
      selectedQuestionIds: []
    }))
  }

  const handleSaveQuestions = async () => {
    if (!quizId) {
      alert('Please save the quiz details first before adding questions.')
      return
    }

    try {
      // Save to localStorage for persistence
      localStorage.setItem(`quiz_builder_${quizId}_questions`, JSON.stringify(state.questions))
      
      // Get question IDs (convert string IDs to numbers if they're numeric)
      const questionIds = state.questions
        .map(q => {
          const id = parseInt(q.id)
          return isNaN(id) ? null : id
        })
        .filter(id => id !== null) as number[]

      if (questionIds.length > 0) {
        // Save to backend
        await quizService.assignQuestionsToQuiz(quizId, questionIds)
        console.log("Questions saved to quiz:", quizId, questionIds)
        alert(`Successfully added ${questionIds.length} questions to the quiz!`)
      } else {
        alert('No valid questions to save. Please add questions from the Question Bank.')
      }
      
      // Notify parent component
      if (onQuestionsChange) {
        onQuestionsChange(state.questions)
      }
    } catch (error) {
      console.error('Failed to save questions:', error)
      alert('Failed to save questions. Please try again.')
    }
  }

  const handleResetQuestions = () => {
    setState(prev => ({
      ...prev,
      questions: mockQuestions,
      selectedQuestionIds: []
    }))
  }

  const allSelected = filteredQuestions.length > 0 && 
    filteredQuestions.every(q => state.selectedQuestionIds.includes(q.id))
  const someSelected = state.selectedQuestionIds.length > 0

  return (
    <div className="space-y-6">
      {/* Warning if no quiz ID */}
      {!quizId && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-600 dark:text-yellow-400 text-sm">
              ⚠️ Please save the quiz details first before adding questions.
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {state.isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading questions...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Questions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Questions ({filteredQuestions.length})
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowQuestionBankModal(true)}
            disabled={!quizId}
          >
            <Search className="mr-2 h-4 w-4" />
            Add from Question Bank
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowImportDialog(true)}
            disabled={!quizId}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button 
            size="sm" 
            onClick={handleAddQuestion}
            disabled={!quizId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search questions by text, category, or tags..."
            value={state.searchQuery}
            onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
            className="pl-10"
          />
        </div>
        <Select
          value={state.filterType}
          onValueChange={(value) => setState(prev => ({ ...prev, filterType: value }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
            <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
            <SelectItem value="true-false">True/False</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all questions"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Select All</span>
        </div>
      </div>

      {/* Questions List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredQuestions.map(q => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {filteredQuestions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                isSelected={state.selectedQuestionIds.includes(question.id)}
                onSelect={(checked: boolean) => handleQuestionSelect(question.id, checked)}
                onEdit={() => {
                  setEditingQuestion(question)
                  setShowEditModal(true)
                }}
                onDelete={() => handleDeleteQuestion(question.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
        <Button variant="outline" onClick={handleResetQuestions}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleSaveQuestions}>
          <Save className="mr-2 h-4 w-4" />
          Save Questions
        </Button>
      </div>

      {/* Bulk Actions */}
      {someSelected && (
        <BulkActionBar
          selectedCount={state.selectedQuestionIds.length}
          onDelete={handleBulkDelete}
          onDeselect={() => setState(prev => ({ ...prev, selectedQuestionIds: [] }))}
        />
      )}

      {/* Modals */}
      <ImportCsvDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImportQuestions}
      />

      {showEditModal && editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSave={handleSaveEditedQuestion}
        />
      )}

      <QuestionBankModal
        open={showQuestionBankModal}
        onOpenChange={setShowQuestionBankModal}
        onAddQuestions={handleAddFromQuestionBank}
      />
    </div>
  )
}
