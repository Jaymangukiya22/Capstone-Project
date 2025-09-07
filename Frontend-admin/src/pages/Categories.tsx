import { useState, useEffect } from "react"
import { Plus, Search, FolderTree } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { StatsCards } from "@/components/categories/StatsCards"
import { CategoryTree } from "@/components/categories/CategoryTree"
import { DetailPanel } from "@/components/categories/DetailPanel"
import { AddCategoryModal } from "@/components/categories/modals/AddCategoryModal"
import { AddSubcategoryModal } from "@/components/categories/modals/AddSubcategoryModal"
import { AddQuizModal } from "@/components/categories/modals/AddQuizModal"
import { categoryService, quizService } from "@/services"
import type { CreateCategoryDto, CreateQuizDto } from "@/types/api"
import type { Category, Subcategory, Quiz, QuizMode } from "@/types"

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState({ totalCategories: 0, totalSubcategories: 0, totalQuizzes: 0, recentlyAdded: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<{ type: 'category' | 'subcategory' | 'quiz'; id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showAddSubcategoryModal, setShowAddSubcategoryModal] = useState(false)
  const [showAddQuizModal, setShowAddQuizModal] = useState(false)
  const [selectedSubcategoryForQuiz, setSelectedSubcategoryForQuiz] = useState<string>("")

  // Load categories from API
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const apiCategories = await categoryService.getAllCategories()
      
      // Transform API categories to match frontend format
      const transformedCategories: Category[] = apiCategories.map((apiCategory: any) => ({
        id: apiCategory.id.toString(),
        name: apiCategory.name,
        description: apiCategory.description || undefined,
        subcategories: apiCategory.children?.map((child: any) => ({
          id: child.id.toString(),
          name: child.name,
          description: child.description || undefined,
          categoryId: apiCategory.id.toString(),
          quizzes: [], // Will be loaded separately if needed
          createdAt: new Date(child.createdAt),
          updatedAt: new Date(child.updatedAt)
        })) || [],
        createdAt: new Date(apiCategory.createdAt),
        updatedAt: new Date(apiCategory.updatedAt)
      }))
      
      setCategories(transformedCategories)
      
      // Calculate stats
      const totalCategories = transformedCategories.length
      const totalSubcategories = transformedCategories.reduce((sum, cat) => sum + cat.subcategories.length, 0)
      const totalQuizzes = 0 // Will be calculated when quizzes are loaded
      
      setStats({
        totalCategories,
        totalSubcategories,
        totalQuizzes,
        recentlyAdded: 0
      })
      
    } catch (err) {
      console.error('Failed to load categories:', err)
      setError('Failed to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectItem = (type: 'category' | 'subcategory' | 'quiz', id: string) => {
    setSelectedItem({ type, id })
  }

  const handleAddCategory = async (name: string, description?: string, parentId?: string) => {
    try {
      const categoryData: CreateCategoryDto = {
        name,
        parentId: parentId ? parseInt(parentId) : undefined
      }
      
      const newApiCategory = await categoryService.createCategory(categoryData)
      
      if (parentId) {
        // Adding as subcategory
        const newSubcategory: Subcategory = {
          id: newApiCategory.id.toString(),
          name: newApiCategory.name,
          description: undefined,
          categoryId: parentId,
          quizzes: [],
          createdAt: new Date(newApiCategory.createdAt),
          updatedAt: new Date(newApiCategory.updatedAt),
        }
        
        setCategories(prev => prev.map(category => 
          category.id === parentId 
            ? { ...category, subcategories: [...category.subcategories, newSubcategory] }
            : category
        ))
        setStats(prev => ({ ...prev, totalSubcategories: prev.totalSubcategories + 1, recentlyAdded: prev.recentlyAdded + 1 }))
      } else {
        // Adding as main category
        const newCategory: Category = {
          id: newApiCategory.id.toString(),
          name: newApiCategory.name,
          description: undefined,
          subcategories: [],
          createdAt: new Date(newApiCategory.createdAt),
          updatedAt: new Date(newApiCategory.updatedAt),
        }
        
        setCategories(prev => [...prev, newCategory])
        setStats(prev => ({ ...prev, totalCategories: prev.totalCategories + 1, recentlyAdded: prev.recentlyAdded + 1 }))
      }
      
      console.log('Category created successfully:', newApiCategory)
    } catch (err) {
      console.error('Failed to create category:', err)
      setError('Failed to create category. Please try again.')
    }
  }

  const handleAddSubcategory = async (name: string, categoryId: string, description?: string) => {
    try {
      const categoryData: CreateCategoryDto = {
        name,
        parentId: parseInt(categoryId)
      }
      
      const newApiCategory = await categoryService.createCategory(categoryData)
      
      const newSubcategory: Subcategory = {
        id: newApiCategory.id.toString(),
        name: newApiCategory.name,
        description: undefined,
        categoryId,
        quizzes: [],
        createdAt: new Date(newApiCategory.createdAt),
        updatedAt: new Date(newApiCategory.updatedAt),
      }

      setCategories(prev => prev.map(category => 
        category.id === categoryId 
          ? { ...category, subcategories: [...category.subcategories, newSubcategory] }
          : category
      ))
      setStats(prev => ({ ...prev, totalSubcategories: prev.totalSubcategories + 1, recentlyAdded: prev.recentlyAdded + 1 }))
      
      console.log('Subcategory created successfully:', newApiCategory)
    } catch (err) {
      console.error('Failed to create subcategory:', err)
      setError('Failed to create subcategory. Please try again.')
    }
  }

  const handleAddQuiz = async (name: string, mode: QuizMode, subcategoryId: string, description?: string) => {
    try {
      const quizData: CreateQuizDto = {
        title: name,
        description: description || undefined,
        categoryId: parseInt(subcategoryId),
        difficulty: 'MEDIUM' as const, // Default difficulty
        timeLimit: 30 // Default time limit
      }
      
      const newApiQuiz = await quizService.createQuiz(quizData)
      
      const newQuiz: Quiz = {
        id: newApiQuiz.id.toString(),
        name: newApiQuiz.title,
        description: newApiQuiz.description || undefined,
        mode,
        subcategoryId,
        createdAt: new Date(newApiQuiz.createdAt),
        updatedAt: new Date(newApiQuiz.updatedAt),
      }

      setCategories(prev => prev.map(category => ({
        ...category,
        subcategories: category.subcategories.map(subcategory =>
          subcategory.id === subcategoryId
            ? { ...subcategory, quizzes: [...subcategory.quizzes, newQuiz] }
            : subcategory
        )
      })))
      setStats(prev => ({ ...prev, totalQuizzes: prev.totalQuizzes + 1, recentlyAdded: prev.recentlyAdded + 1 }))
      
      console.log('Quiz created successfully:', newApiQuiz)
    } catch (err) {
      console.error('Failed to create quiz:', err)
      setError('Failed to create quiz. Please try again.')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await categoryService.deleteCategory(parseInt(categoryId))
      setCategories(prev => prev.filter(category => category.id !== categoryId))
      setStats(prev => ({ ...prev, totalCategories: prev.totalCategories - 1 }))
      if (selectedItem?.type === 'category' && selectedItem.id === categoryId) {
        setSelectedItem(null)
      }
      console.log('Category deleted successfully')
    } catch (err) {
      console.error('Failed to delete category:', err)
      setError('Failed to delete category. Please try again.')
    }
  }

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    try {
      await categoryService.deleteCategory(parseInt(subcategoryId))
      setCategories(prev => prev.map(category => ({
        ...category,
        subcategories: category.subcategories.filter(sub => sub.id !== subcategoryId)
      })))
      setStats(prev => ({ ...prev, totalSubcategories: prev.totalSubcategories - 1 }))
      if (selectedItem?.type === 'subcategory' && selectedItem.id === subcategoryId) {
        setSelectedItem(null)
      }
      console.log('Subcategory deleted successfully')
    } catch (err) {
      console.error('Failed to delete subcategory:', err)
      setError('Failed to delete subcategory. Please try again.')
    }
  }

  const handleDeleteItem = (type: 'category' | 'subcategory' | 'quiz', id: string) => {
    if (type === 'category') {
      handleDeleteCategory(id)
    } else if (type === 'subcategory') {
      handleDeleteSubcategory(id)
    } else if (type === 'quiz') {
      handleDeleteQuiz(id)
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await quizService.deleteQuiz(parseInt(quizId))
      setCategories(prev => prev.map(category => ({
        ...category,
        subcategories: category.subcategories.map(subcategory => ({
          ...subcategory,
          quizzes: subcategory.quizzes.filter(quiz => quiz.id !== quizId)
        }))
      })))
      setStats(prev => ({ ...prev, totalQuizzes: prev.totalQuizzes - 1 }))
      if (selectedItem?.type === 'quiz' && selectedItem.id === quizId) {
        setSelectedItem(null)
      }
      console.log('Quiz deleted successfully')
    } catch (err) {
      console.error('Failed to delete quiz:', err)
      setError('Failed to delete quiz. Please try again.')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading categories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
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
            <FolderTree className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Category Tree */}
        <div className="xl:col-span-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Category Tree</h2>
              <div className="text-sm text-muted-foreground">
                {selectedItem ? '1 selected' : 'No selection'}
              </div>
            </div>
            <CategoryTree
              categories={filteredCategories}
              selectedItem={selectedItem}
              onSelectItem={handleSelectItem}
              onDeleteItem={handleDeleteItem}
              onAddSubcategory={handleAddSubcategoryClick}
              onAddQuiz={handleAddQuizClick}
            />
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
