import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const QuestionDisplay = ({ question, responses, className = '' }) => {
  const totalResponses = responses?.reduce((sum, response) => sum + response?.count, 0);

  const getOptionColor = (index) => {
    const colors = ['bg-primary', 'bg-secondary', 'bg-warning', 'bg-error'];
    return colors?.[index % colors?.length];
  };

  const getOptionLetter = (index) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  return (
    <div className={`bg-card border border-border rounded-lg shadow-elevation-1 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Icon name="HelpCircle" size={20} className="text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Current Question</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Question {question?.number} of {question?.total}</span>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              question?.difficulty === 'Easy' ? 'bg-success/20 text-success' :
              question?.difficulty === 'Medium'? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'
            }`}>
              {question?.difficulty}
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="bg-muted/30 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-medium text-card-foreground mb-3">{question?.text}</h4>
          
          {question?.image && (
            <div className="mb-4">
              <Image
                src={question?.image}
                alt="Question illustration"
                className="w-full max-w-md mx-auto rounded-lg"
              />
            </div>
          )}

          {question?.code && (
            <div className="bg-card border border-border rounded p-3 font-mono text-sm mb-4">
              <pre className="text-card-foreground whitespace-pre-wrap">{question?.code}</pre>
            </div>
          )}
        </div>

        {/* Answer Options */}
        <div className="space-y-3 mb-6">
          {question?.options?.map((option, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${getOptionColor(index)}`}>
                {getOptionLetter(index)}
              </div>
              <span className="flex-1 text-card-foreground">{option}</span>
              {question?.correctAnswer === index && (
                <Icon name="Check" size={16} className="text-success" />
              )}
            </div>
          ))}
        </div>

        {/* Response Statistics */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-card-foreground">Response Distribution</span>
            <span className="text-sm text-muted-foreground">{totalResponses} responses</span>
          </div>
          
          <div className="space-y-2">
            {responses?.map((response, index) => {
              const percentage = totalResponses > 0 ? (response?.count / totalResponses) * 100 : 0;
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getOptionColor(index)}`}>
                    {getOptionLetter(index)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-card-foreground">{response?.count} votes</span>
                      <span className="text-sm font-medium text-card-foreground">{percentage?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${getOptionColor(index)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question Metadata */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Category:</span>
              <p className="font-medium text-card-foreground">{question?.category}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Points:</span>
              <p className="font-medium text-card-foreground">{question?.points}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Time Limit:</span>
              <p className="font-medium text-card-foreground">{question?.timeLimit}s</p>
            </div>
            <div>
              <span className="text-muted-foreground">Accuracy:</span>
              <p className="font-medium text-card-foreground">
                {totalResponses > 0 ? Math.round((responses?.[question?.correctAnswer]?.count || 0) / totalResponses * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionDisplay;