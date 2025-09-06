import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BulkActionsBar = ({ 
  selectedCount, 
  onSelectAll, 
  onDeselectAll, 
  onBulkDelete, 
  onBulkMove,
  onBulkExport,
  totalCount,
  className = '' 
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className={`bg-primary/5 border border-primary/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Icon name="CheckSquare" size={16} className="text-primary" />
            <span className="text-sm font-medium text-primary">
              {selectedCount} of {totalCount} selected
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="text-primary hover:text-primary"
            >
              Select All
            </Button>
            <span className="text-muted-foreground">•</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              className="text-primary hover:text-primary"
            >
              Deselect All
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            iconName="Move"
            iconPosition="left"
            iconSize={14}
            onClick={onBulkMove}
          >
            Move
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            iconName="Download"
            iconPosition="left"
            iconSize={14}
            onClick={onBulkExport}
          >
            Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            iconName="Trash2"
            iconPosition="left"
            iconSize={14}
            onClick={onBulkDelete}
            className="text-error border-error hover:bg-error hover:text-white"
          >
            Delete ({selectedCount})
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;