import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const QuickActionCard = ({ 
  title, 
  description, 
  icon, 
  color = 'primary', 
  path, 
  shortcut,
  className = '' 
}) => {
  const navigate = useNavigate();

  const handleAction = () => {
    navigate(path);
  };

  const getColorClasses = () => {
    const colorMap = {
      primary: 'bg-primary/10 border-primary/20 hover:bg-primary/15',
      success: 'bg-success/10 border-success/20 hover:bg-success/15',
      secondary: 'bg-secondary/10 border-secondary/20 hover:bg-secondary/15',
      warning: 'bg-warning/10 border-warning/20 hover:bg-warning/15'
    };
    return colorMap?.[color] || colorMap?.primary;
  };

  const getIconBgColor = () => {
    const colorMap = {
      primary: 'bg-primary text-primary-foreground',
      success: 'bg-success text-success-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      warning: 'bg-warning text-warning-foreground'
    };
    return colorMap?.[color] || colorMap?.primary;
  };

  return (
    <div
      className={`p-6 border rounded-lg cursor-pointer transition-smooth hover-scale ${getColorClasses()} ${className}`}
      onClick={handleAction}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconBgColor()}`}>
          <Icon name={icon} size={24} />
        </div>
        {shortcut && (
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
            {shortcut}
          </span>
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-text-secondary mb-4">
        {description}
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
  );
};

export default QuickActionCard;