import { Button } from "@/components/ui/button"
import { Edit, Plus, Calendar, FileQuestion, Layers, FolderTree } from "lucide-react"
import type { Category, Subcategory, Quiz } from "@/types"

interface DetailPanelProps {
  selectedItem: { type: 'category' | 'subcategory' | 'quiz'; id: string } | null
  categories: Category[]
  onAddQuiz: (parentId: string) => void
}

export function DetailPanel({ selectedItem, categories, onAddQuiz }: DetailPanelProps) {
  if (!selectedItem) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg h-full">
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <FolderTree className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Category</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose a category from the tree to view and edit its details</p>
          </div>
        </div>
      </div>
    )
  }

  const getSelectedData = () => {
    for (const category of categories) {
      if (selectedItem.type === 'category' && category.id === selectedItem.id) {
        return { type: 'category', data: category }
      }
      
      for (const subcategory of category.subcategories) {
        if (selectedItem.type === 'subcategory' && subcategory.id === selectedItem.id) {
          return { type: 'subcategory', data: subcategory, parent: category }
        }
        
        for (const quiz of subcategory.quizzes) {
          if (selectedItem.type === 'quiz' && quiz.id === selectedItem.id) {
            return { type: 'quiz', data: quiz, parent: subcategory }
          }
        }
      }
    }
    return null
  }

  const selectedData = getSelectedData()
  if (!selectedData) return null

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  if (selectedData.type === 'category') {
    const category = selectedData.data as Category
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Layers className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{category.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
              </div>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Parent Category:</span>
                <span className="text-sm text-gray-900 dark:text-white">{category.name}</span>
              </div>
              {category.description && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Description:</span>
                  <span className="text-sm text-gray-900 dark:text-white text-right max-w-48">{category.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Quizzes</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {category.subcategories.reduce((acc, sub) => acc + sub.quizzes.length, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Metadata</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Created:</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(category.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Updated:</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(category.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button 
                onClick={() => onAddQuiz(category.id)}
                variant="outline" 
                className="w-full justify-start text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedData.type === 'subcategory') {
    const subcategory = selectedData.data as Subcategory
    const parentCategory = selectedData.parent as Category
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Layers className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{subcategory.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Subcategory</p>
              </div>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{subcategory.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Parent Category:</span>
                <span className="text-sm text-gray-900 dark:text-white">{parentCategory.name}</span>
              </div>
              {subcategory.description && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Description:</span>
                  <span className="text-sm text-gray-900 dark:text-white text-right max-w-48">{subcategory.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Quizzes</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{subcategory.quizzes.length}</span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Metadata</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Created:</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(subcategory.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Updated:</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(subcategory.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button 
                onClick={() => onAddQuiz(subcategory.id)}
                variant="outline" 
                className="w-full justify-start text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedData.type === 'quiz') {
    const quiz = selectedData.data as Quiz
    const parentSubcategory = selectedData.parent as Subcategory
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <FileQuestion className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{quiz.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Quiz • {quiz.mode} Mode</p>
              </div>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{quiz.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Mode:</span>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full font-medium text-gray-700 dark:text-gray-300 capitalize">{quiz.mode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Subcategory:</span>
                <span className="text-sm text-gray-900 dark:text-white">{parentSubcategory.name}</span>
              </div>
              {quiz.description && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Description:</span>
                  <span className="text-sm text-gray-900 dark:text-white text-right max-w-48">{quiz.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Metadata</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Created:</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(quiz.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Updated:</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(quiz.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
