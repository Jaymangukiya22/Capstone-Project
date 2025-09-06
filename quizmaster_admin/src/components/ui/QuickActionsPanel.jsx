import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const QuickActionsPanel = ({ className = '' }) => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Create New Quiz',
      description: 'Build a new quiz from scratch',
      icon: 'Plus',
      color: 'primary',
      path: '/quiz-builder',
      shortcut: 'Ctrl+N'
    },
    {
      title: 'Start Live Session',
      description: 'Launch a quiz session immediately',
      icon: 'Play',
      color: 'success',
      path: '/live-quiz-monitor',
      shortcut: 'Ctrl+L'
    },
    {
      title: 'Import Questions',
      description: 'Upload questions from file',
      icon: 'Upload',
      color: 'secondary',
      path: '/question-editor',
      shortcut: 'Ctrl+U'
    },
    {
      title: 'Manage Categories',
      description: 'Organize quiz categories',
      icon: 'FolderTree',
      color: 'warning',
      path: '/category-management',
      shortcut: 'Ctrl+M'
    }
  ];

  const handleAction = (path) => {
    navigate(path);
  };

  const getColorClasses = (color) => {
    const colorMap = {
      primary: 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/15',
      success: 'bg-success/10 border-success/20 text-success hover:bg-success/15',
      secondary: 'bg-secondary/10 border-secondary/20 text-secondary hover:bg-secondary/15',
      warning: 'bg-warning/10 border-warning/20 text-warning hover:bg-warning/15'
    };
    return colorMap?.[color] || colorMap?.primary;
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {quickActions?.map((action) => (
        <div
          key={action?.path}
          className={`p-6 border rounded-lg cursor-pointer transition-smooth hover-scale ${getColorClasses(action?.color)}`}
          onClick={() => handleAction(action?.path)}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              action?.color === 'primary' ? 'bg-primary text-primary-foreground' :
              action?.color === 'success' ? 'bg-success text-success-foreground' :
              action?.color === 'secondary' ? 'bg-secondary text-secondary-foreground' :
              'bg-warning text-warning-foreground'
            }`}>
              <Icon name={action?.icon} size={24} />
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              {action?.shortcut}
            </span>
          </div>
          
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {action?.title}
          </h3>
          
          <p className="text-sm text-text-secondary mb-4">
            {action?.description}
          </p>
          
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              iconName="ArrowRight"
              iconPosition="right"
              iconSize={14}
              className="p-0 h-auto text-current hover:text-current/80"
            >
              Get Started
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickActionsPanel;