import React from 'react';
import type { QuizQuestion } from '@/types/quiz';

interface QuestionCardProps {
  question: QuizQuestion | null;
  selectedAnswer: string | undefined;
  onAnswerSelect: (answer: string) => void;
  questionNumber: number;
  totalQuestions: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  selectedAnswer, 
  onAnswerSelect, 
  questionNumber, 
  totalQuestions 
}) => {
  if (!question) return null;

  return (
    <div className="bg-card rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Multiple Choice
          </span>
        </div>
        
        <h2 className="text-base sm:text-xl font-semibold text-foreground leading-relaxed">
          {question.question}
        </h2>
      </div>
      
      <div className="space-y-2 sm:space-y-3">
        {question.options.map((option, index) => {
          const optionId = `option-${questionNumber}-${index}`;
          const isSelected = selectedAnswer === option;
          
          return (
            <div
              key={index}
              className={`relative rounded-lg border-2 transition-all duration-200 cursor-pointer hover:border-primary/50 ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
              onClick={() => onAnswerSelect(option)}
            >
              <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4">
                <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                  <input
                    type="radio"
                    id={optionId}
                    name={`question-${questionNumber}`}
                    value={option}
                    checked={isSelected}
                    onChange={() => onAnswerSelect(option)}
                    className="w-4 h-4 text-primary border-2 border-border focus:ring-2 focus:ring-primary/20"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <label 
                  htmlFor={optionId}
                  className="flex-1 text-sm sm:text-base text-foreground font-medium cursor-pointer leading-relaxed"
                  onClick={(e) => e.preventDefault()}
                >
                  {option}
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionCard;
