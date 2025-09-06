import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import LiveSessionIndicator from '../../components/ui/LiveSessionIndicator';
import ContentSearchInterface from '../../components/ui/ContentSearchInterface';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// Import page-specific components
import CategoryTree from './components/CategoryTree';
import CategoryDetailPanel from './components/CategoryDetailPanel';
import CategoryModal from './components/CategoryModal';
import CategoryStats from './components/CategoryStats';
import BulkActionsBar from './components/BulkActionsBar';

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [parentCategory, setParentCategory] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  // Add state for sidebar collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Mock categories data
  const [categories, setCategories] = useState([
    {
      id: '1',
      name: 'Science & Technology',
      description: 'Questions related to scientific concepts and technological innovations',
      icon: 'Zap',
      color: 'blue',
      quizCount: 15,
      isNew: false,
      createdAt: 'November 20, 2024',
      updatedAt: 'December 18, 2024',
      children: [
        {
          id: '1-1',
          name: 'Computer Science',
          description: 'Programming, algorithms, and software development',
          icon: 'Monitor',
          color: 'purple',
          quizCount: 8,
          parentId: '1',
          createdAt: 'November 25, 2024',
          updatedAt: 'December 15, 2024',
          children: [
            {
              id: '1-1-1',
              name: 'JavaScript',
              description: 'JavaScript programming language fundamentals',
              icon: 'Code',
              color: 'yellow',
              quizCount: 5,
              parentId: '1-1',
              createdAt: 'December 1, 2024',
              updatedAt: 'December 10, 2024'
            }
          ]
        },
        {
          id: '1-2',
          name: 'Physics',
          description: 'Classical and modern physics concepts',
          icon: 'Atom',
          color: 'green',
          quizCount: 7,
          parentId: '1',
          createdAt: 'November 28, 2024',
          updatedAt: 'December 12, 2024'
        }
      ]
    },
    {
      id: '2',
      name: 'History & Culture',
      description: 'Historical events, cultural knowledge, and social studies',
      icon: 'Book',
      color: 'red',
      quizCount: 12,
      isNew: true,
      createdAt: 'December 1, 2024',
      updatedAt: 'December 20, 2024',
      children: [
        {
          id: '2-1',
          name: 'World History',
          description: 'Major historical events and civilizations',
          icon: 'Globe',
          color: 'orange',
          quizCount: 6,
          parentId: '2',
          createdAt: 'December 5, 2024',
          updatedAt: 'December 18, 2024'
        },
        {
          id: '2-2',
          name: 'Art & Literature',
          description: 'Famous artworks, literature, and cultural movements',
          icon: 'Palette',
          color: 'pink',
          quizCount: 6,
          parentId: '2',
          createdAt: 'December 8, 2024',
          updatedAt: 'December 19, 2024'
        }
      ]
    },
    {
      id: '3',
      name: 'Mathematics',
      description: 'Mathematical concepts from basic arithmetic to advanced calculus',
      icon: 'Calculator',
      color: 'indigo',
      quizCount: 20,
      isNew: false,
      createdAt: 'October 15, 2024',
      updatedAt: 'December 16, 2024',
      children: [
        {
          id: '3-1',
          name: 'Algebra',
          description: 'Linear equations, polynomials, and algebraic structures',
          icon: 'Function',
          color: 'blue',
          quizCount: 10,
          parentId: '3',
          createdAt: 'October 20, 2024',
          updatedAt: 'December 14, 2024'
        },
        {
          id: '3-2',
          name: 'Geometry',
          description: 'Shapes, angles, and spatial relationships',
          icon: 'Triangle',
          color: 'green',
          quizCount: 10,
          parentId: '3',
          createdAt: 'October 25, 2024',
          updatedAt: 'December 13, 2024'
        }
      ]
    }
  ]);

  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  // Handle category toggle for bulk selection
  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => 
      prev?.includes(categoryId)
        ? prev?.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Handle select all categories
  const handleSelectAll = () => {
    const getAllCategoryIds = (cats) => {
      let ids = [];
      cats?.forEach(cat => {
        ids?.push(cat?.id);
        if (cat?.children) {
          ids?.push(...getAllCategoryIds(cat?.children));
        }
      });
      return ids;
    };
    setSelectedCategories(getAllCategoryIds(categories));
  };

  // Handle deselect all categories
  const handleDeselectAll = () => {
    setSelectedCategories([]);
  };

  // Handle category creation/update
  const handleCategorySubmit = (formData) => {
    if (editingCategory) {
      // Update existing category
      const updateCategoryRecursive = (cats) => {
        return cats?.map(cat => {
          if (cat?.id === editingCategory?.id) {
            return { ...cat, ...formData, updatedAt: new Date()?.toLocaleDateString() };
          }
          if (cat?.children) {
            return { ...cat, children: updateCategoryRecursive(cat?.children) };
          }
          return cat;
        });
      };
      setCategories(updateCategoryRecursive(categories));
      setSelectedCategory(prev => prev?.id === editingCategory?.id ? { ...prev, ...formData } : prev);
    } else {
      // Create new category
      const newCategory = {
        id: Date.now()?.toString(),
        ...formData,
        quizCount: 0,
        isNew: true,
        createdAt: new Date()?.toLocaleDateString(),
        updatedAt: new Date()?.toLocaleDateString(),
        children: []
      };

      if (formData?.parentId) {
        // Add as subcategory
        const addToParent = (cats) => {
          return cats?.map(cat => {
            if (cat?.id === formData?.parentId) {
              return {
                ...cat,
                children: [...(cat?.children || []), newCategory]
              };
            }
            if (cat?.children) {
              return { ...cat, children: addToParent(cat?.children) };
            }
            return cat;
          });
        };
        setCategories(addToParent(categories));
      } else {
        // Add as root category
        setCategories([...categories, newCategory]);
      }
    }
    
    setIsModalOpen(false);
    setEditingCategory(null);
    setParentCategory(null);
  };

  // Handle category deletion
  const handleCategoryDelete = (category) => {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      const deleteCategoryRecursive = (cats) => {
        return cats?.filter(cat => {
          if (cat?.id === categoryToDelete?.id) {
            return false;
          }
          if (cat?.children) {
            cat.children = deleteCategoryRecursive(cat?.children);
          }
          return true;
        });
      };
      
      setCategories(deleteCategoryRecursive(categories));
      
      if (selectedCategory?.id === categoryToDelete?.id) {
        setSelectedCategory(null);
      }
      
      setSelectedCategories(prev => prev?.filter(id => id !== categoryToDelete?.id));
    }
    
    setShowDeleteConfirm(false);
    setCategoryToDelete(null);
  };

  // Handle category move (drag and drop)
  const handleCategoryMove = (draggedCategory, targetCategory) => {
    console.log('Moving category:', draggedCategory?.name, 'to:', targetCategory?.name);
    // Implementation would handle the actual move logic
  };

  // Handle bulk actions
  const handleBulkDelete = () => {
    if (selectedCategories?.length > 0) {
      const deleteMultiple = (cats) => {
        return cats?.filter(cat => {
          if (selectedCategories?.includes(cat?.id)) {
            return false;
          }
          if (cat?.children) {
            cat.children = deleteMultiple(cat?.children);
          }
          return true;
        });
      };
      
      setCategories(deleteMultiple(categories));
      setSelectedCategories([]);
      setSelectedCategory(null);
    }
  };

  const handleBulkMove = () => {
    console.log('Bulk move:', selectedCategories);
    // Implementation for bulk move
  };

  const handleBulkExport = () => {
    console.log('Bulk export:', selectedCategories);
    // Implementation for bulk export
  };

  // Handle add subcategory
  const handleAddSubcategory = (parent) => {
    setParentCategory(parent);
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  // Handle search result selection
  const handleSearchResultSelect = (result) => {
    if (result?.type === 'category') {
      // Find and select the category
      const findCategory = (cats) => {
        for (const cat of cats) {
          if (cat?.id === result?.id) {
            return cat;
          }
          if (cat?.children) {
            const found = findCategory(cat?.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const category = findCategory(categories);
      if (category) {
        setSelectedCategory(category);
      }
    } else {
      // Navigate to other pages for quiz/question results
      navigate(result?.path);
    }
  };

  // Add handler for sidebar toggle
  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const getTotalCategoryCount = () => {
    const countRecursive = (cats) => {
      let count = cats?.length;
      cats?.forEach(cat => {
        if (cat?.children) {
          count += countRecursive(cat?.children);
        }
      });
      return count;
    };
    return countRecursive(categories);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar onToggleCollapse={handleSidebarToggle} />
      <div className="lg:pl-60 pb-16 lg:pb-0">
        <main className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <Breadcrumbs />
              <div className="flex items-center space-x-3 mt-2">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Icon name="FolderTree" size={24} className="text-warning" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Category Management</h1>
                  <p className="text-muted-foreground">
                    Organize and manage your quiz categories with drag-and-drop functionality
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <LiveSessionIndicator />
              <Button
                variant="outline"
                iconName="Upload"
                iconPosition="left"
                iconSize={16}
                onClick={() => console.log('Import categories')}
              >
                Import
              </Button>
              <Button
                variant="default"
                iconName="Plus"
                iconPosition="left"
                iconSize={16}
                onClick={() => {
                  setEditingCategory(null);
                  setParentCategory(null);
                  setIsModalOpen(true);
                }}
              >
                Add Category
              </Button>
            </div>
          </div>

          {/* Stats */}
          <CategoryStats categories={categories} />

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 max-w-md">
              <ContentSearchInterface
                scope="categories"
                onResultSelect={handleSearchResultSelect}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                iconName="Filter"
                iconPosition="left"
                iconSize={14}
              >
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="SortAsc"
                iconPosition="left"
                iconSize={14}
              >
                Sort
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="Download"
                iconPosition="left"
                iconSize={14}
                onClick={() => console.log('Export all categories')}
              >
                Export
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          <BulkActionsBar
            selectedCount={selectedCategories?.length}
            totalCount={getTotalCategoryCount()}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkDelete={handleBulkDelete}
            onBulkMove={handleBulkMove}
            onBulkExport={handleBulkExport}
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Tree */}
            <div className="lg:col-span-2">
              <CategoryTree
                categories={categories}
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
                onCategoryMove={handleCategoryMove}
                onCategoryDelete={handleCategoryDelete}
                searchQuery={searchQuery}
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
              />
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              <CategoryDetailPanel
                category={selectedCategory}
                onCategoryUpdate={(id, data) => {
                  setEditingCategory(selectedCategory);
                  setIsModalOpen(true);
                }}
                onCategoryDelete={handleCategoryDelete}
                onAddSubcategory={handleAddSubcategory}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                fullWidth
                iconName="Plus"
                iconPosition="left"
                iconSize={16}
                onClick={() => navigate('/quiz-builder')}
                className="justify-start"
              >
                <div className="text-left">
                  <div className="font-medium">Create Quiz</div>
                  <div className="text-xs text-muted-foreground">Start building a new quiz</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                fullWidth
                iconName="Edit3"
                iconPosition="left"
                iconSize={16}
                onClick={() => navigate('/question-editor')}
                className="justify-start"
              >
                <div className="text-left">
                  <div className="font-medium">Manage Questions</div>
                  <div className="text-xs text-muted-foreground">Edit individual questions</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                fullWidth
                iconName="Monitor"
                iconPosition="left"
                iconSize={16}
                onClick={() => navigate('/live-quiz-monitor')}
                className="justify-start"
              >
                <div className="text-left">
                  <div className="font-medium">Live Monitor</div>
                  <div className="text-xs text-muted-foreground">Monitor active sessions</div>
                </div>
              </Button>
            </div>
          </div>
        </main>
      </div>
      {/* Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
          setParentCategory(null);
        }}
        onSubmit={handleCategorySubmit}
        categories={categories}
        editingCategory={editingCategory}
        parentCategory={parentCategory}
      />
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
          <div className="bg-card border border-border rounded-lg shadow-elevation-3 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center">
                  <Icon name="AlertTriangle" size={20} className="text-error" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">Delete Category</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-sm text-card-foreground mb-6">
                Are you sure you want to delete "{categoryToDelete?.name}"? This will also delete all subcategories and associated quizzes.
              </p>
              
              <div className="flex items-center justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setCategoryToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  iconName="Trash2"
                  iconPosition="left"
                  iconSize={16}
                  onClick={confirmDelete}
                >
                  Delete Category
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;