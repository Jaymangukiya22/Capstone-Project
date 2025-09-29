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
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentQuestion,
  totalQuestions,
  hasAnswer: _hasAnswer, // Acknowledge but don't use for now
  onNext,
  onSubmit,
  isSubmitting = false
}) => {
  const isLastQuestion = currentQuestion === totalQuestions;

  return (
    <div className="bg-card rounded-lg shadow-sm border p-1.5 sm:p-2 md:p-3">
      {/* Mobile-first layout - Ultra compact for iPhone */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        {/* Top row: Question counter and button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Question</span>
            <span className="font-semibold text-foreground text-base sm:text-lg">
              {currentQuestion}
            </span>
            <span>of</span>
            <span className="font-semibold text-foreground text-base sm:text-lg">
              {totalQuestions}
            </span>
          </div>

          {/* Action Button - Prominent on mobile */}
          {isLastQuestion ? (
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="min-w-[120px] sm:min-w-[140px] bg-green-600 hover:bg-green-700 text-sm sm:text-base"
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                  <span className="hidden sm:inline">Submitting...</span>
                  <span className="sm:hidden">Submit</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Submit Quiz</span>
                  <span className="sm:hidden">Submit</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={onNext}
              className="min-w-[120px] sm:min-w-[140px] text-sm sm:text-base"
              size="sm"
            >
              <span className="hidden sm:inline">Next Question</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
            </Button>
          )}
        </div>

        {/* Bottom row: Instructions - Ultra compact on mobile */}
        <div className="text-center border-t border-border pt-1">
          <p className="text-xs text-muted-foreground">
            <span className="hidden md:inline">Questions advance automatically after 30 seconds. You can also click Next to continue.</span>
            <span className="md:hidden">Auto-advance in 30s</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizNavigation;
