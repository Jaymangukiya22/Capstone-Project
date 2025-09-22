import { apiClient } from './api'

// Types for Quiz Attempts
export interface QuizAttemptAnswer {
  questionId: number
  selectedOptions: number[]
  timeSpent: number
  isCorrect?: boolean
}

export interface QuizAttempt {
  id: number
  userId: number
  quizId: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent?: number
  startedAt?: string
  completedAt?: string
  answers: QuizAttemptAnswer[]
}

export interface QuizQuestion {
  id: number
  questionText: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  options: {
    id: number
    optionText: string
    isCorrect: boolean
  }[]
}

export interface FrontendQuizQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: string
}

export interface StartQuizResponse {
  attemptId: number
  questions: QuizQuestion[]
  timeLimit: number
  totalQuestions: number
}

// API Response types
interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

class QuizAttemptService {
  private baseUrl = '/quiz-attempts'

  /**
   * Start a new quiz attempt
   */
  async startQuizAttempt(quizId: number): Promise<StartQuizResponse | null> {
    try {
      // First, start the quiz attempt
      const attemptResponse = await apiClient.post<ApiResponse<{
        attempt: QuizAttempt
      }>>(
        `${this.baseUrl}/start`,
        { quizId }
      )
      
      if (!attemptResponse.data.success) {
        console.error('Failed to start quiz attempt:', attemptResponse.data.message)
        return null
      }

      const attempt = attemptResponse.data.data.attempt

      // Then, get the quiz questions
      const quizResponse = await apiClient.get<ApiResponse<{
        quiz: {
          id: number
          title: string
          description: string
          difficulty: string
          timeLimit: number
          questions: QuizQuestion[]
        }
      }>>(
        `/quizzes/${quizId}/play`
      )
      
      if (!quizResponse.data.success) {
        console.error('Failed to get quiz questions:', quizResponse.data.message)
        return null
      }

      const quiz = quizResponse.data.data.quiz
      const questions = Array.isArray(quiz.questions) ? quiz.questions : []
      const timeLimit = quiz.timeLimit || 30

      if (questions.length === 0) {
        console.warn('⚠️ No questions found for quiz ID:', quizId)
        console.warn('⚠️ This quiz may not have questions assigned to it')
      }

      return {
        attemptId: attempt.id,
        questions,
        timeLimit,
        totalQuestions: questions.length
      }
    } catch (error) {
      console.error('Error starting quiz attempt:', error)
      return null
    }
  }

  /**
   * Submit an answer for a question
   */
  async submitAnswer(
    attemptId: number, 
    questionId: number, 
    selectedOptions: number[], 
    timeSpent: number
  ): Promise<boolean> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `${this.baseUrl}/${attemptId}/answer`,
        {
          questionId,
          selectedOptions,
          timeSpent
        }
      )
      
      return response.data.success
    } catch (error) {
      console.error('Error submitting answer:', error)
      return false
    }
  }

  /**
   * Complete a quiz attempt
   */
  async completeQuizAttempt(attemptId: number): Promise<QuizAttempt | null> {
    try {
      const response = await apiClient.post<ApiResponse<QuizAttempt>>(
        `${this.baseUrl}/${attemptId}/complete`,
        {} // Empty body since attemptId is in URL
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to complete quiz attempt:', response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error completing quiz attempt:', error)
      return null
    }
  }

  /**
   * Get quiz attempt by ID
   */
  async getAttemptById(attemptId: number): Promise<QuizAttempt | null> {
    try {
      const response = await apiClient.get<ApiResponse<QuizAttempt>>(
        `${this.baseUrl}/${attemptId}`
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to get attempt:', response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error getting attempt:', error)
      return null
    }
  }

  /**
   * Get user's quiz attempt history
   */
  async getUserAttempts(page: number = 1, limit: number = 20): Promise<{
    attempts: QuizAttempt[]
    pagination: {
      currentPage: number
      totalPages: number
      totalAttempts: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `${this.baseUrl}/user/history?page=${page}&limit=${limit}`
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to get user attempts:', response.data.message)
        return {
          attempts: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalAttempts: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    } catch (error) {
      console.error('Error getting user attempts:', error)
      return {
        attempts: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalAttempts: 0,
          hasNext: false,
          hasPrev: false
        }
      }
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    bestScore: number
    totalTimeSpent: number
    favoriteCategory: string
  } | null> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `${this.baseUrl}/user/stats`
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to get user stats:', response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error getting user stats:', error)
      return null
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(quizId?: number, limit: number = 10): Promise<any[]> {
    try {
      const url = quizId 
        ? `${this.baseUrl}/leaderboard?quizId=${quizId}&limit=${limit}`
        : `${this.baseUrl}/leaderboard?limit=${limit}`
        
      const response = await apiClient.get<ApiResponse<any[]>>(url)
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to get leaderboard:', response.data.message)
        return []
      }
    } catch (error) {
      console.error('Error getting leaderboard:', error)
      return []
    }
  }
}

// Export singleton instance
export const quizAttemptService = new QuizAttemptService()
