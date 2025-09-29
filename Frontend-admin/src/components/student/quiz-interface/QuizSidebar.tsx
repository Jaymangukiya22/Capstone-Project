import React from 'react';
import { List, Check, X } from 'lucide-react';
import type { QuizQuestion } from '@/types/quiz';

interface QuizSidebarProps {
  questions: QuizQuestion[];
  currentQuestion: number;
  answeredQuestions: Set<number>;
}

const QuizSidebar: React.FC<QuizSidebarProps> = ({ 
  questions, 
  currentQuestion, 
  answeredQuestions
}) => {
  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
          <List size={20} className="mr-2" />
          Question Overview
        </h3>
        <p className="text-sm text-muted-foreground">
          Sequential navigation only - no jumping allowed
        </p>
      </div>
      
      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
        {questions.map((_, index) => {
          const questionNumber = index + 1;
          const isCurrentQuestion = questionNumber === currentQuestion;
          const isAnswered = answeredQuestions.has(questionNumber);
          const isPassed = questionNumber < currentQuestion;
          
          return (
            <div
              key={questionNumber}
              className={`
                w-10 h-10 rounded-lg border-2 font-medium text-sm transition-all duration-200
                flex items-center justify-center
                ${isCurrentQuestion 
                  ? 'border-primary bg-primary text-primary-foreground shadow-md' 
                  : isPassed
                    ? isAnswered
                      ? 'border-green-500 bg-green-500/10 text-green-600' 
                      : 'border-yellow-500 bg-yellow-500/10 text-yellow-600' 
                    : 'border-muted bg-muted/50 text-muted-foreground'
                }
              `}
              title={
                isCurrentQuestion 
                  ? `Current Question ${questionNumber}`
                  : isPassed
                    ? `Question ${questionNumber} ${isAnswered ? '(Answered)' : '(Skipped)'}`
                    : `Question ${questionNumber} (Upcoming)`
              }
            >
              {isPassed && isAnswered && !isCurrentQuestion ? (
                <Check size={14} />
              ) : isPassed && !isAnswered && !isCurrentQuestion ? (
                <X size={14} />
              ) : (
                questionNumber
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-6 border-t border-border">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">
              {currentQuestion}/{questions.length}
            </span>
          </div>
          
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(currentQuestion / questions.length) * 100}%` 
              }}
            />
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span className="text-muted-foreground">Current</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-muted-foreground">Answered</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-muted-foreground">Skipped</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizSidebar;
