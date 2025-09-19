import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Eye, Home } from 'lucide-react';

interface ActionButtonsProps {
  onRetakeQuiz?: () => void;
  showRetake?: boolean;
  className?: string;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  onRetakeQuiz = () => {},
  showRetake = true,
  className = ""
}) => {
  const handleRetakeQuiz = () => {
    onRetakeQuiz();
    window.location.pathname = '/quiz-countdown';
  };

  const handleBackToDashboard = () => {
    window.location.pathname = '/student';
  };

  const handleViewQuizInterface = () => {
    window.location.pathname = '/quiz-interface';
  };

  return (
    <div className={`bg-card rounded-xl shadow-sm p-6 border ${className}`}>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-foreground mb-4">
          What would you like to do next?
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
          {showRetake && (
            <Button
              onClick={handleRetakeQuiz}
              className="flex-1 min-w-[180px] bg-primary hover:bg-primary/90"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Quiz
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleViewQuizInterface}
            className="flex-1 min-w-[180px]"
          >
            <Eye className="h-4 w-4 mr-2" />
            Review Questions
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleBackToDashboard}
            className="flex-1 min-w-[180px]"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <div className="mt-6 text-sm text-muted-foreground">
          <p>Great job completing the quiz! You can retake it anytime to improve your score.</p>
        </div>
      </div>
    </div>
  );
};

export default ActionButtons;
