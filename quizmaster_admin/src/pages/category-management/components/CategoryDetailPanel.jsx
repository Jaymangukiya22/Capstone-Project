import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const CategoryDetailPanel = ({ 
  category, 
  onCategoryUpdate, 
  onCategoryDelete,
  onAddSubcategory,
  className = '' 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    icon: '',
    color: ''
  });

  React.useEffect(() => {
    if (category) {
      setEditForm({
        name: category?.name || '',
        description: category?.description || '',
        icon: category?.icon || 'Folder',
        color: category?.color || 'blue'
      });
    }
  }, [category]);

  const handleSave = () => {
    if (category && editForm?.name?.trim()) {
      onCategoryUpdate(category?.id, editForm);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      name: category?.name || '',
      description: category?.description || '',
      icon: category?.icon || 'Folder',
      color: category?.color || 'blue'
    });
    setIsEditing(false);
  };

  const iconOptions = [
    'Folder', 'FolderTree', 'Book', 'BookOpen', 'GraduationCap', 
    'Brain', 'Lightbulb', 'Target', 'Trophy', 'Star', 'Heart',
    'Zap', 'Globe', 'Users', 'Settings', 'Tag', 'Flag'
  ];

  const colorOptions = [
    { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
    { name: 'Green', value: 'green', class: 'bg-green-500' },
    { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
    { name: 'Red', value: 'red', class: 'bg-red-500' },
    { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
    { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
    { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
    { name: 'Orange', value: 'orange', class: 'bg-orange-500' }
  ];

  if (!category) {
    return (
      <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <Icon name="MousePointer" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            Select a Category
          </h3>
          <p className="text-muted-foreground">
            Choose a category from the tree to view and edit its details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              category?.color ? `bg-${category?.color}-500/10` : 'bg-muted'
            }`}>
              <Icon 
                name={category?.icon || 'Folder'} 
                size={20} 
                className={category?.color ? `text-${category?.color}-500` : 'text-muted-foreground'} 
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">
                {category?.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Category Details
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="Edit3"
                  iconPosition="left"
                  iconSize={14}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="Plus"
                  iconPosition="left"
                  iconSize={14}
                  onClick={() => onAddSubcategory(category)}
                >
                  Add Subcategory
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  iconName="Save"
                  iconPosition="left"
                  iconSize={14}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-4 space-y-6">
        {!isEditing ? (
          <>
            {/* Basic Information */}
            <div>
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Basic Information</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </label>
                  <p className="text-sm text-card-foreground mt-1">{category?.name}</p>
                </div>
                {category?.description && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </label>
                    <p className="text-sm text-card-foreground mt-1">{category?.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div>
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Icon name="FileText" size={16} className="text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Quizzes</span>
                  </div>
                  <p className="text-lg font-semibold text-card-foreground mt-1">
                    {category?.quizCount || 0}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Icon name="FolderTree" size={16} className="text-secondary" />
                    <span className="text-xs font-medium text-muted-foreground">Subcategories</span>
                  </div>
                  <p className="text-lg font-semibold text-card-foreground mt-1">
                    {category?.children?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Metadata</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </label>
                  <p className="text-sm text-card-foreground mt-1">
                    {category?.createdAt || 'December 15, 2024'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Modified
                  </label>
                  <p className="text-sm text-card-foreground mt-1">
                    {category?.updatedAt || 'December 20, 2024'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID
                  </label>
                  <p className="text-sm font-mono text-card-foreground mt-1">
                    {category?.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Subcategories */}
            {category?.children && category?.children?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-3">Subcategories</h4>
                <div className="space-y-2">
                  {category?.children?.map(child => (
                    <div key={child?.id} className="flex items-center space-x-3 p-2 bg-muted/30 rounded-lg">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${
                        child?.color ? `bg-${child?.color}-500/10` : 'bg-muted'
                      }`}>
                        <Icon 
                          name={child?.icon || 'Folder'} 
                          size={12} 
                          className={child?.color ? `text-${child?.color}-500` : 'text-muted-foreground'} 
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-card-foreground">{child?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {child?.quizCount || 0} quiz{child?.quizCount !== 1 ? 'es' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Edit Form */}
            <div className="space-y-4">
              <Input
                label="Category Name"
                type="text"
                value={editForm?.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e?.target?.value }))}
                placeholder="Enter category name"
                required
              />

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={editForm?.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e?.target?.value }))}
                  placeholder="Enter category description (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {iconOptions?.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, icon: iconName }))}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-smooth ${
                        editForm?.icon === iconName
                          ? 'border-primary bg-primary/10 text-primary' :'border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <Icon name={iconName} size={16} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions?.map(color => (
                    <button
                      key={color?.value}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, color: color?.value }))}
                      className={`flex items-center space-x-2 p-2 rounded-lg border transition-smooth ${
                        editForm?.color === color?.value
                          ? 'border-primary bg-primary/10' :'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${color?.class}`}></div>
                      <span className="text-sm text-card-foreground">{color?.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Danger Zone */}
      {!isEditing && (
        <div className="p-4 border-t border-border">
          <div className="p-4 bg-error/5 border border-error/20 rounded-lg">
            <h4 className="text-sm font-semibold text-error mb-2">Danger Zone</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Deleting this category will also remove all its subcategories and associated quizzes.
            </p>
            <Button
              variant="outline"
              size="sm"
              iconName="Trash2"
              iconPosition="left"
              iconSize={14}
              onClick={() => onCategoryDelete(category)}
              className="text-error border-error hover:bg-error hover:text-white"
            >
              Delete Category
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryDetailPanel;