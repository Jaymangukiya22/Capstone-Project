import React, { useState, useEffect } from 'react';
import type { QuizResults as QuizResultsType } from '@/types/quiz';
import ScoreDisplay from './quiz-results/ScoreDisplay';
import Leaderboard from './quiz-results/Leaderboard';
import FriendMatchLeaderboard from './quiz-results/FriendMatchLeaderboard';
import ActionButtons from './quiz-results/ActionButtons';

export function QuizResults() {
  const [quizData, setQuizData] = useState<any>(null);
  const [friendMatchData, setFriendMatchData] = useState<any>(null);
  const [isFriendMatch, setIsFriendMatch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user's username
  const getCurrentUsername = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.username || user.email || 'Current Student';
      }
    } catch (e) {}
    return 'Current Student';
  };

  useEffect(() => {
    // Check for friend match results first
    const friendMatchResults = sessionStorage.getItem('friendMatchResults');
    if (friendMatchResults) {
      const results = JSON.parse(friendMatchResults);
      setFriendMatchData(results);
      setIsFriendMatch(true);
      setIsLoading(false);
      return;
    }

    // Get regular quiz results from sessionStorage
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
    setIsLoading(false);
  }, []);

  const handleRetakeQuiz = () => {
    if (isFriendMatch) {
      sessionStorage.removeItem('friendMatchResults');
      sessionStorage.removeItem('friendMatch');
    } else {
      sessionStorage.removeItem('quizResults');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!quizData && !friendMatchData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load quiz results. Please try again.</p>
        </div>
      </div>
    );
  }

  // Calculate percentage based on match type
  const percentage = isFriendMatch && friendMatchData
    ? (() => {
        if (friendMatchData.results) {
          const currentUser = friendMatchData.results.find((r: any) => r.username === getCurrentUsername());
          return Math.round((currentUser?.score || 0) / (currentUser?.answers?.length || 1) * 100);
        } else if (friendMatchData.playerResults) {
          return Math.round((friendMatchData.playerResults.score || 0) / (friendMatchData.playerResults.answers?.length || 1) * 100);
        }
        return 0;
      })()
    : Math.round(((quizData?.score || 0) / (quizData?.totalQuestions || 1)) * 100);

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
            {isFriendMatch && friendMatchData ? (
              <ScoreDisplay
                score={friendMatchData.results ? 
                  friendMatchData.results.find((r: any) => r.username === getCurrentUsername())?.score || 0 :
                  friendMatchData.playerResults?.score || 0
                }
                totalQuestions={friendMatchData.results ? 
                  friendMatchData.results.find((r: any) => r.username === getCurrentUsername())?.answers?.length || 2 :
                  friendMatchData.playerResults?.answers?.length || 2
                }
                percentage={percentage}
              />
            ) : (
              <ScoreDisplay
                score={quizData?.score || 0}
                totalQuestions={quizData?.totalQuestions || 10}
                percentage={percentage}
              />
            )}
          </div>

          {/* Leaderboard - Different for friend matches */}
          <div className="animate-in slide-in-from-bottom duration-600 delay-400">
            {isFriendMatch && friendMatchData ? (
              <FriendMatchLeaderboard
                rankings={(() => {
                  // Handle different data structures
                  if (friendMatchData.rankings) return friendMatchData.rankings;
                  if (friendMatchData.results && Array.isArray(friendMatchData.results)) {
                    // Transform results to rankings format
                    return friendMatchData.results.map((result: any, index: number) => ({
                      rank: index + 1,
                      userId: result.userId || result.id || index + 1,
                      username: result.username || `Player ${index + 1}`,
                      score: result.score || 0,
                      correctAnswers: result.correctAnswers || result.correct || 0,
                      totalAnswers: result.totalAnswers || result.total || result.answers?.length || 2
                    }));
                  }
                  return [];
                })()}
                winner={friendMatchData.winner}
                matchId={friendMatchData.matchId || 'unknown'}
              />
            ) : (
              <Leaderboard
                currentScore={quizData?.score || 0}
                totalQuestions={quizData?.totalQuestions || 10}
              />
            )}
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
