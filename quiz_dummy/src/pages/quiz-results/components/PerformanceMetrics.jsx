// PerformanceMetrics component
import React from 'react';
import Icon from '../../../components/AppIcon';

const PerformanceMetrics = ({ 
  correctAnswers = 0,
  totalQuestions = 10,
  timeSpent = 0,
  averageTimePerQuestion = 0,
  className = ""
}) => {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds?.toString()?.padStart(2, '0')}`;
  };

  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  const metrics = [
    {
      icon: 'CheckCircle',
      label: 'Correct Answers',
      value: correctAnswers,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      icon: 'XCircle',
      label: 'Incorrect Answers',
      value: totalQuestions - correctAnswers,
      color: 'text-error',
      bgColor: 'bg-error/10'
    },
    {
      icon: 'Clock',
      label: 'Total Time',
      value: formatTime(timeSpent),
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      icon: 'Timer',
      label: 'Average Time',
      value: formatTime(averageTimePerQuestion),
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      icon: 'Target',
      label: 'Accuracy',
      value: `${accuracy}%`,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    }
  ];

  return (
    <div className={`bg-card rounded-xl shadow-sm p-6 border ${className}`}>
      <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center">
        <Icon name="BarChart3" size={28} className="mr-3 text-primary" />
        Performance Metrics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics?.map((metric, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg ${metric?.bgColor} text-center transition-all duration-200 hover:scale-105`}
          >
            <Icon 
              name={metric?.icon} 
              size={32} 
              className={`mx-auto mb-3 ${metric?.color}`}
            />
            <div className={`text-2xl font-bold mb-1 ${metric?.color}`}>
              {metric?.value}
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {metric?.label}
            </div>
          </div>
        ))}
      </div>
      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Overall Progress</span>
          <span>{accuracy}% Accuracy</span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ease-out ${
              accuracy >= 80 ? 'bg-success' : 
              accuracy >= 60 ? 'bg-warning' : 'bg-error'
            }`}
            style={{ width: `${accuracy}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;