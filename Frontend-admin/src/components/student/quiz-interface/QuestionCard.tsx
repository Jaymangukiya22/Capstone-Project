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
    <div className="h-full flex flex-col justify-center max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="bg-card rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full max-w-4xl mx-auto">
        {/* Question Header - Compact on mobile */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
              Multiple Choice
            </span>
          </div>
          
          {/* Question Text - Responsive sizing */}
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground leading-relaxed break-words">
            {question.question}
          </h2>
        </div>
        
        {/* Options - Compact spacing on mobile */}
        <div className="space-y-2 sm:space-y-3">
          {question.options.map((option, index) => {
            const optionId = `option-${questionNumber}-${index}`;
            const isSelected = selectedAnswer === option;
            const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
            
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
                <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 md:p-4">
                  <div className="flex-shrink-0 flex items-center justify-center">
                    {/* Option letter badge - Responsive sizing */}
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-bold ${
                      isSelected 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-border bg-background text-muted-foreground'
                    }`}>
                      {optionLabel}
                    </div>
                    <input
                      type="radio"
                      id={optionId}
                      name={`question-${questionNumber}`}
                      value={option}
                      checked={isSelected}
                      onChange={() => onAnswerSelect(option)}
                      className="sr-only"
                    />
                  </div>
                  
                  {/* Option text - Better mobile typography */}
                  <label 
                    htmlFor={optionId}
                    className="flex-1 text-sm sm:text-base text-foreground font-medium cursor-pointer leading-relaxed py-1 break-words"
                  >
                    {option}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
