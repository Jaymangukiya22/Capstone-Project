import { apiClient } from './api'

// Types matching the existing mock data structure
export interface StudentQuiz {
  id: string
  name: string
  description: string
  category: string
  subcategory: string
  difficulty: 'easy' | 'intermediate' | 'hard'
  questionCounts: {
    easy: number
    intermediate: number
    hard: number
    total: number
  }
  estimatedDuration: number // in minutes
  passingScore: number // percentage required to pass
  timePerQuestion: number // in seconds
  maxPlayers: number // maximum players for multiplayer
  lastUpdated: Date
  isActive: boolean
}

export interface StudentCategory {
  id: string
  name: string
  description?: string
  subcategories: StudentSubcategory[]
}

export interface StudentSubcategory {
  id: string
  name: string
  description?: string
  categoryId: string
  quizzes: StudentQuiz[]
}

// API Response types (matching backend structure)
interface ApiQuiz {
  id: number
  title: string
  description: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  timeLimit: number
  maxQuestions: number
  categoryId: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  category?: {
    id: number
    name: string
    description: string
    parentId: number | null
  }
  _count?: {
    questions: number
  }
}

interface ApiCategory {
  id: number
  name: string
  description: string
  parentId: number | null
  isActive: boolean
  children?: ApiCategory[]
  quizzes?: ApiQuiz[]
  _count?: {
    quizzes: number
    questions: number
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

class StudentQuizService {

  // Transform backend quiz data to student format
  private transformQuiz(apiQuiz: ApiQuiz, categoryName: string = '', subcategoryName: string = ''): StudentQuiz {
    const difficultyMap = {
      'EASY': 'easy' as const,
      'MEDIUM': 'intermediate' as const,
      'HARD': 'hard' as const
    }

    // Calculate question counts (mock for now, can be enhanced later)
    const totalQuestions = apiQuiz._count?.questions || apiQuiz.maxQuestions || 10
    const questionCounts = {
      easy: Math.floor(totalQuestions * 0.4),
      intermediate: Math.floor(totalQuestions * 0.4),
      hard: Math.floor(totalQuestions * 0.2),
      total: totalQuestions
    }

    return {
      id: apiQuiz.id.toString(),
      name: apiQuiz.title,
      description: apiQuiz.description || '',
      category: categoryName || apiQuiz.category?.name || 'General',
      subcategory: subcategoryName || 'Default',
      difficulty: difficultyMap[apiQuiz.difficulty] || 'intermediate',
      questionCounts,
      estimatedDuration: Math.ceil(totalQuestions * (apiQuiz.timeLimit || 30) / 60), // Convert seconds to minutes
      passingScore: 70, // Default passing score
      timePerQuestion: apiQuiz.timeLimit || 30,
      maxPlayers: 10, // Default max players for multiplayer
      lastUpdated: new Date(apiQuiz.updatedAt),
      isActive: apiQuiz.isActive
    }
  }

  // Transform categories to student format with hierarchical structure
  private transformCategories(apiCategories: ApiCategory[]): StudentCategory[] {
    const studentCategories: StudentCategory[] = []
    
    // Find root categories (parentId is null)
    const rootCategories = apiCategories.filter(cat => cat.parentId === null)
    
    for (const rootCategory of rootCategories) {
      // Find subcategories for this root category
      const subcategories = apiCategories.filter(cat => cat.parentId === rootCategory.id)
      
      const studentSubcategories: StudentSubcategory[] = subcategories.map(subcat => ({
        id: subcat.id.toString(),
        name: subcat.name,
        description: subcat.description,
        categoryId: rootCategory.id.toString(),
        quizzes: (subcat.quizzes || []).map(quiz => 
          this.transformQuiz(quiz, rootCategory.name, subcat.name)
        )
      }))

      // Also add quizzes directly under root category as a default subcategory
      if (rootCategory.quizzes && rootCategory.quizzes.length > 0) {
        studentSubcategories.unshift({
          id: `${rootCategory.id}-default`,
          name: 'General',
          description: 'General quizzes in this category',
          categoryId: rootCategory.id.toString(),
          quizzes: rootCategory.quizzes.map(quiz => 
            this.transformQuiz(quiz, rootCategory.name, 'General')
          )
        })
      }

      studentCategories.push({
        id: rootCategory.id.toString(),
        name: rootCategory.name,
        description: rootCategory.description,
        subcategories: studentSubcategories
      })
    }

    return studentCategories
  }

  // Fetch all categories with their quizzes
  async getStudentCategories(): Promise<StudentCategory[]> {
    try {
      const response = await apiClient.get<ApiResponse<ApiCategory[]>>(
        `/categories?hierarchy=true&includeQuizzes=true&depth=2`
      )
      
      if (response.data.success) {
        return this.transformCategories(response.data.data)
      } else {
        console.error('Failed to fetch categories:', response.data.message)
        return []
      }
    } catch (error) {
      console.error('Error fetching student categories:', error)
      return []
    }
  }

  // Get all quizzes flattened
  async getAllQuizzes(): Promise<StudentQuiz[]> {
    const categories = await this.getStudentCategories()
    return categories.flatMap(category => 
      category.subcategories.flatMap(subcategory => subcategory.quizzes)
    )
  }

  // Get quiz by ID
  async getQuizById(id: string): Promise<StudentQuiz | null> {
    try {
      const response = await apiClient.get<ApiResponse<ApiQuiz>>(
        `/quizzes/${id}`
      )
      
      if (response.data.success) {
        return this.transformQuiz(response.data.data)
      } else {
        console.error('Failed to fetch quiz:', response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error fetching quiz by ID:', error)
      return null
    }
  }

  // Get quiz questions for playing
  async getQuizQuestions(quizId: string): Promise<any[]> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `/quizzes/${quizId}/play`
      )
      
      if (response.data.success) {
        return response.data.data.questions || []
      } else {
        console.error('Failed to fetch quiz questions:', response.data.message)
        return []
      }
    } catch (error) {
      console.error('Error fetching quiz questions:', error)
      return []
    }
  }
}

// Export singleton instance
export const studentQuizService = new StudentQuizService()

// Export quiz modes with AI support
export const mockQuizModes = [
  { value: 'solo', label: 'Solo vs AI', description: 'Play against an AI opponent', icon: '🤖' },
  { value: '1v1', label: '1v1', description: 'Challenge another player directly', icon: '⚔️' },
  { value: 'multiplayer', label: 'Multiplayer', description: 'Join a room with up to 10 players', icon: '👥' },
  { value: 'play-with-friend', label: 'Play with Friend', description: 'Create or join a private game', icon: '👫' }
]

// Keep existing helper functions for compatibility
export const generateJoinCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
