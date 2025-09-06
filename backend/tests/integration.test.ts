import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import categoryRoutes from '../src/routes/categoryRoutes';
import quizRoutes from '../src/routes/quizRoutes';
import questionRoutes from '../src/routes/questionRoutes';
import { basicAuth } from '../src/middleware/auth';
import { errorHandler } from '../src/middleware/errorHandler';

const prisma = new PrismaClient();

const createIntegrationTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Quiz App Backend',
      version: '1.0.0'
    });
  });
  
  // API routes
  app.use('/api/categories', basicAuth, categoryRoutes);
  app.use('/api/quizzes', basicAuth, quizRoutes);
  app.use('/api/questions', basicAuth, questionRoutes);
  
  app.use(errorHandler);
  return app;
};

describe('Integration Tests', () => {
  const app = createIntegrationTestApp();
  const validAuth = Buffer.from('aryan:admin').toString('base64');

  beforeEach(async () => {
    // Clean database before each test
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.category.deleteMany();
  });

  describe('Complete Quiz Creation Flow', () => {
    test('should create category, quiz, and questions in sequence', async () => {
      // Step 1: Create category
      const categoryResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .send({ name: 'Mathematics' })
        .expect(201);

      const categoryId = categoryResponse.body.data.id;
      expect(categoryResponse.body.data.name).toBe('Mathematics');

      // Step 2: Create quiz
      const quizResponse = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Basic ${validAuth}`)
        .send({
          title: 'Basic Algebra',
          description: 'Test your algebra skills',
          categoryId: categoryId,
          difficulty: 'MEDIUM',
          timeLimit: 600
        })
        .expect(201);

      const quizId = quizResponse.body.data.id;
      expect(quizResponse.body.data.title).toBe('Basic Algebra');

      // Step 3: Create questions
      const question1Response = await request(app)
        .post('/api/questions')
        .set('Authorization', `Basic ${validAuth}`)
        .send({
          quizId: quizId,
          questionText: 'What is x if 2x + 4 = 10?',
          options: [
            { optionText: '2', isCorrect: false },
            { optionText: '3', isCorrect: true },
            { optionText: '4', isCorrect: false },
            { optionText: '5', isCorrect: false }
          ]
        })
        .expect(201);

      const question2Response = await request(app)
        .post('/api/questions')
        .set('Authorization', `Basic ${validAuth}`)
        .send({
          quizId: quizId,
          questionText: 'Which are linear equations?',
          options: [
            { optionText: 'y = 2x + 1', isCorrect: true },
            { optionText: 'y = x²', isCorrect: false },
            { optionText: '3x - y = 5', isCorrect: true }
          ]
        })
        .expect(201);

      // Step 4: Verify complete quiz structure
      const completeQuizResponse = await request(app)
        .get(`/api/quizzes/${quizId}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(question1Response.body.data.questionText).toBe('What is x if 2x + 4 = 10?');

      expect(question2Response.body.data.questionText).toBe('Which are linear equations?');
      
      // Verify question details
      const questions = completeQuizResponse.body.questions;
      expect(questions[0].options).toHaveLength(4);
      expect(questions[1].options).toHaveLength(3);
      
      // Verify correct answers
      const q1CorrectOptions = questions[0].options.filter((opt: any) => opt.isCorrect);
      const q2CorrectOptions = questions[1].options.filter((opt: any) => opt.isCorrect);
      expect(q1CorrectOptions).toHaveLength(1);
      expect(q2CorrectOptions).toHaveLength(2);
    });
  });

  describe('Hierarchical Categories', () => {
    test('should create and manage category hierarchy', async () => {
      // Create parent category
      const parentResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .send({ name: 'Science' })
        .expect(201);

      const parentId = parentResponse.body.id;

      // Create subcategories
      const physicsResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .send({ name: 'Physics', parentId: parentId })
        .expect(201);

      const chemistryResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .send({ name: 'Chemistry', parentId: parentId })
        .expect(201);

      // Create quizzes in subcategories
      await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Basic ${validAuth}`)
        .send({
          title: 'Mechanics Quiz',
          categoryId: physicsResponse.body.id
        })
        .expect(201);

      await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Basic ${validAuth}`)
        .send({
          title: 'Organic Chemistry Quiz',
          categoryId: chemistryResponse.body.id
        })
        .expect(201);

      // Verify hierarchy
      const categoriesResponse = await request(app)
        .get('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(categoriesResponse.body).toHaveLength(3);
      
      const subcategories = categoriesResponse.body.filter((cat: any) => cat.parentId === parentId);
      expect(subcategories).toHaveLength(2);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity on deletion', async () => {
      // Create test data
      const category = await prisma.category.create({
        data: { name: 'Test Category' }
      });

      const quiz = await prisma.quiz.create({
        data: {
          title: 'Test Quiz',
          categoryId: category.id
        }
      });

      const question = await prisma.question.create({
        data: {
          quizId: quiz.id,
          questionText: 'Test Question'
        }
      });

      await prisma.option.create({
        data: {
          questionId: question.id,
          optionText: 'Test Option',
          isCorrect: true
        }
      });

      // Delete category (should cascade)
      await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      // Verify cascade deletion
      const remainingQuizzes = await prisma.quiz.findMany();
      const remainingQuestions = await prisma.question.findMany();
      const remainingOptions = await prisma.option.findMany();

      expect(remainingQuizzes).toHaveLength(0);
      expect(remainingQuestions).toHaveLength(0);
      expect(remainingOptions).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test basic error responses
      
      await request(app)
        .get('/api/categories/99999')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(404);

      await request(app)
        .post('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .send({ name: '' })
        .expect(400);
    });

    test('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Performance', () => {
    test('should handle multiple concurrent requests', async () => {
      const category = await prisma.category.create({
        data: { name: 'Performance Test' }
      });

      // Create multiple quizzes concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/quizzes')
          .set('Authorization', `Basic ${validAuth}`)
          .send({
            title: `Quiz ${i + 1}`,
            categoryId: category.id
          })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all quizzes were created
      const quizzes = await prisma.quiz.findMany();
      expect(quizzes).toHaveLength(10);
    });
  });
});
