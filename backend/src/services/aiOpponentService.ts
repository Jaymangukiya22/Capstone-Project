import { QuestionBankItem, QuestionBankOption } from '../models';
import { Difficulty } from '../types/enums';
import { logInfo } from '../utils/logger';

export interface AIOpponent {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  responseTimeRange: {
    min: number; // minimum response time in seconds
    max: number; // maximum response time in seconds
  };
  accuracyRate: number; // percentage (0-100) of correct answers
  avatar?: string;
}

export interface AIResponse {
  selectedOptionId: number;
  responseTime: number; // time taken to answer in seconds
  isCorrect: boolean;
}

export interface QuestionWithOptions {
  id: number;
  questionText: string;
  difficulty: Difficulty;
  options: {
    id: number;
    optionText: string;
    isCorrect: boolean;
  }[];
}

// Predefined AI opponents with different skill levels
const AI_OPPONENTS: AIOpponent[] = [
  {
    id: 'rookie-bot',
    name: 'Rookie Bot',
    difficulty: 'easy',
    responseTimeRange: { min: 8, max: 15 },
    accuracyRate: 60,
    avatar: '🤖'
  },
  {
    id: 'smart-bot',
    name: 'Smart Bot', 
    difficulty: 'medium',
    responseTimeRange: { min: 5, max: 12 },
    accuracyRate: 75,
    avatar: '🧠'
  },
  {
    id: 'genius-bot',
    name: 'Genius Bot',
    difficulty: 'hard',
    responseTimeRange: { min: 3, max: 8 },
    accuracyRate: 90,
    avatar: '🚀'
  }
];

export class AIOpponentService {
  
  /**
   * Get available AI opponents
   */
  getAIOpponents(): AIOpponent[] {
    return AI_OPPONENTS;
  }

  /**
   * Get AI opponent by ID
   */
  getAIOpponent(id: string): AIOpponent | null {
    return AI_OPPONENTS.find(opponent => opponent.id === id) || null;
  }

  /**
   * Select appropriate AI opponent based on quiz difficulty
   */
  selectAIOpponentByDifficulty(quizDifficulty: Difficulty): AIOpponent {
    const difficultyMap = {
      [Difficulty.EASY]: 'rookie-bot',
      [Difficulty.MEDIUM]: 'smart-bot', 
      [Difficulty.HARD]: 'genius-bot'
    };
    
    const opponentId = difficultyMap[quizDifficulty];
    return this.getAIOpponent(opponentId) || AI_OPPONENTS[1]; // Default to Smart Bot
  }

  /**
   * Generate AI response for a question
   */
  async generateAIResponse(
    question: QuestionWithOptions, 
    opponent: AIOpponent,
    timeLimit: number = 30
  ): Promise<AIResponse> {
    
    // Calculate response time based on opponent's range and question difficulty
    const { min, max } = opponent.responseTimeRange;
    let responseTime = this.randomBetween(min, max);
    
    // Adjust response time based on question difficulty
    const difficultyMultiplier = {
      [Difficulty.EASY]: 0.8,
      [Difficulty.MEDIUM]: 1.0,
      [Difficulty.HARD]: 1.3
    };
    
    responseTime *= difficultyMultiplier[question.difficulty];
    responseTime = Math.min(responseTime, timeLimit - 1); // Ensure AI responds before timeout
    
    // Determine if AI will answer correctly based on accuracy rate
    const willAnswerCorrectly = Math.random() * 100 < opponent.accuracyRate;
    
    let selectedOptionId: number;
    let isCorrect: boolean;
    
    if (willAnswerCorrectly) {
      // Find correct answer
      const correctOption = question.options.find(opt => opt.isCorrect);
      selectedOptionId = correctOption?.id || question.options[0].id;
      isCorrect = true;
    } else {
      // Select random incorrect answer
      const incorrectOptions = question.options.filter(opt => !opt.isCorrect);
      if (incorrectOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * incorrectOptions.length);
        selectedOptionId = incorrectOptions[randomIndex].id;
        isCorrect = false;
      } else {
        // Fallback to first option if no incorrect options (shouldn't happen)
        selectedOptionId = question.options[0].id;
        isCorrect = question.options[0].isCorrect;
      }
    }

    // Simulate thinking time
    await this.delay(responseTime * 1000);

    logInfo(`AI ${opponent.name} responded to question ${question.id}`, {
      responseTime,
      isCorrect,
      selectedOptionId
    });

    return {
      selectedOptionId,
      responseTime,
      isCorrect
    };
  }

  /**
   * Calculate AI score based on correct answers and response times
   */
  calculateAIScore(
    responses: AIResponse[],
    basePointsPerQuestion: number = 100,
    timeBonus: boolean = true
  ): number {
    let totalScore = 0;

    for (const response of responses) {
      if (response.isCorrect) {
        let questionScore = basePointsPerQuestion;
        
        // Add time bonus (faster response = more points)
        if (timeBonus) {
          const timeBonusMultiplier = Math.max(0.1, 1 - (response.responseTime / 30));
          questionScore += Math.floor(basePointsPerQuestion * 0.5 * timeBonusMultiplier);
        }
        
        totalScore += questionScore;
      }
    }

    return totalScore;
  }

  /**
   * Generate AI performance statistics
   */
  generateAIStats(responses: AIResponse[]): {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    averageResponseTime: number;
    totalScore: number;
  } {
    const totalQuestions = responses.length;
    const correctAnswers = responses.filter(r => r.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const averageResponseTime = totalQuestions > 0 
      ? responses.reduce((sum, r) => sum + r.responseTime, 0) / totalQuestions 
      : 0;
    const totalScore = this.calculateAIScore(responses);

    return {
      totalQuestions,
      correctAnswers,
      accuracy: Math.round(accuracy * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      totalScore
    };
  }

  /**
   * Utility: Generate random number between min and max
   */
  private randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const aiOpponentService = new AIOpponentService();
