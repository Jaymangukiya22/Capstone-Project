import { useEffect, useMemo, useState } from 'react'
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
import { categoryService } from '@/services/categoryService'
import { quizService } from '@/services/quizService'
import type { StudentQuiz } from '@/services/studentQuizService'
import type { Category } from '@/types/api'
import { useAutoMatchmaking, type SelectionMode } from '@/hooks/useAutoMatchmaking'

interface AutoMatchmakingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedQuiz: StudentQuiz | null
}

const getRandomQuizId = (quizIds: number[]): number | null => {
  if (!Array.isArray(quizIds) || quizIds.length === 0) return null
  const index = Math.floor(Math.random() * quizIds.length)
  return quizIds[index] ?? null
}

export function AutoMatchmakingModal({
  open,
  onOpenChange,
  selectedQuiz,
}: AutoMatchmakingModalProps) {
  const [useExactQuiz, setUseExactQuiz] = useState(true)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('random')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [quizIdsForCategory, setQuizIdsForCategory] = useState<number[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)

  const {
    state: matchmaking,
    startSearch,
    cancelSearch,
    resetState,
    stopListening,
  } = useAutoMatchmaking({
    onBeforeNavigate: () => onOpenChange(false),
  })

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

  const loadQuizIdsForCategory = async (categoryIdToLoad: number) => {
    try {
      const result = await quizService.getAllQuizzes({ limit: 1000 })
      const allQuizzes = Array.isArray(result.quizzes) ? result.quizzes : []
      const quizIds = allQuizzes
        .filter(quiz => quiz.categoryId === categoryIdToLoad)
        .map(quiz => quiz.id)
        .filter((id): id is number => typeof id === 'number')
      setQuizIdsForCategory(quizIds)
    } catch {
      setQuizIdsForCategory([])
    }
  }

  useEffect(() => {
    if (!open) {
      stopListening()
    } else {
      resetState()
      setSelectionMode('random')
      setSelectedQuizId(null)
      setQuizIdsForCategory([])

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
      stopListening()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (categoryId) {
      setSelectedCategoryId(categoryId)
      loadQuizIdsForCategory(categoryId).catch(() => {})
    }
  }, [open, categoryId])

  useEffect(() => {
    if (!open) return
    if (!selectedCategoryId) return
    loadQuizIdsForCategory(selectedCategoryId).catch(() => {})
  }, [open, selectedCategoryId])

  const startMatchmaking = async () => {
    if (!effectiveCategoryId) {
      toast({
        title: 'Error',
        description: 'Please select a category for auto-matchmaking.',
        variant: 'destructive',
      })
      return
    }

    let quizIdToUse: number | undefined

    if (selectionMode === 'manual') {
      const quizToUse = selectedQuizId ?? getRandomQuizId(quizIdsForCategory)
      if (quizToUse === null) {
        toast({
          title: 'Matchmaking error',
          description: 'No quizzes available for the selected category.',
          variant: 'destructive',
        })
        return
      }
      quizIdToUse = quizToUse
    } else if (useExactQuiz && quizId) {
      quizIdToUse = quizId
    }

    await startSearch({
      categoryId: effectiveCategoryId,
      quizId: quizIdToUse ?? null,
      selectionMode,
      quizName: selectedQuiz?.name || 'Auto Match',
    })
  }

  const cancelMatchmaking = () => {
    cancelSearch()
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
          <div className="space-y-2">
            <div className="text-sm font-medium">Selection mode</div>
            <Select
              value={selectionMode}
              onValueChange={(value) => {
                const mode = value as SelectionMode
                setSelectionMode(mode)
                setSelectedQuizId(null)
                if (mode === 'manual' && effectiveCategoryId) {
                  loadQuizIdsForCategory(effectiveCategoryId).catch(() => {})
                }
              }}
              disabled={matchmaking.isSearching}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random quiz (default)</SelectItem>
                <SelectItem value="manual">Pick category + quiz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectionMode === 'manual' && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Category</div>
              <Select
                value={effectiveCategoryId ? String(effectiveCategoryId) : ''}
                onValueChange={value => {
                  const parsed = Number(value)
                  setSelectedCategoryId(parsed)
                  setSelectedQuizId(null)
                }}
                disabled={matchmaking.isSearching}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectionMode === 'manual' && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Quiz (optional)</div>
              <Select
                value={selectedQuizId ? String(selectedQuizId) : ''}
                onValueChange={value => setSelectedQuizId(Number(value))}
                disabled={matchmaking.isSearching || !effectiveCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Random quiz" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {quizIdsForCategory.map(id => (
                    <SelectItem key={id} value={String(id)}>
                      Quiz #{id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                If you leave this empty, we will pick a random quiz from the category.
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="useExactQuiz"
              checked={useExactQuiz}
              onCheckedChange={checked => setUseExactQuiz(Boolean(checked))}
              disabled={matchmaking.isSearching || selectionMode === 'manual'}
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
