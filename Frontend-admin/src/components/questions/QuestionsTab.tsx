import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import { 
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { 
  Search, 
  Plus, 
  Upload, 
  Save, 
  RotateCcw,
  Download,
  GripVertical, 
  Eye, 
  Edit, 
  Trash2
} from "lucide-react"
import type { Question, QuestionsState } from "@/types/question"
import { ImportCsvDialog } from "@/components/questions/ImportCsvDialog"
import { EditQuestionModal } from "@/components/questions/EditQuestionModal"
import { QuestionCard } from "@/components/questions/QuestionCard"
import { BulkActionBar } from "@/components/questions/BulkActionBar"

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
  quizId?: string
}

export function QuestionsTab({ quizId = "default" }: QuestionsTabProps) {
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

  // Load questions from localStorage on mount
  useEffect(() => {
    const savedQuestions = localStorage.getItem(`quiz_builder_${quizId}_questions`)
    if (savedQuestions) {
      try {
        const questions = JSON.parse(savedQuestions)
        setState(prev => ({ ...prev, questions }))
      } catch (error) {
        console.error("Failed to load saved questions:", error)
        setState(prev => ({ ...prev, questions: mockQuestions }))
      }
    } else {
      setState(prev => ({ ...prev, questions: mockQuestions }))
    }
  }, [quizId])

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

  const handleImportQuestions = (questions: Question[]) => {
    setState(prev => ({
      ...prev,
      questions: [...prev.questions, ...questions]
    }))
  }

  const handleBulkDelete = () => {
    setState(prev => ({
      ...prev,
      questions: prev.questions.filter(q => !prev.selectedQuestionIds.includes(q.id)),
      selectedQuestionIds: []
    }))
  }

  const handleSaveQuestions = () => {
    localStorage.setItem(`quiz_builder_${quizId}_questions`, JSON.stringify(state.questions))
    console.log("Questions saved:", state.questions)
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Questions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Questions ({filteredQuestions.length})
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button size="sm" onClick={handleAddQuestion}>
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

      {showEditModal && (
        <EditQuestionModal
          question={editingQuestion}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  )
}
