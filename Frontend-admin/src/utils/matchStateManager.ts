/**
 * Match State Manager
 * Handles persistence and restoration of friend match state for reconnection
 * Following Rule 7: Never hardcode, use environment-specific approach
 * Following Rule 19-21: camelCase for functions, PascalCase for classes
 */

interface MatchPlayer {
  userId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  socketId: string;
  score: number;
  currentQuestionIndex: number;
  isReady: boolean;
  answers?: Array<{
    questionId: number;
    selectedOptions: number[];
    timeSpent: number;
    isCorrect: boolean;
    points: number;
  }>;
}

interface MatchState {
  matchId: string;
  joinCode: string;
  websocketUrl: string;
  mode: string;
  currentQuestion: number;
  totalQuestions: number;
  answers: Record<number, number[]>;
  players: MatchPlayer[];
  isWaitingForPlayers: boolean;
  isMatchStarted: boolean;
  currentQuestionData: any;
  questionStartTime: number;
  questionTimeRemaining: number;
  timestamp: number;
}

class MatchStateManager {
  private readonly STORAGE_KEY = 'friendMatchState';
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Save current match state to localStorage
   * Following Rule 21: Max 30 lines per function
   */
  public saveMatchState(state: Partial<MatchState>): void {
    try {
      const existingState = this.getMatchState();
      const newState: MatchState = {
        ...existingState,
        ...state,
        timestamp: Date.now()
      } as MatchState;

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newState));
      console.log('💾 Match state saved:', {
        matchId: newState.matchId,
        currentQuestion: newState.currentQuestion,
        totalQuestions: newState.totalQuestions
      });
    } catch (error) {
      console.error('❌ Failed to save match state:', error);
    }
  }

  /**
   * Restore match state from localStorage
   * Returns null if state is invalid or expired
   */
  public getMatchState(): MatchState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const state: MatchState = JSON.parse(stored);
      
      // Check if state is expired
      if (Date.now() - state.timestamp > this.MAX_AGE_MS) {
        console.warn('⚠️ Match state expired, clearing...');
        this.clearMatchState();
        return null;
      }

      return state;
    } catch (error) {
      console.error('❌ Failed to restore match state:', error);
      return null;
    }
  }

  /**
   * Check if there's a valid match state for reconnection
   */
  public hasValidMatchState(): boolean {
    const state = this.getMatchState();
    return state !== null && !!state.matchId;
  }

  /**
   * Clear match state from localStorage
   */
  public clearMatchState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Match state cleared');
    } catch (error) {
      console.error('❌ Failed to clear match state:', error);
    }
  }

  /**
   * Update specific fields in match state
   */
  public updateMatchState(updates: Partial<MatchState>): void {
    const currentState = this.getMatchState();
    if (currentState) {
      this.saveMatchState({
        ...currentState,
        ...updates
      });
    }
  }

  /**
   * Check if match is in progress (started but not completed)
   */
  public isMatchInProgress(): boolean {
    const state = this.getMatchState();
    return state !== null && 
           state.isMatchStarted && 
           !state.isWaitingForPlayers &&
           state.currentQuestion > 0;
  }

  /**
   * Get match info for reconnection
   */
  public getReconnectionInfo(): { matchId: string; joinCode: string } | null {
    const state = this.getMatchState();
    if (state && state.matchId && state.joinCode) {
      return {
        matchId: state.matchId,
        joinCode: state.joinCode
      };
    }
    return null;
  }
}

// Export singleton instance
export const matchStateManager = new MatchStateManager();

// Export types
export type { MatchState, MatchPlayer };
