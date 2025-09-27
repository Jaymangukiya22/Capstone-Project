import Joi from 'joi';
import { 
  registerSchema,
  loginSchema,
  categorySchema,
  createQuizSchema,
  createQuestionSchema,
  createQuestionBankSchema
} from '../../../src/utils/validation';

describe('Validation Schemas', () => {
  describe('categorySchema', () => {
    it('should validate valid category data', () => {
      const validData = {
        name: 'Programming',
        description: 'Programming related quizzes',
        parentId: null,
        isActive: true
      };

      const { error } = categorySchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should require name field', () => {
      const invalidData = {
        description: 'Missing name'
      };

      const { error } = categorySchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('name');
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        description: 'Empty name'
      };

      const { error } = categorySchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('name');
    });

    it('should accept null parentId', () => {
      const validData = {
        name: 'Root Category',
        parentId: null
      };

      const { error } = categorySchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should accept positive integer parentId', () => {
      const validData = {
        name: 'Subcategory',
        parentId: 1
      };

      const { error } = categorySchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject negative parentId', () => {
      const invalidData = {
        name: 'Invalid Subcategory',
        parentId: -1
      };

      const { error } = categorySchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('parentId');
    });
  });

  describe('createQuizSchema', () => {
    it('should validate valid quiz data', () => {
      const validData = {
        title: 'JavaScript Basics',
        description: 'Basic JavaScript concepts',
        difficulty: 'EASY',
        timeLimit: 30,
        categoryId: 1
      };

      const { error } = createQuizSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should require title field', () => {
      const invalidData = {
        description: 'Missing title',
        difficulty: 'EASY',
        categoryId: 1
      };

      const { error } = createQuizSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('title');
    });

    it('should validate difficulty enum', () => {
      const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
      
      validDifficulties.forEach(difficulty => {
        const validData = {
          title: 'Test Quiz',
          difficulty,
          categoryId: 1
        };

        const { error } = createQuizSchema.validate(validData);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid difficulty', () => {
      const invalidData = {
        title: 'Test Quiz',
        difficulty: 'INVALID',
        categoryId: 1
      };

      const { error } = createQuizSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('difficulty');
    });

    it('should require positive categoryId', () => {
      const invalidData = {
        title: 'Test Quiz',
        difficulty: 'EASY',
        categoryId: -1
      };

      const { error } = createQuizSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('categoryId');
    });
  });

  describe('createQuestionSchema', () => {
    it('should validate valid question data', () => {
      const validData = {
        questionText: 'What is JavaScript?',
        quizId: 1,
        options: [
          { optionText: 'A programming language', isCorrect: true },
          { optionText: 'A database', isCorrect: false }
        ]
      };

      const { error } = createQuestionSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should require questionText', () => {
      const invalidData = {
        quizId: 1,
        options: []
      };

      const { error } = createQuestionSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('questionText');
    });

    it('should require at least 2 options', () => {
      const invalidData = {
        questionText: 'Test question?',
        quizId: 1,
        options: [
          { optionText: 'Only option', isCorrect: true }
        ]
      };

      const { error } = createQuestionSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('options');
    });

    it('should reject more than 4 options', () => {
      const invalidData = {
        questionText: 'Test question?',
        quizId: 1,
        options: [
          { optionText: 'Option 1', isCorrect: true },
          { optionText: 'Option 2', isCorrect: false },
          { optionText: 'Option 3', isCorrect: false },
          { optionText: 'Option 4', isCorrect: false },
          { optionText: 'Option 5', isCorrect: false }
        ]
      };

      const { error } = createQuestionSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('options');
    });
  });

  describe('createQuestionBankSchema', () => {
    it('should validate valid question bank data', () => {
      const validData = {
        questionText: 'What is JavaScript?',
        difficulty: 'MEDIUM',
        categoryId: 1,
        options: [
          { optionText: 'A programming language', isCorrect: true },
          { optionText: 'A database', isCorrect: false }
        ]
      };

      const { error } = createQuestionBankSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should allow null categoryId for global questions', () => {
      const validData = {
        questionText: 'Global question?',
        difficulty: 'MEDIUM',
        categoryId: null,
        options: [
          { optionText: 'Option A', isCorrect: true },
          { optionText: 'Option B', isCorrect: false }
        ]
      };

      const { error } = createQuestionBankSchema.validate(validData);
      expect(error).toBeUndefined();
    });
  });

  describe('registerSchema', () => {
    it('should validate valid user registration data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'securepassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN'
      };

      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should require username', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('username');
    });

    it('should validate email format', () => {
      const invalidData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('email');
    });

    it('should validate password length', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123' // Too short
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('password');
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const { error } = loginSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should require email', () => {
      const invalidData = {
        password: 'password123'
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('email');
    });

    it('should require password', () => {
      const invalidData = {
        email: 'test@example.com'
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('password');
    });
  });
});
