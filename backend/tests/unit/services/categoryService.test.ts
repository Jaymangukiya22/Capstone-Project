import { CategoryService } from '../../../src/services/categoryService';
import { Category } from '../../../src/models/Category';
import { testSequelize, createTestUser, createTestCategory } from '../../setup';

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let testUser: any;

  beforeEach(async () => {
    categoryService = new CategoryService();
    testUser = await createTestUser();
  });

  describe('createCategory', () => {
    it('should create a new category successfully', async () => {
      const categoryData = {
        name: 'Programming',
        description: 'Programming related quizzes',
        parentId: null,
        isActive: true
      };

      const result = await categoryService.createCategory(categoryData);

      expect(result).toBeDefined();
      expect(result.name).toBe(categoryData.name);
      expect(result.description).toBe(categoryData.description);
      expect(result.isActive).toBe(true);
    });

    it('should create a subcategory with parent relationship', async () => {
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

      const result = await categoryService.createCategory(subcategoryData);

      expect(result).toBeDefined();
      expect(result.name).toBe(subcategoryData.name);
      expect(result.parentId).toBe(parentCategory.id);
    });

    it('should throw error for duplicate category name', async () => {
      const categoryData = {
        name: 'Programming',
        description: 'Programming related quizzes',
        parentId: null,
        isActive: true
      };

      await categoryService.createCategory(categoryData);

      await expect(
        categoryService.createCategory(categoryData)
      ).rejects.toThrow();
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories with pagination', async () => {
      await createTestCategory({ name: 'Category 1', createdById: testUser.id });
      await createTestCategory({ name: 'Category 2', createdById: testUser.id });
      await createTestCategory({ name: 'Category 3', createdById: testUser.id });

      const result = await categoryService.getAllCategories({
        page: 1,
        limit: 2
      });

      expect(result.categories).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should return categories with children when includeChildren is true', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'JavaScript',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      const result = await categoryService.getAllCategories({
        includeChildren: true,
        depth: 2
      });

      expect(result.categories).toHaveLength(1); // Only parent categories
      expect(result.categories[0].children).toHaveLength(1);
      expect(result.categories[0].children[0].name).toBe('JavaScript');
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

      const result = await categoryService.getAllCategories({
        parentId: parentCategory.id
      });

      expect(result.categories).toHaveLength(2);
      expect(result.categories.every(cat => cat.parentId === parentCategory.id)).toBe(true);
    });
  });

  describe('getCategoryById', () => {
    it('should return category by id', async () => {
      const category = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const result = await categoryService.getCategoryById(category.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(category.id);
      expect(result.name).toBe(category.name);
    });

    it('should return category with children when includeChildren is true', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'JavaScript',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      const result = await categoryService.getCategoryById(parentCategory.id, true);

      expect(result).toBeDefined();
      expect(result.children).toHaveLength(1);
      expect(result.children[0].name).toBe('JavaScript');
    });

    it('should throw error for non-existent category', async () => {
      await expect(
        categoryService.getCategoryById(999)
      ).rejects.toThrow('Category not found');
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const category = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      const updateData = {
        name: 'Advanced Programming',
        description: 'Advanced programming concepts'
      };

      const result = await categoryService.updateCategory(category.id, updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
    });

    it('should throw error for non-existent category', async () => {
      const updateData = {
        name: 'Updated Category'
      };

      await expect(
        categoryService.updateCategory(999, updateData)
      ).rejects.toThrow('Category not found');
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      const category = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      await categoryService.deleteCategory(category.id);

      const deletedCategory = await Category.findByPk(category.id);
      expect(deletedCategory).toBeNull();
    });

    it('should throw error when deleting category with children', async () => {
      const parentCategory = await createTestCategory({ 
        name: 'Programming',
        createdById: testUser.id 
      });

      await createTestCategory({ 
        name: 'JavaScript',
        parentId: parentCategory.id,
        createdById: testUser.id 
      });

      await expect(
        categoryService.deleteCategory(parentCategory.id)
      ).rejects.toThrow('Cannot delete category with subcategories');
    });

    it('should throw error for non-existent category', async () => {
      await expect(
        categoryService.deleteCategory(999)
      ).rejects.toThrow('Category not found');
    });
  });

  describe('getCategoryHierarchy', () => {
    it('should return hierarchical category structure', async () => {
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

      const result = await categoryService.getCategoryHierarchy(3);

      expect(result).toHaveLength(1); // One root category
      expect(result[0].name).toBe('Programming');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('JavaScript');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].name).toBe('React');
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

      const result = await categoryService.getCategoryHierarchy(2);

      expect(result[0].children[0].children).toBeUndefined();
    });
  });

  describe('searchCategories', () => {
    it('should search categories by name', async () => {
      await createTestCategory({ name: 'JavaScript Programming', createdById: testUser.id });
      await createTestCategory({ name: 'Python Programming', createdById: testUser.id });
      await createTestCategory({ name: 'Database Design', createdById: testUser.id });

      const result = await categoryService.searchCategories('Programming');

      expect(result.categories).toHaveLength(2);
      expect(result.categories.every((cat: any) => cat.name.includes('Programming'))).toBe(true);
    });

    it('should search categories by description', async () => {
      await createTestCategory({ 
        name: 'JavaScript',
        description: 'Frontend programming language',
        createdById: testUser.id 
      });
      
      await createTestCategory({ 
        name: 'Python',
        description: 'Backend programming language',
        createdById: testUser.id 
      });

      const result = await categoryService.searchCategories('Frontend');

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].name).toBe('JavaScript');
    });
  });
});
