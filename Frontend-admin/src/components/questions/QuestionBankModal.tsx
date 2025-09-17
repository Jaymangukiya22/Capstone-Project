import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, RotateCcw, ChevronDown, ChevronRight, Globe, FolderTree, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mockCategories } from '@/data/mockData'
import { mockQuestions } from '@/data/mockQuestions'
import { 
  generateQuestionTree, 
  filterQuestionsByNode, 
  searchQuestions, 
  filterQuestionsByDifficulty 
} from '@/utils/questionUtils'
import type { Question } from '@/types'

interface QuestionBankModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddQuestions: (questions: Question[]) => void
}

export function QuestionBankModal({ open, onOpenChange, onAddQuestions }: QuestionBankModalProps) {
  const [categories] = useState(mockCategories)
  const [questions] = useState(mockQuestions)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('global')
  const [selectedNodeType, setSelectedNodeType] = useState<'category' | 'subcategory' | 'global'>('global')
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'intermediate' | 'hard'>('all')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['global']))

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

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

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

  const handleReset = () => {
    setSelectedNodeId('global')
    setSelectedNodeType('global')
    setSelectedQuestions(new Set())
    setSearchQuery('')
    setDifficultyFilter('all')
  }

  const handleAddSelected = () => {
    const questionsToAdd = filteredQuestions.filter(q => selectedQuestions.has(q.id))
    onAddQuestions(questionsToAdd)
    onOpenChange(false)
    handleReset()
  }

  const renderTreeNode = (node: any) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNodeId === node.id
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
            isSelected
              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
          onClick={() => handleSelectNode(node.id, node.type)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 mr-1"
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          {node.type === 'global' ? (
            <Globe className="h-4 w-4 mr-2 text-gray-400" />
          ) : node.type === 'category' ? (
            <FolderTree className="h-4 w-4 mr-2 text-gray-400" />
          ) : (
            <Layers className="h-4 w-4 mr-2 text-gray-400" />
          )}
          
          <span className="flex-1">{node.name}</span>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
            {node.questionCount}
          </span>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4 space-y-1 mt-1">
            {node.children!.map((child: any) => renderTreeNode(child))}
          </div>
        )}
      </div>
    )
  }

  const isAllSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestions.has(q.id))
  const someSelected = selectedQuestions.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Questions from Question Bank</DialogTitle>
          <DialogDescription>
            Select questions from your question bank to add to this quiz
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-3 gap-6 h-full">
            {/* Left Panel - Category Tree */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Categories</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {questionTree.map(node => renderTreeNode(node))}
              </div>
            </div>

            {/* Right Panel - Question List */}
            <div className="col-span-2 space-y-4">
              {/* Search and Filters */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={difficultyFilter}
                    onValueChange={(value: 'all' | 'easy' | 'intermediate' | 'hard') => 
                      setDifficultyFilter(value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Select All */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Select All ({filteredQuestions.length} questions)
                    </span>
                  </div>
                  {someSelected && (
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      {selectedQuestions.size} selected
                    </span>
                  )}
                </div>
              </div>

              {/* Questions Grid */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedQuestions.has(question.id)}
                        onCheckedChange={(checked) => handleSelectQuestion(question.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                          {question.text}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {Object.entries(question.options).map(([key, value]) => (
                            <div
                              key={key}
                              className={cn(
                                "p-2 text-xs rounded border",
                                question.correctOption === key
                                  ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800"
                                  : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                              )}
                            >
                              <span className="font-medium">{key}.</span> {value}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className={cn(
                            "px-2 py-1 rounded",
                            question.difficulty === 'easy' ? "bg-green-100 text-green-800" :
                            question.difficulty === 'intermediate' ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          )}>
                            {question.difficulty}
                          </span>
                          <span>{question.points} pts</span>
                          <span>{question.timeLimit}s</span>
                          {question.tags.length > 0 && (
                            <span>• {question.tags.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredQuestions.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No questions found matching your criteria
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddSelected}
              disabled={selectedQuestions.size === 0}
            >
              Add Selected ({selectedQuestions.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
