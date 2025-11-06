import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, BookOpen, Target, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { quizAttemptService } from '@/services/quizAttemptService'
import type { QuizAttempt } from '@/services/quizAttemptService'

export function MyResults() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalAttempts, setTotalAttempts] = useState(0)

  useEffect(() => {
    fetchAttempts()
  }, [currentPage])

  const fetchAttempts = async () => {
    setLoading(true)
    try {
      const result = await quizAttemptService.getUserAttempts(currentPage, 10)
      setAttempts(result.attempts || [])
      setTotalPages(result.pagination?.totalPages || 1)
      setTotalAttempts(result.pagination?.totalAttempts || 0)
    } catch (error) {
      console.error('Error fetching attempts:', error)
      setAttempts([])
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

      {attempts.length === 0 ? (
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
            {attempts.map((attempt) => (
              <Card key={attempt.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">
                          {attempt.quiz?.title || `Quiz #${attempt.quizId}`}
                        </CardTitle>
                        <Badge variant={getDifficultyVariant(attempt.quiz?.difficulty)}>
                          {attempt.quiz?.difficulty || 'MEDIUM'}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {attempt.quiz?.description || 'Comprehensive quiz covering key concepts'}
                      </CardDescription>
                      {attempt.quiz?.category && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Category: <span className="font-medium">{attempt.quiz.category.name}</span>
                          </span>
                        </div>
                      )}
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
                            <div className="text-lg font-semibold">{attempt.totalQuestions}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Total Questions</div>
                          </div>

                          {/* Duration */}
                          <div className="flex flex-col items-center">
                            <Clock className="h-5 w-5 text-green-500 mb-1" />
                            <div className="text-lg font-semibold">{formatTime(attempt.timeSpent)}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                          </div>

                          {/* Points */}
                          <div className="flex flex-col items-center">
                            <Target className="h-5 w-5 text-orange-500 mb-1" />
                            <div className={`text-lg font-semibold ${getScoreColor(attempt.score)}`}>
                              {attempt.score}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Points</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Date and Time */}
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(attempt.completedAt || attempt.createdAt)}
                      </div>
                      {attempt.completedAt && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Completed at {new Date(attempt.completedAt).toLocaleTimeString('en-US', {
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
                            {attempt.correctAnswers}/{attempt.totalQuestions}
                          </span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          Accuracy: <span className="font-medium text-gray-900 dark:text-white">
                            {Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)}%
                          </span>
                        </span>
                      </div>
                      <Badge 
                        variant={attempt.status === 'COMPLETED' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {attempt.status.toLowerCase()}
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
                Showing {attempts.length} of {totalAttempts} results
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
