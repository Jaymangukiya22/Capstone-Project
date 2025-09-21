import React from 'react';
import { Clock, FileText, Timer, Target, Info } from 'lucide-react';

interface QuizPreparationProps {
  isVisible: boolean;
}

const QuizPreparation: React.FC<QuizPreparationProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 animate-in slide-in-from-bottom duration-600">
      <div className="bg-card/90 backdrop-blur-sm rounded-lg shadow-lg border p-6 animate-pulse">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2 animate-in fade-in duration-400">
            <Clock size={24} className="text-primary mr-2" />
            <h3 className="text-lg font-semibold text-foreground">Get Ready!</h3>
          </div>
          <p className="text-sm text-muted-foreground animate-in fade-in duration-400 delay-100">
            Your quiz is about to begin
          </p>
        </div>

        <div className="space-y-3 animate-in fade-in duration-400 delay-200">
          <div className="flex items-center text-sm text-foreground">
            <FileText size={16} className="text-primary mr-3 flex-shrink-0" />
            <span>10 multiple choice questions</span>
          </div>
          
          <div className="flex items-center text-sm text-foreground">
            <Timer size={16} className="text-primary mr-3 flex-shrink-0" />
            <span>30 seconds per question</span>
          </div>
          
          <div className="flex items-center text-sm text-foreground">
            <Target size={16} className="text-primary mr-3 flex-shrink-0" />
            <span>Answer all questions to complete</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border animate-in fade-in duration-400 delay-300">
          <div className="flex items-center justify-center text-xs text-muted-foreground">
            <Info size={14} className="mr-2" />
            <span>Questions advance automatically when time runs out</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPreparation;
