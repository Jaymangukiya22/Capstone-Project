import React, { useEffect, useState } from 'react';
import { quizSessionManager } from '@/utils/quizSessionManager';

interface QuizRouteGuardProps {
  children: React.ReactNode;
  routeType: 'quiz' | 'results';
}

export const QuizRouteGuard: React.FC<QuizRouteGuardProps> = ({ children, routeType }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateAccess = () => {
      let validation;
      
      if (routeType === 'quiz') {
        validation = quizSessionManager.validateQuizAccess();
      } else {
        validation = quizSessionManager.validateResultsAccess();
      }

      if (!validation.canAccess) {
        console.warn(`Access denied to ${routeType}:`, validation.reason);
        
        // Redirect to appropriate page
        if (validation.redirectTo) {
          window.location.href = validation.redirectTo;
          return;
        }
      }

      setIsValid(validation.canAccess);
      setIsValidating(false);
    };

    validateAccess();
  }, [routeType]);

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validating access...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
          <button 
            onClick={() => window.location.href = '/student-quiz'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Quiz Selection
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
