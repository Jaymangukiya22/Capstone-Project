import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, BookOpen, Target, Calendar, ChevronLeft, ChevronRight, Swords, Bot, Trophy } from "lucide-react"
import { quizAttemptService } from '@/services/quizAttemptService'
import type { QuizAttempt } from '@/services/quizAttemptService'
import { apiClient } from '@/services/api'

interface FriendMatch {
  matchId: string
  quiz: {
    id: number
    title: string
    difficulty: string
    category: { id: number; name: string }
  }
  myStats: {
    score: number
    correctAnswers: number
    timeSpent: number
    rank: number
    isWinner: boolean
  }
  opponent: {
    username: string
    score: number
    correctAnswers: number
  } | null
  result: 'WON' | 'LOST' | 'TIE'
  scoreDifference: number
  status: string
  playedAt: string
  completedAt: string
}

interface CombinedResult {
  id: string
  type: 'SOLO_VS_AI' | 'PLAY_WITH_FRIEND'
  quiz: any
  score: number
  correctAnswers: number
  totalQuestions: number
  timeSpent: number
  status: string
  completedAt: string
  createdAt: string
  // Friend match specific
  opponent?: any
  result?: string
  isWinner?: boolean
  rank?: number
}

export function MyResults() {
  const [results, setResults] = useState<CombinedResult[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalAttempts, setTotalAttempts] = useState(0)

  useEffect(() => {
    fetchResults()
  }, [currentPage])

  const fetchResults = async () => {
    setLoading(true)
    try {
      // Fetch Solo VS AI attempts
      const attemptsResult = await quizAttemptService.getUserAttempts(currentPage, 10)
      const attempts = attemptsResult.attempts || []

      // Fetch Friend Matches
      const matchesResponse = await apiClient.get('/performance/my-matches')
      const matches: FriendMatch[] = matchesResponse.data.success ? matchesResponse.data.data.matches : []

      // Combine both into unified format
      const soloResults: CombinedResult[] = attempts.map(attempt => ({
        id: `solo-${attempt.id}`,
        type: 'SOLO_VS_AI' as const,
        quiz: attempt.quiz,
        score: attempt.score,
        correctAnswers: attempt.correctAnswers,
        totalQuestions: attempt.totalQuestions,
        timeSpent: attempt.timeSpent || 0,
        status: attempt.status,
        completedAt: attempt.completedAt || '',
        createdAt: attempt.createdAt || ''
      }))

      const friendResults: CombinedResult[] = matches.map(match => ({
        id: `friend-${match.matchId}`,
        type: 'PLAY_WITH_FRIEND' as const,
        quiz: match.quiz,
        score: match.myStats.score,
        correctAnswers: match.myStats.correctAnswers,
        totalQuestions: 10, // Friend matches have 10 questions
        timeSpent: match.myStats.timeSpent,
        status: match.status,
        completedAt: match.completedAt,
        createdAt: match.playedAt,
        opponent: match.opponent,
        result: match.result,
        isWinner: match.myStats.isWinner,
        rank: match.myStats.rank
      }))

      // Combine and sort by date (most recent first)
      const combined = [...soloResults, ...friendResults].sort((a, b) => 
        new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
      )

      setResults(combined)
      setTotalPages(Math.ceil(combined.length / 10))
      setTotalAttempts(combined.length)
    } catch (error) {
      console.error('Error fetching results:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (seconds: number | undefined) => {
    if (!seconds) return '0m'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes === 0) return `${remainingSeconds}s`
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  const getDifficultyVariant = (difficulty: string | undefined): "default" | "secondary" | "destructive" => {
    switch (difficulty?.toUpperCase()) {
      case 'EASY': return 'secondary'
      case 'MEDIUM': return 'default'
      case 'HARD': return 'destructive'
      default: return 'default'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your quiz history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Previously Played</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Review your quiz performance and track your progress
        </p>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Quiz History</h3>
            <p className="text-gray-600 dark:text-gray-400">
              You haven't taken any quizzes yet. Start playing to see your results here!
            </p>
            <Button 
              className="mt-4"
              onClick={() => window.location.href = '/student-quiz'}
            >
              Browse Quizzes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {results.map((result) => (
              <Card key={result.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">
                          {result.quiz?.title || 'Quiz'}
                        </CardTitle>
                        <Badge variant={getDifficultyVariant(result.quiz?.difficulty)}>
                          {result.quiz?.difficulty || 'MEDIUM'}
                        </Badge>
                        {result.type === 'SOLO_VS_AI' ? (
                          <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
                            <Bot className="h-3 w-3" />
                            Solo VS AI
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 bg-pink-50 text-pink-700 border-pink-200">
                            <Swords className="h-3 w-3" />
                            Friend Match
                            {result.isWinner && ' 🏆'}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        {result.quiz?.description || 'Comprehensive quiz covering key concepts'}
                      </CardDescription>
                      <div className="mt-2 flex items-center gap-4">
                        {result.quiz?.category && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Category: <span className="font-medium">{result.quiz.category.name}</span>
                          </span>
                        )}
                        {result.type === 'PLAY_WITH_FRIEND' && result.opponent && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            vs <span className="font-medium">{result.opponent.username}</span>
                            {result.result === 'WON' && <span className="ml-1 text-green-600">✓ Won</span>}
                            {result.result === 'LOST' && <span className="ml-1 text-red-600">✗ Lost</span>}
                            {result.result === 'TIE' && <span className="ml-1 text-gray-600">○ Tie</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Quiz Overview Section */}
                      <div className="text-center">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Quiz Overview</div>
                        <div className="flex items-center gap-8">
                          {/* Total Questions */}
                          <div className="flex flex-col items-center">
                            <BookOpen className="h-5 w-5 text-blue-500 mb-1" />
                            <div className="text-lg font-semibold">{result.totalQuestions}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Total Questions</div>
                          </div>

                          {/* Duration */}
                          <div className="flex flex-col items-center">
                            <Clock className="h-5 w-5 text-green-500 mb-1" />
                            <div className="text-lg font-semibold">{formatTime(result.timeSpent)}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                          </div>

                          {/* Points */}
                          <div className="flex flex-col items-center">
                            <Target className="h-5 w-5 text-orange-500 mb-1" />
                            <div className={`text-lg font-semibold ${getScoreColor(result.score)}`}>
                              {result.score}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Points</div>
                          </div>

                          {/* Rank (for friend matches) */}
                          {result.type === 'PLAY_WITH_FRIEND' && result.rank && (
                            <div className="flex flex-col items-center">
                              <Trophy className={`h-5 w-5 mb-1 ${result.rank === 1 ? 'text-yellow-500' : 'text-gray-400'}`} />
                              <div className="text-lg font-semibold">#{result.rank}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Rank</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Date and Time */}
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(result.completedAt || result.createdAt)}
                      </div>
                      {result.completedAt && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Completed at {new Date(result.completedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 dark:text-gray-400">
                          Correct Answers: <span className="font-medium text-gray-900 dark:text-white">
                            {result.correctAnswers}/{result.totalQuestions}
                          </span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          Accuracy: <span className="font-medium text-gray-900 dark:text-white">
                            {Math.round((result.correctAnswers / result.totalQuestions) * 100)}%
                          </span>
                        </span>
                        {result.type === 'PLAY_WITH_FRIEND' && result.opponent && (
                          <span className="text-gray-500 dark:text-gray-400">
                            Opponent Score: <span className="font-medium text-gray-900 dark:text-white">
                              {result.opponent.score}
                            </span>
                          </span>
                        )}
                      </div>
                      <Badge 
                        variant={result.status === 'COMPLETED' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {result.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {results.length} of {totalAttempts} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="px-3 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
