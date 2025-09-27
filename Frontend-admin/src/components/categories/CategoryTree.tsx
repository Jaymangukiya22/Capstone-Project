import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, FolderTree, Layers, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/api'
import { useQuizzes } from '@/hooks/useQuizzes'

interface CategoryTreeProps {
  categories: Category[]
  allCategories?: Category[]
  selectedItem: { type: 'category' | 'subcategory' | 'quiz'; id: string } | null
  onSelectItem: (type: 'category' | 'subcategory' | 'quiz', id: string) => void
  onAddSubcategory: (categoryId: string) => void
  onAddQuiz: (parentId: string, parentType: 'category' | 'subcategory') => void
  onDeleteItem: (type: 'category' | 'subcategory' | 'quiz', id: string) => void
}

export function CategoryTree({ 
  categories, 
  allCategories,
  selectedItem, 
  onSelectItem, 
  onAddSubcategory,
  onAddQuiz,
  onDeleteItem
}: CategoryTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set())
  
  // Fetch quizzes to display in categories
  const { quizzes } = useQuizzes()

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }
  
  // Get quizzes for a specific category
  const getQuizzesForCategory = (categoryId: number) => {
    // Ensure quizzes is an array before filtering
    if (!Array.isArray(quizzes)) {
      return []
    }
    return quizzes.filter(quiz => quiz.categoryId === categoryId)
  }

  // Count subcategories for a specific category by counting categories with this parentId
  const getSubcategoryCount = (categoryId: number) => {
    const categoryList = allCategories || categories
    if (!Array.isArray(categoryList)) return 0
    return categoryList.filter(cat => cat.parentId === categoryId).length
  }

  // Get subcategories for a specific category from the allCategories array
  const getSubcategories = (categoryId: number) => {
    const categoryList = allCategories || categories
    if (!Array.isArray(categoryList)) return []
    return categoryList.filter(cat => cat.parentId === categoryId)
  }

  // Debug: Log the categories and quizzes to see what we're working with
  console.log('📁 Categories in CategoryTree:', categories)
  console.log('🎯 Quizzes in CategoryTree:', quizzes)
  
  // Debug each category structure
  categories.forEach((cat, index) => {
    console.log(`📁 Category ${index + 1}:`, {
      id: cat.id,
      name: cat.name,
      children: cat.children,
      childrenCount: cat.children?.length || 0
    })
  })

  const toggleSubcategory = (subcategoryId: string) => {
    const newExpanded = new Set(expandedSubcategories)
    if (newExpanded.has(subcategoryId)) {
      newExpanded.delete(subcategoryId)
    } else {
      newExpanded.add(subcategoryId)
    }
    setExpandedSubcategories(newExpanded)
  }

  // Recursive component to render subcategories with nested structure
  const renderSubcategories = (subcategories: any[], level: number = 1) => {
    return subcategories.map((subcategory) => (
      <div key={`subcategory-${subcategory.id}`} className="space-y-1">
        {/* Subcategory Item */}
        <div
          className={cn(
            "group relative flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer",
            selectedItem?.type === 'subcategory' && selectedItem?.id === subcategory.id.toString()
              ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600"
          )}
        >
          <div className="flex items-center space-x-3 flex-1" onClick={() => onSelectItem('subcategory', subcategory.id.toString())}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                toggleSubcategory(subcategory.id.toString())
              }}
            >
              {expandedSubcategories.has(subcategory.id.toString()) ? (
                <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              )}
            </Button>
            
            <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded flex items-center justify-center">
              <Layers className="h-3 w-3 text-orange-600 dark:text-orange-400" />
            </div>
            
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">{subcategory.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {getSubcategoryCount(subcategory.id)} subcategories • {getQuizzesForCategory(subcategory.id).length} quizzes
              </div>
            </div>
          </div>

          {/* Action buttons - always visible for better UX */}
          <div className="flex items-center space-x-1 opacity-70 hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onAddSubcategory(subcategory.id.toString())
              }}
              title="Add Nested Subcategory"
            >
              <Plus className="h-3 w-3 text-gray-600 dark:text-gray-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onAddQuiz(subcategory.id.toString(), 'subcategory')
              }}
              title="Add Quiz to Subcategory"
            >
              <Plus className="h-3 w-3 text-green-600 dark:text-green-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteItem('subcategory', subcategory.id.toString())
              }}
              title="Delete Subcategory"
            >
              <Trash2 className="h-3 w-3 text-red-500 dark:text-red-400" />
            </Button>
          </div>
        </div>

        {/* Nested content */}
        {expandedSubcategories.has(subcategory.id.toString()) && (
          <div className={cn("ml-6 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3")}>
            {/* Nested subcategories */}
            {getSubcategories(subcategory.id).length > 0 && (
              <div className="space-y-1">
                {renderSubcategories(getSubcategories(subcategory.id), level + 1)}
              </div>
            )}
            
            {/* Quizzes */}
            {getQuizzesForCategory(subcategory.id).map((quiz) => (
              <div
                key={`subcategory-quiz-${quiz.id}`}
                className={cn(
                  "group relative flex items-center justify-between p-2.5 rounded border transition-all duration-200 cursor-pointer",
                  selectedItem?.type === 'quiz' && selectedItem?.id === quiz.id.toString()
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600"
                )}
                onClick={() => onSelectItem('quiz', quiz.id.toString())}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center">
                    <FileQuestion className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{quiz.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {quiz.difficulty} • {quiz.timeLimit}s
                    </div>
                  </div>
                </div>

                {/* Delete button - always visible for better UX */}
                <div className="opacity-70 hover:opacity-100 transition-opacity duration-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteItem('quiz', quiz.id.toString())
                    }}
                    title="Delete Quiz"
                  >
                    <Trash2 className="h-3 w-3 text-red-500 dark:text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ))
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <div key={`category-${category.id}`} className="space-y-2">
          {/* Category Item */}
          <div
            className={cn(
              "group relative flex items-center justify-between p-4 rounded-lg border transition-all duration-200 cursor-pointer",
              selectedItem?.type === 'category' && selectedItem?.id === category.id.toString()
                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <div className="flex items-center space-x-4 flex-1" onClick={() => onSelectItem('category', category.id.toString())}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleCategory(category.id.toString())
                }}
              >
                {expandedCategories.has(category.id.toString()) ? (
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
              </Button>
              
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FolderTree className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="flex-1">
                <div className="font-semibold text-base text-gray-900 dark:text-gray-100">{category.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {getSubcategoryCount(category.id)} subcategories • {getQuizzesForCategory(category.id).length} quizzes
                </div>
              </div>
            </div>

            {/* Action buttons - always visible for better UX */}
            <div className="flex items-center space-x-1 opacity-70 hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddSubcategory(category.id.toString())
                }}
                title="Add Subcategory"
              >
                <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddQuiz(category.id.toString(), 'category')
                }}
                title="Add Quiz to Category"
              >
                <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteItem('category', category.id.toString())
                }}
                title="Delete Category"
              >
                <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
              </Button>
            </div>
          </div>

          {/* Subcategories and Quizzes */}
          {expandedCategories.has(category.id.toString()) && (
            <div className="ml-8 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-4">
              {/* Render subcategories */}
              {getSubcategories(category.id).length > 0 && (
                <div className="space-y-1">
                  {renderSubcategories(getSubcategories(category.id))}
                </div>
              )}
              
              {/* Render quizzes directly under this category */}
              {getQuizzesForCategory(category.id).map((quiz) => (
                <div
                  key={`category-quiz-${quiz.id}`}
                  className={cn(
                    "group relative flex items-center justify-between p-2.5 rounded border transition-all duration-200 cursor-pointer",
                    selectedItem?.type === 'quiz' && selectedItem?.id === quiz.id.toString()
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                  onClick={() => onSelectItem('quiz', quiz.id.toString())}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center">
                      <FileQuestion className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{quiz.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {quiz.difficulty} • {quiz.timeLimit}s
                      </div>
                    </div>
                  </div>

                  {/* Delete button - always visible for better UX */}
                  <div className="opacity-70 hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteItem('quiz', quiz.id.toString())
                      }}
                      title="Delete Quiz"
                    >
                      <Trash2 className="h-3 w-3 text-red-500 dark:text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
