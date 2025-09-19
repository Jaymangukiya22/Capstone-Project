import React from 'react';
import { BookOpen } from 'lucide-react';

interface QuizHeaderProps {
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining: number;
  questionTimeRemaining: number;
  onTimeUp: () => void;
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
  onTimeUp,
  quizTitle = "Quiz Assessment"
}) => {
  return (
    <div className="bg-card rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Quiz Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{quizTitle}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion} of {totalQuestions}
            </p>
          </div>
        </div>

        {/* Timer Section */}
        <div className="flex items-center space-x-6">
          {/* Question Timer */}
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Question Time
            </div>
            <div className={`text-lg font-bold ${
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
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Total Time
            </div>
            <div className={`text-lg font-bold ${
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

      {/* Question Timer Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-1000 ${
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
          <span>Question auto-advances at 0 seconds</span>
          <span>{questionTimeRemaining}s remaining</span>
        </div>
      </div>
    </div>
  );
};

export default QuizHeader;
