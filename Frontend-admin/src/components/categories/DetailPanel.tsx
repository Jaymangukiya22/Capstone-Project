import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Plus, Calendar, FileQuestion, Layers } from "lucide-react"
import type { Category, Subcategory, Quiz } from "@/types"

interface DetailPanelProps {
  selectedItem: { type: 'category' | 'subcategory' | 'quiz'; id: string } | null
  categories: Category[]
  onAddSubcategory: () => void
  onAddQuiz: () => void
}

export function DetailPanel({ selectedItem, categories, onAddSubcategory, onAddQuiz }: DetailPanelProps) {
  if (!selectedItem) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a category, subcategory, or quiz to view details</p>
          </div>
        </CardContent>
      </Card>
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
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  if (selectedData.type === 'category') {
    const category = selectedData.data as Category
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <FileQuestion className="h-5 w-5 text-blue-600" />
              </div>
              <span>{category.name}</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button size="sm" onClick={onAddSubcategory}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcategory
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Basic Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{category.name}</span>
              </div>
              {category.description && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span>{category.description}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-lg font-bold">{category.subcategories.length}</div>
                  <div className="text-xs text-muted-foreground">Subcategories</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <FileQuestion className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-lg font-bold">
                    {category.subcategories.reduce((acc, sub) => acc + sub.quizzes.length, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Quizzes</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(category.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span>{formatDate(category.updatedAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (selectedData.type === 'subcategory') {
    const subcategory = selectedData.data as Subcategory
    const parentCategory = selectedData.parent as Category
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <Layers className="h-5 w-5 text-orange-600" />
              </div>
              <span>{subcategory.name}</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button size="sm" onClick={onAddQuiz}>
                <Plus className="h-4 w-4 mr-2" />
                Add Quiz
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Basic Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{subcategory.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parent Category:</span>
                <span>{parentCategory.name}</span>
              </div>
              {subcategory.description && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span>{subcategory.description}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Statistics</h3>
            <div className="flex items-center space-x-2">
              <FileQuestion className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-lg font-bold">{subcategory.quizzes.length}</div>
                <div className="text-xs text-muted-foreground">Quizzes</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(subcategory.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span>{formatDate(subcategory.updatedAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (selectedData.type === 'quiz') {
    const quiz = selectedData.data as Quiz
    const parentSubcategory = selectedData.parent as Subcategory
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
              <FileQuestion className="h-5 w-5 text-green-600" />
            </div>
            <span>{quiz.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Basic Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{quiz.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <span className="bg-secondary px-2 py-1 rounded text-xs">{quiz.mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subcategory:</span>
                <span>{parentSubcategory.name}</span>
              </div>
              {quiz.description && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span>{quiz.description}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(quiz.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span>{formatDate(quiz.updatedAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
