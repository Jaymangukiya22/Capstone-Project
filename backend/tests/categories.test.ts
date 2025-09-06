import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import categoryRoutes from '../src/routes/categoryRoutes';
import { basicAuth } from '../src/middleware/auth';
import { errorHandler } from '../src/middleware/errorHandler';

const prisma = new PrismaClient();

const createCategoryTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/categories', basicAuth, categoryRoutes);
  app.use(errorHandler);
  return app;
};

describe('Categories API', () => {
  const app = createCategoryTestApp();
  const validAuth = Buffer.from('aryan:admin').toString('base64');
  let createdCategoryId: number;

  beforeEach(async () => {
    // Clean up categories before each test
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.category.deleteMany();
  });

  describe('POST /api/categories', () => {
    test('should create a new category', async () => {
      const categoryData = {
        name: 'Science'
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        name: 'Science',
        parentId: null
      });
      expect(response.body.data.id).toBeDefined();
      createdCategoryId = response.body.data.id;
    });

    test('should create a subcategory', async () => {
      // First create parent category
      const parent = await prisma.category.create({
        data: { name: 'Science' }
      });

      const subcategoryData = {
        name: 'Physics',
        parentId: parent.id
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .send(subcategoryData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        name: 'Physics',
        parentId: parent.id
      });
    });

    test('should reject invalid category data', async () => {
      const invalidData = {
        name: '' // Empty name
      };

      await request(app)
        .post('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .send(invalidData)
        .expect(400);
    });

    test('should reject unauthorized requests', async () => {
      const categoryData = { name: 'Science' };

      await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(401);
    });
  });

  describe('GET /api/categories', () => {
    beforeEach(async () => {
      // Create test categories
      const parent = await prisma.category.create({
        data: { name: 'Science' }
      });
      
      await prisma.category.create({
        data: { name: 'Physics', parentId: parent.id }
      });
      
      await prisma.category.create({
        data: { name: 'Mathematics' }
      });
    });

    test('should get all categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.data.some((cat: any) => cat.name === 'Science')).toBe(true);
      expect(response.body.data.some((cat: any) => cat.name === 'Physics')).toBe(true);
      expect(response.body.data.some((cat: any) => cat.name === 'Mathematics')).toBe(true);
    });

    test('should include parent-child relationships', async () => {
      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      const physics = response.body.data.find((cat: any) => cat.name === 'Physics');
      expect(physics.parentId).toBeDefined();
      expect(physics.parent).toBeDefined();
      expect(physics.parent.name).toBe('Science');
    });
  });

  describe('GET /api/categories/:id', () => {
    test('should get category by id', async () => {
      const category = await prisma.category.create({
        data: { name: 'Science' }
      });

      const response = await request(app)
        .get(`/api/categories/${category.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: category.id,
        name: 'Science'
      });
    });

    test('should return 404 for non-existent category', async () => {
      await request(app)
        .get('/api/categories/99999')
        .set('Authorization', `Basic ${validAuth}`)
        .expect(404);
    });
  });

  describe('PUT /api/categories/:id', () => {
    test('should update category', async () => {
      const category = await prisma.category.create({
        data: { name: 'Science' }
      });

      const updateData = { name: 'Natural Science' };

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe('Natural Science');
    });

    test('should reject invalid update data', async () => {
      const category = await prisma.category.create({
        data: { name: 'Science' }
      });

      const invalidData = { name: '' };

      await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    test('should delete category', async () => {
      const category = await prisma.category.create({
        data: { name: 'Science' }
      });

      await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      // Verify deletion
      const deletedCategory = await prisma.category.findUnique({
        where: { id: category.id }
      });
      expect(deletedCategory).toBeNull();
    });

    test('should cascade delete subcategories', async () => {
      const parent = await prisma.category.create({
        data: { name: 'Science' }
      });
      
      const child = await prisma.category.create({
        data: { name: 'Physics', parentId: parent.id }
      });

      await request(app)
        .delete(`/api/categories/${parent.id}`)
        .set('Authorization', `Basic ${validAuth}`)
        .expect(200);

      // Verify both parent and child are deleted
      const deletedParent = await prisma.category.findUnique({
        where: { id: parent.id }
      });
      const deletedChild = await prisma.category.findUnique({
        where: { id: child.id }
      });
      
      expect(deletedParent).toBeNull();
      expect(deletedChild).toBeNull();
    });
  });
});
