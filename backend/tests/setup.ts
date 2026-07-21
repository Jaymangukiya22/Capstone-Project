import { Sequelize } from 'sequelize-typescript';
import bcrypt from 'bcrypt';
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
import { Client } from 'pg';

const ensure_test_database_exists = async () => {
  const db_name = process.env.DB_NAME || 'quizup_test';
  const admin_database = 'postgres';

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'quizup_user',
    password: process.env.DB_PASSWORD || 'quizup_password',
    database: admin_database,
  });

  await client.connect();
  try {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [db_name]
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${db_name}"`);
    }
  } finally {
    await client.end();
  }
};
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
    await ensure_test_database_exists();

    // Test database connection
    await testSequelize.authenticate();
    console.log('✅ Test database connection established');
    
    // Sync database (create tables)
    await testSequelize.sync({ force: true });
    console.log('✅ Test database synced');

    (global as any).__TEST_SEQUELIZE__ = testSequelize;
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

    delete (global as any).__TEST_SEQUELIZE__;
  } catch (error) {
    console.error('❌ Test database teardown failed:', error);
  }
});

// Test utilities - Properly typed async functions
export async function createTestUser(overrides: any = {}): Promise<User> {
  // Generate real bcrypt hash for password "1234567890"
  const passwordHash = await bcrypt.hash('1234567890', 10);
  
  const defaults = {
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash, // This is required by the model
    role: 'PLAYER', // Changed from STUDENT to PLAYER to match enum
    isActive: true,
    eloRating: 1200, // Default value from model
    totalMatches: 0,
    wins: 0,
    losses: 0
  };
  
  const user = await User.create({
    ...defaults,
    ...(overrides || {})
  });
  
  return user;
}

export async function createTestCategory(overrides: any = {}): Promise<Category> {
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
  
  return category;
}

export async function createTestQuiz(categoryId: number, overrides: any = {}): Promise<Quiz> {
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
  
  return quiz;
}

export async function createTestQuestion(quizId: number, overrides: any = {}): Promise<QuizQuestion> {
  const quiz = await Quiz.findByPk(quizId);
  if (!quiz) throw new Error('Quiz not found for test question creation');

  const createdById = overrides.createdById ?? (quiz as any).createdById ?? 1;
  const difficulty = overrides.difficulty ?? 'MEDIUM';
  const questionText = overrides.questionText ?? 'Test question?';

  const question = await QuestionBankItem.create({
    questionText,
    difficulty,
    categoryId: (quiz as any).categoryId,
    createdById,
    isActive: true,
  } as any);

  await QuestionBankOption.bulkCreate([
    { questionId: question.id, optionText: 'Option A', isCorrect: true },
    { questionId: question.id, optionText: 'Option B', isCorrect: false },
    { questionId: question.id, optionText: 'Option C', isCorrect: false },
    { questionId: question.id, optionText: 'Option D', isCorrect: false },
  ] as any);

  const existingCount = await QuizQuestion.count({ where: { quizId } });
  const orderIndex = overrides.orderIndex ?? existingCount + 1;

  return await QuizQuestion.create({
    quizId,
    questionId: question.id,
    orderIndex,
    points: overrides.points ?? 100,
    timeLimit: overrides.timeLimit,
  } as any);
}

export async function createTestQuestionBankQuestion(overrides: any = {}): Promise<QuestionBankItem> {
  const has_category_id = Object.prototype.hasOwnProperty.call(
    overrides,
    'categoryId'
  );
  let categoryId = overrides.categoryId;
  if (!has_category_id) {
    const existingCategory = await Category.findOne();
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const created = await Category.create({
        name: 'Test Category (Auto)',
        isActive: true,
      } as any);
      categoryId = created.id;
    }
  }

  const defaults = {
    questionText: 'Test bank question?',
    difficulty: 'MEDIUM',
    categoryId,
    createdById: 1,
    isActive: true,
  };

  const question = await QuestionBankItem.create({
    ...defaults,
    ...(overrides || {}),
    categoryId,
  } as any);

  return question;
}
