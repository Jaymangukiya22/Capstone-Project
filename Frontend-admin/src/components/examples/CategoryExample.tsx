import React, { useState } from 'react';
import { useApi, useApiMutation } from '../../hooks/useApi';
import { categoryService } from '../../services';
import type { Category, CreateCategoryDto } from '../../services';

/**
 * Example component showing how to use Category API services
 */
export const CategoryExample: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Fetch all categories
  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories
  } = useApi(() => categoryService.getAllCategories());

  // Create category mutation
  const {
    loading: createLoading,
    error: createError,
    mutate: createCategory
  } = useApiMutation((data: CreateCategoryDto) => categoryService.createCategory(data));

  // Update category mutation
  const {
    loading: updateLoading,
    error: updateError,
    mutate: updateCategory
  } = useApiMutation(({ id, data }: { id: number; data: { name: string } }) => 
    categoryService.updateCategory(id, data)
  );

  // Delete category mutation
  const {
    loading: deleteLoading,
    mutate: deleteCategory
  } = useApiMutation((id: number) => categoryService.deleteCategory(id));

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      await createCategory({ name: newCategoryName });
      setNewCategoryName('');
      refetchCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdateCategory = async (id: number, name: string) => {
    try {
      await updateCategory({ id, data: { name } });
      refetchCategories();
      setSelectedCategory(null);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await deleteCategory(id);
      refetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  if (categoriesLoading) return <div>Loading categories...</div>;
  if (categoriesError) return <div>Error: {categoriesError}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Category Management</h1>

      {/* Create Category */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Create New Category</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleCreateCategory}
            disabled={createLoading || !newCategoryName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {createLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
        {createError && <p className="text-red-500 mt-2">{createError}</p>}
      </div>

      {/* Categories List */}
      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Categories ({categories?.length || 0})</h2>
        
        {categories?.map((category) => (
          <div key={category.id} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{category.name}</h3>
                <p className="text-sm text-gray-500">
                  ID: {category.id} | Created: {new Date(category.createdAt).toLocaleDateString()}
                </p>
                {category.parent && (
                  <p className="text-sm text-blue-600">
                    Parent: {category.parent.name}
                  </p>
                )}
                {category.children && category.children.length > 0 && (
                  <p className="text-sm text-green-600">
                    {category.children.length} subcategories
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory(category)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  disabled={deleteLoading}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Category</h3>
            <input
              type="text"
              defaultValue={selectedCategory.name}
              onChange={(e) => setSelectedCategory({ ...selectedCategory, name: e.target.value })}
              className="w-full px-3 py-2 border rounded mb-4"
            />
            {updateError && <p className="text-red-500 mb-4">{updateError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateCategory(selectedCategory.id, selectedCategory.name)}
                disabled={updateLoading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                {updateLoading ? 'Updating...' : 'Update'}
              </button>
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
