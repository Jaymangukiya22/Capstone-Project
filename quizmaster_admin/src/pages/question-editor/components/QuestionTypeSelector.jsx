import React from 'react';
import Icon from '../../../components/AppIcon';


const QuestionTypeSelector = ({ selectedType, onTypeChange, className = '' }) => {
  const questionTypes = [
    {
      type: 'multiple-choice',
      label: 'Multiple Choice',
      icon: 'CheckSquare',
      description: 'Single or multiple correct answers',
      color: 'primary'
    },
    {
      type: 'true-false',
      label: 'True/False',
      icon: 'ToggleLeft',
      description: 'Binary choice questions',
      color: 'success'
    },
    {
      type: 'fill-blank',
      label: 'Fill in the Blank',
      icon: 'Edit3',
      description: 'Text input answers',
      color: 'warning'
    },
    {
      type: 'essay',
      label: 'Essay',
      icon: 'FileText',
      description: 'Long-form text responses',
      color: 'secondary'
    }
  ];

  const getColorClasses = (color, isSelected) => {
    const baseClasses = 'border-2 transition-smooth hover-scale';
    if (isSelected) {
      const selectedMap = {
        primary: 'border-primary bg-primary/10 text-primary',
        success: 'border-success bg-success/10 text-success',
        warning: 'border-warning bg-warning/10 text-warning',
        secondary: 'border-secondary bg-secondary/10 text-secondary'
      };
      return `${baseClasses} ${selectedMap?.[color]}`;
    }
    return `${baseClasses} border-border bg-card hover:border-primary/30`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Icon name="HelpCircle" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-text-primary">Question Type</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {questionTypes?.map((type) => (
          <div
            key={type?.type}
            className={`p-4 rounded-lg cursor-pointer ${getColorClasses(type?.color, selectedType === type?.type)}`}
            onClick={() => onTypeChange(type?.type)}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedType === type?.type 
                  ? `bg-${type?.color} text-${type?.color}-foreground`
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Icon name={type?.icon} size={24} />
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-1">{type?.label}</h4>
                <p className="text-xs text-muted-foreground">{type?.description}</p>
              </div>
              
              {selectedType === type?.type && (
                <div className="w-2 h-2 bg-current rounded-full"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionTypeSelector;