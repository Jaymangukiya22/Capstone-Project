import { useState, useEffect } from 'react'
import { Plus, Search, BookOpen, Loader2, Upload, Download, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '../components/ui/breadcrumb'
import { QuestionBankTree } from '../components/question-bank/QuestionBankTree'
import { AddEditQuestionModal } from '../components/question-bank/AddEditQuestionModal'
import { ImportCsvDialog } from '../components/question-bank/ImportCsvDialog'
import { useCategories } from '../hooks/useCategories'
import { useQuizzes } from '../hooks/useQuizzes'
import { questionBankService, type QuestionBankItem, type CreateQuestionBankDto } from '../services/questionBankService'
import type { Category as ApiCategory } from '../types/api'

export function QuestionBank() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [selectedItem, setSelectedItem] = useState<{ type: 'category' | 'subcategory' | 'quiz' | 'global'; id: string } | null>({ type: 'global', id: 'global' })
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'EASY' | 'MEDIUM' | 'HARD'>('all')
  const [showAddEditModal, setShowAddEditModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | undefined>(undefined)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use categories hook to fetch hierarchical data
  const { 
    categories: apiCategories, 
    loading: categoriesLoading, 
    error: categoriesError, 
    getCategoryHierarchy 
  } = useCategories({ includeChildren: true, depth: 5, autoFetch: false })

  // Use quizzes hook to get all quizzes
  const { quizzes, loading: quizzesLoading } = useQuizzes()

  // Load data on component mount
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load questions when selection changes
  useEffect(() => {
    loadQuestionsForSelection()
  }, [selectedItem, searchQuery, difficultyFilter])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch full category hierarchy
      await getCategoryHierarchy(5)
      
      // Load all questions initially
      await loadAllQuestions()
      
    } catch (err) {
      console.error('Failed to load initial data:', err)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadAllQuestions = async () => {
    try {
      const result = await questionBankService.getAllQuestions({
        search: searchQuery || undefined,
        difficulty: difficultyFilter !== 'all' ? difficultyFilter as 'EASY' | 'MEDIUM' | 'HARD' : undefined
      })
      const questions = Array.isArray(result.questions) ? result.questions : []
      setQuestions(questions)
    } catch (err) {
      console.error('Failed to load questions:', err)
      setError('Failed to load questions.')
      setQuestions([]) // Set empty array on error
    }
  }

  const loadQuestionsForSelection = async () => {
    if (!selectedItem) {
      await loadAllQuestions()
      return
    }

    try {
      console.log('🔍 Loading questions for:', selectedItem)
      
      if (selectedItem.type === 'global') {
        // Load all questions without category
        const result = await questionBankService.getAllQuestions({
          search: searchQuery || undefined,
          difficulty: difficultyFilter !== 'all' ? difficultyFilter as 'EASY' | 'MEDIUM' | 'HARD' : undefined
        })
        // Filter to only questions without categoryId
        const allQuestions = Array.isArray(result.questions) ? result.questions : []
        const globalQuestions = allQuestions.filter(q => !q.categoryId)
        console.log('📋 Global questions found:', globalQuestions.length)
        setQuestions(globalQuestions)
      } else if (selectedItem.type === 'category' || selectedItem.type === 'subcategory') {
        // Get all questions for this category and all its children
        const categoryId = parseInt(selectedItem.id)
        console.log('📁 Loading questions for category:', categoryId)
        
        // Get direct questions for this category
        const directQuestions = await questionBankService.getQuestionsByCategory(categoryId)
        console.log('📋 Direct questions API response:', directQuestions)
        
        // The service now returns QuestionBankItem[] directly
        const questionsArray = Array.isArray(directQuestions) ? directQuestions : []
        
        console.log('📋 Processed questions array:', questionsArray.length, questionsArray)
        setQuestions(questionsArray)
        
      } else if (selectedItem.type === 'quiz') {
        // Get questions specifically assigned to this quiz
        const quiz = quizzes?.find(q => q.id.toString() === selectedItem.id)
        console.log('🎯 Loading questions for quiz:', quiz?.title, 'categoryId:', quiz?.categoryId)
        if (quiz?.categoryId) {
          const categoryQuestions = await questionBankService.getQuestionsByCategory(quiz.categoryId)
          
          // The service now returns QuestionBankItem[] directly
          const questionsArray = Array.isArray(categoryQuestions) ? categoryQuestions : []
          
          console.log('📋 Quiz questions found:', questionsArray.length)
          setQuestions(questionsArray)
        } else {
          console.log('❌ Quiz has no category')
          setQuestions([])
        }
      }
    } catch (err) {
      console.error('Failed to load questions for selection:', err)
      setError('Failed to load questions.')
      setQuestions([]) // Set empty array on error
    }
  }

  const handleSaveQuestion = async (questionData: CreateQuestionBankDto) => {
    try {
      if (editingQuestion) {
        // Update existing question
        await questionBankService.updateQuestion(editingQuestion.id, questionData)
        console.log('✅ Question updated successfully')
      } else {
        // Create new question
        await questionBankService.createQuestion(questionData)
        console.log('✅ Question created successfully')
      }
      
      // Refresh questions list
      await loadQuestionsForSelection()
      setShowAddEditModal(false)
      setEditingQuestion(undefined)
    } catch (error) {
      console.error('Failed to save question:', error)
      throw error // Let the modal handle the error display
    }
  }

  const handleDeleteQuestions = async (questionIds: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${questionIds.length} question(s)?`)) {
      return
    }

    try {
      // Delete each question
      for (const questionId of questionIds) {
        await questionBankService.deleteQuestion(parseInt(questionId))
      }
      
      console.log(`✅ Deleted ${questionIds.length} questions successfully`)
      
      // Refresh questions list
      await loadQuestionsForSelection()
      setSelectedQuestions(new Set()) // Clear selection
    } catch (error) {
      console.error('Failed to delete questions:', error)
      alert('Failed to delete questions. Please try again.')
    }
  }

  const handleBulkUpload = () => {
    setShowImportDialog(true)
  }

  const handleImportComplete = async () => {
    console.log('📥 Import completed, refreshing questions...')
    await loadQuestionsForSelection()
    setShowImportDialog(false)
  }

  const handleAddQuestion = () => {
    setEditingQuestion(undefined)
    setShowAddEditModal(true)
  }

  const handleEditQuestion = (question: QuestionBankItem) => {
    setEditingQuestion(question)
    setShowAddEditModal(true)
  }

  const handleSelectItem = (type: 'category' | 'subcategory' | 'quiz' | 'global', id: string) => {
    setSelectedItem({ type, id })
    setSelectedQuestions(new Set()) // Clear selection when changing context
  }

  // Calculate stats
  const stats = {
    totalQuestions: questions.length,
    totalCategories: apiCategories.length,
    totalQuizzes: Array.isArray(quizzes) ? quizzes.length : 0,
    selectedCount: selectedQuestions.size
  }

  const isLoading = loading || categoriesLoading || quizzesLoading

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Question Bank</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-green-600 dark:text-green-400 animate-spin" />
            ) : (
              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Question Bank</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage questions across categories and quizzes
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
            <span>{stats.totalQuestions} Questions</span>
          </div>
          <Button 
            onClick={handleBulkUpload} 
            variant="outline"
            size="sm"
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button 
            onClick={handleAddQuestion} 
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalQuestions}</p>
            </div>
            <BookOpen className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Categories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalCategories}</p>
            </div>
            <Search className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Quizzes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalQuizzes}</p>
            </div>
            <Plus className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Selected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.selectedCount}</p>
            </div>
            <Download className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Error Display */}
      {(error || categoriesError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="text-red-500">⚠️</div>
            <span className="text-sm text-red-700 dark:text-red-400">{error || categoriesError}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Question Bank Tree */}
        <div className="xl:col-span-1">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Categories & Quizzes</h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
                  <p className="text-gray-500">Loading...</p>
                </div>
              </div>
            ) : (
              <QuestionBankTree
                categories={apiCategories}
                quizzes={quizzes || []}
                selectedItem={selectedItem}
                onSelectItem={handleSelectItem}
              />
            )}
          </div>
        </div>

        {/* Questions Panel */}
        <div className="xl:col-span-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Questions 
                {selectedItem?.type === 'global' && <span className="text-purple-600"> (Global)</span>}
                {selectedItem?.type === 'category' && <span className="text-blue-600"> (Category)</span>}
                {selectedItem?.type === 'subcategory' && <span className="text-green-600"> (Subcategory)</span>}
                {selectedItem?.type === 'quiz' && <span className="text-orange-600"> (Quiz)</span>}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{questions.length} questions</span>
                {selectedQuestions.size > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteQuestions(Array.from(selectedQuestions))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedQuestions.size})
                  </Button>
                )}
                <Button onClick={handleBulkUpload} variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button onClick={handleAddQuestion} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>
            
            {/* Questions List */}
            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No questions found</p>
                </div>
              ) : (
                questions.map((question) => (
                  <div key={question.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.has(question.id.toString())}
                          onChange={(e) => {
                            const newSelected = new Set(selectedQuestions)
                            if (e.target.checked) {
                              newSelected.add(question.id.toString())
                            } else {
                              newSelected.delete(question.id.toString())
                            }
                            setSelectedQuestions(newSelected)
                          }}
                          className="mt-1 w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {question.questionText}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              question.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                              question.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {question.difficulty}
                            </span>
                            <span>{question.options.length} options</span>
                            <span>ID: {question.id}</span>
                            {question.categoryId && <span>Category ID: {question.categoryId}</span>}
                            {question.category && <span>Category: {question.category.name}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteQuestions([question.id.toString()])}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Temporarily commented out QuestionListPanel until we fix the interface
          <QuestionListPanel
            questions={questions}
            selectedQuestions={selectedQuestions}
            onSelectionChange={setSelectedQuestions}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            difficultyFilter={difficultyFilter}
            onDifficultyFilterChange={setDifficultyFilter}
            onAddQuestion={handleAddQuestion}
            onEditQuestion={handleEditQuestion}
            onDeleteQuestions={handleDeleteQuestions}
            onBulkUpload={handleBulkUpload}
            selectedItem={selectedItem}
          />
          */}
        </div>
      </div>

      {/* Modals */}
      <AddEditQuestionModal
        open={showAddEditModal}
        onOpenChange={setShowAddEditModal}
        question={editingQuestion}
        categories={apiCategories || []}
        selectedNodeId={selectedItem?.id}
        selectedNodeType={selectedItem?.type}
        onSave={handleSaveQuestion}
      />

      <ImportCsvDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={handleImportComplete}
        selectedCategoryId={selectedItem?.type === 'category' ? parseInt(selectedItem.id) : undefined}
      />
    </div>
  )
}
