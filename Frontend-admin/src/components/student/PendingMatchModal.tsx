import { useEffect, useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock } from 'lucide-react'
import { friendMatchService, type PendingMatchData } from '@/services/friendMatchService'

interface PendingMatchModalProps {
  isOpen: boolean
  onClose: () => void
  pendingMatch: PendingMatchData | null
  onRejoin: () => void
}

export function PendingMatchModal({ isOpen, onClose, pendingMatch, onRejoin }: PendingMatchModalProps) {
  const [countdown, setCountdown] = useState(pendingMatch?.timeRemaining || 0)

  useEffect(() => {
    if (!isOpen || !pendingMatch?.timeRemaining) return

    setCountdown(pendingMatch.timeRemaining)

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onClose()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, pendingMatch, onClose])

  if (!pendingMatch?.hasPendingMatch) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Match In Progress - You Were Disconnected
          </DialogTitle>
          <DialogDescription className="pt-2">
            You have a match waiting for you to reconnect. Your opponent is still in the match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm font-medium">Time Remaining:</span>
            <div className="flex items-center gap-1 text-red-600 font-bold">
              <Clock className="h-4 w-4" />
              {countdown}s
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Question {pendingMatch.currentQuestionIndex ?? 1} of {pendingMatch.totalQuestions ?? '?'}</p>
            <p className="mt-1">Join Code: <span className="font-mono font-semibold">{pendingMatch.joinCode}</span></p>
          </div>

          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-sm text-yellow-800">
              If you don't rejoin within {countdown} seconds, the match will be forfeited and your opponent will win.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Decline (Forfeit)
          </Button>
          <Button onClick={onRejoin} className="bg-green-600 hover:bg-green-700">
            Rejoin Match Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook to check for pending matches on app load - only checks once per session
export function usePendingMatchCheck() {
  const [pendingMatch, setPendingMatch] = useState<PendingMatchData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    const checkPendingMatch = async () => {
      // Skip if already checked this session
      if (hasCheckedRef.current) return
      
      // Skip if user already declined in this session
      const declinedThisSession = sessionStorage.getItem('pendingMatch_declined')
      if (declinedThisSession === 'true') {
        console.log('⏭️ Skipping pending match check - user already declined this session')
        hasCheckedRef.current = true
        return
      }

      const userData = localStorage.getItem('user')
      if (!userData) {
        hasCheckedRef.current = true
        return
      }

      try {
        const user = JSON.parse(userData)
        if (!user.id) {
          hasCheckedRef.current = true
          return
        }

        console.log('🔍 Checking for pending matches...')
        const result = await friendMatchService.checkPendingMatch(user.id)
        hasCheckedRef.current = true
        
        if (result?.hasPendingMatch && result.timeRemaining && result.timeRemaining > 0) {
          console.log('✅ Pending match found:', result)
          setPendingMatch(result)
          setShowModal(true)
        } else {
          console.log('❌ No pending match found')
        }
      } catch (error) {
        // Mark as checked even on error to prevent spam
        hasCheckedRef.current = true
        console.error('Error checking pending match:', error)
      }
    }

    // Check immediately on mount (only once)
    checkPendingMatch()
  }, [])

  const handleClose = () => {
    // Mark as declined for this session
    sessionStorage.setItem('pendingMatch_declined', 'true')
    
    if (pendingMatch?.hasPendingMatch) {
      const userData = localStorage.getItem('user')
      if (userData) {
        try {
          const user = JSON.parse(userData)
          // Fire and forget - don't wait for response
          friendMatchService.clearPendingMatch(user.id).catch(() => {})
        } catch (error) {
          console.error('Error clearing pending match:', error)
        }
      }
    }
    setShowModal(false)
    setPendingMatch(null)
  }

  const handleRejoin = () => {
    setShowModal(false)
    if (pendingMatch?.matchId) {
      // Store match data in sessionStorage for FriendMatchInterface to read
      const matchData = {
        matchId: pendingMatch.matchId,
        mode: 'create',
        joinCode: pendingMatch.joinCode || '',
        reconnect: true,
        timestamp: Date.now()
      }
      sessionStorage.setItem('friendMatch', JSON.stringify(matchData))
      
      console.log('🔄 Rejoining match:', pendingMatch.matchId)
      
      // Navigate to friend match
      window.location.href = '/friend-match'
    }
  }

  return {
    PendingMatchModal: (
      <PendingMatchModal
        isOpen={showModal}
        onClose={handleClose}
        pendingMatch={pendingMatch}
        onRejoin={handleRejoin}
      />
    ),
    pendingMatch,
    showModal,
    handleClose,
    handleRejoin
  }
}
