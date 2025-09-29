import { AIOpponentService } from '../../../src/services/aiOpponentService';
import { Difficulty } from '../../../src/types/enums';

describe('AIOpponentService', () => {
  let aiOpponentService: AIOpponentService;

  beforeEach(() => {
    aiOpponentService = new AIOpponentService();
  });

  describe('getAIOpponents', () => {
    it('should return all available AI opponents', () => {
      const opponents = aiOpponentService.getAIOpponents();

      expect(opponents).toHaveLength(3);
      expect(opponents.map(op => op.id)).toEqual(['rookie-bot', 'smart-bot', 'genius-bot']);
    });

    it('should return opponents with correct properties', () => {
      const opponents = aiOpponentService.getAIOpponents();

      opponents.forEach(opponent => {
        expect(opponent).toHaveProperty('id');
        expect(opponent).toHaveProperty('name');
        expect(opponent).toHaveProperty('difficulty');
        expect(opponent).toHaveProperty('accuracyRate');
        expect(opponent).toHaveProperty('responseTimeRange');
      });
    });

    it('should have increasing difficulty levels', () => {
      const opponents = aiOpponentService.getAIOpponents();

      expect(opponents[0].accuracyRate).toBe(60); // Rookie
      expect(opponents[1].accuracyRate).toBe(75); // Smart
      expect(opponents[2].accuracyRate).toBe(90); // Genius
    });
  });

  describe('getAIOpponent', () => {
    it('should return correct AI opponent by id', () => {
      const rookieBot = aiOpponentService.getAIOpponent('rookie-bot');
      const smartBot = aiOpponentService.getAIOpponent('smart-bot');
      const geniusBot = aiOpponentService.getAIOpponent('genius-bot');

      expect(rookieBot?.id).toBe('rookie-bot');
      expect(rookieBot?.accuracyRate).toBe(60);

      expect(smartBot?.id).toBe('smart-bot');
      expect(smartBot?.accuracyRate).toBe(75);

      expect(geniusBot?.id).toBe('genius-bot');
      expect(geniusBot?.accuracyRate).toBe(90);
    });

    it('should return null for non-existent AI opponent', () => {
      const nonExistent = aiOpponentService.getAIOpponent('non-existent-bot');
      expect(nonExistent).toBeNull();
    });
  });

  describe('generateAIResponse', () => {
    const mockQuestion = {
      id: 1,
      questionText: 'Test question?',
      difficulty: Difficulty.MEDIUM,
      options: [
        { id: 1, optionText: 'Option A', isCorrect: true },
        { id: 2, optionText: 'Option B', isCorrect: false },
        { id: 3, optionText: 'Option C', isCorrect: false },
        { id: 4, optionText: 'Option D', isCorrect: false }
      ]
    };

    it('should generate response with correct structure', async () => {
      const rookieBot = aiOpponentService.getAIOpponent('rookie-bot')!;
      const response = await aiOpponentService.generateAIResponse(mockQuestion, rookieBot, 30);

      expect(response).toHaveProperty('selectedOptionId');
      expect(response).toHaveProperty('responseTime');
      expect(response).toHaveProperty('isCorrect');

      expect(typeof response.selectedOptionId).toBe('number');
      expect(typeof response.responseTime).toBe('number');
      expect(typeof response.isCorrect).toBe('boolean');
    });

    it('should select valid option id', async () => {
      const rookieBot = aiOpponentService.getAIOpponent('rookie-bot')!;
      const response = await aiOpponentService.generateAIResponse(mockQuestion, rookieBot, 30);

      const validOptionIds = mockQuestion.options.map(opt => opt.id);
      expect(validOptionIds).toContain(response.selectedOptionId);
    });

    it('should have response time within reasonable bounds', async () => {
      const rookieBot = aiOpponentService.getAIOpponent('rookie-bot')!;
      const response = await aiOpponentService.generateAIResponse(mockQuestion, rookieBot, 30);

      expect(response.responseTime).toBeGreaterThan(0);
      expect(response.responseTime).toBeLessThanOrEqual(30); // Should not exceed time limit
    });
  });

  describe('calculateAIScore', () => {
    it('should calculate score correctly for array of responses', () => {
      const responses = [
        { selectedOptionId: 1, responseTime: 10, isCorrect: true },
        { selectedOptionId: 2, responseTime: 15, isCorrect: false },
        { selectedOptionId: 1, responseTime: 5, isCorrect: true }
      ];

      const score = aiOpponentService.calculateAIScore(responses);

      expect(score).toBeGreaterThan(0);
      expect(typeof score).toBe('number');
    });

    it('should return 0 for all incorrect answers', () => {
      const responses = [
        { selectedOptionId: 2, responseTime: 10, isCorrect: false },
        { selectedOptionId: 3, responseTime: 15, isCorrect: false }
      ];

      const score = aiOpponentService.calculateAIScore(responses);
      expect(score).toBe(0);
    });

    it('should give higher scores for faster responses', () => {
      const fastResponses = [
        { selectedOptionId: 1, responseTime: 5, isCorrect: true }
      ];

      const slowResponses = [
        { selectedOptionId: 1, responseTime: 25, isCorrect: true }
      ];

      const fastScore = aiOpponentService.calculateAIScore(fastResponses);
      const slowScore = aiOpponentService.calculateAIScore(slowResponses);

      expect(fastScore).toBeGreaterThan(slowScore);
    });
  });

  describe('generateAIStats', () => {
    it('should generate correct statistics', () => {
      const responses = [
        { selectedOptionId: 1, responseTime: 10, isCorrect: true },
        { selectedOptionId: 2, responseTime: 15, isCorrect: false },
        { selectedOptionId: 1, responseTime: 5, isCorrect: true }
      ];

      const stats = aiOpponentService.generateAIStats(responses);

      expect(stats.totalQuestions).toBe(3);
      expect(stats.correctAnswers).toBe(2);
      expect(stats.accuracy).toBe(66.67);
      expect(stats.averageResponseTime).toBe(10);
      expect(stats.totalScore).toBeGreaterThan(0);
    });

    it('should handle empty responses array', () => {
      const stats = aiOpponentService.generateAIStats([]);

      expect(stats.totalQuestions).toBe(0);
      expect(stats.correctAnswers).toBe(0);
      expect(stats.accuracy).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.totalScore).toBe(0);
    });
  });
});
