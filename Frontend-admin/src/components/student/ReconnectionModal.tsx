import React, { useEffect, useState } from 'react';
import { sessionManager } from '@/utils/sessionManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReconnectionModalProps {
  isOpen: boolean;
  onReconnect: (matchId: string) => Promise<void>;
  onStartNew: () => void;
}

const ReconnectionModal: React.FC<ReconnectionModalProps> = ({
  isOpen,
  onReconnect,
  onStartNew
}) => {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [matchState, setMatchState] = useState(sessionManager.getMatchState());
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setMatchState(sessionManager.getMatchState());
    }
  }, [isOpen]);

  const handleReconnect = async () => {
    if (!matchState?.matchId) return;

    setIsReconnecting(true);
    try {
      await onReconnect(matchState.matchId);
      console.log('Successfully reconnected to match');
    } catch (error) {
      console.error('Failed to reconnect:', error);
      // If reconnection fails, clear the session
      sessionManager.clearMatchState();
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleStartNew = () => {
    sessionManager.clearMatchState();
    onStartNew();
  };

  if (!matchState || !sessionManager.canReconnect()) {
    return null;
  }

  const getTimeSinceLastActivity = () => {
    if (!matchState.lastActivity) return 'Unknown';
    
    const timeDiff = Date.now() - matchState.lastActivity;
    const minutes = Math.floor(timeDiff / 60000);
    const seconds = Math.floor((timeDiff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  const getGameProgress = () => {
    const current = matchState.gameState?.currentQuestionIndex || 0;
    const score = matchState.gameState?.score || 0;
    return { current: current + 1, score };
  };

  const progress = getGameProgress();

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Reconnect to Match?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Match Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Active Match Found</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><span className="font-medium">Mode:</span> {matchState.mode}</p>
              <p><span className="font-medium">Status:</span> {matchState.status}</p>
              <p><span className="font-medium">Progress:</span> Question {progress.current}</p>
              <p><span className="font-medium">Score:</span> {progress.score} points</p>
              <p><span className="font-medium">Last Activity:</span> {getTimeSinceLastActivity()}</p>
              {matchState.joinCode && (
                <p><span className="font-medium">Join Code:</span> {matchState.joinCode}</p>
              )}
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            {isReconnecting ? (
              <>
                <WifiOff className="h-4 w-4 text-orange-500 animate-pulse" />
                <span className="text-orange-600">Reconnecting...</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Ready to reconnect</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex-1"
            >
              {isReconnecting ? 'Reconnecting...' : 'Reconnect to Match'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleStartNew}
              disabled={isReconnecting}
            >
              Start New
            </Button>
          </div>

          {/* Warning */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <p>💡 <strong>Tip:</strong> Your progress is saved locally and encrypted for security. 
            Reconnecting will restore your current position in the quiz.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReconnectionModal;
