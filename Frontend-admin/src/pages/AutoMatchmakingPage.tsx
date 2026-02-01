import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { Loader2, Users, XCircle } from 'lucide-react'

import { categoryService } from '@/services/categoryService'
import { quizService } from '@/services/quizService'
import { gameWebSocket } from '@/services/matchService'
import { WEBSOCKET_URL } from '@/services/api'

import type { Category, Quiz } from '@/types/api'

type MatchmakingState = {
  isSearching: boolean
  startedAtMs: number | null
  elapsedMs: number
  range: number | null
  playersSearching: number | null
}

const flattenCategoryNodes = (categories: Category[]): Category[] => {
  const result: Category[] = []
  const queue: Category[] = Array.isArray(categories) ? [...categories] : []

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    result.push(current)
    if (Array.isArray(current.children) && current.children.length > 0) {
      queue.push(...current.children)
    }
  }

  return result
}

const getDescendantCategories = (all: Category[], parentId: number): Category[] => {
  const result: Category[] = []
  const queue: number[] = [parentId]

  while (queue.length > 0) {
    const currentParentId = queue.shift()
    if (currentParentId === undefined) continue

    const children = all.filter(category => category.parentId === currentParentId)
    result.push(...children)
    queue.push(...children.map(child => child.id))
  }

  return result
}

type FlatCategory = {
  id: number
  name: string
  displayName: string
}

type QuizSelection = 'RANDOM' | number | null

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

const flattenCategories = (
  categories: Category[],
  prefix: string = '',
): FlatCategory[] => {
  if (!Array.isArray(categories)) return []

  const flattened: FlatCategory[] = []

  for (const category of categories) {
    const displayName = prefix ? `${prefix} > ${category.name}` : category.name
    flattened.push({
      id: category.id,
      name: category.name,
      displayName,
    })

    if (category.children?.length) {
      flattened.push(
        ...flattenCategories(category.children, displayName),
      )
    }
  }

  return flattened
}

const getQuizName = (quiz: Quiz | undefined) => {
  if (!quiz) return 'Random Quiz'
  return quiz.title || 'Selected Quiz'
}

export function AutoMatchmakingPage() {
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [loadingQuizzes, setLoadingQuizzes] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(
    null,
  )
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizSelection, setQuizSelection] = useState<QuizSelection>('RANDOM')

  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({
    isSearching: false,
    startedAtMs: null,
    elapsedMs: 0,
    range: null,
    playersSearching: null,
  })

  const elapsedTimerRef = useRef<number | null>(null)
  const isNavigatingRef = useRef(false)

  const parentCategories = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return []

    const roots = categories.filter(category => category.parentId == null)
    return roots.length > 0 ? roots : categories
  }, [categories])

  const selectedParent = useMemo(() => {
    if (!parentCategoryId) return null
    return parentCategories.find(category => category.id === parentCategoryId)
      ?? null
  }, [parentCategories, parentCategoryId])

  const allCategoriesFlat = useMemo(() => {
    return flattenCategoryNodes(categories)
  }, [categories])

  const subcategories = useMemo(() => {
    if (!selectedParent) return []

    if (Array.isArray(selectedParent.children) && selectedParent.children.length > 0) {
      return flattenCategories(selectedParent.children)
    }

    const descendants = getDescendantCategories(allCategoriesFlat, selectedParent.id)
    if (descendants.length === 0) return []
    return flattenCategories(descendants)
  }, [allCategoriesFlat, selectedParent])

  const selectedQuiz = useMemo(() => {
    if (quizSelection === 'RANDOM' || quizSelection === null) return undefined
    return quizzes.find(quiz => quiz.id === quizSelection)
  }, [quizSelection, quizzes])

  const clearElapsedTimer = () => {
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }

  const resetMatchmakingState = () => {
    clearElapsedTimer()
    setMatchmaking({
      isSearching: false,
      startedAtMs: null,
      elapsedMs: 0,
      range: null,
      playersSearching: null,
    })
  }

  const cleanupSocket = () => {
    clearElapsedTimer()
    gameWebSocket.removeAllListeners()
    gameWebSocket.disconnect()
    isNavigatingRef.current = false
  }

  const loadCategories = async () => {
    try {
      setLoadingCategories(true)
      const hierarchy = await categoryService.getCategoryHierarchy(5)
      setCategories(Array.isArray(hierarchy) ? hierarchy : [])
    } catch (error) {
      setCategories([])
      toast({
        title: 'Failed to load categories',
        description: 'Please try again.',
        variant: 'destructive',
      })
      console.error('Error loading categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadQuizzesForCategory = async (categoryId: number) => {
    try {
      setLoadingQuizzes(true)
      const result = await quizService.getAllQuizzes({
        categoryId,
        limit: 1000,
      })
      setQuizzes(Array.isArray(result.quizzes) ? result.quizzes : [])
    } catch (error) {
      setQuizzes([])
      toast({
        title: 'Failed to load quizzes',
        description: 'Please try again.',
        variant: 'destructive',
      })
      console.error('Error loading quizzes:', error)
    } finally {
      setLoadingQuizzes(false)
    }
  }

  const startElapsedTimer = () => {
    clearElapsedTimer()
    elapsedTimerRef.current = window.setInterval(() => {
      setMatchmaking(prev => {
        if (!prev.isSearching || !prev.startedAtMs) return prev
        return { ...prev, elapsedMs: Date.now() - prev.startedAtMs }
      })
    }, 1000)
  }

  const handleMatchmakingStarted = (data: unknown) => {
    const payload = data as { range?: unknown; playersSearching?: unknown }
    const startedAtMs = Date.now()

    setMatchmaking({
      isSearching: true,
      startedAtMs,
      elapsedMs: 0,
      range: typeof payload?.range === 'number' ? payload.range : null,
      playersSearching: typeof payload?.playersSearching === 'number'
        ? payload.playersSearching
        : null,
    })

    startElapsedTimer()
  }

  const handleMatchmakingUpdate = (data: unknown) => {
    const payload = data as {
      range?: unknown
      elapsedMs?: unknown
      playersSearching?: unknown
    }
    setMatchmaking(prev => ({
      ...prev,
      range: typeof payload?.range === 'number' ? payload.range : prev.range,
      elapsedMs: typeof payload?.elapsedMs === 'number' ? payload.elapsedMs : prev.elapsedMs,
      playersSearching: typeof payload?.playersSearching === 'number'
        ? payload.playersSearching
        : prev.playersSearching,
    }))
  }

  const handleAutoMatchFound = (data: unknown) => {
    const payload = data as { matchId?: unknown }
    const matchId = payload?.matchId
    if (isNavigatingRef.current) return
    if (typeof matchId !== 'string' || matchId.length === 0) return
    isNavigatingRef.current = true

    const friendMatchInfo = {
      matchId,
      joinCode: '',
      websocketUrl: WEBSOCKET_URL,
      quizName: getQuizName(selectedQuiz),
      quizId:
        quizSelection !== 'RANDOM' && quizSelection !== null
          ? String(quizSelection)
          : '',
      mode: 'create',
    }

    sessionStorage.setItem('friendMatch', JSON.stringify(friendMatchInfo))
    window.location.pathname = '/friend-match'
  }

  const handleTimeout = (message?: string) => {
    clearElapsedTimer()
    setMatchmaking(prev => ({ ...prev, isSearching: false }))
    toast({
      title: 'No match found',
      description: message || 'No match found within 5 minutes.',
      variant: 'destructive',
    })
    gameWebSocket.disconnect()
  }

  const handleCancel = () => {
    clearElapsedTimer()
    setMatchmaking(prev => ({ ...prev, isSearching: false }))
    gameWebSocket.disconnect()
  }

  const handleFailure = (title: string, message?: string) => {
    clearElapsedTimer()
    setMatchmaking(prev => ({ ...prev, isSearching: false }))
    toast({
      title,
      description: message || 'Something went wrong.',
      variant: 'destructive',
    })
    gameWebSocket.disconnect()
  }

  const registerSocketHandlers = () => {
    gameWebSocket.on('matchmaking_started', handleMatchmakingStarted)
    gameWebSocket.on('matchmaking_update', handleMatchmakingUpdate)
    gameWebSocket.on('auto_match_found', handleAutoMatchFound)
    gameWebSocket.on('auto_match_timeout', (data: any) => handleTimeout(data?.message))
    gameWebSocket.on('matchmaking_cancelled', handleCancel)
    gameWebSocket.on('matchmaking_error', (data: any) => handleFailure('Matchmaking error', data?.message))
    gameWebSocket.on('error', (data: any) => handleFailure('Error', data?.message))
  }

  const startMatchmaking = async () => {
    if (!subcategoryId) {
      toast({
        title: 'Select a subcategory',
        description: 'Choose a subcategory to start matchmaking.',
        variant: 'destructive',
      })
      return
    }

    resetMatchmakingState()
    cleanupSocket()
    registerSocketHandlers()

    gameWebSocket.on('authenticated', () => {
      const payload: { categoryId: number; quizId?: number } = {
        categoryId: subcategoryId,
      }

      if (quizSelection !== 'RANDOM' && quizSelection !== null) {
        payload.quizId = quizSelection
      }

      gameWebSocket.send('start_auto_matchmaking', payload)
    })

    const user = getLocalUser()
    try {
      await gameWebSocket.connect(WEBSOCKET_URL, user.userId, user.username)
    } catch (error) {
      handleFailure('Connection Error', 'Failed to connect to matchmaking server.')
      console.error('Error connecting to websocket:', error)
    }
  }

  const cancelMatchmaking = () => {
    gameWebSocket.send('cancel_auto_matchmaking', {})
  }

  useEffect(() => {
    loadCategories().catch(() => {})
    return cleanupSocket
  }, [])

  useEffect(() => {
    setSubcategoryId(null)
    setQuizzes([])
    setQuizSelection('RANDOM')
    resetMatchmakingState()
  }, [parentCategoryId])

  useEffect(() => {
    if (!subcategoryId) {
      setQuizzes([])
      setQuizSelection('RANDOM')
      return
    }

    setQuizSelection('RANDOM')
    loadQuizzesForCategory(subcategoryId).catch(() => {})
  }, [subcategoryId])

  const elapsedSeconds = Math.floor(matchmaking.elapsedMs / 1000)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Auto Matchmaking</h1>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">1) Select a category</div>
          <Select
            value={parentCategoryId ? String(parentCategoryId) : ''}
            onValueChange={value => setParentCategoryId(Number(value))}
            disabled={loadingCategories || matchmaking.isSearching}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingCategories ? 'Loading categories…' : 'Choose category'}
              />
            </SelectTrigger>
            <SelectContent>
              {parentCategories.map(category => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">2) Select a subcategory</div>
          <Select
            value={subcategoryId ? String(subcategoryId) : ''}
            onValueChange={value => setSubcategoryId(Number(value))}
            disabled={!parentCategoryId || matchmaking.isSearching}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose subcategory" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map(sub => (
                <SelectItem key={sub.id} value={String(sub.id)}>
                  {sub.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">3) Select a quiz</div>
          <Select
            value={quizSelection === null ? '' : String(quizSelection)}
            onValueChange={value => {
              if (value === 'RANDOM') {
                setQuizSelection('RANDOM')
                return
              }
              setQuizSelection(Number(value))
            }}
            disabled={!subcategoryId || loadingQuizzes || matchmaking.isSearching}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingQuizzes ? 'Loading quizzes…' : 'Random or choose a quiz'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RANDOM">Random Quiz</SelectItem>
              {quizzes.map(quiz => (
                <SelectItem key={quiz.id} value={String(quiz.id)}>
                  {quiz.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            If you pick <span className="font-medium">Random Quiz</span>, the system will match you on the selected subcategory and choose any quiz.
          </div>
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
            disabled={!subcategoryId || matchmaking.isSearching}
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
    </div>
  )
}
