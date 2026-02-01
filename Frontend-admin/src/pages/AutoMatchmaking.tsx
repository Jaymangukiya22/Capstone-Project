import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { Loader2, Target, Users, XCircle } from 'lucide-react'
import { gameWebSocket } from '@/services/matchService'
import { WEBSOCKET_URL } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useCategories } from '@/hooks/useCategories'
import { useQuizzes } from '@/hooks/useQuizzes'

type MatchmakingState = {
  isSearching: boolean
  startedAtMs: number | null
  elapsedMs: number
  range: number | null
  playersSearching: number | null
}

export function AutoMatchmaking() {
  const { user } = useAuth()
  const { categories } = useCategories({ autoFetch: true })
  const { quizzes } = useQuizzes({ autoFetch: true })

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)
  const [useExactQuiz, setUseExactQuiz] = useState(true)

  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({
    isSearching: false,
    startedAtMs: null,
    elapsedMs: 0,
    range: null,
    playersSearching: null,
  })

  const elapsedTimerRef = useRef<number | null>(null)
  const isNavigatingRef = useRef(false)

  const filteredQuizzes = useMemo(() => {
    if (!selectedCategoryId) return quizzes
    return quizzes.filter(q => q.categoryId === selectedCategoryId)
  }, [quizzes, selectedCategoryId])

  const clearElapsedTimer = () => {
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }

  const resetState = () => {
    clearElapsedTimer()
    setMatchmaking({
      isSearching: false,
      startedAtMs: null,
      elapsedMs: 0,
      range: null,
      playersSearching: null,
    })
  }

  const handleAutoMatchFound = (data: { matchId?: string; quizId?: number }) => {
    if (isNavigatingRef.current) return

    const matchId = data?.matchId
    if (!matchId) return

    isNavigatingRef.current = true

    localStorage.removeItem('friendMatchState')
    sessionStorage.removeItem('friendMatchState')

    const quizName = filteredQuizzes.find(q => q.id === (data.quizId ?? selectedQuizId))
      ?.title

    const friendMatchInfo = {
      matchId,
      joinCode: '',
      websocketUrl: WEBSOCKET_URL,
      quizName: quizName || 'Auto Match',
      quizId: String(data.quizId ?? selectedQuizId ?? ''),
      mode: 'create',
    }

    sessionStorage.setItem('friendMatch', JSON.stringify(friendMatchInfo))
    window.location.pathname = '/friend-match'
  }

  const startMatchmaking = async () => {
    if (!selectedCategoryId) {
      toast({
        title: 'Error',
        description: 'Please select a category to start matchmaking.',
        variant: 'destructive',
      })
      return
    }

    const userId = user?.id ?? Number(localStorage.getItem('userId')) ?? 1
    const username = user?.email || user?.username || 'Player1'

    resetState()
    isNavigatingRef.current = false

    gameWebSocket.disconnect()
    gameWebSocket.removeAllListeners()

    gameWebSocket.on('authenticated', () => {
      const payload: { categoryId: number; quizId?: number } = {
        categoryId: selectedCategoryId,
      }

      if (useExactQuiz && selectedQuizId) {
        payload.quizId = selectedQuizId
      }

      gameWebSocket.send('start_auto_matchmaking', payload)
    })

    gameWebSocket.on('matchmaking_started', (data: any) => {
      const startedAtMs = Date.now()

      setMatchmaking({
        isSearching: true,
        startedAtMs,
        elapsedMs: 0,
        range: typeof data?.range === 'number' ? data.range : null,
        playersSearching: typeof data?.playersSearching === 'number'
          ? data.playersSearching
          : null,
      })

      clearElapsedTimer()
      elapsedTimerRef.current = window.setInterval(() => {
        setMatchmaking(prev => {
          if (!prev.isSearching || !prev.startedAtMs) return prev
          return { ...prev, elapsedMs: Date.now() - prev.startedAtMs }
        })
      }, 1000)
    })

    gameWebSocket.on('matchmaking_update', (data: any) => {
      setMatchmaking(prev => ({
        ...prev,
        range: typeof data?.range === 'number' ? data.range : prev.range,
        elapsedMs: typeof data?.elapsedMs === 'number' ? data.elapsedMs : prev.elapsedMs,
        playersSearching: typeof data?.playersSearching === 'number'
          ? data.playersSearching
          : prev.playersSearching,
      }))
    })

    gameWebSocket.on('auto_match_found', (data: any) => {
      if (typeof data?.matchId === 'string' && data.matchId.length > 0) {
        handleAutoMatchFound({
          matchId: data.matchId,
          quizId: typeof data?.quizId === 'number' ? data.quizId : undefined,
        })
      }
    })

    gameWebSocket.on('auto_match_timeout', (data: any) => {
      clearElapsedTimer()
      setMatchmaking(prev => ({ ...prev, isSearching: false }))
      toast({
        title: 'No match found',
        description: data?.message || 'No match found within 5 minutes.',
        variant: 'destructive',
      })
      gameWebSocket.disconnect()
    })

    gameWebSocket.on('matchmaking_cancelled', () => {
      clearElapsedTimer()
      setMatchmaking(prev => ({ ...prev, isSearching: false }))
      gameWebSocket.disconnect()
    })

    gameWebSocket.on('matchmaking_error', (data: any) => {
      clearElapsedTimer()
      setMatchmaking(prev => ({ ...prev, isSearching: false }))
      toast({
        title: 'Matchmaking error',
        description: data?.message || 'Failed to start matchmaking.',
        variant: 'destructive',
      })
      gameWebSocket.disconnect()
    })

    gameWebSocket.on('error', (data: any) => {
      clearElapsedTimer()
      setMatchmaking(prev => ({ ...prev, isSearching: false }))
      toast({
        title: 'Error',
        description: data?.message || 'Something went wrong.',
        variant: 'destructive',
      })
      gameWebSocket.disconnect()
    })

    try {
      await gameWebSocket.connect(WEBSOCKET_URL, userId, username)
    } catch {
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to matchmaking server.',
        variant: 'destructive',
      })
    }
  }

  const cancelMatchmaking = () => {
    gameWebSocket.send('cancel_auto_matchmaking', {})
  }

  useEffect(() => {
    return () => {
      clearElapsedTimer()
      gameWebSocket.removeAllListeners()
      gameWebSocket.disconnect()
    }
  }, [])

  useEffect(() => {
    setSelectedQuizId(null)
  }, [selectedCategoryId])

  const elapsedSeconds = Math.floor(matchmaking.elapsedMs / 1000)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Auto Matchmaking</h1>
          <p className="text-sm text-muted-foreground">
            Find an opponent automatically based on ELO, expanding the range over
            time.
          </p>
        </div>
        <Badge variant="outline" className="h-8">
          <Target className="h-4 w-4 mr-2" />
          Ranked
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Match Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Category</div>
              <Select
                value={selectedCategoryId ? String(selectedCategoryId) : ''}
                onValueChange={value => setSelectedCategoryId(Number(value))}
                disabled={matchmaking.isSearching}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Quiz (optional)</div>
              <Select
                value={selectedQuizId ? String(selectedQuizId) : ''}
                onValueChange={value => setSelectedQuizId(Number(value))}
                disabled={!selectedCategoryId || matchmaking.isSearching}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedCategoryId
                        ? 'Choose quiz (optional)'
                        : 'Select a category first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredQuizzes.map(quiz => (
                    <SelectItem key={quiz.id} value={String(quiz.id)}>
                      {quiz.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="useExactQuiz"
              checked={useExactQuiz}
              onCheckedChange={checked => setUseExactQuiz(Boolean(checked))}
              disabled={matchmaking.isSearching}
            />
            <label htmlFor="useExactQuiz" className="text-sm leading-tight">
              Match using selected quiz only
              <div className="text-xs text-muted-foreground">
                If unchecked (or if no quiz is selected), matchmaking can pick
                any quiz from this category.
              </div>
            </label>
          </div>

          {matchmaking.isSearching && (
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Searching…</div>
                <div className="text-xs text-muted-foreground">
                  {elapsedSeconds}s
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                ELO range:{' '}
                {typeof matchmaking.range === 'number'
                  ? `±${matchmaking.range}`
                  : '—'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Players searching:{' '}
                {typeof matchmaking.playersSearching === 'number'
                  ? matchmaking.playersSearching
                  : '—'}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={startMatchmaking}
              disabled={!selectedCategoryId || matchmaking.isSearching}
              className="flex-1"
            >
              {matchmaking.isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching
                </>
              ) : (
                'Start Matchmaking'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={cancelMatchmaking}
              disabled={!matchmaking.isSearching}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
