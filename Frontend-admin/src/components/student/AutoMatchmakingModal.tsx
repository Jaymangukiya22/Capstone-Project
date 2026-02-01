import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { Loader2, Users, XCircle } from 'lucide-react'
import { gameWebSocket } from '@/services/matchService'
import { WEBSOCKET_URL } from '@/services/api'
import { categoryService } from '@/services/categoryService'
import type { StudentQuiz } from '@/services/studentQuizService'
import type { Category } from '@/types/api'

interface AutoMatchmakingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedQuiz: StudentQuiz | null
}

type MatchmakingState = {
  isSearching: boolean
  startedAtMs: number | null
  elapsedMs: number
  range: number | null
  playersSearching: number | null
}

const getLocalUser = () => {
  const storedUser = localStorage.getItem('user')
  if (!storedUser) {
    return { userId: 1, username: 'Player1' }
  }

  try {
    const userData = JSON.parse(storedUser)
    return {
      userId: Number(userData.id) || 1,
      username: userData.email || userData.username || 'Player1',
    }
  } catch {
    return { userId: 1, username: 'Player1' }
  }
}

export function AutoMatchmakingModal({
  open,
  onOpenChange,
  selectedQuiz,
}: AutoMatchmakingModalProps) {
  const [useExactQuiz, setUseExactQuiz] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({
    isSearching: false,
    startedAtMs: null,
    elapsedMs: 0,
    range: null,
    playersSearching: null,
  })

  const elapsedTimerRef = useRef<number | null>(null)
  const isNavigatingRef = useRef(false)

  const categoryId = useMemo(() => {
    if (!selectedQuiz?.categoryId) return null
    const parsed = Number(selectedQuiz.categoryId)
    if (!parsed || Number.isNaN(parsed)) return null
    return parsed
  }, [selectedQuiz])

  const effectiveCategoryId = useMemo(() => {
    return categoryId ?? selectedCategoryId
  }, [categoryId, selectedCategoryId])

  const quizId = useMemo(() => {
    if (!selectedQuiz?.id) return null
    const parsed = Number(selectedQuiz.id)
    if (!parsed || Number.isNaN(parsed)) return null
    return parsed
  }, [selectedQuiz])

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

  useEffect(() => {
    if (!open) {
      clearElapsedTimer()
      gameWebSocket.removeAllListeners()
      isNavigatingRef.current = false
    } else {
      resetState()

      categoryService
        .getAllCategories({ limit: 1000, hierarchy: true, depth: 10 })
        .then(result => {
          setCategories(result.categories || [])
        })
        .catch(() => {
          setCategories([])
        })
    }

    return () => {
      clearElapsedTimer()
      gameWebSocket.removeAllListeners()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (categoryId) {
      setSelectedCategoryId(categoryId)
    }
  }, [open, categoryId])

  const handleAutoMatchFound = (matchId: string) => {
    if (isNavigatingRef.current) return
    isNavigatingRef.current = true

    localStorage.removeItem('friendMatchState')
    sessionStorage.removeItem('friendMatchState')

    const friendMatchInfo = {
      matchId,
      joinCode: '',
      websocketUrl: WEBSOCKET_URL,
      quizName: selectedQuiz?.name || 'Auto Match',
      quizId: selectedQuiz?.id || '',
      mode: 'create',
    }

    sessionStorage.setItem('friendMatch', JSON.stringify(friendMatchInfo))
    onOpenChange(false)
    window.location.pathname = '/friend-match'
  }

  const startMatchmaking = async () => {
    if (!effectiveCategoryId) {
      toast({
        title: 'Error',
        description: 'Please select a category for auto-matchmaking.',
        variant: 'destructive',
      })
      return
    }

    const user = getLocalUser()

    resetState()
    gameWebSocket.disconnect()
    gameWebSocket.removeAllListeners()

    gameWebSocket.on('authenticated', () => {
      const payload: any = { categoryId: effectiveCategoryId }
      if (useExactQuiz && quizId) payload.quizId = quizId
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
      const foundMatchId = data?.matchId
      if (typeof foundMatchId === 'string' && foundMatchId.length > 0) {
        handleAutoMatchFound(foundMatchId)
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
      await gameWebSocket.connect(WEBSOCKET_URL, user.userId, user.username)
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

  const elapsedSeconds = Math.floor(matchmaking.elapsedMs / 1000)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Auto Matchmaking</span>
          </DialogTitle>
          <DialogDescription>
            Find an opponent automatically based on ELO, expanding the range over time.
          </DialogDescription>
        </DialogHeader>

        {selectedQuiz && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                {selectedQuiz.name}
              </h4>
              <Badge variant="outline" className="text-xs">
                {selectedQuiz.difficulty}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Category: {selectedQuiz.category}
            </div>
          </div>
        )}

        {!selectedQuiz && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Select a category</div>
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
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="useExactQuiz"
              checked={useExactQuiz}
              onCheckedChange={checked => setUseExactQuiz(Boolean(checked))}
              disabled={matchmaking.isSearching}
            />
            <label htmlFor="useExactQuiz" className="text-sm leading-tight">
              Match using this quiz only
              <div className="text-xs text-muted-foreground">
                If unchecked, matchmaking can pick any quiz from this category.
              </div>
            </label>
          </div>

          {matchmaking.isSearching && (
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Searching…</div>
                <div className="text-xs text-muted-foreground">{elapsedSeconds}s</div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                ELO range: {typeof matchmaking.range === 'number' ? `±${matchmaking.range}` : '—'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Players searching: {typeof matchmaking.playersSearching === 'number'
                  ? matchmaking.playersSearching
                  : '—'}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={startMatchmaking}
              disabled={!effectiveCategoryId || matchmaking.isSearching}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
