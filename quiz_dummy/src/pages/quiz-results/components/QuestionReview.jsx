// QuestionReview component
import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';


const QuestionReview = ({ 
  questions = [],
  userAnswers = [],
  className = ""
}) => {
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const toggleQuestion = (index) => {
    setExpandedQuestion(expandedQuestion === index ? null : index);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds?.toString()?.padStart(2, '0')}`;
  };

  return (
    <div className={`bg-card rounded-xl shadow-sm p-6 border ${className}`}>
      <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center">
        <Icon name="List" size={28} className="mr-3 text-primary" />
        Question Review
      </h2>
      <div className="space-y-4">
        {questions?.map((question, index) => {
          const userAnswer = userAnswers?.[index];
          const isCorrect = userAnswer?.selectedOption === question?.correctAnswer;
          const timeSpent = userAnswer?.timeSpent || 0;
          
          return (
            <div 
              key={index}
              className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              <div 
                className="flex items-center justify-between p-4 cursor-pointer bg-muted/30 hover:bg-muted/50"
                onClick={() => toggleQuestion(index)}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Icon 
                      name={isCorrect ? "CheckCircle" : "XCircle"}
                      size={24}
                      className={isCorrect ? "text-success" : "text-error"}
                    />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      Question {index + 1}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {question?.question?.length > 60 
                        ? `${question?.question?.substring(0, 60)}...` 
                        : question?.question
                      }
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`font-medium ${isCorrect ? 'text-success' : 'text-error'}`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {formatTime(timeSpent)}
                    </div>
                  </div>
                  <Icon 
                    name={expandedQuestion === index ? "ChevronUp" : "ChevronDown"}
                    size={20}
                    className="text-muted-foreground"
                  />
                </div>
              </div>
              {expandedQuestion === index && (
                <div className="p-4 bg-background border-t">
                  <div className="mb-4">
                    <h4 className="font-medium text-foreground mb-2">
                      {question?.question}
                    </h4>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {question?.options?.map((option, optionIndex) => {
                      const isUserAnswer = userAnswer?.selectedOption === optionIndex;
                      const isCorrectAnswer = question?.correctAnswer === optionIndex;
                      
                      let optionClass = "p-3 rounded-lg border text-sm";
                      if (isCorrectAnswer) {
                        optionClass += " bg-success/10 border-success/20 text-success";
                      } else if (isUserAnswer && !isCorrect) {
                        optionClass += " bg-error/10 border-error/20 text-error";
                      } else {
                        optionClass += " bg-muted/30 border-border text-muted-foreground";
                      }
                      
                      return (
                        <div key={optionIndex} className={optionClass}>
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            <div className="flex items-center space-x-2">
                              {isCorrectAnswer && (
                                <Icon name="Check" size={16} className="text-success" />
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <Icon name="X" size={16} className="text-error" />
                              )}
                              {isUserAnswer && (
                                <span className="text-xs font-medium">Your Answer</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {question?.explanation && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Icon name="Info" size={16} className="text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-primary text-sm mb-1">Explanation</div>
                          <div className="text-sm text-foreground">{question?.explanation}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionReview;