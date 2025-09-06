import { validateCategory, validateQuiz, validateQuestion } from '../src/utils/validation';

describe('Validation Utils', () => {
  describe('Category Validation', () => {
    test('should validate valid category data', () => {
      const validCategory = {
        name: 'Science',
        parentId: 1
      };

      const { error } = validateCategory(validCategory);
      expect(error).toBeUndefined();
    });

    test('should reject empty name', () => {
      const invalidCategory = {
        name: '',
        parentId: 1
      };

      const { error } = validateCategory(invalidCategory);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('name');
    });

    test('should reject name longer than 100 characters', () => {
      const invalidCategory = {
        name: 'a'.repeat(101),
        parentId: 1
      };

      const { error } = validateCategory(invalidCategory);
      expect(error).toBeDefined();
    });

    test('should allow null parentId', () => {
      const validCategory = {
        name: 'Science',
        parentId: null
      };

      const { error } = validateCategory(validCategory);
      expect(error).toBeUndefined();
    });
  });

  describe('Quiz Validation', () => {
    test('should validate valid quiz data', () => {
      const validQuiz = {
        title: 'Math Quiz',
        description: 'Test your math skills',
        categoryId: 1,
        difficulty: 'MEDIUM',
        timeLimit: 300
      };

      const { error } = validateQuiz(validQuiz);
      expect(error).toBeUndefined();
    });

    test('should reject empty title', () => {
      const invalidQuiz = {
        title: '',
        categoryId: 1
      };

      const { error } = validateQuiz(invalidQuiz);
      expect(error).toBeDefined();
    });

    test('should reject invalid difficulty', () => {
      const invalidQuiz = {
        title: 'Quiz',
        categoryId: 1,
        difficulty: 'INVALID'
      };

      const { error } = validateQuiz(invalidQuiz);
      expect(error).toBeDefined();
    });

    test('should reject negative time limit', () => {
      const invalidQuiz = {
        title: 'Quiz',
        categoryId: 1,
        timeLimit: -100
      };

      const { error } = validateQuiz(invalidQuiz);
      expect(error).toBeDefined();
    });
  });

  describe('Question Validation', () => {
    test('should validate valid question data', () => {
      const validQuestion = {
        quizId: 1,
        questionText: 'What is 2 + 2?',
        options: [
          { optionText: '3', isCorrect: false },
          { optionText: '4', isCorrect: true },
          { optionText: '5', isCorrect: false }
        ]
      };

      const { error } = validateQuestion(validQuestion);
      expect(error).toBeUndefined();
    });

    test('should reject question with less than 2 options', () => {
      const invalidQuestion = {
        quizId: 1,
        questionText: 'Question?',
        options: [
          { optionText: 'Only option', isCorrect: true }
        ]
      };

      const { error } = validateQuestion(invalidQuestion);
      expect(error).toBeDefined();
    });

    test('should reject question with more than 4 options', () => {
      const invalidQuestion = {
        quizId: 1,
        questionText: 'Question?',
        options: [
          { optionText: 'Option 1', isCorrect: false },
          { optionText: 'Option 2', isCorrect: false },
          { optionText: 'Option 3', isCorrect: false },
          { optionText: 'Option 4', isCorrect: false },
          { optionText: 'Option 5', isCorrect: true }
        ]
      };

      const { error } = validateQuestion(invalidQuestion);
      expect(error).toBeDefined();
    });

    test('should reject question with no correct answers', () => {
      const invalidQuestion = {
        quizId: 1,
        questionText: 'Question?',
        options: [
          { optionText: 'Wrong 1', isCorrect: false },
          { optionText: 'Wrong 2', isCorrect: false }
        ]
      };

      const { error } = validateQuestion(invalidQuestion);
      expect(error).toBeDefined();
    });

    test('should accept question with multiple correct answers', () => {
      const validQuestion = {
        quizId: 1,
        questionText: 'Which are correct?',
        options: [
          { optionText: 'Correct 1', isCorrect: true },
          { optionText: 'Correct 2', isCorrect: true },
          { optionText: 'Wrong', isCorrect: false }
        ]
      };

      const { error } = validateQuestion(validQuestion);
      expect(error).toBeUndefined();
    });
  });
});
