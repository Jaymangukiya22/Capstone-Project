import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Search,
  ChevronDown,
  ChevronRight,
  FolderTree,
  BookOpen,
  Clock,
  Users
} from 'lucide-react'
import { mockStudentCategories, type StudentQuiz } from '@/data/mockStudentData'

interface CategoryTreePanelProps {
  selectedQuizId?: string
  onQuizSelect: (quiz: StudentQuiz) => void
}

export function CategoryTreePanel({ selectedQuizId, onQuizSelect }: CategoryTreePanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['1'])) // Expand first category by default
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set(['1-1'])) // Expand first subcategory by default

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleSubcategory = (subcategoryId: string) => {
    const newExpanded = new Set(expandedSubcategories)
    if (newExpanded.has(subcategoryId)) {
      newExpanded.delete(subcategoryId)
    } else {
      newExpanded.add(subcategoryId)
    }
    setExpandedSubcategories(newExpanded)
  }

  const filteredCategories = mockStudentCategories.map(category => ({
    ...category,
    subcategories: category.subcategories.map(subcategory => ({
      ...subcategory,
      quizzes: subcategory.quizzes.filter(quiz =>
        quiz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.subcategory.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(subcategory => subcategory.quizzes.length > 0 || searchQuery === '')
  })).filter(category => category.subcategories.length > 0 || searchQuery === '')

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Available Quizzes</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No quizzes found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCategories.map((category) => (
              <div key={category.id}>
                {/* Category Header */}
                <div
                  className="flex items-center px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  <FolderTree className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="flex-1">{category.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {category.subcategories.reduce((total, sub) => total + sub.quizzes.length, 0)}
                  </Badge>
                </div>

                {/* Subcategories */}
                {expandedCategories.has(category.id) && (
                  <div className="ml-4 space-y-1">
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id}>
                        {/* Subcategory Header */}
                        <div
                          className="flex items-center px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                          onClick={() => toggleSubcategory(subcategory.id)}
                        >
                          {expandedSubcategories.has(subcategory.id) ? (
                            <ChevronDown className="h-3 w-3 mr-2" />
                          ) : (
                            <ChevronRight className="h-3 w-3 mr-2" />
                          )}
                          <span className="flex-1">{subcategory.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {subcategory.quizzes.length}
                          </Badge>
                        </div>

                        {/* Quizzes */}
                        {expandedSubcategories.has(subcategory.id) && (
                          <div className="ml-4 space-y-1">
                            {subcategory.quizzes.map((quiz) => (
                              <div
                                key={quiz.id}
                                className={cn(
                                  "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm",
                                  selectedQuizId === quiz.id
                                    ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                )}
                                onClick={() => onQuizSelect(quiz)}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                                    {quiz.name}
                                  </h4>
                                  <Badge 
                                    className={cn("text-xs ml-2 flex-shrink-0", getDifficultyColor(quiz.difficulty))}
                                  >
                                    {quiz.difficulty}
                                  </Badge>
                                </div>
                                
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                                  {quiz.description}
                                </p>
                                
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center">
                                      <BookOpen className="h-3 w-3 mr-1" />
                                      <span>{quiz.questionCounts.total}q</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span>{quiz.estimatedDuration}m</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Users className="h-3 w-3 mr-1" />
                                      <span>{quiz.maxPlayers}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
