import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SessionControls = ({ session, onControlAction, className = '' }) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [timerAdjustment, setTimerAdjustment] = useState(0);

  const handleConfirmAction = (action) => {
    onControlAction(action);
    setShowConfirmDialog(null);
  };

  const handleTimerAdjust = (seconds) => {
    setTimerAdjustment(seconds);
    onControlAction('adjustTimer', seconds);
  };

  const isSessionActive = session?.status === 'active';
  const isSessionPaused = session?.status === 'paused';

  return (
    <div className={`bg-card border border-border rounded-lg p-6 shadow-elevation-1 ${className}`}>
      <h3 className="text-lg font-semibold text-card-foreground mb-4">Session Controls</h3>
      {/* Primary Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Button
          variant={isSessionActive ? "outline" : "default"}
          size="sm"
          iconName={isSessionActive ? "Pause" : "Play"}
          iconPosition="left"
          iconSize={16}
          onClick={() => onControlAction(isSessionActive ? 'pause' : 'resume')}
          fullWidth
        >
          {isSessionActive ? 'Pause' : 'Resume'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          iconName="SkipForward"
          iconPosition="left"
          iconSize={16}
          onClick={() => onControlAction('nextQuestion')}
          disabled={!isSessionActive}
          fullWidth
        >
          Next Question
        </Button>

        <Button
          variant="outline"
          size="sm"
          iconName="RotateCcw"
          iconPosition="left"
          iconSize={16}
          onClick={() => onControlAction('repeatQuestion')}
          disabled={!isSessionActive}
          fullWidth
        >
          Repeat
        </Button>

        <Button
          variant="destructive"
          size="sm"
          iconName="Square"
          iconPosition="left"
          iconSize={16}
          onClick={() => setShowConfirmDialog('end')}
          fullWidth
        >
          End Session
        </Button>
      </div>
      {/* Timer Controls */}
      <div className="bg-muted/30 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-card-foreground">Question Timer</span>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-primary">{session?.questionTimeLeft}s</span>
            <div className="w-12 h-2 bg-muted rounded-full">
              <div 
                className="h-2 bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${(session?.questionTimeLeft / session?.questionTimeLimit) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Adjust Timer</span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              iconName="Minus"
              iconSize={14}
              onClick={() => handleTimerAdjust(-10)}
              disabled={!isSessionActive}
              className="px-2"
            />
            <span className="text-sm font-medium text-card-foreground w-12 text-center">
              {timerAdjustment > 0 ? '+' : ''}{timerAdjustment}s
            </span>
            <Button
              variant="outline"
              size="sm"
              iconName="Plus"
              iconSize={14}
              onClick={() => handleTimerAdjust(10)}
              disabled={!isSessionActive}
              className="px-2"
            />
          </div>
        </div>
      </div>
      {/* Advanced Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Auto-advance questions</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={session?.autoAdvance}
              onChange={(e) => onControlAction('toggleAutoAdvance', e?.target?.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Show correct answers</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={session?.showAnswers}
              onChange={(e) => onControlAction('toggleShowAnswers', e?.target?.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Allow late joins</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={session?.allowLateJoins}
              onChange={(e) => onControlAction('toggleLateJoins', e?.target?.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
      {/* Emergency Actions */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            iconName="AlertTriangle"
            iconPosition="left"
            iconSize={14}
            onClick={() => setShowConfirmDialog('reset')}
            className="text-warning hover:text-warning"
          >
            Reset Session
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconName="Download"
            iconPosition="left"
            iconSize={14}
            onClick={() => onControlAction('exportData')}
          >
            Export Data
          </Button>
        </div>
      </div>
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-300">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <Icon name="AlertTriangle" size={24} className="text-warning" />
              <h4 className="text-lg font-semibold text-card-foreground">
                {showConfirmDialog === 'end' ? 'End Session' : 'Reset Session'}
              </h4>
            </div>
            <p className="text-muted-foreground mb-6">
              {showConfirmDialog === 'end' ?'Are you sure you want to end this quiz session? This action cannot be undone and all players will be disconnected.' :'Are you sure you want to reset this session? All progress will be lost and the quiz will restart from the beginning.'
              }
            </p>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmDialog(null)}
                fullWidth
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleConfirmAction(showConfirmDialog)}
                fullWidth
              >
                {showConfirmDialog === 'end' ? 'End Session' : 'Reset Session'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionControls;