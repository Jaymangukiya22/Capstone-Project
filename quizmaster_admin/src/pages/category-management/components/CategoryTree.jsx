import React, { useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CategoryTree = ({ 
  categories, 
  selectedCategory, 
  onCategorySelect, 
  onCategoryMove, 
  onCategoryDelete,
  searchQuery,
  selectedCategories,
  onCategoryToggle,
  className = '' 
}) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set(['1', '2', '3']));
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const dragCounter = useRef(0);

  const toggleExpanded = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded?.has(categoryId)) {
      newExpanded?.delete(categoryId);
    } else {
      newExpanded?.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (e, category) => {
    setDraggedItem(category);
    e.dataTransfer.effectAllowed = 'move';
    e?.dataTransfer?.setData('text/html', e?.target?.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverItem(null);
    dragCounter.current = 0;
  };

  const handleDragOver = (e) => {
    e?.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, category) => {
    e?.preventDefault();
    dragCounter.current++;
    setDragOverItem(category);
  };

  const handleDragLeave = (e) => {
    dragCounter.current--;
    if (dragCounter?.current === 0) {
      setDragOverItem(null);
    }
  };

  const handleDrop = (e, targetCategory) => {
    e?.preventDefault();
    dragCounter.current = 0;
    setDragOverItem(null);
    
    if (draggedItem && targetCategory && draggedItem?.id !== targetCategory?.id) {
      onCategoryMove(draggedItem, targetCategory);
    }
  };

  const filterCategories = (categories, query) => {
    if (!query) return categories;
    
    return categories?.filter(category => {
      const matchesQuery = category?.name?.toLowerCase()?.includes(query?.toLowerCase()) ||
                          category?.description?.toLowerCase()?.includes(query?.toLowerCase());
      const hasMatchingChildren = category?.children && 
                                 filterCategories(category?.children, query)?.length > 0;
      return matchesQuery || hasMatchingChildren;
    });
  };

  const renderCategory = (category, level = 0) => {
    const isExpanded = expandedCategories?.has(category?.id);
    const isSelected = selectedCategory?.id === category?.id;
    const isChecked = selectedCategories?.includes(category?.id);
    const isDragOver = dragOverItem?.id === category?.id;
    const hasChildren = category?.children && category?.children?.length > 0;

    return (
      <div key={category?.id} className="select-none">
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, category)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, category)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, category)}
          className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-smooth hover:bg-accent group ${
            isSelected ? 'bg-primary/10 border border-primary/20' : ''
          } ${isDragOver ? 'bg-accent border-2 border-dashed border-primary' : ''}`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => onCategorySelect(category)}
        >
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e?.stopPropagation();
              onCategoryToggle(category?.id);
            }}
            className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
          />

          {/* Expand/Collapse Button */}
          <div className="w-6 flex justify-center">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="xs"
                iconName={isExpanded ? "ChevronDown" : "ChevronRight"}
                iconSize={14}
                onClick={(e) => {
                  e?.stopPropagation();
                  toggleExpanded(category?.id);
                }}
                className="p-0 h-auto w-auto hover:bg-accent"
              />
            ) : (
              <div className="w-3.5 h-3.5"></div>
            )}
          </div>

          {/* Category Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            category?.color ? `bg-${category?.color}/10` : 'bg-muted'
          }`}>
            <Icon 
              name={category?.icon || 'Folder'} 
              size={16} 
              className={category?.color ? `text-${category?.color}` : 'text-muted-foreground'} 
            />
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-text-primary truncate">
                {category?.name}
              </h4>
              {category?.isNew && (
                <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
                  New
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-xs text-muted-foreground">
                {category?.quizCount} quiz{category?.quizCount !== 1 ? 'es' : ''}
              </span>
              {category?.children && category?.children?.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {category?.children?.length} subcategor{category?.children?.length !== 1 ? 'ies' : 'y'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-smooth">
            <Button
              variant="ghost"
              size="xs"
              iconName="Plus"
              iconSize={14}
              onClick={(e) => {
                e?.stopPropagation();
                // Handle add subcategory
              }}
              className="p-1"
            />
            <Button
              variant="ghost"
              size="xs"
              iconName="Edit3"
              iconSize={14}
              onClick={(e) => {
                e?.stopPropagation();
                // Handle edit category
              }}
              className="p-1"
            />
            <Button
              variant="ghost"
              size="xs"
              iconName="Trash2"
              iconSize={14}
              onClick={(e) => {
                e?.stopPropagation();
                onCategoryDelete(category);
              }}
              className="p-1 text-error hover:text-error"
            />
          </div>

          {/* Drag Handle */}
          <div className="opacity-0 group-hover:opacity-100 transition-smooth">
            <Icon name="GripVertical" size={14} className="text-muted-foreground" />
          </div>
        </div>
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category?.children?.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredCategories = filterCategories(categories, searchQuery);

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">Category Tree</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {selectedCategories?.length} selected
            </span>
            {selectedCategories?.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                iconName="Trash2"
                iconPosition="left"
                iconSize={14}
                onClick={() => selectedCategories?.forEach(id => {
                  const category = categories?.find(c => c?.id === id);
                  if (category) onCategoryDelete(category);
                })}
                className="text-error hover:text-error"
              >
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 max-h-96 overflow-y-auto">
        {filteredCategories?.length > 0 ? (
          <div className="space-y-1">
            {filteredCategories?.map(category => renderCategory(category))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Icon name="FolderOpen" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium text-text-primary mb-2">
              {searchQuery ? 'No matching categories' : 'No categories yet'}
            </h4>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms' :'Create your first category to get started'
              }
            </p>
            {!searchQuery && (
              <Button variant="outline" iconName="Plus" iconPosition="left">
                Add Category
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Drop Zone Indicator */}
      {draggedItem && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-card border border-border rounded-lg p-4 shadow-elevation-2">
            <Icon name="Move" size={24} className="text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-primary">Drop to reorganize</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryTree;