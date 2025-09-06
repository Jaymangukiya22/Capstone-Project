import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import questionRoutes from '../src/routes/questionRoutes';
import { basicAuth } from '../src/middleware/auth';
import { errorHandler } from '../src/middleware/errorHandler';

const prisma = new PrismaClient();

const createQuestionTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/questions', basicAuth, questionRoutes);
  app.use(errorHandler);
  return app;
};

describe('Questions API', () => {
  const app = createQuestionTestApp();
  const validAuth = Buffer.from('aryan:admin').toString('base64');
  let testQuizId: number;

  beforeEach(async () => {
    // Clean up and create test data
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.category.deleteMany();

    const category = await prisma.category.create({
      data: { name: 'Test Category' }
    });

    const quiz = await prisma.quiz.create({
      data: {
        title: 'Test Quiz',
        categoryId: category.id
      }
    });
    testQuizId = quiz.id;
  });

  describe('POST /api/questions', () => {
    test('should create a question with options', async () => {
      const questionData = {
        quizId: testQuizId,
        questionText: 'What is the capital of France?',
        options: [
          { optionText: 'London', isCorrect: false },
          { optionText: 'Paris', isCorrect: true },
          { optionText: 'Berlin', isCorrect: false },
          { optionText: 'Madrid', isCorrect: false }
        ]
      };

      const response = await request(app)
        .post('/api/questions')
        .set('Authorization', `Basic ${validAuth}`)
        .send(questionData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        quizId: testQuizId,
        questionText: 'What is the capital of France?'
      });
      expect(response.body.data.options).toHaveLength(4);
      expect(response.body.data.options.some((opt: any) => opt.optionText === 'Paris' && opt.isCorrect)).toBe(true);
    });

    test('should create question with multiple correct answers', async () => {
      const questionData = {
        quizId: testQuizId,
        questionText: 'Which are programming languages?',
        options: [
          { optionText: 'JavaScript', isCorrect: true },
          { optionText: 'Python', isCorrect: true },
          { optionText: 'HTML', isCorrect: false },
          { optionText: 'TypeScript', isCorrect: true }
        ]
      };

      const response = await request(app)
        .post('/api/questions')
        .set('Authorization', `Basic ${validAuth}`)
        .send(questionData)
        .expect(201);

      const correctOptions = response.body.data.options.filter((opt: any) => opt.isCorrect);
      expect(correctOptions).toHaveLength(3);
    });

    test('should reject question with less than 2 options', async () => {
      const questionData = {
        quizId: testQuizId,
        questionText: 'Invalid question?',
        options: [
          { optionText: 'Only option', isCorrect: true }
        ]
      };

      await request(app)
        .post('/api/questions')
        .set('Authorization', `Basic ${validAuth}`)
        .send(questionData)
        .expect(400);
    });

    test('should reject question with more than 4 options', async () => {
      const questionData = {
        quizId: testQuizId,
        questionText: 'Too many options?',
        options: [
          { optionText: 'Option 1', isCorrect: false },
          { optionText: 'Option 2', isCorrect: false },
          { optionText: 'Option 3', isCorrect: false },
          { optionText: 'Option 4', isCorrect: false },
          { optionText: 'Option 5', isCorrect: true }
        ]
      };

      await request(app)
        .post('/api/questions')
        .set('Authorization', `Basic ${validAuth}`)
        .send(questionData)
        .expect(400);
    });

    test('should reject question with no correct answers', async () => {
      const questionData = {
        quizId: testQuizId,
        questionText: 'No correct answer?',
        options: [
          { optionText: 'Wrong 1', isCorrect: false },
          { optionText: 'Wrong 2', isCorrect: false }
        ]
      };

      await request(app)
        .post('/api/questions')
        .set('Authorization', `Basic ${validAuth}`)
        .send(questionData)
        .expect(400);
    });

    test('should reject question for non-existent quiz', async () => {
      const questionData = {
        quizId: 99999,
        questionText: 'Test question?',
        options: [
          { optionText: 'Yes', isCorrect: true },
          { optionText: 'No', isCorrect: false }
        ]
      };

      await request(app)
        .post('/api/questions')
        .set('Authorization', `Basic ${validAuth}`)
        .send(questionData)
        .expect(400);
    });
  });

  describe('GET /api/questions', () => {
    beforeEach(async () => {
      // Create test questions
      const question1 = await prisma.question.create({
        data: {
          quizId: testQuizId,
          questionText: 'Question 1'
        }
      });

      const question2 = await prisma.question.create({
        data: {
          quizId: testQuizId,
          questionText: 'Question 2'
        }
      });

      // Add options
      await prisma.option.createMany({
        data: [
          { questionId: question1.id, optionText: 'Option 1A', isCorrect: true },
          { questionId: question1.id, optionText: 'Option 1B', isCorrect: false },
          { questionId: question2.id, optionText: 'Option 2A', isCorrect: false },
          { questionId: question2.id, optionText: 'Option 2B', isCorrect: true }
        ]
      });
    });

    test('should get all questions', async () => {
      const response = await request(app)
        .get('/api/questions')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].options).toBeDefined();
      expect(response.body.data[0].quiz).toBeDefined();
    });

    test('should filter questions by quiz', async () => {
      const response = await request(app)
        .get(`/api/questions?quizId=${testQuizId}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((question: any) => {
        expect(question.quizId).toBe(testQuizId);
      });
    });
  });

  describe('GET /api/questions/:id', () => {
    test('should get question by id', async () => {
      const question = await prisma.question.create({
        data: {
          quizId: testQuizId,
          questionText: 'Test Question'
        }
      });

      await prisma.option.createMany({
        data: [
          { questionId: question.id, optionText: 'Option A', isCorrect: true },
          { questionId: question.id, optionText: 'Option B', isCorrect: false }
        ]
      });

      const response = await request(app)
        .get(`/api/questions/${question.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: question.id,
        questionText: 'Test Question'
      });
      expect(response.body.data.options).toHaveLength(2);
    });

    test('should return 404 for non-existent question', async () => {
      await request(app)
        .get('/api/questions/99999')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(404);
    });
  });

  describe('PUT /api/questions/:id', () => {
    test('should update question and options', async () => {
      const question = await prisma.question.create({
        data: {
          quizId: testQuizId,
          questionText: 'Original Question'
        }
      });

      await prisma.option.createMany({
        data: [
          { questionId: question.id, optionText: 'Old Option 1', isCorrect: true },
          { questionId: question.id, optionText: 'Old Option 2', isCorrect: false }
        ]
      });

      const updateData = {
        questionText: 'Updated Question',
        options: [
          { optionText: 'New Option 1', isCorrect: false },
          { optionText: 'New Option 2', isCorrect: true },
          { optionText: 'New Option 3', isCorrect: false }
        ]
      };

      const response = await request(app)
        .put(`/api/questions/${question.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.questionText).toBe('Updated Question');
      expect(response.body.data.options).toHaveLength(3);
      expect(response.body.data.options.some((opt: any) => opt.optionText === 'New Option 2' && opt.isCorrect)).toBe(true);
    });
  });

  describe('DELETE /api/questions/:id', () => {
    test('should delete question and its options', async () => {
      const question = await prisma.question.create({
        data: {
          quizId: testQuizId,
          questionText: 'Question to Delete'
        }
      });

      const option = await prisma.option.create({
        data: {
          questionId: question.id,
          optionText: 'Option to Delete',
          isCorrect: true
        }
      });

      await request(app)
        .delete(`/api/questions/${question.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      // Verify deletion
      const deletedQuestion = await prisma.question.findUnique({ where: { id: question.id } });
      const deletedOption = await prisma.option.findUnique({ where: { id: option.id } });
      
      expect(deletedQuestion).toBeNull();
      expect(deletedOption).toBeNull();
    });
  });
});
