import request from 'supertest';
import express from 'express';
import quizRoutes from '../../src/routes/quizRoutes';
import { testSequelize, createTestUser, createTestCategory, createTestQuiz, createTestQuestion } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/quizzes', quizRoutes);

describe('Quiz Controller Integration Tests', () => {
  let testUser: any;
  let testCategory: any;

  beforeEach(async () => {
    testUser = await createTestUser();
    testCategory = await createTestCategory({ createdById: testUser.id });
  });

  describe('POST /api/quizzes', () => {
    it('should create a new quiz', async () => {
      const quizData = {
        title: 'JavaScript Basics',
        description: 'Basic JavaScript concepts',
        difficulty: 'EASY',
        timeLimit: 30,
        categoryId: testCategory.id,
        isActive: true
      };

      const response = await request(app)
        .post('/api/quizzes')
        .send(quizData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(quizData.title);
      expect(response.body.data.description).toBe(quizData.description);
      expect(response.body.data.difficulty).toBe(quizData.difficulty);
      expect(response.body.data.timeLimit).toBe(quizData.timeLimit);
      expect(response.body.data.categoryId).toBe(testCategory.id);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        // Missing required title field
        description: 'Invalid quiz',
        difficulty: 'EASY',
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/quizzes')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should return 400 for invalid difficulty', async () => {
      const invalidData = {
        title: 'Test Quiz',
        description: 'Test description',
        difficulty: 'INVALID',
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/quizzes')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent category', async () => {
      const quizData = {
        title: 'Test Quiz',
        description: 'Test description',
        difficulty: 'EASY',
        categoryId: 999
      };

      const response = await request(app)
        .post('/api/quizzes')
        .send(quizData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quizzes', () => {
    it('should return all quizzes with pagination', async () => {
      await createTestQuiz(testCategory.id, { title: 'Quiz 1', createdById: testUser.id });
      await createTestQuiz(testCategory.id, { title: 'Quiz 2', createdById: testUser.id });
      await createTestQuiz(testCategory.id, { title: 'Quiz 3', createdById: testUser.id });

      const response = await request(app)
        .get('/api/quizzes?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quizzes).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(3);
    });

    it('should filter quizzes by category', async () => {
      const anotherCategory = await createTestCategory({ 
        name: 'Another Category',
        createdById: testUser.id 
      });

      await createTestQuiz(testCategory.id, { title: 'Quiz 1', createdById: testUser.id });
      await createTestQuiz(testCategory.id, { title: 'Quiz 2', createdById: testUser.id });
      await createTestQuiz(anotherCategory.id, { title: 'Quiz 3', createdById: testUser.id });

      const response = await request(app)
        .get(`/api/quizzes?categoryId=${testCategory.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quizzes).toHaveLength(2);
      expect(response.body.data.quizzes.every((quiz: any) => quiz.categoryId === testCategory.id)).toBe(true);
    });

    it('should filter quizzes by difficulty', async () => {
      await createTestQuiz(testCategory.id, { 
        title: 'Easy Quiz', 
        difficulty: 'EASY',
        createdById: testUser.id 
      });
      
      await createTestQuiz(testCategory.id, { 
        title: 'Hard Quiz', 
        difficulty: 'HARD',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/quizzes?difficulty=EASY')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quizzes).toHaveLength(1);
      expect(response.body.data.quizzes[0].difficulty).toBe('EASY');
    });

    it('should include questions when requested', async () => {
      const quiz = await createTestQuiz(testCategory.id, { 
        title: 'Quiz with Questions',
        createdById: testUser.id 
      });

      await createTestQuestion(quiz.id, { 
        questionText: 'Question 1',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/quizzes?includeQuestions=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quizzes[0].questions).toBeDefined();
      expect(response.body.data.quizzes[0].questions).toHaveLength(1);
    });

    it('should search quizzes', async () => {
      await createTestQuiz(testCategory.id, { 
        title: 'JavaScript Fundamentals',
        createdById: testUser.id 
      });
      
      await createTestQuiz(testCategory.id, { 
        title: 'Python Basics',
        createdById: testUser.id 
      });
      
      await createTestQuiz(testCategory.id, { 
        title: 'Advanced JavaScript',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/quizzes?search=JavaScript')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quizzes).toHaveLength(2);
      expect(response.body.data.quizzes.every((quiz: any) => quiz.title.includes('JavaScript'))).toBe(true);
    });
  });

  describe('GET /api/quizzes/:id', () => {
    it('should return quiz by id', async () => {
      const quiz = await createTestQuiz(testCategory.id, { 
        title: 'Test Quiz',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get(`/api/quizzes/${quiz.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(quiz.id);
      expect(response.body.data.title).toBe(quiz.title);
    });

    it('should include questions when requested', async () => {
      const quiz = await createTestQuiz(testCategory.id, { 
        title: 'Test Quiz',
        createdById: testUser.id 
      });

      await createTestQuestion(quiz.id, { 
        questionText: 'Test Question',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get(`/api/quizzes/${quiz.id}?includeQuestions=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questions).toBeDefined();
      expect(response.body.data.questions).toHaveLength(1);
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await request(app)
        .get('/api/quizzes/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/quizzes/:id', () => {
    it('should update quiz', async () => {
      const quiz = await createTestQuiz(testCategory.id, { 
        title: 'Original Title',
        createdById: testUser.id 
      });

      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
        difficulty: 'HARD'
      };

      const response = await request(app)
        .put(`/api/quizzes/${quiz.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.difficulty).toBe(updateData.difficulty);
    });

    it('should return 404 for non-existent quiz', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put('/api/quizzes/999')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid update data', async () => {
      const quiz = await createTestQuiz(testCategory.id, { 
        title: 'Test Quiz',
        createdById: testUser.id 
      });

      const invalidData = {
        difficulty: 'INVALID'
      };

      const response = await request(app)
        .put(`/api/quizzes/${quiz.id}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/quizzes/:id', () => {
    it('should delete quiz', async () => {
      const quiz = await createTestQuiz(testCategory.id, { 
        title: 'Quiz to Delete',
        createdById: testUser.id 
      });

      const response = await request(app)
        .delete(`/api/quizzes/${quiz.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await request(app)
        .delete('/api/quizzes/999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quizzes/search', () => {
    it('should search quizzes', async () => {
      await createTestQuiz(testCategory.id, { 
        title: 'JavaScript Fundamentals',
        createdById: testUser.id 
      });
      
      await createTestQuiz(testCategory.id, { 
        title: 'Python Basics',
        createdById: testUser.id 
      });
      
      await createTestQuiz(testCategory.id, { 
        title: 'Advanced JavaScript',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/quizzes/search?q=JavaScript')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((quiz: any) => quiz.title.includes('JavaScript'))).toBe(true);
    });

    it('should return 400 for missing search query', async () => {
      const response = await request(app)
        .get('/api/quizzes/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('query');
    });
  });

  describe('GET /api/quizzes/:id/stats', () => {
    it('should return quiz statistics', async () => {
      const quiz = await createTestQuiz(testCategory.id, { 
        title: 'Test Quiz',
        createdById: testUser.id 
      });

      await createTestQuestion(quiz.id, { 
        questionText: 'Easy Question',
        difficulty: 'EASY',
        createdById: testUser.id 
      });
      
      await createTestQuestion(quiz.id, { 
        questionText: 'Hard Question',
        difficulty: 'HARD',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get(`/api/quizzes/${quiz.id}/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalQuestions).toBe(2);
      expect(response.body.data.difficultyBreakdown).toBeDefined();
      expect(response.body.data.difficultyBreakdown.EASY).toBe(1);
      expect(response.body.data.difficultyBreakdown.HARD).toBe(1);
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await request(app)
        .get('/api/quizzes/999/stats')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quizzes/:id/play', () => {
    it('should return quiz for gameplay', async () => {
      const quiz = await createTestQuiz(testCategory.id, { 
        title: 'Playable Quiz',
        createdById: testUser.id 
      });

      await createTestQuestion(quiz.id, { 
        questionText: 'Question 1',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get(`/api/quizzes/${quiz.id}/play`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(quiz.id);
      expect(response.body.data.questions).toBeDefined();
      expect(response.body.data.questions).toHaveLength(1);
    });

    it('should return 404 for inactive quiz', async () => {
      const quiz = await createTestQuiz(testCategory.id, { 
        title: 'Inactive Quiz',
        isActive: false,
        createdById: testUser.id 
      });

      const response = await request(app)
        .get(`/api/quizzes/${quiz.id}/play`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await request(app)
        .get('/api/quizzes/999/play')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
