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

import type { Category, Quiz } from '@/types/api'
import { useAutoMatchmaking, type SelectionMode } from '@/hooks/useAutoMatchmaking'

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

  const {
    state: matchmaking,
    startSearch,
    cancelSearch,
    resetState: resetMatchmakingState,
  } = useAutoMatchmaking()

  const prefsRestoredRef = useRef(false)
  const restoringPrefsRef = useRef(false)

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

    const quizIdToUse = selectionMode === 'manual'
      ? selectedQuizId
      : getRandomQuizId(quizzes)

    if (quizIdToUse === null) {
      toast({
        title: 'Matchmaking error',
        description: 'No quizzes available for the selected category',
        variant: 'destructive',
      })
      return
    }

    if (typeof quizIdToUse !== 'number') {
      toast({
        title: 'Matchmaking error',
        description: 'Please select a quiz',
        variant: 'destructive',
      })
      return
    }

    const quiz = quizzes.find(item => item.id === quizIdToUse) ?? undefined

    await startSearch({
      categoryId: effectiveCategoryId,
      quizId: quizIdToUse,
      selectionMode,
      quizName: getQuizName(quiz),
    })
  }

  const cancelMatchmaking = () => {
    cancelSearch()
  }

  useEffect(() => {
    loadCategories()
  }, [])

  // Restore the last-used category/quiz/selection-mode once categories are
  // loaded, e.g. after "Play again" navigates back here from QuizResults.
  useEffect(() => {
    if (prefsRestoredRef.current) return
    if (!Array.isArray(categories) || categories.length === 0) return
    prefsRestoredRef.current = true

    const stored = sessionStorage.getItem('matchmakingPrefs')
    if (!stored) return

    try {
      const prefs = JSON.parse(stored) as {
        categoryId?: unknown
        quizId?: unknown
        selectionMode?: unknown
      }
      if (typeof prefs.categoryId !== 'number') return

      const flat = flattenCategoryNodes(categories)
      const target = flat.find(category => category.id === prefs.categoryId)
      if (!target) return

      let root = target
      while (root.parentId != null) {
        const parent = flat.find(category => category.id === root.parentId)
        if (!parent) break
        root = parent
      }

      const restoredMode: SelectionMode = prefs.selectionMode === 'manual' ? 'manual' : 'random'

      restoringPrefsRef.current = true
      setParentCategoryId(root.id)
      setSelectionMode(restoredMode)
      setSubcategoryId(target.id)

      if (restoredMode === 'manual' && typeof prefs.quizId === 'number') {
        setSelectedQuizId(prefs.quizId)
      }

      loadQuizzesForCategory(target.id).catch(error => {
        console.error('Error loading quizzes for restored category:', error)
      })
    } catch (error) {
      console.error('Error restoring matchmaking prefs:', error)
    }
  }, [categories])

  useEffect(() => {
    if (!selectedParent) {
      setSubcategoryId(null)
      setQuizzes([])
      return
    }

    if (restoringPrefsRef.current) return

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
    if (restoringPrefsRef.current) {
      restoringPrefsRef.current = false
      return
    }
    setSubcategoryId(null)
    setQuizzes([])
    setSelectedQuizId(null)
    setSelectionMode('random')
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
            <div className="mt-1 text-xs text-muted-foreground">
              Position in queue: {typeof matchmaking.queuePosition === 'number'
                ? matchmaking.queuePosition
                : '—'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Est. wait: {typeof matchmaking.estimatedWaitMs === 'number'
                ? `~${Math.round(matchmaking.estimatedWaitMs / 1000)}s`
                : '—'}
            </div>
            {matchmaking.expanding && (
              <div className="mt-1 text-xs text-muted-foreground">
                Expanding search…
              </div>
            )}
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
