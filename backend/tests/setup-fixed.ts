import { Sequelize } from 'sequelize-typescript';
import bcrypt from 'bcryptjs';
import { Category } from '../src/models/Category';
import { Quiz } from '../src/models/Quiz';
import { QuizQuestion } from '../src/models/QuizQuestion';
import { QuestionBankOption } from '../src/models/QuestionBankOption';
import { QuestionBankItem } from '../src/models/QuestionBankItem';
import { User } from '../src/models/User';
import { QuizAttempt } from '../src/models/QuizAttempt';
import { QuizAttemptAnswer } from '../src/models/QuizAttemptAnswer';
import { Match } from '../src/models/Match';
import { MatchPlayer } from '../src/models/MatchPlayer';
import dotenv from 'dotenv';

dotenv.config();

// Test database configuration
export const testSequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'quizup_test',
  username: process.env.DB_USER || 'quizup_user',
  password: process.env.DB_PASSWORD || 'quizup_password',
  logging: false, // Disable logging during tests
  models: [
    Category,
    Quiz,
    QuizQuestion,
    QuestionBankOption,
    QuestionBankItem,
    User,
    QuizAttempt,
    QuizAttemptAnswer,
    Match,
    MatchPlayer
  ],
});

// Global test setup
beforeAll(async () => {
  try {
    // Test database connection
    await testSequelize.authenticate();
    console.log('✅ Test database connection established');
    
    // Sync database schema
    await testSequelize.sync({ force: true });
    console.log('✅ Test database schema synchronized');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clear all tables in reverse order to handle foreign key constraints
    // Type-safe cleanup function
    const cleanupModels = async () => {
      const cleanupOperations = [
        () => QuizAttemptAnswer.destroy({ where: {}, force: true }),
        () => MatchPlayer.destroy({ where: {}, force: true }),
        () => Match.destroy({ where: {}, force: true }),
        () => QuizAttempt.destroy({ where: {}, force: true }),
        () => QuestionBankOption.destroy({ where: {}, force: true }),
        () => QuestionBankItem.destroy({ where: {}, force: true }),
        () => QuizQuestion.destroy({ where: {}, force: true }),
        () => Quiz.destroy({ where: {}, force: true }),
        () => Category.destroy({ where: {}, force: true }),
        () => User.destroy({ where: {}, force: true })
      ];

      for (const cleanup of cleanupOperations) {
        await cleanup();
      }
    };

    await cleanupModels();
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// Global test teardown
afterAll(async () => {
  try {
    await testSequelize.close();
    console.log('✅ Test database connection closed');
  } catch (error) {
    console.error('❌ Test database teardown failed:', error);
  }
});

// Test utilities with fixed syntax
export function createTestUser(overrides: any) {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate real bcrypt hash for password "1234567890"
      const passwordHash = await bcrypt.hash('1234567890', 10);
      
      const defaults = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash,
        role: 'STUDENT',
        isActive: true
      };
      
      const user = await User.create({
        ...defaults,
        ...(overrides || {})
      });
      
      resolve(user);
    } catch (error) {
      reject(error);
    }
  });
}

export function createTestCategory(overrides: any) {
  return new Promise(async (resolve, reject) => {
    try {
      const defaults = {
        name: 'Test Category',
        description: 'Test category description',
        isActive: true,
        createdById: 1
      };
      
      const category = await Category.create({
        ...defaults,
        ...(overrides || {})
      });
      
      resolve(category);
    } catch (error) {
      reject(error);
    }
  });
}

export function createTestQuiz(categoryId: number, overrides: any) {
  return new Promise(async (resolve, reject) => {
    try {
      const defaults = {
        title: 'Test Quiz',
        description: 'Test quiz description',
        difficulty: 'MEDIUM',
        timeLimit: 30,
        categoryId,
        createdById: 1,
        isActive: true
      };
      
      const quiz = await Quiz.create({
        ...defaults,
        ...(overrides || {})
      });
      
      resolve(quiz);
    } catch (error) {
      reject(error);
    }
  });
}

export function createTestQuestion(quizId: number, overrides: any) {
  return new Promise(async (resolve, reject) => {
    try {
      const defaults = {
        questionText: 'Test question?',
        difficulty: 'MEDIUM',
        quizId,
        createdById: 1
      };
      
      const question = await QuizQuestion.create({
        ...defaults,
        ...(overrides || {})
      });
      
      resolve(question);
    } catch (error) {
      reject(error);
    }
  });
}

export function createTestQuestionBankQuestion(overrides: any) {
  return new Promise(async (resolve, reject) => {
    try {
      const defaults = {
        questionText: 'Test bank question?',
        difficulty: 'MEDIUM',
        categoryId: null, // Global question
        createdById: 1
      };
      
      const question = await QuestionBankItem.create({
        ...defaults,
        ...(overrides || {})
      });
      
      resolve(question);
    } catch (error) {
      reject(error);
    }
  });
}
