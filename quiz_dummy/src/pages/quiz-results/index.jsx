// Quiz results page index
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ScoreDisplay from './components/ScoreDisplay';
import Leaderboard from './components/Leaderboard';
import ActionButtons from './components/ActionButtons';
import CelebrationAnimation from './components/CelebrationAnimation';

const QuizResults = () => {
  const [quizData, setQuizData] = useState(null);
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
        completedAt: new Date()?.toISOString(),
        studentName: "Current Student"
      });
    }
    setLoading(false);
  }, []);

  const handleRetakeQuiz = () => {
    sessionStorage.removeItem('quizResults');
    window.location.href = '/quiz-countdown';
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
          <p className="text-error">Failed to load quiz results. Please try again.</p>
        </div>
      </div>
    );
  }

  const percentage = Math.round((quizData?.score / quizData?.totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Celebration Animation */}
          <CelebrationAnimation 
            score={quizData?.score}
            totalQuestions={quizData?.totalQuestions}
          />

          {/* Main Score Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <ScoreDisplay
              score={quizData?.score}
              totalQuestions={quizData?.totalQuestions}
              percentage={percentage}
            />
          </motion.div>

          {/* Leaderboard - Replace PerformanceMetrics and QuestionReview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Leaderboard
              currentScore={quizData?.score}
              totalQuestions={quizData?.totalQuestions}
            />
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <ActionButtons
              onRetakeQuiz={handleRetakeQuiz}
              showRetake={true}
            />
          </motion.div>

          {/* Footer Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center py-8"
          >
            <div className="bg-card rounded-lg p-6 border">
              <p className="text-muted-foreground mb-2">
                Thank you for taking the quiz! Check your ranking above.
              </p>
              <p className="text-sm text-muted-foreground">
                Keep practicing to climb the leaderboard!
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuizResults;