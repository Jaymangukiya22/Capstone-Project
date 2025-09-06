import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const CategoryModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categories, 
  editingCategory = null,
  parentCategory = null 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    icon: 'Folder',
    color: 'blue'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setFormData({
          name: editingCategory?.name || '',
          description: editingCategory?.description || '',
          parentId: editingCategory?.parentId || '',
          icon: editingCategory?.icon || 'Folder',
          color: editingCategory?.color || 'blue'
        });
      } else {
        setFormData({
          name: '',
          description: '',
          parentId: parentCategory?.id || '',
          icon: 'Folder',
          color: 'blue'
        });
      }
      setErrors({});
    }
  }, [isOpen, editingCategory, parentCategory]);

  const iconOptions = [
    { value: 'Folder', label: 'Folder' },
    { value: 'FolderTree', label: 'Folder Tree' },
    { value: 'Book', label: 'Book' },
    { value: 'BookOpen', label: 'Book Open' },
    { value: 'GraduationCap', label: 'Graduation Cap' },
    { value: 'Brain', label: 'Brain' },
    { value: 'Lightbulb', label: 'Lightbulb' },
    { value: 'Target', label: 'Target' },
    { value: 'Trophy', label: 'Trophy' },
    { value: 'Star', label: 'Star' },
    { value: 'Heart', label: 'Heart' },
    { value: 'Zap', label: 'Zap' },
    { value: 'Globe', label: 'Globe' },
    { value: 'Users', label: 'Users' },
    { value: 'Settings', label: 'Settings' },
    { value: 'Tag', label: 'Tag' },
    { value: 'Flag', label: 'Flag' }
  ];

  const colorOptions = [
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'purple', label: 'Purple' },
    { value: 'red', label: 'Red' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'pink', label: 'Pink' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'orange', label: 'Orange' }
  ];

  const buildCategoryOptions = (categories, level = 0) => {
    let options = [];
    categories?.forEach(category => {
      // Don't allow selecting the category being edited as its own parent
      if (editingCategory && category?.id === editingCategory?.id) return;
      
      options?.push({
        value: category?.id,
        label: `${'  '?.repeat(level)}${category?.name}`,
        disabled: level > 2 // Limit nesting to 3 levels
      });
      
      if (category?.children && category?.children?.length > 0) {
        options?.push(...buildCategoryOptions(category?.children, level + 1));
      }
    });
    return options;
  };

  const parentOptions = [
    { value: '', label: 'No Parent (Root Category)' },
    ...buildCategoryOptions(categories)
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData?.name?.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData?.name?.trim()?.length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    }

    // Check for duplicate names at the same level
    const siblings = formData?.parentId 
      ? categories?.find(c => c?.id === formData?.parentId)?.children || []
      : categories;
    
    const isDuplicate = siblings?.some(sibling => 
      sibling?.name?.toLowerCase() === formData?.name?.trim()?.toLowerCase() &&
      (!editingCategory || sibling?.id !== editingCategory?.id)
    );
    
    if (isDuplicate) {
      newErrors.name = 'A category with this name already exists at this level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        name: formData?.name?.trim(),
        description: formData?.description?.trim()
      });
      onClose();
    } catch (error) {
      setErrors({ submit: 'Failed to save category. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card border border-border rounded-lg shadow-elevation-3 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${formData?.color}-500/10`}>
                <Icon name={formData?.icon} size={20} className={`text-${formData?.color}-500`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {editingCategory ? 'Update category details' : 'Add a new category to organize your quizzes'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              iconName="X"
              iconSize={16}
              onClick={handleClose}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Category Name"
            type="text"
            value={formData?.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e?.target?.value }))}
            placeholder="Enter category name"
            error={errors?.name}
            required
            disabled={isSubmitting}
          />

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Description
            </label>
            <textarea
              value={formData?.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e?.target?.value }))}
              placeholder="Enter category description (optional)"
              rows={3}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:opacity-50"
            />
          </div>

          <Select
            label="Parent Category"
            options={parentOptions}
            value={formData?.parentId}
            onChange={(value) => setFormData(prev => ({ ...prev, parentId: value }))}
            placeholder="Select parent category"
            disabled={isSubmitting}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Icon"
              options={iconOptions}
              value={formData?.icon}
              onChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
              disabled={isSubmitting}
            />

            <Select
              label="Color"
              options={colorOptions}
              value={formData?.color}
              onChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
              disabled={isSubmitting}
            />
          </div>

          {/* Preview */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Preview
            </label>
            <div className="flex items-center space-x-3 p-3 bg-card border border-border rounded-lg">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${formData?.color}-500/10`}>
                <Icon name={formData?.icon} size={16} className={`text-${formData?.color}-500`} />
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  {formData?.name || 'Category Name'}
                </p>
                {formData?.description && (
                  <p className="text-xs text-muted-foreground">
                    {formData?.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {errors?.submit && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-sm text-error">{errors?.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={isSubmitting}
              iconName={editingCategory ? "Save" : "Plus"}
              iconPosition="left"
              iconSize={16}
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;