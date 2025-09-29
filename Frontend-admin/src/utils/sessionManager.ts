interface MatchState {
  matchId: string;
  quizId: number;
  joinCode?: string;
  playerData?: {
    userId: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  gameState?: {
    currentQuestionIndex: number;
    score: number;
    timeRemaining?: number;
    answers: Array<{
      questionId: number;
      selectedOptionId: number;
      timeSpent: number;
      timestamp: number;
    }>;
  };
  mode: 'solo' | '1v1' | 'multiplayer' | 'friend';
  status: 'waiting' | 'playing' | 'finished';
  connectedAt?: number;
  lastActivity?: number;
}

interface QuestionAnswers {
  [questionId: number]: {
    correctAnswer: string; // Encrypted
    options: string; // Encrypted options array
    timestamp: number;
  };
}

class SessionManager {
  private readonly MATCH_KEY = 'quizapp_match_state';
  private readonly ANSWERS_KEY = 'quizapp_question_data';
  private readonly CRYPTO_KEY = 'QuizApp2024SecureKey!@#';

  // Simple encryption for answer data (base64 + XOR cipher)
  private encryptData(data: string): string {
    try {
      const key = this.CRYPTO_KEY;
      let encrypted = '';
      
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        encrypted += String.fromCharCode(charCode);
      }
      
      return btoa(encrypted); // Base64 encode
    } catch (error) {
      console.error('Encryption error:', error);
      return btoa(data); // Fallback to simple base64
    }
  }

  private decryptData(encryptedData: string): string {
    try {
      const key = this.CRYPTO_KEY;
      const decoded = atob(encryptedData); // Base64 decode
      let decrypted = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return atob(encryptedData); // Fallback to simple base64 decode
    }
  }

  // Match State Management
  saveMatchState(matchState: MatchState): void {
    try {
      matchState.lastActivity = Date.now();
      const encrypted = this.encryptData(JSON.stringify(matchState));
      sessionStorage.setItem(this.MATCH_KEY, encrypted);
      console.log('Match state saved to session storage');
    } catch (error) {
      console.error('Failed to save match state:', error);
    }
  }

  getMatchState(): MatchState | null {
    try {
      const encrypted = sessionStorage.getItem(this.MATCH_KEY);
      if (!encrypted) return null;

      const decrypted = this.decryptData(encrypted);
      const matchState: MatchState = JSON.parse(decrypted);
      
      // Check if session is still valid (24 hours)
      const isExpired = matchState.lastActivity && 
        (Date.now() - matchState.lastActivity) > 24 * 60 * 60 * 1000;
      
      if (isExpired) {
        this.clearMatchState();
        return null;
      }

      return matchState;
    } catch (error) {
      console.error('Failed to get match state:', error);
      this.clearMatchState(); // Clear corrupted data
      return null;
    }
  }

  updateMatchState(updates: Partial<MatchState>): void {
    const currentState = this.getMatchState();
    if (currentState) {
      const updatedState = { ...currentState, ...updates };
      this.saveMatchState(updatedState);
    }
  }

  clearMatchState(): void {
    sessionStorage.removeItem(this.MATCH_KEY);
    console.log('Match state cleared from session storage');
  }

  // Question Answers Management (Encrypted)
  saveQuestionAnswers(quizId: number, questionAnswers: QuestionAnswers): void {
    try {
      const dataToEncrypt = JSON.stringify({
        quizId,
        answers: questionAnswers,
        timestamp: Date.now()
      });
      
      const encrypted = this.encryptData(dataToEncrypt);
      localStorage.setItem(`${this.ANSWERS_KEY}_${quizId}`, encrypted);
      console.log('Question answers saved (encrypted)');
    } catch (error) {
      console.error('Failed to save question answers:', error);
    }
  }

  getQuestionAnswers(quizId: number): QuestionAnswers | null {
    try {
      const encrypted = localStorage.getItem(`${this.ANSWERS_KEY}_${quizId}`);
      if (!encrypted) return null;

      const decrypted = this.decryptData(encrypted);
      const data = JSON.parse(decrypted);
      
      // Check if data is recent (12 hours)
      const isExpired = (Date.now() - data.timestamp) > 12 * 60 * 60 * 1000;
      if (isExpired) {
        this.clearQuestionAnswers(quizId);
        return null;
      }

      return data.answers;
    } catch (error) {
      console.error('Failed to get question answers:', error);
      this.clearQuestionAnswers(quizId);
      return null;
    }
  }

  clearQuestionAnswers(quizId: number): void {
    localStorage.removeItem(`${this.ANSWERS_KEY}_${quizId}`);
  }

  // Utility Methods
  hasActiveMatch(): boolean {
    const matchState = this.getMatchState();
    return matchState !== null && matchState.status !== 'finished';
  }

  canReconnect(): boolean {
    const matchState = this.getMatchState();
    if (!matchState) return false;
    
    // Allow reconnection if last activity was within 10 minutes
    const timeSinceLastActivity = Date.now() - (matchState.lastActivity || 0);
    return timeSinceLastActivity < 10 * 60 * 1000 && matchState.status === 'playing';
  }

  getReconnectionData(): { matchId: string; gameState: MatchState['gameState'] } | null {
    const matchState = this.getMatchState();
    if (!matchState || !this.canReconnect()) return null;
    
    return {
      matchId: matchState.matchId,
      gameState: matchState.gameState
    };
  }

  // Clean up expired data
  cleanup(): void {
    // Clean up expired match states
    const matchState = this.getMatchState();
    if (matchState) {
      const isExpired = matchState.lastActivity && 
        (Date.now() - matchState.lastActivity) > 24 * 60 * 60 * 1000;
      if (isExpired) {
        this.clearMatchState();
      }
    }

    // Clean up old answer data (scan all localStorage keys)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.ANSWERS_KEY)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const decrypted = this.decryptData(data);
            const parsed = JSON.parse(decrypted);
            const isExpired = (Date.now() - parsed.timestamp) > 12 * 60 * 60 * 1000;
            if (isExpired) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted data
          localStorage.removeItem(key);
        }
      }
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
export type { MatchState, QuestionAnswers };
