import request from 'supertest';
import express from 'express';
import categoryRoutes from '../../src/routes/categoryRoutes';
import { testSequelize, createTestUser, createTestCategory } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);

describe('Category Controller Integration Tests', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'Programming',
        description: 'Programming related quizzes',
        parentId: null,
        isActive: true
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(categoryData.name);
      expect(response.body.data.description).toBe(categoryData.description);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should create a subcategory', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const subcategoryData = {
        name: 'JavaScript',
        description: 'JavaScript programming',
        parentId: parentCategory.id,
        isActive: true
      };

      const response = await request(app)
        .post('/api/categories')
        .send(subcategoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(subcategoryData.name);
      expect(response.body.data.parentId).toBe(parentCategory.id);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        // Missing required name field
        description: 'Invalid category'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should return 409 for duplicate category name', async () => {
      await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const duplicateData = {
        name: 'Programming',
        description: 'Duplicate category',
        isActive: true
      };

      const response = await request(app)
        .post('/api/categories')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/categories', () => {
    it('should return all categories with pagination', async () => {
      await createTestCategory({ name: 'Category 1', createdById: testUser.id });
      await createTestCategory({ name: 'Category 2', createdById: testUser.id });
      await createTestCategory({ name: 'Category 3', createdById: testUser.id });

      const response = await request(app)
        .get('/api/categories?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(3);
    });

    it('should return categories with hierarchy', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'JavaScript',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/categories?hierarchy=true&includeChildren=true&depth=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(1);
      expect(response.body.data.categories[0].children).toHaveLength(1);
    });

    it('should filter by parentId', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'JavaScript',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'Python',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      const response = await request(app)
        .get(`/api/categories?parentId=${parentCategory.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(2);
      expect(response.body.data.categories.every((cat: any) => cat.parentId === parentCategory.id)).toBe(true);
    });

    it('should search categories', async () => {
      await createTestCategory({ 
        name: 'JavaScript Programming',
        createdById: testUser.id 
      });
      
      await createTestCategory({ 
        name: 'Python Programming',
        createdById: testUser.id 
      });
      
      await createTestCategory({ 
        name: 'Database Design',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/categories?search=Programming')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(2);
      expect(response.body.data.categories.every((cat: any) => cat.name.includes('Programming'))).toBe(true);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return category by id', async () => {
      const category = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get(`/api/categories/${category.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(category.id);
      expect(response.body.data.name).toBe(category.name);
    });

    it('should return category with children', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'JavaScript',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      const response = await request(app)
        .get(`/api/categories/${parentCategory.id}?includeChildren=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.children).toHaveLength(1);
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .get('/api/categories/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update category', async () => {
      const category = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const updateData = {
        name: 'Advanced Programming',
        description: 'Advanced programming concepts'
      };

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent category', async () => {
      const updateData = {
        name: 'Updated Category'
      };

      const response = await request(app)
        .put('/api/categories/999')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid update data', async () => {
      const category = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const invalidData = {
        name: '' // Empty name should be invalid
      };

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete category', async () => {
      const category = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const response = await request(app)
        .delete(`/api/categories/${category.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .delete('/api/categories/999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when trying to delete category with children', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'JavaScript',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      const response = await request(app)
        .delete(`/api/categories/${parentCategory.id}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('subcategories');
    });
  });

  describe('GET /api/categories/search', () => {
    it('should search categories', async () => {
      await createTestCategory({ 
        name: 'JavaScript Fundamentals',
        createdById: testUser.id 
      });
      
      await createTestCategory({ 
        name: 'Python Basics',
        createdById: testUser.id 
      });
      
      await createTestCategory({ 
        name: 'Advanced JavaScript',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/categories/search?q=JavaScript')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((cat: any) => cat.name.includes('JavaScript'))).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/categories/search?q=NonExistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 400 for missing search query', async () => {
      const response = await request(app)
        .get('/api/categories/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('query');
    });
  });

  describe('GET /api/categories/hierarchy', () => {
    it('should return category hierarchy', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const jsCategory = await createTestCategory({ 
        name: 'JavaScript',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'React',
        parentId: jsCategory.id,
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/categories/hierarchy?maxDepth=3')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Programming');
      expect(response.body.data[0].children).toHaveLength(1);
      expect(response.body.data[0].children[0].children).toHaveLength(1);
    });

    it('should respect maxDepth parameter', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const jsCategory = await createTestCategory({ 
        name: 'JavaScript',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'React',
        parentId: jsCategory.id,
        createdById: testUser.id 
      });

      const response = await request(app)
        .get('/api/categories/hierarchy?maxDepth=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].children[0].children).toBeUndefined();
    });
  });
});
