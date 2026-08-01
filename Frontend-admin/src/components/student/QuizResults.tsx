import { useEffect, useMemo, useState } from 'react';
import ScoreDisplay from './quiz-results/ScoreDisplay';
import Leaderboard from './quiz-results/Leaderboard';
import FriendMatchLeaderboard from './quiz-results/FriendMatchLeaderboard';
import { useResultsNavigationGuard } from '@/hooks/useNavigationGuard';
import { apiClient } from '@/services/api';
import { Clock, Zap, Home, Award, RefreshCw } from 'lucide-react';

const toArray = <T,>(value: unknown): T[] => {
  return Array.isArray(value) ? (value as T[]) : []
}

const normalizeFriendMatchData = (data: any) => {
  const results = toArray<any>(data?.results).map((player: any) => ({
    ...player,
    answers: toArray<any>(player?.answers),
  }))

  return {
    ...data,
    results,
  }
}

const getQuestionIds = (players: any[]): number[] => {
  const ids = new Set<number>()
  for (const player of players) {
    for (const answer of toArray<any>(player?.answers)) {
      if (typeof answer?.questionId === 'number') ids.add(answer.questionId)
    }
  }
  return Array.from(ids)
}

export function QuizResults() {
  const [quizData, setQuizData] = useState<any>(null);
  const [friendMatchData, setFriendMatchData] = useState<any>(null);
  const [isFriendMatch, setIsFriendMatch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const friendResults = useMemo(() => {
    if (!isFriendMatch) return []
    return toArray<any>(friendMatchData?.results)
  }, [friendMatchData, isFriendMatch])

  const questionIds = useMemo(() => {
    return getQuestionIds(friendResults)
  }, [friendResults])

  const playerNames = useMemo(() => {
    return friendResults.map((player: any) => player?.username || 'Player')
  }, [friendResults])

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

  // Prevent going back to quiz from results
  useResultsNavigationGuard();

  useEffect(() => {
    const loadResults = async () => {
      try {
        // Clear any remaining quiz session data to prevent re-entry
        sessionStorage.removeItem('currentQuiz');
        
        // Check for friend match results first
        const friendMatchResults = sessionStorage.getItem('friendMatchResults');
        if (friendMatchResults) {
          const results = JSON.parse(friendMatchResults);
          console.log('🔍 QuizResults: Friend match data from session:', results);
          
          // Note: Backend does not expose /friend-matches/:matchId/results.
          // Also, auto-match ids (auto_*) are not stored as friend matches.
          // Prefer session results as the source of truth.
          const matchId = typeof results.matchId === 'string' ? results.matchId : ''
          const shouldTryDbFetch = false

          // If we have a matchId, optionally fetch REAL data from database
          if (shouldTryDbFetch && matchId && !matchId.startsWith('auto_')) {
            console.log('📡 Fetching REAL results from DATABASE for matchId:', results.matchId);
            
            try {
              // Don't add /api prefix - apiClient base URL already includes it!
              const response = await apiClient.get(`/friend-matches/${results.matchId}/results`);
              console.log('✅ DATABASE RESULTS:', response.data);
              
              if (response.data.success && response.data.data) {
                const dbData = response.data.data;
                
                // Store REAL database data
                setFriendMatchData({
                  matchId: dbData.matchId,
                  quizTitle: dbData.quizTitle,
                  results: dbData.results,
                  winner: dbData.winner,
                  totalQuestions: dbData.totalQuestions,
                  completedAt: dbData.endedAt || new Date().toISOString(),
                  isFriendMatch: true
                });
                
                setIsFriendMatch(true);
                setIsLoading(false);
                return;
              }
            } catch (apiError: any) {
              console.error('❌ Database fetch failed, using session data:', apiError);
              // Fall back to session storage
            }
          }
          
          // Fallback to session storage if API fails
          setFriendMatchData(normalizeFriendMatchData(results));
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
      } catch (error) {
        console.error('Error loading results:', error);
        setIsLoading(false);
      }
    };

    loadResults();
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
          const results = toArray<any>(friendMatchData.results)
          const currentUser = results.find((r: any) => r.username === getCurrentUsername());
          const answers = toArray<any>(currentUser?.answers)
          return Math.round((currentUser?.score || 0) / (answers.length || 1) * 100);
        } else if (friendMatchData.playerResults) {
          const answers = toArray<any>(friendMatchData.playerResults.answers)
          return Math.round((friendMatchData.playerResults.score || 0) / (answers.length || 1) * 100);
        }
        return 0;
      })()
    : Math.round(((quizData?.score || 0) / (quizData?.totalQuestions || 1)) * 100);

  // Get current user data for friend match
  const getCurrentUserData = () => {
    if (!friendMatchData?.results) return null;
    const results = toArray<any>(friendMatchData.results)
    return results.find((r: any) => r.username === getCurrentUsername());
  };

  const currentUserData = isFriendMatch ? getCurrentUserData() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative">
      {/* Full-screen quiz mode indicator */}
      <div className="absolute top-4 right-4 z-50">
        <div className="bg-green-500/10 text-green-600 text-xs px-3 py-1.5 rounded-full border border-green-500/20 backdrop-blur-sm">
          ✓ Match Completed
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* FRIEND MATCH RESULTS */}
          {isFriendMatch && friendMatchData ? (
            <>
              {/* FRIEND MATCH LEADERBOARD */}
              <div className="animate-in slide-in-from-bottom duration-500 delay-100">
                <FriendMatchLeaderboard
                  rankings={(() => {
                    console.log('🔍 Processing friendMatchData for rankings:', friendMatchData);
                    
                    if (friendMatchData.rankings) {
                      console.log('✅ Using direct rankings:', friendMatchData.rankings);
                      return friendMatchData.rankings;
                    }
                    
                    if (friendMatchData.results && Array.isArray(friendMatchData.results)) {
                      const transformedRankings = friendMatchData.results.map((result: any, index: number) => ({
                        rank: index + 1,
                        userId: result.userId || result.id || index + 1,
                        username: result.username || `Player ${index + 1}`,
                        score: result.score || 0,
                        correctAnswers: result.correctAnswers || result.correct || 0,
                        totalAnswers: result.totalAnswers || result.total || result.answers?.length || 10
                      }));
                      console.log('🔄 Transformed rankings from results:', transformedRankings);
                      return transformedRankings;
                    }
                    
                    if (friendMatchData.playerResults) {
                      const currentUser = getCurrentUsername();
                      const fallbackRanking = [{
                        rank: 1,
                        userId: 1,
                        username: currentUser,
                        score: friendMatchData.playerResults.score || 0,
                        correctAnswers: friendMatchData.playerResults.score || 0,
                        totalAnswers: friendMatchData.playerResults.answers?.length || 10
                      }];
                      console.log('📝 Created fallback ranking for individual completion:', fallbackRanking);
                      return fallbackRanking;
                    }
                    
                    console.log('❌ No valid data found, returning empty array');
                    return [];
                  })()}
                  winner={friendMatchData.winner}
                  matchId={friendMatchData.matchId || 'unknown'}
                />
              </div>
{/* 
              {/* 3. MATCH STATISTICS
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom duration-500 delay-200">
              
                <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">Performance</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Correct Answers</span>
                      <span className="font-bold text-lg">{currentUserData?.correctAnswers || 0}/{friendMatchData.totalQuestions || 10}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Accuracy</span>
                      <span className="font-bold text-lg text-green-500">{currentUserData?.accuracy || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Score</span>
                      <span className="font-bold text-lg text-primary">{currentUserData?.score || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* Stats Card 2 *
                <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="font-semibold">Quick Stats</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Time/Question</span>
                      <span className="font-bold text-lg">
                        {currentUserData?.answers ? 
                          (currentUserData.answers.reduce((acc: number, a: any) => acc + (a.timeSpent || 0), 0) / currentUserData.answers.length).toFixed(1) 
                          : '0.0'}s
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Fastest Answer</span>
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold text-lg">
                          {currentUserData?.answers ? 
                            Math.min(...currentUserData.answers.map((a: any) => a.timeSpent || 15)) 
                            : 0}s
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Best Score/Q</span>
                      <span className="font-bold text-lg text-yellow-500">
                        {currentUserData?.answers ? 
                          Math.max(...currentUserData.answers.map((a: any) => a.points || 0)) 
                          : 0} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div> 
              */}

              {/* 4. SCORE BREAKDOWN */}
              <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 sm:p-6 animate-in slide-in-from-bottom duration-500 delay-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Award className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Score Breakdown</h3>
                    <p className="text-xs text-muted-foreground">See how your points were calculated</p>
                  </div>
                </div>

                {/* Scoring Formula */}
                <div className="mb-4 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded bg-primary/10 mt-0.5">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">Scoring Formula</h4>
                      <code className="block text-xs bg-background/50 px-2 py-1 rounded break-words whitespace-normal">
                        Points = 100 (base) + (15s - timeSpent) × 2 (time bonus)
                      </code>
                      <p className="text-xs text-muted-foreground mt-2">
                        ⚡ Answer faster to earn more points! Max 15s per question.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question-by-Question Breakdown */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {toArray<any>(currentUserData?.answers).map((answer: any, index: number) => {
                    const timeBonus = Math.max(0, Math.floor((15 - answer.timeSpent) * 2));
                    const basePoints = 100;
                    return (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            answer.isCorrect ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">Question {index + 1}</span>
                              {answer.isCorrect ? (
                                <span className="text-xs text-green-500">✓ Correct</span>
                              ) : (
                                <span className="text-xs text-red-500">✗ Wrong</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{answer.timeSpent}s</span>
                              {answer.timeSpent < 10 && (
                                <span className="text-xs text-yellow-500 flex items-center gap-1">
                                  <Zap className="w-3 h-3" /> Fast!
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-lg">{answer.points}</div>
                          <div className="text-xs text-muted-foreground">
                            {basePoints} + {timeBonus} bonus
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6. ATTEMPTS (BOTH PLAYERS) */}
              {friendResults.length > 0 && (
                <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 sm:p-6 animate-in slide-in-from-bottom duration-500 delay-350">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Award className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Attempts</h3>
                      <p className="text-xs text-muted-foreground">Per-question answers for both players</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-4">Q</th>
                          {playerNames.map((name: string, idx: number) => (
                            <th key={idx} className="py-2 pr-4 min-w-[220px]">{name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {questionIds.map((questionId: number, index: number) => (
                          <tr key={questionId} className="border-b last:border-b-0">
                            <td className="py-3 pr-4 font-medium">{index + 1}</td>
                            {friendResults.map((player: any, playerIdx: number) => {
                              const answers = toArray<any>(player?.answers)
                              const answer = answers.find(a => a?.questionId === questionId)
                              const selected = toArray<number>(answer?.selectedOptions)
                              const correct = toArray<number>(answer?.correctOptions)
                              const isCorrect = Boolean(answer?.isCorrect)
                              const timeSpent = typeof answer?.timeSpent === 'number' ? answer.timeSpent : null
                              const points = typeof answer?.points === 'number' ? answer.points : null

                              return (
                                <td key={playerIdx} className="py-3 pr-4 align-top">
                                  {answer ? (
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground">
                                        Selected: {selected.length > 0 ? selected.join(', ') : '—'}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Correct: {correct.length > 0 ? correct.join(', ') : '—'}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className={isCorrect ? 'text-green-500' : 'text-red-500'}>
                                          {isCorrect ? 'Correct' : 'Wrong'}
                                        </span>
                                        <span className="text-muted-foreground">
                                          Time: {timeSpent !== null ? `${timeSpent}s` : '—'}
                                        </span>
                                        <span className="text-muted-foreground">
                                          Pts: {points !== null ? points : '—'}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground">—</div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. PLAY AGAIN + BACK TO DASHBOARD BUTTONS */}
              <div className="flex flex-wrap justify-center gap-3 animate-in slide-in-from-bottom duration-500 delay-400">
                <button
                  onClick={() => {
                    sessionStorage.removeItem('friendMatchResults');
                    sessionStorage.removeItem('friendMatch');
                    window.location.href = '/matchmaking';
                  }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg"
                >
                  <RefreshCw className="w-5 h-5" />
                  Play Again
                </button>
                <button
                  onClick={() => {
                    sessionStorage.removeItem('friendMatchResults');
                    sessionStorage.removeItem('friendMatch');
                    window.location.href = '/student/dashboard';
                  }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 transition-all hover:scale-105 shadow-lg"
                >
                  <Home className="w-5 h-5" />
                  Back to Dashboard
                </button>
              </div>
            </>
          ) : (
            // REGULAR QUIZ RESULTS (Keep existing layout)
            <>
              <div className="animate-in zoom-in duration-600 delay-200">
                <ScoreDisplay
                  score={quizData?.score || 0}
                  totalQuestions={quizData?.totalQuestions || 10}
                  percentage={percentage}
                />
              </div>

              <div className="animate-in slide-in-from-bottom duration-600 delay-400">
                <Leaderboard
                  currentScore={quizData?.score || 0}
                  totalQuestions={quizData?.totalQuestions || 10}
                />
              </div>

              <div className="flex justify-center animate-in slide-in-from-bottom duration-600 delay-600">
                <button
                  onClick={() => {
                    handleRetakeQuiz();
                    window.location.href = '/student/dashboard';
                  }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg"
                >
                  <Home className="w-5 h-5" />
                  Back to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
