import { useState } from 'react'
import { Plus, Search, FileQuestion, Edit, Trash2, Eye, Play, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { useQuizzes } from '@/hooks/useQuizzes'
import { useCategories } from '@/hooks/useCategories'
import type { Quiz } from '@/types/api'

export function QuizManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("")

  // Fetch quizzes and categories
  const { 
    quizzes, 
    loading: quizzesLoading, 
    error: quizzesError, 
    deleteQuiz,
    refreshQuizzes 
  } = useQuizzes()
  
  const { categories } = useCategories({ includeChildren: true, depth: 3 })

  // Filter quizzes based on search and filters
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || quiz.categoryId.toString() === selectedCategory
    const matchesDifficulty = !selectedDifficulty || quiz.difficulty === selectedDifficulty
    
    return matchesSearch && matchesCategory && matchesDifficulty
  })

  const handleDeleteQuiz = async (quiz: Quiz) => {
    if (confirm(`Are you sure you want to delete "${quiz.title}"?`)) {
      try {
        await deleteQuiz(quiz.id)
        alert('Quiz deleted successfully!')
      } catch (err) {
        alert('Failed to delete quiz. Please try again.')
      }
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'HARD': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getCategoryName = (categoryId: number) => {
    const findCategory = (cats: any[]): string => {
      for (const cat of cats) {
        if (cat.id === categoryId) return cat.name
        if (cat.children) {
          const found = findCategory(cat.children)
          if (found) return found
        }
      }
      return 'Unknown'
    }
    return findCategory(categories)
  }

  if (quizzesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading quizzes...</p>
        </div>
      </div>
    )
  }

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
            <BreadcrumbPage>Quiz Management</BreadcrumbPage>
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
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Quiz Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage and organize your quizzes
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => window.location.href = '/quiz-builder'}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {quizzesError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="text-red-500">⚠️</div>
            <span className="text-sm text-red-700 dark:text-red-400">{quizzesError}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Difficulties</SelectItem>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={refreshQuizzes}>
          Refresh
        </Button>
      </div>

      {/* Quiz Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quiz Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Time Limit</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuizzes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-gray-500">
                    {quizzes.length === 0 ? 'No quizzes found. Create your first quiz!' : 'No quizzes match your filters.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredQuizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {quiz.title}
                      </div>
                      {quiz.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {quiz.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getCategoryName(quiz.categoryId)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getDifficultyColor(quiz.difficulty)}>
                      {quiz.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {quiz.timeLimit}s
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(quiz.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" title="View Quiz">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Edit Quiz">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Play Quiz">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="View Stats">
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Delete Quiz"
                        onClick={() => handleDeleteQuiz(quiz)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{quizzes.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Quizzes</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{quizzes.filter(q => q.difficulty === 'EASY').length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Easy Quizzes</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">{quizzes.filter(q => q.difficulty === 'MEDIUM').length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Medium Quizzes</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{quizzes.filter(q => q.difficulty === 'HARD').length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Hard Quizzes</div>
        </div>
      </div>
    </div>
  )
}
