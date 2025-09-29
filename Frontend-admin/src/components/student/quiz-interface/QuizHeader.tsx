import React from 'react';
import { BookOpen } from 'lucide-react';

interface QuizHeaderProps {
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining: number;
  questionTimeRemaining: number;
  onTimeUp?: () => void; // Made optional since it's not used in this component
  quizTitle?: string;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const QuizHeader: React.FC<QuizHeaderProps> = ({
  currentQuestion,
  totalQuestions,
  timeRemaining,
  questionTimeRemaining,
  quizTitle = "Quiz Assessment"
}) => {
  return (
    <div className="bg-card rounded-lg shadow-sm border p-3 md:p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
        {/* Quiz Title - Compact on mobile */}
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="md:w-5 md:h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold text-foreground truncate">{quizTitle}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Question {currentQuestion} of {totalQuestions}
            </p>
          </div>
        </div>

        {/* Timer Section - Horizontal on mobile */}
        <div className="flex items-center space-x-3 md:space-x-6 flex-shrink-0">
          {/* Question Timer */}
          <div className="text-center">
            <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">
              Question
            </div>
            <div className={`text-lg md:text-xl font-bold ${
              questionTimeRemaining <= 10 
                ? 'text-red-500 animate-pulse' 
                : questionTimeRemaining <= 20 
                  ? 'text-yellow-500' 
                  : 'text-foreground'
            }`}>
              {questionTimeRemaining}s
            </div>
          </div>

          {/* Overall Timer */}
          <div className="text-center">
            <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">
              Total
            </div>
            <div className={`text-lg md:text-xl font-bold ${
              timeRemaining <= 300 
                ? 'text-red-500 animate-pulse' 
                : timeRemaining <= 600 
                  ? 'text-yellow-500' 
                  : 'text-foreground'
            }`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Question Timer Progress Bar - Simplified on mobile */}
      <div className="mt-3 md:mt-4">
        <div className="w-full bg-muted rounded-full h-1.5 md:h-2">
          <div 
            className={`h-1.5 md:h-2 rounded-full transition-all duration-1000 ${
              questionTimeRemaining <= 10 
                ? 'bg-red-500' 
                : questionTimeRemaining <= 20 
                  ? 'bg-yellow-500' 
                  : 'bg-green-500'
            }`}
            style={{ 
              width: `${(questionTimeRemaining / 30) * 100}%` 
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span className="hidden sm:inline">Question auto-advances at 0 seconds</span>
          <span className="sm:hidden">Auto-advance at 0s</span>
          <span>{questionTimeRemaining}s remaining</span>
        </div>
      </div>
    </div>
  );
};

export default QuizHeader;
