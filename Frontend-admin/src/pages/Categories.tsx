import { useState } from 'react'
import { Plus, Search, FolderTree} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryTree } from '@/components/categories/CategoryTree'
import { AddCategoryModal } from '@/components/categories/modals/AddCategoryModal'
import { AddSubcategoryModal } from '@/components/categories/modals/AddSubcategoryModal'
import { AddQuizModal } from '@/components/categories/modals/AddQuizModal'
import { mockCategories, mockStats } from '@/data/mockData'
import { addSubcategoryToTree } from '@/utils/categoryUtils'
import type { Category, Subcategory, Quiz, QuizMode } from '@/types'
import { StatsCards } from '@/components/categories/StatsCards'
import { DetailPanel } from '@/components/categories/DetailPanel'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage  } from '@/components/ui/breadcrumb'
export function Categories() {
  const [categories, setCategories] = useState<Category[]>(mockCategories)
  const [stats, setStats] = useState(mockStats)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<{ type: 'category' | 'subcategory' | 'quiz'; id: string } | null>(null)
  
  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showAddSubcategoryModal, setShowAddSubcategoryModal] = useState(false)
  const [showAddQuizModal, setShowAddQuizModal] = useState(false)
  const [selectedSubcategoryForQuiz, setSelectedSubcategoryForQuiz] = useState<string>("")

  const handleSelectItem = (type: 'category' | 'subcategory' | 'quiz', id: string) => {
    setSelectedItem({ type, id })
  }

  const handleAddCategory = async (name: string, description?: string, parentId?: string) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name,
      description,
      subcategories: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    if (parentId) {
      // If parentId is provided, add as subcategory
      const newSubcategory: Subcategory = {
        id: Date.now().toString(),
        name,
        description,
        categoryId: parentId,
        subcategories: [],
        quizzes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      setCategories(prev => prev.map(category => 
        category.id === parentId 
          ? { ...category, subcategories: [...category.subcategories, newSubcategory] }
          : category
      ))
      setStats(prev => ({ ...prev, totalSubcategories: prev.totalSubcategories + 1, recentlyAdded: prev.recentlyAdded + 1 }))
    } else {
      // Add as main category
      setCategories(prev => [...prev, newCategory])
      setStats(prev => ({ ...prev, totalCategories: prev.totalCategories + 1, recentlyAdded: prev.recentlyAdded + 1 }))
    }
  }

  // Modular function to save subcategory - can be replaced with API call later
  const saveSubcategory = async (newSubcategory: Omit<Subcategory, 'subcategories'>, parentId: string, parentType: 'category' | 'subcategory') => {
    // This is a placeholder function that currently updates state
    // Later, this can be replaced with an API call like:
    // const response = await api.createSubcategory(newSubcategory, parentId, parentType)
    // return response.data
    
    const updatedCategories = addSubcategoryToTree(categories, newSubcategory, parentId, parentType)
    setCategories(updatedCategories)
    setStats(prev => ({ ...prev, totalSubcategories: prev.totalSubcategories + 1, recentlyAdded: prev.recentlyAdded + 1 }))
  }

  const handleAddSubcategory = async (name: string, parentId: string, parentType: 'category' | 'subcategory', description?: string) => {
    const newSubcategory: Omit<Subcategory, 'subcategories'> = {
      id: Date.now().toString(),
      name,
      description,
      categoryId: parentType === 'category' ? parentId : categories.find(cat => 
        cat.subcategories.some(sub => sub.id === parentId)
      )?.id || parentId,
      parentSubcategoryId: parentType === 'subcategory' ? parentId : undefined,
      quizzes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await saveSubcategory(newSubcategory, parentId, parentType)
  }

  const handleAddQuiz = async (name: string, mode: QuizMode, subcategoryId: string, description?: string) => {
    const newQuiz: Quiz = {
      id: Date.now().toString(),
      name,
      description,
      mode,
      subcategoryId,
      createdAt: new Date(),
      updatedAt: new Date(),
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
  }

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(category => category.id !== categoryId))
    setStats(prev => ({ ...prev, totalCategories: prev.totalCategories - 1 }))
    if (selectedItem?.type === 'category' && selectedItem.id === categoryId) {
      setSelectedItem(null)
    }
  }

  const handleDeleteSubcategory = (subcategoryId: string) => {
    setCategories(prev => prev.map(category => ({
      ...category,
      subcategories: category.subcategories.filter(sub => sub.id !== subcategoryId)
    })))
    setStats(prev => ({ ...prev, totalSubcategories: prev.totalSubcategories - 1 }))
    if (selectedItem?.type === 'subcategory' && selectedItem.id === subcategoryId) {
      setSelectedItem(null)
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

  const handleDeleteQuiz = (quizId: string) => {
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