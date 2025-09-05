import React from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const QuestionMetadata = ({ metadata, onMetadataChange, className = '' }) => {
  const difficultyOptions = [
    { value: 'easy', label: 'Easy', description: 'Basic knowledge required' },
    { value: 'medium', label: 'Medium', description: 'Moderate understanding needed' },
    { value: 'hard', label: 'Hard', description: 'Advanced knowledge required' },
    { value: 'expert', label: 'Expert', description: 'Specialized expertise needed' }
  ];

  const categoryOptions = [
    { value: 'science', label: 'Science & Technology' },
    { value: 'history', label: 'History & Culture' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'literature', label: 'Literature & Arts' },
    { value: 'geography', label: 'Geography' },
    { value: 'sports', label: 'Sports & Recreation' },
    { value: 'general', label: 'General Knowledge' },
    { value: 'programming', label: 'Programming' },
    { value: 'business', label: 'Business & Finance' },
    { value: 'health', label: 'Health & Medicine' }
  ];

  const timeLimitOptions = [
    { value: '15', label: '15 seconds' },
    { value: '30', label: '30 seconds' },
    { value: '45', label: '45 seconds' },
    { value: '60', label: '1 minute' },
    { value: '90', label: '1.5 minutes' },
    { value: '120', label: '2 minutes' },
    { value: '180', label: '3 minutes' },
    { value: '300', label: '5 minutes' },
    { value: '0', label: 'No time limit' }
  ];

  const pointOptions = [
    { value: '1', label: '1 point' },
    { value: '2', label: '2 points' },
    { value: '3', label: '3 points' },
    { value: '5', label: '5 points' },
    { value: '10', label: '10 points' },
    { value: '15', label: '15 points' },
    { value: '20', label: '20 points' },
    { value: '25', label: '25 points' }
  ];

  const handleChange = (field, value) => {
    onMetadataChange({
      ...metadata,
      [field]: value
    });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-success';
      case 'medium': return 'text-warning';
      case 'hard': return 'text-error';
      case 'expert': return 'text-purple-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-2">
        <Icon name="Settings" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-text-primary">Question Settings</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <Select
            label="Category"
            description="Select the subject category for this question"
            options={categoryOptions}
            value={metadata?.category}
            onChange={(value) => handleChange('category', value)}
            searchable
            required
          />

          <Select
            label="Difficulty Level"
            description="How challenging is this question?"
            options={difficultyOptions}
            value={metadata?.difficulty}
            onChange={(value) => handleChange('difficulty', value)}
            required
          />

          <Input
            type="text"
            label="Tags"
            description="Comma-separated tags for better organization"
            placeholder="algebra, equations, solving"
            value={metadata?.tags}
            onChange={(e) => handleChange('tags', e?.target?.value)}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Select
            label="Time Limit"
            description="How long should players have to answer?"
            options={timeLimitOptions}
            value={metadata?.timeLimit}
            onChange={(value) => handleChange('timeLimit', value)}
            required
          />

          <Select
            label="Point Value"
            description="How many points is this question worth?"
            options={pointOptions}
            value={metadata?.points}
            onChange={(value) => handleChange('points', value)}
            required
          />

          <Input
            type="text"
            label="Question ID"
            description="Unique identifier for this question"
            placeholder="Auto-generated if left empty"
            value={metadata?.questionId}
            onChange={(e) => handleChange('questionId', e?.target?.value)}
          />
        </div>
      </div>
      {/* Additional Settings */}
      <div className="border-t border-border pt-6">
        <h4 className="font-medium text-text-primary mb-4">Advanced Settings</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="number"
            label="Negative Marking"
            description="Points deducted for wrong answers"
            placeholder="0"
            min="0"
            value={metadata?.negativeMarking}
            onChange={(e) => handleChange('negativeMarking', e?.target?.value)}
          />

          <Input
            type="number"
            label="Partial Credit"
            description="Percentage of points for partially correct answers"
            placeholder="50"
            min="0"
            max="100"
            value={metadata?.partialCredit}
            onChange={(e) => handleChange('partialCredit', e?.target?.value)}
          />
        </div>

        <div className="mt-4">
          <Input
            type="text"
            label="Learning Objective"
            description="What should students learn from this question?"
            placeholder="Students will be able to solve linear equations..."
            value={metadata?.learningObjective}
            onChange={(e) => handleChange('learningObjective', e?.target?.value)}
          />
        </div>
      </div>
      {/* Metadata Summary */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium text-text-primary mb-3">Question Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Category:</span>
            <p className="font-medium text-text-primary">
              {categoryOptions?.find(c => c?.value === metadata?.category)?.label || 'Not set'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Difficulty:</span>
            <p className={`font-medium capitalize ${getDifficultyColor(metadata?.difficulty)}`}>
              {metadata?.difficulty || 'Not set'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Time Limit:</span>
            <p className="font-medium text-text-primary">
              {metadata?.timeLimit === '0' ? 'No limit' : 
               metadata?.timeLimit ? `${metadata?.timeLimit}s` : 'Not set'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Points:</span>
            <p className="font-medium text-text-primary">
              {metadata?.points ? `${metadata?.points} pts` : 'Not set'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionMetadata;