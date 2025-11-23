import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight } from 'lucide-react';

interface QuizNavigationProps {
  currentQuestion: number;
  totalQuestions: number;
  hasAnswer: boolean;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isWaitingForOpponent?: boolean;
  opponentName?: string;
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentQuestion,
  totalQuestions,
  hasAnswer: _hasAnswer, // Acknowledge but don't use for now
  onNext,
  onSubmit,
  isSubmitting = false,
  isWaitingForOpponent = false,
  opponentName = 'opponent'
}) => {
  const isLastQuestion = currentQuestion === totalQuestions;

  return (
    <div className="bg-card rounded-lg shadow-sm border p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Question Progress - Mobile First */}
        <div className="flex items-center justify-between sm:justify-start sm:gap-4">
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
            <span>Question</span>
            <span className="font-semibold text-foreground text-base sm:text-lg">
              {currentQuestion}
            </span>
            <span>of</span>
            <span className="font-semibold text-foreground text-base sm:text-lg">
              {totalQuestions}
            </span>
          </div>
          
          {/* Auto-advance info - Hidden on mobile to save space */}
          <div className="hidden sm:block text-center flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Auto-advances after 30 seconds
            </p>
          </div>
        </div>

        {/* Waiting for opponent message */}
        {isWaitingForOpponent && (
          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              ⏳ Waiting for {opponentName} to answer...
            </p>
          </div>
        )}

        {/* Navigation Button - Full width on mobile */}
        <div className="flex justify-end">
          {isLastQuestion ? (
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || isWaitingForOpponent}
              className="w-full sm:w-auto sm:min-w-[140px] bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : isWaitingForOpponent ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Waiting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Submit Quiz
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={onNext}
              disabled={isWaitingForOpponent}
              className="w-full sm:w-auto sm:min-w-[140px] disabled:opacity-50"
            >
              {isWaitingForOpponent ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Waiting...
                </>
              ) : (
                <>
                  Next Question
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizNavigation;
