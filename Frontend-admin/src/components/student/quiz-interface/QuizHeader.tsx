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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Quiz Title - Mobile optimized */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {quizTitle}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Question {currentQuestion} of {totalQuestions}
            </p>
          </div>
        </div>

        {/* Timer Section - Mobile optimized */}
        <div className="flex items-center justify-end space-x-3 sm:space-x-6">
          {/* Question Timer */}
          <div className="text-center">
            <div className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">
              Question
            </div>
            <div className={`text-lg sm:text-2xl font-bold ${
              questionTimeRemaining <= 10 
                ? 'text-red-600 animate-pulse' 
                : questionTimeRemaining <= 20 
                  ? 'text-yellow-600' 
                  : 'text-gray-900 dark:text-white'
            }`}>
              {questionTimeRemaining}s
            </div>
          </div>

          {/* Overall Timer */}
          <div className="text-center">
            <div className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">
              Total
            </div>
            <div className={`text-lg sm:text-2xl font-bold ${
              timeRemaining <= 300 
                ? 'text-red-600 animate-pulse' 
                : timeRemaining <= 600 
                  ? 'text-yellow-600' 
                  : 'text-gray-900 dark:text-white'
            }`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Question Timer Progress Bar - Mobile optimized */}
      <div className="mt-3 sm:mt-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
          <div 
            className={`h-1.5 sm:h-2 rounded-full transition-all duration-1000 ${
              questionTimeRemaining <= 10 
                ? 'bg-red-600' 
                : questionTimeRemaining <= 20 
                  ? 'bg-yellow-600' 
                  : 'bg-green-600'
            }`}
            style={{ 
              width: `${(questionTimeRemaining / 30) * 100}%` 
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span className="hidden sm:inline">Auto-advances in {questionTimeRemaining} seconds</span>
          <span className="sm:hidden">Auto-advance: {questionTimeRemaining}s</span>
          <span>{questionTimeRemaining}s</span>
        </div>
      </div>
    </div>
  );
};
export default QuizHeader;
