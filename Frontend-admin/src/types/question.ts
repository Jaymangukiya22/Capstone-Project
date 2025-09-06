export interface QuestionOption {
  id: string
  text: string
}

export interface Question {
  id: string
  text: string
  options: QuestionOption[]
  correctOptionId: string
  type: 'multiple-choice' | 'true-false'
  difficulty: 'easy' | 'intermediate' | 'hard'
  tags: string[]
  points: number
  timeLimit: number // in seconds
  createdAt: Date
  updatedAt: Date
}

export interface ImportValidationError {
  rowIndex: number
  errors: string[]
}

export interface ImportRow {
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
}

export interface QuestionsState {
  questions: Question[]
  selectedQuestionIds: string[]
  searchQuery: string
  filterType: string
  isLoading: boolean
}
