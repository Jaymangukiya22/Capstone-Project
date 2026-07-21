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

type SelectionMode = 'random' | 'manual'

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

const getRandomQuizId = (quizzes: Quiz[]): number | null => {
  if (!Array.isArray(quizzes) || quizzes.length === 0) return null
  const index = Math.floor(Math.random() * quizzes.length)
  return quizzes[index]?.id ?? null
}

const getRandomSubcategoryId = (
  parent: Category,
  allCategoriesFlat: Category[],
): number | null => {
  if (Array.isArray(parent.children) && parent.children.length > 0) {
    const flattened = flattenCategories(parent.children)
    if (flattened.length === 0) return null
    const index = Math.floor(Math.random() * flattened.length)
    return flattened[index]?.id ?? null
  }

  const descendants = getDescendantCategories(allCategoriesFlat, parent.id)
  if (descendants.length === 0) return null
  const index = Math.floor(Math.random() * descendants.length)
  return descendants[index]?.id ?? null
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
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('random')

  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({
    isSearching: false,
    startedAtMs: null,
    elapsedMs: 0,
    range: null,
    playersSearching: null,
  })

  const elapsedTimerRef = useRef<number | null>(null)
  const isNavigatingRef = useRef(false)
  const selectedQuizRef = useRef<Quiz | null>(null)

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

  const selectedSubcategory = useMemo(() => {
    if (!subcategoryId) return null
    return allCategoriesFlat.find(category => category.id === subcategoryId) ?? null
  }, [allCategoriesFlat, subcategoryId])

  const manualCategoryOptions = useMemo(() => {
    if (!parentCategoryId) return []
    const parent = allCategoriesFlat.find(category => category.id === parentCategoryId)
    if (!parent) return []

    const descendants = getDescendantCategories(allCategoriesFlat, parentCategoryId)
    const combined = [parent, ...descendants]

    const seen = new Set<number>()
    return combined.filter(category => {
      if (seen.has(category.id)) return false
      seen.add(category.id)
      return true
    })
  }, [allCategoriesFlat, parentCategoryId])

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

      const descendantIds = getDescendantCategories(allCategoriesFlat, categoryId)
        .map(category => category.id)
      const categoryIds = new Set<number>([categoryId, ...descendantIds])

      const result = await quizService.getAllQuizzes({ limit: 1000 })
      const allQuizzes = Array.isArray(result.quizzes) ? result.quizzes : []
      const filtered = allQuizzes.filter(quiz => categoryIds.has(quiz.categoryId))

      setQuizzes(filtered)
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

  const pickRandomSubcategory = (parent: Category) => {
    const randomId = getRandomSubcategoryId(parent, allCategoriesFlat)
    setSubcategoryId(randomId)
    if (randomId !== null) {
      loadQuizzesForCategory(randomId).catch(error => {
        console.error('Error loading quizzes for random subcategory:', error)
      })
    } else {
      loadQuizzesForCategory(parent.id).catch(error => {
        console.error('Error loading quizzes for parent category:', error)
      })
    }
  }

  const handleSelectionModeChange = (mode: SelectionMode) => {
    setSelectionMode(mode)
    setSelectedQuizId(null)
    selectedQuizRef.current = null

    if (mode === 'random') {
      if (selectedParent) pickRandomSubcategory(selectedParent)
      return
    }

    setSubcategoryId(parentCategoryId)
    if (parentCategoryId) {
      loadQuizzesForCategory(parentCategoryId).catch(error => {
        console.error('Error loading quizzes for parent category:', error)
      })
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

    const selectedQuiz = selectedQuizRef.current
    const friendMatchInfo = {
      matchId,
      joinCode: '',
      websocketUrl: WEBSOCKET_URL,
      quizName: selectedQuiz?.title || 'Random Quiz',
      quizId: selectedQuiz?.id ? String(selectedQuiz.id) : '',
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
    if (!parentCategoryId) {
      toast({
        title: 'Select a category',
        description: 'Choose a category to start matchmaking.',
        variant: 'destructive',
      })
      return
    }

    const effectiveCategoryId = subcategoryId ?? parentCategoryId

    resetMatchmakingState()
    cleanupSocket()
    registerSocketHandlers()

    gameWebSocket.on('authenticated', () => {
      const payload: { categoryId: number; quizId?: number } = {
        categoryId: effectiveCategoryId,
      }

      const quizIdToUse = selectionMode === 'manual'
        ? selectedQuizId
        : getRandomQuizId(quizzes)

      if (quizIdToUse === null) {
        handleFailure('Matchmaking error', 'No quizzes available for the selected category')
        return
      }

      if (typeof quizIdToUse !== 'number') {
        handleFailure('Matchmaking error', 'Please select a quiz')
        return
      }

      payload.quizId = quizIdToUse
      selectedQuizRef.current = quizzes.find(quiz => quiz.id === quizIdToUse) ?? null
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
    loadCategories()
    return cleanupSocket
  }, [])

  useEffect(() => {
    if (!selectedParent) {
      setSubcategoryId(null)
      setQuizzes([])
      return
    }

    if (selectionMode === 'random') {
      pickRandomSubcategory(selectedParent)
    } else {
      setSubcategoryId(selectedParent.id)
      loadQuizzesForCategory(selectedParent.id).catch(error => {
        console.error('Error loading quizzes for parent category:', error)
      })
    }
  }, [selectedParent])

  useEffect(() => {
    setSubcategoryId(null)
    setQuizzes([])
    setSelectedQuizId(null)
    setSelectionMode('random')
    selectedQuizRef.current = null
    resetMatchmakingState()
  }, [parentCategoryId])

  const handleParentCategoryChange = (value: string) => {
    setParentCategoryId(Number(value))
  }

  const elapsedSeconds = Math.floor(matchmaking.elapsedMs / 1000)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Auto Matchmaking</h1>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={parentCategoryId ? String(parentCategoryId) : ''}
              onValueChange={handleParentCategoryChange}
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selection mode</label>
            <Select
              value={selectionMode}
              onValueChange={(value) => handleSelectionModeChange(value as SelectionMode)}
              disabled={!selectedParent || loadingQuizzes || matchmaking.isSearching}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random subcategory + random quiz</SelectItem>
                <SelectItem value="manual">Select subcategory + quiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectionMode === 'random' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Random selection</label>
              <div className="rounded-md border p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Subcategory</span>
                  <span className="font-medium text-foreground">
                    {loadingQuizzes
                      ? 'Selecting...'
                      : (selectedSubcategory?.name || '— (none)')}
                  </span>
                </div>
                <div className="mt-2 flex justify-between gap-2">
                  <span className="text-muted-foreground">Quiz</span>
                  <span className="font-medium text-foreground">
                    {loadingQuizzes ? 'Loading...' : (quizzes.length > 0 ? 'Random Quiz' : '—')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectionMode === 'manual' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subcategory</label>
              <Select
                value={subcategoryId ? String(subcategoryId) : ''}
                onValueChange={(value) => {
                  const parsed = Number(value)
                  setSubcategoryId(parsed)
                  setSelectedQuizId(null)
                  selectedQuizRef.current = null
                  loadQuizzesForCategory(parsed).catch(error => {
                    console.error('Error loading quizzes for manual category:', error)
                  })
                }}
                disabled={!selectedParent || loadingQuizzes || matchmaking.isSearching}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose subcategory" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {manualCategoryOptions.map(category => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quiz</label>
              <Select
                value={selectedQuizId ? String(selectedQuizId) : ''}
                onValueChange={(value) => setSelectedQuizId(Number(value))}
                disabled={!subcategoryId || loadingQuizzes || matchmaking.isSearching}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingQuizzes ? 'Loading quizzes…' : 'Choose quiz'} />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {quizzes.map(quiz => (
                    <SelectItem key={quiz.id} value={String(quiz.id)}>
                      {quiz.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

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
            disabled={!parentCategoryId || matchmaking.isSearching}
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
