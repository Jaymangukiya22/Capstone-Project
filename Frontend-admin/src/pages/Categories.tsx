import { useState, useEffect } from 'react'
import { Plus, Search, FolderTree, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryTree } from '@/components/categories/CategoryTree'
import { AddCategoryModal } from '@/components/categories/modals/AddCategoryModal'
import { AddSubcategoryModal } from '@/components/categories/modals/AddSubcategoryModal'
import { AddQuizModal } from '@/components/categories/modals/AddQuizModal'
import { StatsCards } from '@/components/categories/StatsCards'
import { DetailPanel } from '@/components/categories/DetailPanel'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { useCategories } from '@/hooks/useCategories'
import { useQuizzes } from '@/hooks/useQuizzes'
import type { Category as ApiCategory, CreateCategoryDto } from '@/types/api'
import { mockCategories, mockStats } from '@/data/mockData'
import { addSubcategoryToTree } from '@/utils/categoryUtils'
import type { Category, Subcategory, Quiz, QuizMode } from '@/types'

export function Categories() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<{ type: 'category' | 'subcategory' | 'quiz'; id: string } | null>(null)
  
  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showAddSubcategoryModal, setShowAddSubcategoryModal] = useState(false)
  const [showAddQuizModal, setShowAddQuizModal] = useState(false)
  const [selectedSubcategoryForQuiz, setSelectedSubcategoryForQuiz] = useState<string>("")

  // Use categories hook to fetch data from backend - get ALL categories without pagination
  const { 
    categories: apiCategories, 
    loading, 
    error, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    getCategoryHierarchy 
  } = useCategories({ includeChildren: true, depth: 5, autoFetch: false })

  // Use quizzes hook to get all quizzes
  const { quizzes } = useQuizzes()

  // Fetch all categories with full hierarchy on component mount
  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        await getCategoryHierarchy(5) // Get full hierarchy with depth 5
      } catch (error) {
        console.error('Failed to fetch category hierarchy:', error)
      }
    }
    
    fetchAllCategories()
  }, [getCategoryHierarchy])

  // Filter to get only root categories (parentId is null) for main display
  const rootCategories = apiCategories.filter(cat => cat.parentId === null)

  // Get quizzes for a specific category (defined before use)
  const getQuizzesForCategory = (categoryId: number) => {
    if (!Array.isArray(quizzes)) return []
    return quizzes.filter(quiz => quiz.categoryId === categoryId).map(quiz => ({
      id: quiz.id.toString(),
      name: quiz.title,
      mode: 'practice' as QuizMode, // Default mode
      description: quiz.description || '',
      subcategoryId: categoryId.toString(), // Add required field
      createdAt: new Date(quiz.createdAt),
      updatedAt: new Date(quiz.updatedAt),
    }))
  }

  // Transform subcategories recursively
  function transformSubcategories(apiSubcategories: ApiCategory[]): Subcategory[] {
    return apiSubcategories.map((apiSub: ApiCategory) => ({
      id: apiSub.id.toString(),
      name: apiSub.name,
      description: apiSub.description,
      categoryId: apiSub.parentId?.toString() || '',
      parentSubcategoryId: apiSub.parentId?.toString(),
      subcategories: transformSubcategories(apiSub.children || []),
      quizzes: getQuizzesForCategory(apiSub.id),
      createdAt: new Date(apiSub.createdAt),
      updatedAt: new Date(apiSub.updatedAt),
    }))
  }

  // Transform API categories to frontend format
  const categories: Category[] = apiCategories.map((apiCategory: ApiCategory) => ({
    id: apiCategory.id.toString(),
    name: apiCategory.name,
    description: apiCategory.description,
    subcategories: transformSubcategories(apiCategory.children || []),
    createdAt: new Date(apiCategory.createdAt),
    updatedAt: new Date(apiCategory.updatedAt),
  }))

  // Calculate stats from API data
  const countAllSubcategories = (categories: ApiCategory[]): number => {
    return categories.reduce((acc, cat) => {
      return acc + (cat.children?.length || 0) + countAllSubcategories(cat.children || [])
    }, 0)
  }

  const stats = {
    totalCategories: apiCategories.length,
    totalSubcategories: countAllSubcategories(apiCategories),
    totalQuizzes: Array.isArray(quizzes) ? quizzes.length : 0,
    recentlyAdded: 0, // TODO: Calculate from recent data
  }

  function countSubcategories(subcategories: Subcategory[]): number {
    return subcategories.reduce((acc, sub) => acc + 1 + countSubcategories(sub.subcategories), 0)
  }

  function countQuizzes(subcategories: Subcategory[]): number {
    return subcategories.reduce((acc, sub) => acc + sub.quizzes.length + countQuizzes(sub.subcategories), 0)
  }

  const handleSelectItem = (type: 'category' | 'subcategory' | 'quiz', id: string) => {
    setSelectedItem({ type, id })
  }

  const handleAddCategory = async (name: string, description?: string, parentId?: string) => {
    try {
      await createCategory({
        name,
        description,
        parentId: parentId ? parseInt(parentId) : null,
        isActive: true
      })
    } catch (err) {
      console.error('Failed to create category:', err)
      alert('Failed to create category. Please try again.')
    }
  }

  const handleAddSubcategory = async (name: string, parentId: string, parentType: 'category' | 'subcategory', description?: string) => {
    try {
      await createCategory({
        name,
        description,
        parentId: parseInt(parentId),
        isActive: true
      })
    } catch (err) {
      console.error('Failed to create subcategory:', err)
      alert('Failed to create subcategory. Please try again.')
    }
  }

  const handleAddQuiz = async (name: string, mode: QuizMode, subcategoryId: string, description?: string) => {
    try {
      // Import quiz service
      const { quizService } = await import('@/services/quizService')
      
      const quizData = {
        title: name,
        description: description || '',
        categoryId: parseInt(subcategoryId),
        difficulty: 'MEDIUM' as const,
        timeLimit: 30
      }
      
      const newQuiz = await quizService.createQuiz(quizData)
      console.log('Quiz created successfully:', newQuiz)
      
      // Refresh categories to show the new quiz
      // Note: In a real implementation, you might want to optimistically update the UI
      alert(`Quiz "${name}" created successfully!`)
      
    } catch (err) {
      console.error('Failed to create quiz:', err)
      alert('Failed to create quiz. Please try again.')
    }
  }

  const handleDeleteItem = async (type: 'category' | 'subcategory' | 'quiz', id: string) => {
    try {
      if (type === 'category' || type === 'subcategory') {
        await deleteCategory(parseInt(id))
        if (selectedItem?.type === type && selectedItem.id === id) {
          setSelectedItem(null)
        }
      } else if (type === 'quiz') {
        // Import quiz service for deletion
        const { quizService } = await import('@/services/quizService')
        await quizService.deleteQuiz(parseInt(id))
        if (selectedItem?.type === 'quiz' && selectedItem.id === id) {
          setSelectedItem(null)
        }
        alert('Quiz deleted successfully!')
      }
    } catch (err) {
      console.error(`Failed to delete ${type}:`, err)
      alert(`Failed to delete ${type}. Please try again.`)
    }
  }

  const handleAddSubcategoryClick = (_categoryId: string) => {
    setShowAddSubcategoryModal(true)
  }

  const handleAddQuizClick = (parentId: string, parentType: 'category' | 'subcategory') => {
    if (parentType === 'subcategory') {
      setSelectedSubcategoryForQuiz(parentId)
    } else if (selectedItem?.type === 'subcategory') {
      setSelectedSubcategoryForQuiz(selectedItem.id)
    }
    setShowAddQuizModal(true)
  }

  const handleAddQuizFromPanel = (parentId: string) => {
    setSelectedSubcategoryForQuiz(parentId)
    setShowAddQuizModal(true)
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.subcategories.some(sub => 
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.quizzes.some(quiz => quiz.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  )

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
            <BreadcrumbPage>Categories</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            {loading ? (
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : (
              <FolderTree className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Category Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Organize and manage your quiz categories
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>2 Active Sessions</span>
          </div>
          <Button 
            onClick={() => setShowAddCategoryModal(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="text-red-500">⚠️</div>
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Category Tree */}
        <div className="xl:col-span-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Categories & Subcategories</h2>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500">Loading categories...</p>
                </div>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No categories yet</h3>
                <p className="text-gray-500 mb-4">Get started by creating your first category</p>
                <Button onClick={() => setShowAddCategoryModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Category
                </Button>
              </div>
            ) : (
              <CategoryTree
                categories={rootCategories}
                allCategories={apiCategories}
                selectedItem={selectedItem}
                onSelectItem={handleSelectItem}
                onAddSubcategory={handleAddSubcategoryClick}
                onAddQuiz={handleAddQuizClick}
                onDeleteItem={handleDeleteItem}
              />
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="xl:col-span-1">
          <DetailPanel 
            selectedItem={selectedItem} 
            categories={filteredCategories}
            onAddQuiz={handleAddQuizFromPanel}
          />
        </div>
      </div>

      {/* Modals */}
      <AddCategoryModal
        open={showAddCategoryModal}
        onOpenChange={setShowAddCategoryModal}
        onAddCategory={handleAddCategory}
        categories={categories}
      />

      <AddSubcategoryModal
        open={showAddSubcategoryModal}
        onOpenChange={setShowAddSubcategoryModal}
        onAddSubcategory={handleAddSubcategory}
        categories={categories}
      />

      <AddQuizModal
        open={showAddQuizModal}
        onOpenChange={setShowAddQuizModal}
        onAddQuiz={handleAddQuiz}
        subcategoryId={selectedSubcategoryForQuiz}
      />
    </div>
  )
}