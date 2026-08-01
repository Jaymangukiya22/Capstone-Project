import { useEffect, useRef, useState } from 'react'

import { toast } from '@/lib/toast'
import { gameWebSocket } from '@/services/matchService'
import { WEBSOCKET_URL } from '@/services/api'

export type SelectionMode = 'random' | 'manual'

export type MatchmakingState = {
  isSearching: boolean
  startedAtMs: number | null
  elapsedMs: number
  range: number | null
  playersSearching: number | null
  /** 1-based rank of this search in the category queue (optional, backend-provided). */
  queuePosition: number | null
  /** Mean recent wait time in ms for this category/range; may be null when unknown. */
  estimatedWaitMs: number | null
  /** True once the ELO search range has widened past its starting value. */
  expanding: boolean
}

export interface StartMatchmakingPrefs {
  categoryId: number
  quizId?: number | null
  selectionMode: SelectionMode
  /** Display name used for the resulting friend-match session, if a match is found. */
  quizName?: string
}

export interface UseAutoMatchmakingOptions {
  /** Called right before navigating to /friend-match (e.g. to close a dialog). */
  onBeforeNavigate?: () => void
}

const initialState: MatchmakingState = {
  isSearching: false,
  startedAtMs: null,
  elapsedMs: 0,
  range: null,
  playersSearching: null,
  queuePosition: null,
  estimatedWaitMs: null,
  expanding: false,
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

/**
 * Shared matchmaking-search state machine used by both AutoMatchmakingPage
 * and AutoMatchmakingModal. Owns the socket wiring, the elapsed-time timer,
 * and the matchmaking_* event handlers so both UIs stay in sync.
 */
export function useAutoMatchmaking(options?: UseAutoMatchmakingOptions) {
  const [state, setState] = useState<MatchmakingState>(initialState)

  const elapsedTimerRef = useRef<number | null>(null)
  const isNavigatingRef = useRef(false)
  const quizNameRef = useRef<string>('Random Quiz')
  const quizIdRef = useRef<number | null>(null)

  const clearElapsedTimer = () => {
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }

  const startElapsedTimer = () => {
    clearElapsedTimer()
    elapsedTimerRef.current = window.setInterval(() => {
      setState(prev => {
        if (!prev.isSearching || !prev.startedAtMs) return prev
        return { ...prev, elapsedMs: Date.now() - prev.startedAtMs }
      })
    }, 1000)
  }

  /** Reset the displayed matchmaking state (does not touch the socket). */
  const resetState = () => {
    clearElapsedTimer()
    setState(initialState)
  }

  /** Stop listening/ticking without disconnecting the underlying socket. */
  const stopListening = () => {
    clearElapsedTimer()
    gameWebSocket.removeAllListeners()
    isNavigatingRef.current = false
  }

  /** Full teardown: stop listening, disconnect the socket, reset state. */
  const teardown = () => {
    clearElapsedTimer()
    gameWebSocket.removeAllListeners()
    gameWebSocket.disconnect()
    isNavigatingRef.current = false
  }

  const handleMatchmakingStarted = (data: unknown) => {
    const payload = data as {
      range?: unknown
      playersSearching?: unknown
      queuePosition?: unknown
      estimatedWaitMs?: unknown
      expanding?: unknown
    }
    const startedAtMs = Date.now()

    setState({
      isSearching: true,
      startedAtMs,
      elapsedMs: 0,
      range: typeof payload?.range === 'number' ? payload.range : null,
      playersSearching: typeof payload?.playersSearching === 'number'
        ? payload.playersSearching
        : null,
      queuePosition: typeof payload?.queuePosition === 'number'
        ? payload.queuePosition
        : null,
      estimatedWaitMs: typeof payload?.estimatedWaitMs === 'number'
        ? payload.estimatedWaitMs
        : null,
      expanding: typeof payload?.expanding === 'boolean' ? payload.expanding : false,
    })

    startElapsedTimer()
  }

  const handleMatchmakingUpdate = (data: unknown) => {
    const payload = data as {
      range?: unknown
      elapsedMs?: unknown
      playersSearching?: unknown
      queuePosition?: unknown
      estimatedWaitMs?: unknown
      expanding?: unknown
    }

    setState(prev => ({
      ...prev,
      range: typeof payload?.range === 'number' ? payload.range : prev.range,
      elapsedMs: typeof payload?.elapsedMs === 'number' ? payload.elapsedMs : prev.elapsedMs,
      playersSearching: typeof payload?.playersSearching === 'number'
        ? payload.playersSearching
        : prev.playersSearching,
      queuePosition: typeof payload?.queuePosition === 'number'
        ? payload.queuePosition
        : prev.queuePosition,
      estimatedWaitMs: typeof payload?.estimatedWaitMs === 'number'
        ? payload.estimatedWaitMs
        : payload?.estimatedWaitMs === null
          ? null
          : prev.estimatedWaitMs,
      expanding: typeof payload?.expanding === 'boolean' ? payload.expanding : prev.expanding,
    }))
  }

  const handleAutoMatchFound = (data: unknown) => {
    const payload = data as { matchId?: unknown }
    const matchId = payload?.matchId
    if (isNavigatingRef.current) return
    if (typeof matchId !== 'string' || matchId.length === 0) return
    isNavigatingRef.current = true

    try {
      localStorage.removeItem('friendMatchState')
      sessionStorage.removeItem('friendMatchState')
    } catch (error) {
      console.error('Failed to clear stale friend match state:', error)
    }

    const friendMatchInfo = {
      matchId,
      joinCode: '',
      websocketUrl: WEBSOCKET_URL,
      quizName: quizNameRef.current || 'Random Quiz',
      quizId: quizIdRef.current !== null ? String(quizIdRef.current) : '',
      mode: 'create',
    }

    sessionStorage.setItem('friendMatch', JSON.stringify(friendMatchInfo))
    options?.onBeforeNavigate?.()
    window.location.pathname = '/friend-match'
  }

  const handleTimeout = (message?: string) => {
    clearElapsedTimer()
    setState(prev => ({ ...prev, isSearching: false }))
    toast({
      title: 'No match found',
      description: message || 'No match found within 5 minutes.',
      variant: 'destructive',
    })
    gameWebSocket.disconnect()
  }

  const handleCancel = () => {
    clearElapsedTimer()
    setState(prev => ({ ...prev, isSearching: false }))
    gameWebSocket.disconnect()
  }

  const handleFailure = (title: string, message?: string) => {
    clearElapsedTimer()
    setState(prev => ({ ...prev, isSearching: false }))
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

  const startSearch = async (prefs: StartMatchmakingPrefs): Promise<void> => {
    quizNameRef.current = prefs.quizName || 'Random Quiz'
    quizIdRef.current = typeof prefs.quizId === 'number' ? prefs.quizId : null

    try {
      sessionStorage.setItem('matchmakingPrefs', JSON.stringify({
        categoryId: prefs.categoryId,
        quizId: prefs.quizId ?? null,
        selectionMode: prefs.selectionMode,
      }))
    } catch (error) {
      console.error('Failed to persist matchmaking prefs:', error)
    }

    resetState()
    teardown()
    registerSocketHandlers()

    gameWebSocket.on('authenticated', () => {
      const payload: { categoryId: number; quizId?: number } = {
        categoryId: prefs.categoryId,
      }

      if (typeof prefs.quizId === 'number') {
        payload.quizId = prefs.quizId
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

  const cancelSearch = () => {
    gameWebSocket.send('cancel_auto_matchmaking', {})
  }

  // Safety net: fully tear down if the consuming component unmounts mid-search.
  useEffect(() => {
    return () => {
      teardown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    state,
    isSearching: state.isSearching,
    startSearch,
    cancelSearch,
    resetState,
    stopListening,
  }
}
