// ScoreDisplay component
import React from 'react';
import Icon from '../../../components/AppIcon';

const ScoreDisplay = ({ 
  score = 0, 
  totalQuestions = 10, 
  percentage = 0,
  className = "" 
}) => {
  const getScoreColor = () => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-error';
  };

  const getScoreIcon = () => {
    if (percentage >= 80) return 'Trophy';
    if (percentage >= 60) return 'Award';
    return 'AlertCircle';
  };

  const getScoreBadge = () => {
    if (percentage >= 80) return 'Excellent!';
    if (percentage >= 60) return 'Good Job!';
    return 'Keep Trying!';
  };

  return (
    <div className={`bg-card rounded-xl shadow-lg p-8 text-center border ${className}`}>
      <div className="mb-6">
        <Icon 
          name={getScoreIcon()} 
          size={80} 
          className={`mx-auto mb-4 ${getScoreColor()}`}
        />
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Quiz Complete!
        </h1>
        <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
          percentage >= 80 ? 'bg-success/10 text-success' :
          percentage >= 60 ? 'bg-warning/10 text-warning': 'bg-error/10 text-error'
        }`}>
          {getScoreBadge()}
        </div>
      </div>

      <div className="mb-8">
        <div className={`text-6xl font-bold mb-4 ${getScoreColor()}`}>
          {percentage}%
        </div>
        <div className="text-xl text-muted-foreground mb-4">
          You scored {score} out of {totalQuestions} questions correctly
        </div>
        
        {/* Circular Progress */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-muted"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
              className={getScoreColor()}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${getScoreColor()}`}>
              {score}/{totalQuestions}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreDisplay;