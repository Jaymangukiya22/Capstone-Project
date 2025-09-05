import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, FolderTree, Layers, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryTreeProps {
  categories: Category[]
  selectedItem: { type: 'category' | 'subcategory' | 'quiz'; id: string } | null
  onSelectItem: (type: 'category' | 'subcategory' | 'quiz', id: string) => void
  onAddSubcategory: (categoryId: string) => void
  onAddQuiz: (parentId: string, parentType: 'category' | 'subcategory') => void
  onDeleteItem: (type: 'category' | 'subcategory' | 'quiz', id: string) => void
}

export function CategoryTree({ 
  categories, 
  selectedItem, 
  onSelectItem, 
  onAddSubcategory,
  onAddQuiz,
  onDeleteItem
}: CategoryTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set())
  const [hoveredItem, setHoveredItem] = useState<{ type: 'category' | 'subcategory' | 'quiz'; id: string } | null>(null)

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

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <div key={category.id} className="space-y-2">
          {/* Category Item */}
          <div
            className={cn(
              "group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer",
              "hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 hover:scale-[1.02]",
              selectedItem?.type === 'category' && selectedItem?.id === category.id
                ? "bg-gradient-to-r from-blue-50 via-blue-100 to-indigo-100 border-blue-400 shadow-lg dark:from-blue-950 dark:via-blue-900 dark:to-indigo-900 dark:border-blue-500"
                : "bg-white border-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:via-blue-100 hover:to-indigo-50 dark:bg-gray-800 dark:border-gray-600 dark:hover:from-blue-950/60 dark:hover:via-blue-900/60 dark:hover:to-indigo-950/60"
            )}
            onMouseEnter={() => setHoveredItem({ type: 'category', id: category.id })}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="flex items-center space-x-4 flex-1" onClick={() => onSelectItem('category', category.id)}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleCategory(category.id)
                }}
              >
                {expandedCategories.has(category.id) ? (
                  <ChevronDown className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                )}
              </Button>
              
              <div className="p-3 bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700 rounded-xl shadow-md">
                <FolderTree className="h-6 w-6 text-blue-700 dark:text-blue-200" />
              </div>
              
              <div className="flex-1">
                <div className="font-bold text-lg text-gray-900 dark:text-gray-100">{category.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {category.subcategories.length} subcategories • {category.subcategories.reduce((acc, sub) => acc + sub.quizzes.length, 0)} total quizzes
                </div>
              </div>
            </div>

            {/* Action buttons - visible on hover */}
            <div className={cn(
              "flex items-center space-x-2 transition-all duration-300",
              hoveredItem?.type === 'category' && hoveredItem?.id === category.id 
                ? "opacity-100 translate-x-0" 
                : "opacity-0 translate-x-4"
            )}>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 hover:bg-green-200 dark:hover:bg-green-800 hover:scale-110 transition-all rounded-full shadow-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddSubcategory(category.id)
                }}
                title="Add Subcategory"
              >
                <Plus className="h-5 w-5 text-green-700 dark:text-green-300" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 hover:bg-orange-200 dark:hover:bg-orange-800 hover:scale-110 transition-all rounded-full shadow-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddQuiz(category.id, 'category')
                }}
                title="Add Quiz"
              >
                <Plus className="h-5 w-5 text-orange-700 dark:text-orange-300" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 hover:bg-red-200 dark:hover:bg-red-800 hover:scale-110 transition-all rounded-full shadow-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteItem('category', category.id)
                }}
                title="Delete Category"
              >
                <Trash2 className="h-5 w-5 text-red-700 dark:text-red-300" />
              </Button>
            </div>
          </div>

          {/* Subcategories */}
          {expandedCategories.has(category.id) && (
            <div className="ml-10 space-y-2 border-l-3 border-blue-300 dark:border-blue-700 pl-6">
              {category.subcategories.map((subcategory) => (
                <div key={subcategory.id} className="space-y-2">
                  {/* Subcategory Item */}
                  <div
                    className={cn(
                      "group relative flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-300 cursor-pointer",
                      "hover:shadow-lg hover:border-orange-400 dark:hover:border-orange-500 hover:scale-[1.01]",
                      selectedItem?.type === 'subcategory' && selectedItem?.id === subcategory.id
                        ? "bg-gradient-to-r from-orange-50 via-orange-100 to-amber-100 border-orange-400 shadow-md dark:from-orange-950 dark:via-orange-900 dark:to-amber-900 dark:border-orange-500"
                        : "bg-white border-gray-300 hover:bg-gradient-to-r hover:from-orange-50 hover:via-orange-100 hover:to-amber-50 dark:bg-gray-800 dark:border-gray-600 dark:hover:from-orange-950/60 dark:hover:via-orange-900/60 dark:hover:to-amber-950/60"
                    )}
                    onMouseEnter={() => setHoveredItem({ type: 'subcategory', id: subcategory.id })}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="flex items-center space-x-3 flex-1" onClick={() => onSelectItem('subcategory', subcategory.id)}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-full transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSubcategory(subcategory.id)
                        }}
                      >
                        {expandedSubcategories.has(subcategory.id) ? (
                          <ChevronDown className="h-4 w-4 text-orange-700 dark:text-orange-300" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-orange-700 dark:text-orange-300" />
                        )}
                      </Button>
                      
                      <div className="p-2.5 bg-gradient-to-br from-orange-200 to-orange-300 dark:from-orange-800 dark:to-orange-700 rounded-lg shadow-sm">
                        <Layers className="h-5 w-5 text-orange-700 dark:text-orange-200" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{subcategory.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {subcategory.quizzes.length} quizzes
                        </div>
                      </div>
                    </div>

                    {/* Action buttons - visible on hover */}
                    <div className={cn(
                      "flex items-center space-x-1 transition-all duration-300",
                      hoveredItem?.type === 'subcategory' && hoveredItem?.id === subcategory.id 
                        ? "opacity-100 translate-x-0" 
                        : "opacity-0 translate-x-3"
                    )}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-green-200 dark:hover:bg-green-800 hover:scale-110 transition-all rounded-full shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddQuiz(subcategory.id, 'subcategory')
                        }}
                        title="Add Quiz"
                      >
                        <Plus className="h-4 w-4 text-green-700 dark:text-green-300" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-200 dark:hover:bg-red-800 hover:scale-110 transition-all rounded-full shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteItem('subcategory', subcategory.id)
                        }}
                        title="Delete Subcategory"
                      >
                        <Trash2 className="h-4 w-4 text-red-700 dark:text-red-300" />
                      </Button>
                    </div>
                  </div>

                  {/* Quizzes */}
                  {expandedSubcategories.has(subcategory.id) && (
                    <div className="ml-8 space-y-1 border-l-2 border-orange-300 dark:border-orange-700 pl-4">
                      {subcategory.quizzes.map((quiz) => (
                        <div
                          key={quiz.id}
                          className={cn(
                            "group relative flex items-center justify-between p-3 rounded-lg border transition-all duration-300 cursor-pointer",
                            "hover:shadow-md hover:border-green-400 dark:hover:border-green-500 hover:scale-[1.005]",
                            selectedItem?.type === 'quiz' && selectedItem?.id === quiz.id
                              ? "bg-gradient-to-r from-green-50 via-green-100 to-emerald-100 border-green-400 shadow-sm dark:from-green-950 dark:via-green-900 dark:to-emerald-900 dark:border-green-500"
                              : "bg-white border-gray-200 hover:bg-gradient-to-r hover:from-green-50 hover:via-green-100 hover:to-emerald-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:from-green-950/60 dark:hover:via-green-900/60 dark:hover:to-emerald-950/60"
                          )}
                          onMouseEnter={() => setHoveredItem({ type: 'quiz', id: quiz.id })}
                          onMouseLeave={() => setHoveredItem(null)}
                          onClick={() => onSelectItem('quiz', quiz.id)}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="p-2.5 bg-gradient-to-br from-green-200 to-green-300 dark:from-green-800 dark:to-green-700 rounded-lg shadow-sm">
                              <FileQuestion className="h-5 w-5 text-green-700 dark:text-green-200" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{quiz.name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {quiz.mode} mode
                              </div>
                            </div>
                          </div>

                          {/* Delete button - visible on hover */}
                          <div className={cn(
                            "transition-all duration-300",
                            hoveredItem?.type === 'quiz' && hoveredItem?.id === quiz.id 
                              ? "opacity-100 translate-x-0" 
                              : "opacity-0 translate-x-2"
                          )}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-200 dark:hover:bg-red-800 hover:scale-110 transition-all rounded-full shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteItem('quiz', quiz.id)
                              }}
                              title="Delete Quiz"
                            >
                              <Trash2 className="h-4 w-4 text-red-700 dark:text-red-300" />
                            </Button>
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
  )
}
