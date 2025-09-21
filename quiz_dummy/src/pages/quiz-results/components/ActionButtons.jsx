// ActionButtons component
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';

const ActionButtons = ({ 
  onRetakeQuiz = () => {},
  showRetake = true,
  className = ""
}) => {
  const navigate = useNavigate();

  const handleRetakeQuiz = () => {
    onRetakeQuiz();
    navigate('/quiz-countdown');
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleViewQuizInterface = () => {
    navigate('/quiz-interface');
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
              variant="default"
              onClick={handleRetakeQuiz}
              iconName="RotateCcw"
              iconPosition="left"
              className="flex-1 min-w-[180px] bg-primary hover:bg-primary/90"
            >
              Retake Quiz
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleViewQuizInterface}
            iconName="Eye"
            iconPosition="left"
            className="flex-1 min-w-[180px]"
          >
            Review Questions
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleBackToDashboard}
            iconName="Home"
            iconPosition="left"
            className="flex-1 min-w-[180px]"
          >
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