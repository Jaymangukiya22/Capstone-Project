import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import quizRoutes from '../src/routes/quizRoutes';
import { basicAuth } from '../src/middleware/auth';
import { errorHandler } from '../src/middleware/errorHandler';

const prisma = new PrismaClient();

const createQuizTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/quizzes', basicAuth, quizRoutes);
  app.use(errorHandler);
  return app;
};

describe('Quizzes API', () => {
  const app = createQuizTestApp();
  const validAuth = Buffer.from('aryan:admin').toString('base64');
  let testCategoryId: number;

  beforeEach(async () => {
    // Clean up and create test data
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.category.deleteMany();

    const category = await prisma.category.create({
      data: { name: 'Test Category' }
    });
    testCategoryId = category.id;
  });

  describe('POST /api/quizzes', () => {
    test('should create a new quiz', async () => {
      const quizData = {
        title: 'Basic Math Quiz',
        description: 'Test your basic math skills',
        categoryId: testCategoryId,
        difficulty: 'EASY',
        timeLimit: 300
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Basic ${validAuth}`)
        .send(quizData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        title: 'Basic Math Quiz',
        description: 'Test your basic math skills',
        categoryId: testCategoryId,
        difficulty: 'EASY',
        timeLimit: 300
      });
      expect(response.body.data.id).toBeDefined();
    });

    test('should create quiz without optional fields', async () => {
      const quizData = {
        title: 'Simple Quiz',
        categoryId: testCategoryId
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Basic ${validAuth}`)
        .send(quizData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        title: 'Simple Quiz',
        categoryId: testCategoryId,
        difficulty: 'MEDIUM', // Default value
        description: null,
        timeLimit: null
      });
    });

    test('should reject invalid quiz data', async () => {
      const invalidData = {
        title: '', // Empty title
        categoryId: testCategoryId
      };

      await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Basic ${validAuth}`)
        .send(invalidData)
        .expect(400);
    });

    test('should reject quiz with non-existent category', async () => {
      const quizData = {
        title: 'Test Quiz',
        categoryId: 99999 // Non-existent category
      };

      await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Basic ${validAuth}`)
        .send(quizData)
        .expect(400);
    });
  });

  describe('GET /api/quizzes', () => {
    beforeEach(async () => {
      // Create test quizzes
      await prisma.quiz.createMany({
        data: [
          {
            title: 'Math Quiz',
            categoryId: testCategoryId,
            difficulty: 'EASY'
          },
          {
            title: 'Science Quiz',
            categoryId: testCategoryId,
            difficulty: 'HARD'
          }
        ]
      });
    });

    test('should get all quizzes', async () => {
      const response = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.some((quiz: any) => quiz.title === 'Math Quiz')).toBe(true);
      expect(response.body.data.some((quiz: any) => quiz.title === 'Science Quiz')).toBe(true);
    });

    test('should include category information', async () => {
      const response = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data[0].category).toBeDefined();
      expect(response.body.data[0].category.name).toBe('Test Category');
    });

    test('should filter by category', async () => {
      const response = await request(app)
        .get(`/api/quizzes?categoryId=${testCategoryId}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((quiz: any) => {
        expect(quiz.categoryId).toBe(testCategoryId);
      });
    });

    test('should filter by difficulty', async () => {
      const response = await request(app)
        .get('/api/quizzes?difficulty=EASY')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].difficulty).toBe('EASY');
    });
  });

  describe('GET /api/quizzes/:id', () => {
    test('should get quiz by id with questions', async () => {
      const quiz = await prisma.quiz.create({
        data: {
          title: 'Test Quiz',
          categoryId: testCategoryId
        }
      });

      // Add a question with options
      const question = await prisma.question.create({
        data: {
          quizId: quiz.id,
          questionText: 'What is 2 + 2?'
        }
      });

      await prisma.option.createMany({
        data: [
          { questionId: question.id, optionText: '3', isCorrect: false },
          { questionId: question.id, optionText: '4', isCorrect: true },
          { questionId: question.id, optionText: '5', isCorrect: false }
        ]
      });

      const response = await request(app)
        .get(`/api/quizzes/${quiz.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: quiz.id,
        title: 'Test Quiz'
      });
      expect(response.body.data.questions).toHaveLength(1);
      expect(response.body.data.questions[0].options).toHaveLength(3);
    });

    test('should return 404 for non-existent quiz', async () => {
      await request(app)
        .get('/api/quizzes/99999')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(404);
    });
  });

  describe('PUT /api/quizzes/:id', () => {
    test('should update quiz', async () => {
      const quiz = await prisma.quiz.create({
        data: {
          title: 'Original Title',
          categoryId: testCategoryId
        }
      });

      const updateData = {
        title: 'Updated Title',
        difficulty: 'HARD'
      };

      const response = await request(app)
        .put(`/api/quizzes/${quiz.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.difficulty).toBe('HARD');
    });
  });

  describe('DELETE /api/quizzes/:id', () => {
    test('should delete quiz and cascade to questions/options', async () => {
      const quiz = await prisma.quiz.create({
        data: {
          title: 'Quiz to Delete',
          categoryId: testCategoryId
        }
      });

      const question = await prisma.question.create({
        data: {
          quizId: quiz.id,
          questionText: 'Test question'
        }
      });

      await prisma.option.create({
        data: {
          questionId: question.id,
          optionText: 'Test option',
          isCorrect: true
        }
      });

      await request(app)
        .delete(`/api/quizzes/${quiz.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      // Verify cascade deletion
      const deletedQuiz = await prisma.quiz.findUnique({ where: { id: quiz.id } });
      const deletedQuestion = await prisma.question.findUnique({ where: { id: question.id } });
      
      expect(deletedQuiz).toBeNull();
      expect(deletedQuestion).toBeNull();
    });
  });

  describe('GET /api/quizzes/:id/stats', () => {
    test('should get quiz statistics', async () => {
      const quiz = await prisma.quiz.create({
        data: {
          title: 'Stats Quiz',
          categoryId: testCategoryId
        }
      });

      // Add questions
      await prisma.question.createMany({
        data: [
          { quizId: quiz.id, questionText: 'Question 1' },
          { quizId: quiz.id, questionText: 'Question 2' }
        ]
      });

      const response = await request(app)
        .get(`/api/quizzes/${quiz.id}/stats`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: quiz.id,
        title: 'Stats Quiz',
        totalQuestions: 2
      });
      expect(response.body.data.category).toBeDefined();
    });
  });
});
