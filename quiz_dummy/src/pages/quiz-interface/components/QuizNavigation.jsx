// QuizNavigation component
import React from 'react';
import Button from '../../../components/ui/Button';

const QuizNavigation = ({
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
            variant="default"
            onClick={onSubmit}
            loading={isSubmitting}
            iconName="Check"
            iconPosition="right"
            className="w-full sm:w-auto min-w-[140px] bg-success hover:bg-success/90"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={onNext}
            iconName="ChevronRight"
            iconPosition="right"
            className="w-full sm:w-auto min-w-[140px]"
          >
            Next Question
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizNavigation;