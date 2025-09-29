import { sessionManager } from '../utils/sessionManager';
import type { QuestionAnswers } from '../utils/sessionManager';

export interface QuizQuestion {
  id: number;
  questionText: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: Array<{
    id: number;
    optionText: string;
    isCorrect: boolean;
  }>;
}

export interface QuizGameData {
  id: number;
  title: string;
  description: string;
  questions: QuizQuestion[];
  timeLimit: number;
}

class QuizGameService {
  private currentQuiz: QuizGameData | null = null;

  /**
   * Load quiz and encrypt sensitive answer data
   */
  async loadQuizForGame(quizId: number): Promise<QuizGameData> {
    try {
      // Fetch quiz data from API (implement your actual API call here)
      const response = await fetch(`/api/quizzes/${quizId}/play`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load quiz');
      }

      const quiz: QuizGameData = data.data.quiz;
      this.currentQuiz = quiz;

      // Extract and encrypt correct answers
      const questionAnswers: QuestionAnswers = {};
      
      quiz.questions.forEach(question => {
        const correctOptions = question.options
          .filter(opt => opt.isCorrect)
          .map(opt => opt.id);
        
        const optionsData = question.options.map(opt => ({
          id: opt.id,
          text: opt.optionText,
          // Don't include isCorrect in client-side options
        }));

        questionAnswers[question.id] = {
          correctAnswer: JSON.stringify(correctOptions),
          options: JSON.stringify(optionsData),
          timestamp: Date.now()
        };
      });

      // Store encrypted answers
      sessionManager.saveQuestionAnswers(quizId, questionAnswers);

      // Return quiz without correct answer information
      const sanitizedQuiz: QuizGameData = {
        ...quiz,
        questions: quiz.questions.map(q => ({
          ...q,
          options: q.options.map(opt => ({
            id: opt.id,
            optionText: opt.optionText,
            isCorrect: false // Never expose correct answers to client
          }))
        }))
      };

      return sanitizedQuiz;
    } catch (error) {
      console.error('Failed to load quiz:', error);
      throw error;
    }
  }

  /**
   * Check if answer is correct (using encrypted data)
   */
  checkAnswer(quizId: number, questionId: number, selectedOptions: number[]): { isCorrect: boolean; correctAnswers: number[] } {
    const questionAnswers = sessionManager.getQuestionAnswers(quizId);
    if (!questionAnswers || !questionAnswers[questionId]) {
      console.warn('No answer data found for question:', questionId);
      return { isCorrect: false, correctAnswers: [] };
    }

    try {
      const correctAnswers = JSON.parse(questionAnswers[questionId].correctAnswer);
      
      // Check if selected answers match correct answers
      const isCorrect = selectedOptions.length === correctAnswers.length &&
        selectedOptions.every(option => correctAnswers.includes(option));

      return { isCorrect, correctAnswers };
    } catch (error) {
      console.error('Error checking answer:', error);
      return { isCorrect: false, correctAnswers: [] };
    }
  }

  /**
   * Get question options (without correct answer info)
   */
  getQuestionOptions(quizId: number, questionId: number): Array<{id: number, text: string}> {
    const questionAnswers = sessionManager.getQuestionAnswers(quizId);
    if (!questionAnswers || !questionAnswers[questionId]) {
      return [];
    }

    try {
      return JSON.parse(questionAnswers[questionId].options);
    } catch (error) {
      console.error('Error getting question options:', error);
      return [];
    }
  }

  /**
   * Calculate score with time bonus
   */
  calculateScore(isCorrect: boolean, timeSpent: number, questionTimeLimit: number): number {
    if (!isCorrect) return 0;

    const baseScore = 100;
    const timeBonus = Math.max(0, Math.round((questionTimeLimit - timeSpent) / questionTimeLimit * 50));
    
    return baseScore + timeBonus;
  }

  /**
   * Clean up quiz data
   */
  cleanup(quizId: number): void {
    sessionManager.clearQuestionAnswers(quizId);
    this.currentQuiz = null;
  }

  /**
   * Get current quiz
   */
  getCurrentQuiz(): QuizGameData | null {
    return this.currentQuiz;
  }
}

// Export singleton instance
export const quizGameService = new QuizGameService();
