import { useState, useEffect } from 'react'
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
import { Search, RotateCcw, BookOpen, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuestionBankTree } from '@/components/question-bank/QuestionBankTree'
import { useCategories } from '@/hooks/useCategories'
import { useQuizzes } from '@/hooks/useQuizzes'
import { questionBankService, type QuestionBankItem } from '@/services/questionBankService'
import { toast } from '@/lib/toast'
import type { Question } from '@/types'

interface QuestionBankModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddQuestions: (questions: Question[]) => void
}

export function QuestionBankModal({ open, onOpenChange, onAddQuestions }: QuestionBankModalProps) {
  // State management
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [allQuestions, setAllQuestions] = useState<QuestionBankItem[]>([]) // Store all questions for filtering
  const [selectedQuestions, setSelectedQuestions] = useState(new Set<string>())
  const [selectedItem, setSelectedItem] = useState<{ type: 'category' | 'subcategory' | 'quiz' | 'global'; id: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)

  // Hooks for data fetching - Load ALL categories without pagination
  const { categories: apiCategories, loading: categoriesLoading, fetchCategories } = useCategories({ 
    includeChildren: false, 
    depth: 0,
    autoFetch: false 
  })
  const { quizzes } = useQuizzes()
  
  // Force load ALL categories when modal opens
  useEffect(() => {
    if (open && !apiCategories?.length) {
      console.log('🔄 Force loading ALL categories on modal open...')
      fetchCategories({ limit: 1000, page: 1 })
    }
  }, [open, fetchCategories])

  // Store question counts per category
  const [categoryCounts, setCategoryCounts] = useState<Record<number, number>>({})

  // Load questions when modal opens or selection changes
  useEffect(() => {
    if (open) {
      loadQuestions()
    }
  }, [open, selectedItem])
  
  // Store virtual categories for missing IDs
  const [virtualCategories, setVirtualCategories] = useState<any[]>([])
  
  // Calculate category counts when allQuestions changes
  useEffect(() => {
    const counts: Record<number, number> = {}
    const missingCategoryIds = new Set<number>()
    
    allQuestions.forEach(q => {
      if (q.categoryId) {
        counts[q.categoryId] = (counts[q.categoryId] || 0) + 1
        
        // Check if this category exists in apiCategories
        const categoryExists = apiCategories?.some(cat => cat.id === q.categoryId)
        if (!categoryExists) {
          missingCategoryIds.add(q.categoryId)
        }
      }
    })
    
    setCategoryCounts(counts)
    console.log('📊 Questions per category:', counts)
    console.log('📦 Loaded categories from API:', apiCategories?.map(c => ({ id: c.id, name: c.name })))
    
    if (missingCategoryIds.size > 0) {
      console.error('❌ MISSING CATEGORIES: Questions exist for category IDs that are not in the category tree:', Array.from(missingCategoryIds))
      console.log('🔍 These category IDs have questions but no category:', Array.from(missingCategoryIds))
      
      // Create virtual categories for missing IDs with better names
      const categoryNameMap: Record<number, string> = {
        366: 'Technology',
        367: 'Science', 
        368: 'Mathematics',
        369: 'History',
        370: 'Geography',
        371: 'General Knowledge',
        355: 'Literature',
        3: 'Computer Hardware',
        4: 'Electronics',
        5: 'Programming',
        6: 'Web Development',
        7: 'Databases',
        8: 'Networking',
        11: 'Data Structures',
        12: 'Algorithms',
        13: 'Machine Learning',
        14: 'AI',
        15: 'Cloud Computing',
        17: 'DevOps',
        18: 'Security',
        19: 'Mobile Development',
        20: 'Game Development',
        21: 'Blockchain',
        23: 'IoT',
        24: 'Robotics',
        25: 'Data Science',
        26: 'Statistics',
        27: 'Business',
        29: 'Marketing',
        31: 'Finance',
        32: 'Economics',
        33: 'Psychology',
        36: 'Biology',
        37: 'Chemistry',
        38: 'Physics',
        40: 'Environment',
        41: 'Health',
        42: 'Sports',
        44: 'Entertainment',
        46: 'Politics',
        47: 'Law',
        50: 'Architecture',
        51: 'Design',
        53: 'Music',
        58: 'Art',
        59: 'Culture',
        60: 'Food',
        314: 'Education'
      }
      
      const virtuals = Array.from(missingCategoryIds).map(id => ({
        id,
        name: categoryNameMap[id] || `Category ${id}`,
        description: `Questions for ${categoryNameMap[id] || `Category ${id}`}`,
        parentId: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      
      console.log('🤖 Creating virtual categories:', virtuals)
      setVirtualCategories(virtuals)
    }
  }, [allQuestions, apiCategories])

  // Helper function to get all descendant category IDs
  const getAllDescendantCategoryIds = (categoryId: number, categories: any[]): number[] => {
    const descendants = [categoryId] // Include the category itself
    
    // Find direct children
    const children = categories.filter(cat => cat.parentId === categoryId)
    console.log(`🔍 Category ${categoryId} has ${children.length} direct children:`, children.map(c => `${c.name} (${c.id})`))
    
    // Recursively get descendants of children
    children.forEach(child => {
      const childDescendants = getAllDescendantCategoryIds(child.id, categories)
      descendants.push(...childDescendants)
      console.log(`📂 Added descendants for ${child.name} (${child.id}):`, childDescendants)
    })
    
    console.log(`🎯 Final descendant IDs for category ${categoryId}:`, descendants)
    return descendants
  }

  const loadQuestions = async () => {
    setIsLoading(true)
    try {
      // If no item selected, load ALL questions
      if (!selectedItem) {
        console.log('🔄 Loading ALL questions from database...');
        
        // First, get the total count with a small request
        const firstResponse = await questionBankService.getAllQuestions({ limit: 1, page: 1 })
        const totalQuestions = firstResponse.pagination?.total || 0;
        console.log(`📊 Total questions in database: ${totalQuestions}`);
        
        if (totalQuestions === 0) {
          setQuestions([])
          setAllQuestions([])
          setIsLoading(false)
          return
        }
        
        // Now fetch all questions in batches
        const pageSize = 100;
        const totalPages = Math.ceil(totalQuestions / pageSize);
        const allQuestionArrays = [];
        
        for (let page = 1; page <= totalPages; page++) {
          console.log(`📄 Fetching page ${page} of ${totalPages}...`);
          const response = await questionBankService.getAllQuestions({ limit: pageSize, page })
          const questionsArray = Array.isArray(response.questions) ? response.questions : []
          allQuestionArrays.push(...questionsArray);
        }
        
        console.log(`✅ Loaded ${allQuestionArrays.length} questions total`);
        console.log('🔍 First 3 questions:', allQuestionArrays.slice(0, 3));
        setQuestions(allQuestionArrays)
        setAllQuestions(allQuestionArrays)
        setIsLoading(false)
        return
      }
      
      if (selectedItem.type === 'global') {
        const response = await questionBankService.getAllQuestions({ limit: 1000 })
        // Filter to only questions without categoryId
        const questionsArray = Array.isArray(response.questions) ? response.questions : []
        const globalQuestions = questionsArray.filter(q => !q.categoryId)
        console.log(`📊 Loaded ${globalQuestions.length} global questions (no category)`)
        setQuestions(globalQuestions)
        
      } else if (selectedItem.type === 'category' || selectedItem.type === 'subcategory') {
        const categoryId = parseInt(selectedItem.id)
        console.log('🔍 Loading questions for category:', categoryId)
        console.log('📚 Total questions available:', allQuestions.length)
        console.log('🔢 All category IDs in questions:', [...new Set(allQuestions.map(q => q.categoryId))])
        
        // Instead of calling API, filter from allQuestions we already have
        const categoryQuestions = allQuestions.filter(q => q.categoryId === categoryId)
        
        console.log(`✅ Found ${categoryQuestions.length} questions for category ${categoryId}`)
        
        if (categoryQuestions.length > 0) {
          console.log('📝 Sample questions:', categoryQuestions.slice(0, 3).map(q => `"${q.questionText}" (ID: ${q.id}, Category: ${q.categoryId})`))
        }
        
        setQuestions(categoryQuestions)
        
        if (categoryQuestions.length === 0) {
          console.log('📭 No questions found for this category')
          console.log('❓ Looking for subcategory questions...')
          
          // Check if this is a parent category and look for questions in subcategories
          const allCategoryIds = getAllDescendantCategoryIds(categoryId, [...(apiCategories || []), ...virtualCategories])
          console.log('🔄 Checking descendant categories:', allCategoryIds)
          
          const descendantQuestions = allQuestions.filter(q => allCategoryIds.includes(q.categoryId || 0))
          console.log(`📊 Found ${descendantQuestions.length} questions in descendant categories`)
          
          if (descendantQuestions.length > 0) {
            setQuestions(descendantQuestions)
          } else {
            // Show a message to the user
            toast({
              title: "No questions found",
              description: `Category "${categoryId}" has no questions yet.`,
              variant: "default"
            })
          }
        }
        
      } else if (selectedItem.type === 'quiz') {
        // For quiz, get questions by the quiz's category (including subcategories)
        const quiz = quizzes?.find(q => q.id.toString() === selectedItem.id)
        if (quiz?.categoryId) {
          const allCategoryIds = getAllDescendantCategoryIds(quiz.categoryId, apiCategories || [])
          console.log('🎯 Quiz category IDs to search:', allCategoryIds)
          
          const questionPromises = allCategoryIds.map(catId => 
            questionBankService.getQuestionsByCategory(catId)
          )
          
          const allResponses = await Promise.all(questionPromises)
          
          allResponses.forEach(response => {
            const questionsArray = Array.isArray(response) ? response : []
            allQuestions.push(...questionsArray)
          })
          
          // Remove duplicates
          const uniqueQuestions = allQuestions.filter((question, index, self) => 
            index === self.findIndex(q => q.id === question.id)
          )
          
          setQuestions(uniqueQuestions)
        } else {
          setQuestions([])
        }
      } else {
        setQuestions([])
      }
    } catch (error: any) {
      console.error('❌ Error loading questions:', error)
      console.error('Error response:', error.response?.data)
      
      let errorMessage = "Failed to load questions"
      if (error.response?.status === 401) {
        errorMessage = "Authentication required. Please login again."
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      setQuestions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Filter questions based on search and difficulty
  const filteredQuestions = questions.filter(question => {
    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase()
      if (!question.questionText.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Difficulty filter
    if (difficultyFilter !== 'all' && question.difficulty.toLowerCase() !== difficultyFilter) {
      return false
    }

    return true
  })

  const handleSelectItem = (type: 'category' | 'subcategory' | 'quiz' | 'global', id: string) => {
    console.log('🎯 Selected:', type, id)
    setSelectedItem({ type, id })
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
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id.toString())))
    } else {
      setSelectedQuestions(new Set())
    }
  }

  const handleReset = () => {
    setSelectedItem({ type: 'global', id: 'global' })
    setSelectedQuestions(new Set())
    setSearchQuery('')
    setDifficultyFilter('all')
  }

  const handleAddQuestions = () => {
    const questionsToAdd = filteredQuestions.filter(q => selectedQuestions.has(q.id.toString()))
    // Transform API questions to Question type format
    const transformedQuestions: Question[] = questionsToAdd.map(q => ({
      id: q.id.toString(),
      text: q.questionText,
      options: {
        A: q.options[0]?.optionText || '',
        B: q.options[1]?.optionText || '',
        C: q.options[2]?.optionText || '',
        D: q.options[3]?.optionText || ''
      },
      correctOption: String.fromCharCode(65 + (q.options.findIndex(opt => opt.isCorrect) || 0)) as 'A' | 'B' | 'C' | 'D',
      difficulty: (q.difficulty.toLowerCase() === 'medium' ? 'intermediate' : q.difficulty.toLowerCase()) as 'easy' | 'intermediate' | 'hard',
      points: 10, // Default points
      timeLimit: 30, // Default time limit
      tags: [], // Default empty tags
      category: q.categoryId ? `Category ${q.categoryId}` : 'Global',
      createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
      updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date()
    }))

    onAddQuestions(transformedQuestions)
    onOpenChange(false)
    handleReset()
  }

  const isAllSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestions.has(q.id.toString()))
  const someSelected = selectedQuestions.size > 0
  const loadingState = categoriesLoading || isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Questions from Question Bank</DialogTitle>
          <DialogDescription>
            Select questions from your question bank to add to this quiz. Browse by categories or search globally.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-3 gap-6 h-full">
            {/* Left Panel - Hierarchical Tree */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Categories & Quizzes</h3>
              
              {/* All Questions Button */}
              <div
                className={cn(
                  "flex items-center space-x-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                  !selectedItem && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                )}
                onClick={() => {
                  setSelectedItem(null) // This will trigger loading ALL questions
                  setSelectedQuestions(new Set())
                }}
              >
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">All Questions ({allQuestions.length})</span>
              </div>
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                {loadingState ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <QuestionBankTree
                    categories={[...(apiCategories || []), ...virtualCategories]}
                    quizzes={quizzes || []}
                    selectedItem={selectedItem}
                    onSelectItem={handleSelectItem}
                    categoryCounts={categoryCounts}
                  />
                )}
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
                    onValueChange={(value) => setDifficultyFilter(value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
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
                      {selectedItem?.type === 'category' || selectedItem?.type === 'subcategory' ? (
                        <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">
                          (from category tree)
                        </span>
                      ) : selectedItem?.type === 'quiz' ? (
                        <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                          (from quiz category)
                        </span>
                      ) : selectedItem?.type === 'global' ? (
                        <span className="ml-1 text-xs text-purple-600 dark:text-purple-400">
                          (global only)
                        </span>
                      ) : null}
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
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="ml-2 text-gray-500">
                      Loading questions
                      {selectedItem?.type === 'category' || selectedItem?.type === 'subcategory' 
                        ? ' from category and all subcategories...' 
                        : selectedItem?.type === 'quiz'
                        ? ' from quiz category...'
                        : selectedItem?.type === 'global'
                        ? ' (global)...'
                        : '...'
                      }
                    </span>
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No questions found</p>
                    <p className="text-sm">Try selecting a different category or adjusting your search</p>
                  </div>
                ) : (
                  filteredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750"
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedQuestions.has(question.id.toString())}
                          onCheckedChange={(checked) => handleSelectQuestion(question.id.toString(), checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {question.questionText}
                          </p>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {question.options.map((option, index) => (
                              <div
                                key={option.id}
                                className={cn(
                                  "p-2 text-xs rounded border",
                                  option.isCorrect
                                    ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800"
                                    : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                                )}
                              >
                                <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option.optionText}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className={cn(
                              "px-2 py-1 rounded",
                              question.difficulty === 'EASY' ? "bg-green-100 text-green-800" :
                              question.difficulty === 'MEDIUM' ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            )}>
                              {question.difficulty}
                            </span>
                            <span>ID: {question.id}</span>
                            {question.categoryId && <span>Category: {question.categoryId}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="flex items-center space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleAddQuestions}
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
