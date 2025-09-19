import React, { useState, useEffect } from 'react';
import type { QuizResults as QuizResultsType } from '@/types/quiz';
import ScoreDisplay from './quiz-results/ScoreDisplay';
import Leaderboard from './quiz-results/Leaderboard';
import ActionButtons from './quiz-results/ActionButtons';

const QuizResults: React.FC = () => {
  const [quizData, setQuizData] = useState<QuizResultsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get results from sessionStorage
    const storedResults = sessionStorage.getItem('quizResults');
    if (storedResults) {
      const results = JSON.parse(storedResults);
      setQuizData(results);
    } else {
      // Fallback mock data
      setQuizData({
        score: 8,
        totalQuestions: 10,
        timeSpent: 480,
        completedAt: new Date().toISOString(),
        studentName: "Current Student",
        answers: []
      });
    }
    setLoading(false);
  }, []);

  const handleRetakeQuiz = () => {
    sessionStorage.removeItem('quizResults');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load quiz results. Please try again.</p>
        </div>
      </div>
    );
  }

  const percentage = Math.round((quizData.score / quizData.totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Full-screen quiz mode indicator */}
      <div className="absolute top-4 right-4 z-50">
        <div className="bg-green-500/10 text-green-600 text-xs px-3 py-1 rounded-full border border-green-500/20">
          Quiz Completed - Full Screen
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8 animate-in fade-in duration-600">
          {/* Completion Header */}
          <div className="text-center py-4 animate-in slide-in-from-top duration-600 delay-100">
            <p className="text-sm text-muted-foreground">
              Quiz completed on {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Time: {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>

          {/* Main Score Display */}
          <div className="animate-in zoom-in duration-600 delay-200">
            <ScoreDisplay
              score={quizData.score}
              totalQuestions={quizData.totalQuestions}
              percentage={percentage}
            />
          </div>

          {/* Leaderboard */}
          <div className="animate-in slide-in-from-bottom duration-600 delay-400">
            <Leaderboard
              currentScore={quizData.score}
              totalQuestions={quizData.totalQuestions}
            />
          </div>

          {/* Action Buttons */}
          <div className="animate-in slide-in-from-bottom duration-600 delay-600">
            <ActionButtons
              onRetakeQuiz={handleRetakeQuiz}
              showRetake={true}
            />
          </div>

          {/* Footer Message */}
          <div className="text-center py-8 animate-in fade-in duration-600 delay-800">
            <div className="bg-card rounded-lg p-6 border">
              <p className="text-muted-foreground mb-2">
                Thank you for taking the quiz! Check your ranking above.
              </p>
              <p className="text-sm text-muted-foreground">
                Keep practicing to climb the leaderboard!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
