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
  hasAnswer,
  onNext,
  onSubmit,
  isSubmitting = false
}) => {
  const isLastQuestion = currentQuestion === totalQuestions;

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>Question</span>
          <span className="font-semibold text-foreground text-lg">
            {currentQuestion}
          </span>
          <span>of</span>
          <span className="font-semibold text-foreground text-lg">
            {totalQuestions}
          </span>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Questions advance automatically after 30 seconds
          </p>
          <p className="text-xs text-muted-foreground">
            You can also click Next to continue
          </p>
        </div>

        {isLastQuestion ? (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[140px] bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
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
            className="w-full sm:w-auto min-w-[140px]"
          >
            Next Question
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizNavigation;
