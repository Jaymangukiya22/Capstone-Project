export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  timeLimit?: number; // in seconds
}

export interface QuizAnswer {
  questionId: number;
  selectedOption: string;
  timeSpent: number;
  isCorrect: boolean;
}

export interface QuizResults {
  score: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: string;
  studentName: string;
  answers: QuizAnswer[];
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: string;
  percentage: number;
}

export interface QuizState {
  currentQuestion: number;
  answers: Map<number, string>;
  timeRemaining: number;
  questionTimeRemaining: number;
  isSubmitting: boolean;
  startTime: number;
}

export interface QuizConfig {
  title: string;
  totalTime: number; // in seconds
  questionTimeLimit: number; // in seconds
  questions: QuizQuestion[];
}
