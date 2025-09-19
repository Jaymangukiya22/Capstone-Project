import { useState, useMemo } from 'react'
import { QuestionTreePanel } from '@/components/question-bank/QuestionTreePanel'
import { QuestionListPanel } from '@/components/question-bank/QuestionListPanel'
import { AddEditQuestionModal } from '@/components/question-bank/AddEditQuestionModal'
import { ImportCsvDialog } from '@/components/question-bank/ImportCsvDialog'
import { mockCategories } from '@/data/mockData'
import { mockQuestions } from '@/data/mockQuestions'
import { 
  generateQuestionTree, 
  filterQuestionsByNode, 
  searchQuestions, 
  filterQuestionsByDifficulty 
} from '@/utils/questionUtils'
import type { Question } from '@/types'

export function QuestionBank() {
  const [categories] = useState(mockCategories)
  const [questions, setQuestions] = useState(mockQuestions)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('global')
  const [selectedNodeType, setSelectedNodeType] = useState<'category' | 'subcategory' | 'global'>('global')
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'intermediate' | 'hard'>('all')
  const [showAddEditModal, setShowAddEditModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>(undefined)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false)

  // Generate question tree with counts
  const questionTree = useMemo(() => 
    generateQuestionTree(categories, questions), 
    [categories, questions]
  )

  // Filter questions based on selected node, search, and difficulty
  const filteredQuestions = useMemo(() => {
    let filtered = questions

    // Filter by selected node
    if (selectedNodeId) {
      filtered = filterQuestionsByNode(filtered, selectedNodeId, selectedNodeType, true)
    }

    // Apply search filter
    if (searchQuery) {
      filtered = searchQuestions(filtered, searchQuery)
    }

    // Apply difficulty filter
    filtered = filterQuestionsByDifficulty(filtered, difficultyFilter)

    return filtered
  }, [questions, selectedNodeId, selectedNodeType, searchQuery, difficultyFilter])

  // Get selected node name for display
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return 'All Questions'
    
    const findNodeName = (nodes: any[]): string => {
      for (const node of nodes) {
        if (node.id === selectedNodeId) {
          return node.name
        }
        if (node.children) {
          const childName = findNodeName(node.children)
          if (childName) return childName
        }
      }
      return ''
    }

    return findNodeName(questionTree) || 'Question Bank'
  }, [selectedNodeId, questionTree])

  const handleSelectNode = (nodeId: string, nodeType: 'category' | 'subcategory' | 'global') => {
    setSelectedNodeId(nodeId)
    setSelectedNodeType(nodeType)
    setSelectedQuestions(new Set()) // Clear selection when changing nodes
  }

  const handleSelectQuestion = (questionId: string, selected: boolean) => {
    const newSelection = new Set(selectedQuestions)
    if (selected) {
      newSelection.add(questionId)
    } else {
      newSelection.delete(questionId)
    }
    setSelectedQuestions(newSelection)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)))
    } else {
      setSelectedQuestions(new Set())
    }
  }

  const handleAddQuestion = () => {
    setEditingQuestion(undefined)
    setShowAddEditModal(true)
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setShowAddEditModal(true)
  }

  const handleSaveQuestion = async (questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingQuestion) {
      // Update existing question
      setQuestions(prev => prev.map(q => 
        q.id === editingQuestion.id 
          ? { 
              ...questionData, 
              id: editingQuestion.id, 
              createdAt: editingQuestion.createdAt,
              updatedAt: new Date() 
            }
          : q
      ))
    } else {
      // Add new question - if no category specified and we have a selected node, use it
      let finalQuestionData = { ...questionData }
      
      if (!questionData.categoryId && !questionData.subcategoryId && selectedNodeId && selectedNodeType !== 'global') {
        if (selectedNodeType === 'category') {
          finalQuestionData.categoryId = selectedNodeId
        } else if (selectedNodeType === 'subcategory') {
          finalQuestionData.subcategoryId = selectedNodeId
          // Find the parent category for this subcategory
          const parentCategory = categories.find(cat => 
            cat.subcategories.some(sub => sub.id === selectedNodeId)
          )
          if (parentCategory) {
            finalQuestionData.categoryId = parentCategory.id
          }
        }
      }
      
      const newQuestion: Question = {
        ...finalQuestionData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setQuestions(prev => [...prev, newQuestion])
    }
  }

  const handleDeleteQuestion = (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      setQuestions(prev => prev.filter(q => q.id !== questionId))
      setSelectedQuestions(prev => {
        const newSelection = new Set(prev)
        newSelection.delete(questionId)
        return newSelection
      })
    }
  }

  const handleBulkDelete = () => {
    if (selectedQuestions.size === 0) return
    
    if (confirm(`Are you sure you want to delete ${selectedQuestions.size} selected question(s)?`)) {
      setQuestions(prev => prev.filter(q => !selectedQuestions.has(q.id)))
      setSelectedQuestions(new Set())
    }
  }

  const handlePreviewQuestion = (question: Question) => {
    // TODO: Implement preview modal
    console.log('Preview question:', question)
  }

  const handleImportCSV = () => {
    setShowImportDialog(true)
  }

  const handleImportQuestions = (importedQuestions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const newQuestions: Question[] = importedQuestions.map(q => ({
      ...q,
      id: Date.now().toString() + Math.random().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    }))
    setQuestions(prev => [...prev, ...newQuestions])
  }

  const handleBackendImport = (result: any) => {
    console.log('Backend import result:', result)
    // Optionally refresh the questions list from backend
    // For now, just show success message
    alert(`Successfully imported ${result.summary?.successfulImports || 0} questions!`)
  }

  const handleExportQuestions = () => {
    // TODO: Implement export functionality
    const questionsToExport = selectedQuestions.size > 0 
      ? filteredQuestions.filter(q => selectedQuestions.has(q.id))
      : filteredQuestions
    
    console.log('Export questions:', questionsToExport)
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Left Panel - Category Tree */}
      <div className={`${isTreeCollapsed ? 'w-12' : 'w-80'} flex-shrink-0 transition-all duration-300`}>
        <QuestionTreePanel
          treeNodes={questionTree}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          isCollapsed={isTreeCollapsed}
          onToggleCollapse={() => setIsTreeCollapsed(!isTreeCollapsed)}
        />
      </div>

      {/* Right Panel - Question List */}
      <QuestionListPanel
        questions={filteredQuestions}
        selectedQuestions={selectedQuestions}
        searchQuery={searchQuery}
        difficultyFilter={difficultyFilter}
        onSearchChange={setSearchQuery}
        onDifficultyFilterChange={setDifficultyFilter}
        onSelectQuestion={handleSelectQuestion}
        onSelectAll={handleSelectAll}
        onAddQuestion={handleAddQuestion}
        onImportCSV={handleImportCSV}
        onExportQuestions={handleExportQuestions}
        onPreviewQuestion={handlePreviewQuestion}
        onEditQuestion={handleEditQuestion}
        onDeleteQuestion={handleDeleteQuestion}
        onBulkDelete={handleBulkDelete}
        selectedNodeName={selectedNodeName}
      />

      {/* Add/Edit Question Modal */}
      <AddEditQuestionModal
        open={showAddEditModal}
        onOpenChange={setShowAddEditModal}
        question={editingQuestion}
        categories={categories}
        selectedNodeId={selectedNodeId}
        selectedNodeType={selectedNodeType}
        onSave={handleSaveQuestion}
      />

      {/* Import CSV Dialog */}
      <ImportCsvDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImportQuestions}
        onBackendImport={handleBackendImport}
      />
    </div>
  )
}
