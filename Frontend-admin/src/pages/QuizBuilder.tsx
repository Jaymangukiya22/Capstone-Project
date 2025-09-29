import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { FileQuestion, RotateCcw, Save, BookOpen, Settings, Rocket, X } from "lucide-react"
import { categoryService } from "@/services"
import { useQuizzes } from "@/hooks/useQuizzes"
import { QuestionsTab } from "@/components/questions/QuestionsTab"
import { QuizSettingsTab } from "@/components/quiz-settings/QuizSettingsTab"
import { PublishReviewTab } from "@/components/publish/PublishReviewTab"
import type { Category } from "@/types"
import type { Question } from "@/types/question"
import type { QuizSettings } from "@/types/quiz-settings"
import { defaultQuizSettings } from "@/types/quiz-settings"

interface QuizFormData {
  title: string
  description: string
  tags: string[]
  categoryId: string
  subcategoryId: string
}

export function QuizBuilder() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<QuizFormData>({
    title: "",
    description: "",
    tags: [],
    categoryId: "",
    subcategoryId: "",
  })
  const [currentTagInput, setCurrentTagInput] = useState("")
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null)
  const [questions] = useState<Question[]>([]) // setQuestions will be used when question management is implemented
  const [quizSettings, setQuizSettings] = useState<QuizSettings>(defaultQuizSettings)
  
  // Use quiz management hook
  const { createQuiz, updateQuiz } = useQuizzes({ autoFetch: false })

  // Load categories from API
  useEffect(() => {
    loadCategories()
  }, [])

  // Add refresh function for categories
  const refreshCategories = async () => {
    console.log('🔄 Refreshing Quiz Builder categories...')
    await loadCategories()
    console.log('✅ Quiz Builder categories refreshed')
  }

  // Check for editing quiz data from localStorage
  useEffect(() => {
    const editingQuizData = localStorage.getItem('editingQuiz')
    if (editingQuizData) {
      try {
        const quizData = JSON.parse(editingQuizData)
        setFormData({
          title: quizData.title || "",
          description: quizData.description || "",
          tags: quizData.tags || [],
          categoryId: quizData.categoryId?.toString() || "",
          subcategoryId: "",
        })
        
        // Update quiz settings with quiz data
        setQuizSettings(prev => ({
          ...prev,
          difficulty: quizData.difficulty || 'MEDIUM',
          timeLimit: quizData.timeLimit || 30,
        }))
        
        // Store the quiz ID for updating instead of creating new
        if (quizData.id) {
          setEditingQuizId(quizData.id)
        }
        
        // Clear the editing data after loading
        localStorage.removeItem('editingQuiz')
      } catch (error) {
        console.error('Error loading editing quiz data:', error)
      }
    }
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await categoryService.getAllCategories({ 
        includeChildren: true, 
        depth: 5,
        limit: 1000, // Get all categories, not just first 10
        hierarchy: true // Ensure we get the full hierarchy
      })
      
      // Transform API categories to match frontend format
      const transformedCategories: Category[] = result.categories.map((apiCategory: any) => ({
        id: apiCategory.id.toString(),
        name: apiCategory.name,
        description: apiCategory.description,
        subcategories: transformSubcategories(apiCategory.children || []),
        createdAt: new Date(apiCategory.createdAt),
        updatedAt: new Date(apiCategory.updatedAt)
      }))
      
      setCategories(transformedCategories)
      
      // Debug logging
      console.log('📁 Quiz Builder - Loaded categories:', transformedCategories)
      console.log('📁 Quiz Builder - Total categories:', transformedCategories.length)
      console.log('📁 Quiz Builder - Category IDs:', transformedCategories.map(cat => `${cat.name} (ID: ${cat.id})`))
      
      // Check if we have the new categories (61-66)
      const newCategoryIds = [61, 62, 63, 64, 65, 66]
      const foundNewCategories = transformedCategories.filter(cat => newCategoryIds.includes(parseInt(cat.id)))
      console.log('🔍 Found new categories (61-66):', foundNewCategories.map(cat => `${cat.name} (ID: ${cat.id})`))
      
      transformedCategories.forEach(cat => {
        console.log(`📁 Category: ${cat.name} (ID: ${cat.id}) - Subcategories: ${cat.subcategories.length}`)
      })
      
    } catch (err) {
      console.error('Failed to load categories:', err)
      setError('Failed to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const transformSubcategories = (apiSubcategories: any[]): any[] => {
    if (!Array.isArray(apiSubcategories)) return []
    return apiSubcategories.map((apiSub: any) => ({
      id: apiSub.id.toString(),
      name: apiSub.name,
      description: apiSub.description,
      categoryId: apiSub.parentId?.toString() || '',
      parentSubcategoryId: apiSub.parentId?.toString(),
      subcategories: transformSubcategories(apiSub.children || []),
      quizzes: [], // TODO: Add quizzes from API
      createdAt: new Date(apiSub.createdAt),
      updatedAt: new Date(apiSub.updatedAt),
    }))
  }

  const selectedCategory = categories.find(cat => cat.id === formData.categoryId)
  
  // Flatten all subcategories (including nested ones) for display
  const flattenSubcategories = (subcategories: any[], prefix = ''): any[] => {
    let flattened: any[] = []
    subcategories.forEach(sub => {
      const displayName = prefix ? `${prefix} > ${sub.name}` : sub.name
      flattened.push({
        ...sub,
        displayName
      })
      if (sub.subcategories && sub.subcategories.length > 0) {
        flattened = flattened.concat(flattenSubcategories(sub.subcategories, displayName))
      }
    })
    return flattened
  }
  
  const availableSubcategories = selectedCategory ? flattenSubcategories(selectedCategory.subcategories) : []

  const handleInputChange = (field: keyof QuizFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Reset subcategory when category changes
      ...(field === 'categoryId' ? { subcategoryId: '' } : {})
    }))
  }

  // Tag management functions
  const addTag = (tagText: string) => {
    const trimmedTag = tagText.trim()
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (currentTagInput.trim()) {
        addTag(currentTagInput)
        setCurrentTagInput("")
      }
    }
  }

  const handleTagInputBlur = () => {
    if (currentTagInput.trim()) {
      addTag(currentTagInput)
      setCurrentTagInput("")
    }
  }

  const handleReset = () => {
    setFormData({
      title: "",
      description: "",
      tags: [],
      categoryId: "",
      subcategoryId: "",
    })
    setCurrentTagInput("")
  }

  const handleSave = async () => {
    if (!isFormValid) return
    
    try {
      setSaving(true)
      setError(null)
      
      const quizData = {
        title: formData.title,
        description: formData.description,
        tags: formData.tags,
        categoryId: parseInt(formData.subcategoryId || formData.categoryId),
        difficulty: 'MEDIUM' as const, // Default difficulty
        timeLimit: 30 // Default time limit
      }
      
      let savedQuiz
      if (editingQuizId) {
        // Update existing quiz
        savedQuiz = await updateQuiz(editingQuizId, quizData)
        console.log('Quiz updated successfully:', savedQuiz)
        alert(`Quiz "${savedQuiz.title}" updated successfully!`)
      } else {
        // Create new quiz
        savedQuiz = await createQuiz(quizData)
        console.log('Quiz created successfully:', savedQuiz)
        alert(`Quiz "${savedQuiz.title}" created successfully!`)
      }
      
      // Reset form after successful save
      setFormData({
        title: "",
        description: "",
        tags: [],
        categoryId: "",
        subcategoryId: "",
      })
      setCurrentTagInput("")
      setEditingQuizId(null)
      
    } catch (err) {
      console.error('Failed to save quiz:', err)
      setError('Failed to save quiz. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = formData.title.trim() && formData.description.trim()

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
            <BreadcrumbPage>Quiz Builder</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <FileQuestion className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Quiz Builder</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create engaging quizzes with comprehensive configuration options
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshCategories}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Refresh Categories</span>
          </Button>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Auto-save enabled</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <BookOpen className="mr-2 h-4 w-4" />
            Load Template
          </Button>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last saved: <span className="text-gray-700 dark:text-gray-300">Never</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="details" className="flex items-center space-x-2">
            <FileQuestion className="h-4 w-4" />
            <span>Quiz Details</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center space-x-2">
            <span>Questions</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Quiz Settings</span>
          </TabsTrigger>
          <TabsTrigger value="publish" className="flex items-center space-x-2">
            <Rocket className="h-4 w-4" />
            <span>Publish & Review</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
            {/* Section Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <FileQuestion className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quiz Details</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Basic information and settings</p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
                <div className="space-y-4">
                  {/* Quiz Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Quiz Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter quiz title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this quiz covers..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="w-full min-h-[100px] resize-none"
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      {formData.description.length}/500 characters
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tags
                    </Label>
                    
                    {/* Tag Input */}
                    <div className="space-y-2">
                      <Input
                        id="tags"
                        placeholder="Type a tag and press Enter or comma"
                        value={currentTagInput}
                        onChange={(e) => setCurrentTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        onBlur={handleTagInputBlur}
                        className="w-full"
                      />
                      
                      {/* Tag Display */}
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border">
                          {formData.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="flex items-center gap-1 px-2 py-1 text-xs"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
                                aria-label={`Remove ${tag} tag`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Help others find your quiz with relevant keywords. Press Enter or comma to add tags.
                    </p>
                  </div>
                </div>
              </div>

              {/* Categorization */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Categorization</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => handleInputChange('categoryId', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Subcategory
                    </Label>
                    <Select
                      value={formData.subcategoryId}
                      onValueChange={(value) => handleInputChange('subcategoryId', value)}
                      disabled={!formData.categoryId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.displayName || subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!isFormValid || saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Quiz'}</span>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <QuestionsTab quizId="current-quiz" />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <QuizSettingsTab quizId="current-quiz" totalQuestions={questions.length} />
        </TabsContent>

        <TabsContent value="publish" className="space-y-6">
          <PublishReviewTab 
            quizId="current-quiz"
            quizData={{
              ...formData,
              tags: formData.tags.join(', ') // Convert array back to string for compatibility
            }}
            questions={questions}
            settings={quizSettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
