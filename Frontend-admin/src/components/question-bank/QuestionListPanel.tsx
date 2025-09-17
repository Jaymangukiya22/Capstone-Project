import { Search, Download, Upload, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QuestionCard } from './QuestionCard'
import type { Question } from '@/types'

interface QuestionListPanelProps {
  questions: Question[]
  selectedQuestions: Set<string>
  searchQuery: string
  difficultyFilter: 'all' | 'easy' | 'intermediate' | 'hard'
  onSearchChange: (query: string) => void
  onDifficultyFilterChange: (difficulty: 'all' | 'easy' | 'intermediate' | 'hard') => void
  onSelectQuestion: (questionId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onAddQuestion: () => void
  onImportCSV: () => void
  onExportQuestions: () => void
  onPreviewQuestion: (question: Question) => void
  onEditQuestion: (question: Question) => void
  onDeleteQuestion: (questionId: string) => void
  onBulkDelete: () => void
  selectedNodeName?: string
}

export function QuestionListPanel({
  questions,
  selectedQuestions,
  searchQuery,
  difficultyFilter,
  onSearchChange,
  onDifficultyFilterChange,
  onSelectQuestion,
  onSelectAll,
  onAddQuestion,
  onImportCSV,
  onExportQuestions,
  onPreviewQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onBulkDelete,
  selectedNodeName
}: QuestionListPanelProps) {
  const isAllSelected = questions.length > 0 && questions.every(q => selectedQuestions.has(q.id))
  const someSelected = selectedQuestions.size > 0


  const clearSelection = () => {
    questions.forEach(q => onSelectQuestion(q.id, false))
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {selectedNodeName || 'Question Bank'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {questions.length} question{questions.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={onImportCSV}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import CSV</span>
            </Button>
            <Button
              onClick={onAddQuestion}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Question</span>
            </Button>
            <Button
              variant="outline"
              onClick={onExportQuestions}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search questions by text, tags, or options..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={difficultyFilter} onValueChange={onDifficultyFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Select All and Bulk Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={onSelectAll}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Select All
            </span>
            {someSelected && (
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {selectedQuestions.size} selected
              </span>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {someSelected && (
            <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <X className="h-4 w-4 mr-1" />
                Deselect
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExportQuestions}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-100"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkDelete}
                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-100"
              >
                <X className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Question List */}
      <div className="flex-1 overflow-y-auto p-6">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium mb-2">No questions found</h3>
            <p className="text-sm text-center max-w-md">
              {searchQuery || difficultyFilter !== 'all' 
                ? "Try adjusting your search or filters to find questions."
                : "Get started by adding your first question or importing from CSV."
              }
            </p>
            {!searchQuery && difficultyFilter === 'all' && (
              <Button onClick={onAddQuestion} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Question
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                isSelected={selectedQuestions.has(question.id)}
                onSelect={onSelectQuestion}
                onPreview={onPreviewQuestion}
                onEdit={onEditQuestion}
                onDelete={onDeleteQuestion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
