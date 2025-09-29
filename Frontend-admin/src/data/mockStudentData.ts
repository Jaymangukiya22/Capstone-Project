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

// Mock data for student interface
export const mockStudentCategories: StudentCategory[] = [
  {
    id: "1",
    name: "Science & Technology",
    description: "Science and technology related quizzes",
    subcategories: [
      {
        id: "1-1",
        name: "Computer Science",
        categoryId: "1",
        quizzes: [
          {
            id: "quiz-1",
            name: "Computer science fundamentals",
            description: "This quiz contains basics of computer science fundamentals such as OOP, DBMS, CN etc.",
            category: "Science & Technology",
            subcategory: "Computer Science",
            difficulty: "intermediate",
            questionCounts: {
              easy: 5,
              intermediate: 8,
              hard: 2,
              total: 15
            },
            estimatedDuration: 8,
            passingScore: 75,
            timePerQuestion: 30,
            lastUpdated: new Date('2024-01-15'),
            isActive: true
          },
          {
            id: "quiz-2",
            name: "Data Structures & Algorithms",
            description: "Comprehensive quiz covering arrays, linked lists, trees, graphs, and sorting algorithms.",
            category: "Science & Technology",
            subcategory: "Computer Science",
            difficulty: "hard",
            questionCounts: {
              easy: 3,
              intermediate: 7,
              hard: 10,
              total: 20
            },
            estimatedDuration: 12,
            passingScore: 70,
            timePerQuestion: 35,
            lastUpdated: new Date('2024-01-20'),
            isActive: true
          }
        ]
      },
      {
        id: "1-2",
        name: "Physics",
        categoryId: "1",
        quizzes: [
          {
            id: "quiz-3",
            name: "Classical Mechanics",
            description: "Newton's laws, motion, forces, and energy concepts in classical physics.",
            category: "Science & Technology",
            subcategory: "Physics",
            difficulty: "intermediate",
            questionCounts: {
              easy: 6,
              intermediate: 9,
              hard: 5,
              total: 20
            },
            estimatedDuration: 10,
            passingScore: 80,
            timePerQuestion: 30,
            lastUpdated: new Date('2024-01-18'),
            isActive: true
          }
        ]
      }
    ]
  },
  {
    id: "2",
    name: "Mathematics",
    description: "Mathematical concepts and problem solving",
    subcategories: [
      {
        id: "2-1",
        name: "Algebra",
        categoryId: "2",
        quizzes: [
          {
            id: "quiz-4",
            name: "Linear Algebra Basics",
            description: "Vectors, matrices, determinants, and linear transformations.",
            category: "Mathematics",
            subcategory: "Algebra",
            difficulty: "intermediate",
            questionCounts: {
              easy: 4,
              intermediate: 8,
              hard: 3,
              total: 15
            },
            estimatedDuration: 9,
            passingScore: 65,
            timePerQuestion: 35,
            lastUpdated: new Date('2024-01-22'),
            isActive: true
          }
        ]
      },
      {
        id: "2-2",
        name: "Calculus",
        categoryId: "2",
        quizzes: [
          {
            id: "quiz-5",
            name: "Differential Calculus",
            description: "Limits, derivatives, and applications of differentiation.",
            category: "Mathematics",
            subcategory: "Calculus",
            difficulty: "hard",
            questionCounts: {
              easy: 2,
              intermediate: 6,
              hard: 12,
              total: 20
            },
            estimatedDuration: 15,
            passingScore: 85,
            timePerQuestion: 45,
            lastUpdated: new Date('2024-01-25'),
            isActive: true
          }
        ]
      }
    ]
  },
  {
    id: "3",
    name: "Languages",
    description: "Language learning and literature",
    subcategories: [
      {
        id: "3-1",
        name: "English",
        categoryId: "3",
        quizzes: [
          {
            id: "quiz-6",
            name: "Grammar Fundamentals",
            description: "Basic grammar rules, sentence structure, and common usage patterns.",
            category: "Languages",
            subcategory: "English",
            difficulty: "easy",
            questionCounts: {
              easy: 12,
              intermediate: 6,
              hard: 2,
              total: 20
            },
            estimatedDuration: 7,
            passingScore: 60,
            timePerQuestion: 20,
            lastUpdated: new Date('2024-01-12'),
            isActive: true
          }
        ]
      }
    ]
  }
]

export const mockQuizModes = [
  { value: '1v1', label: '1v1', description: 'Challenge another player directly' },
  { value: 'multiplayer', label: 'Multiplayer', description: 'Join a room with multiple players' },
  { value: 'play-with-friend', label: 'Play with Friend', description: 'Create or join a private game' }
]

// Helper functions
export const getAllQuizzes = (): StudentQuiz[] => {
  return mockStudentCategories.flatMap(category => 
    category.subcategories.flatMap(subcategory => subcategory.quizzes)
  )
}

export const getQuizById = (id: string): StudentQuiz | undefined => {
  return getAllQuizzes().find(quiz => quiz.id === id)
}

export const generateJoinCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
