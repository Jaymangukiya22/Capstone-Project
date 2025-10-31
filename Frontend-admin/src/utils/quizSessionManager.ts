/**
 * Quiz Session Manager
 * Handles quiz state, prevents re-entry to completed quizzes, and manages navigation
 */

export interface QuizSession {
  quizId: string;
  mode: string;
  gameCode?: string;
  quizName?: string;
  startTime: number;
  attemptId?: number | null;
  isCompleted?: boolean;
  completedAt?: number;
}

export interface QuizResults {
  score: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: string;
  studentName: string;
  leaderboard?: any[];
}

class QuizSessionManager {
  private static instance: QuizSessionManager;
  private readonly CURRENT_QUIZ_KEY = 'currentQuiz';
  private readonly QUIZ_RESULTS_KEY = 'quizResults';
  private readonly FRIEND_MATCH_RESULTS_KEY = 'friendMatchResults';
  private readonly COMPLETED_QUIZZES_KEY = 'completedQuizzes';

  static getInstance(): QuizSessionManager {
    if (!QuizSessionManager.instance) {
      QuizSessionManager.instance = new QuizSessionManager();
    }
    return QuizSessionManager.instance;
  }

  /**
   * Start a new quiz session
   */
  startQuizSession(session: QuizSession): void {
    // Clear any previous results
    this.clearResults();
    
    // Mark session as active
    const activeSession = {
      ...session,
      isCompleted: false,
      startTime: Date.now()
    };
    
    sessionStorage.setItem(this.CURRENT_QUIZ_KEY, JSON.stringify(activeSession));
  }

  /**
   * Get current active quiz session
   */
  getCurrentSession(): QuizSession | null {
    try {
      const sessionData = sessionStorage.getItem(this.CURRENT_QUIZ_KEY);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Update current session (e.g., set attemptId)
   */
  updateSession(updates: Partial<QuizSession>): void {
    const currentSession = this.getCurrentSession();
    if (currentSession) {
      const updatedSession = { ...currentSession, ...updates };
      sessionStorage.setItem(this.CURRENT_QUIZ_KEY, JSON.stringify(updatedSession));
    }
  }

  /**
   * Complete the current quiz session
   */
  completeQuizSession(results: QuizResults): void {
    const currentSession = this.getCurrentSession();
    if (currentSession) {
      // Mark session as completed
      const completedSession = {
        ...currentSession,
        isCompleted: true,
        completedAt: Date.now()
      };
      
      // Store completed quiz info
      this.addToCompletedQuizzes(completedSession);
      
      // Store results
      sessionStorage.setItem(this.QUIZ_RESULTS_KEY, JSON.stringify(results));
      
      // Clear current session
      sessionStorage.removeItem(this.CURRENT_QUIZ_KEY);
    }
  }

  /**
   * Check if user can access quiz (not completed recently)
   */
  canAccessQuiz(quizId: string): boolean {
    const completedQuizzes = this.getCompletedQuizzes();
    const recentCompletion = completedQuizzes.find(
      quiz => quiz.quizId === quizId && 
      quiz.completedAt && 
      (Date.now() - quiz.completedAt) < 5 * 60 * 1000 // 5 minutes cooldown
    );
    
    return !recentCompletion;
  }

  /**
   * Check if there's an active quiz session
   */
  hasActiveSession(): boolean {
    const session = this.getCurrentSession();
    return session !== null && !session.isCompleted;
  }

  /**
   * Check if user is trying to re-enter a completed quiz
   */
  isQuizCompleted(quizId: string): boolean {
    const completedQuizzes = this.getCompletedQuizzes();
    return completedQuizzes.some(quiz => quiz.quizId === quizId);
  }

  /**
   * Get quiz results
   */
  getQuizResults(): QuizResults | null {
    try {
      const results = sessionStorage.getItem(this.QUIZ_RESULTS_KEY);
      return results ? JSON.parse(results) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear all quiz-related data
   */
  clearAllQuizData(): void {
    sessionStorage.removeItem(this.CURRENT_QUIZ_KEY);
    sessionStorage.removeItem(this.QUIZ_RESULTS_KEY);
    sessionStorage.removeItem(this.FRIEND_MATCH_RESULTS_KEY);
  }

  /**
   * Clear only results (keep session active)
   */
  clearResults(): void {
    sessionStorage.removeItem(this.QUIZ_RESULTS_KEY);
    sessionStorage.removeItem(this.FRIEND_MATCH_RESULTS_KEY);
  }

  /**
   * Force end current session (for navigation guards)
   */
  forceEndSession(): void {
    const session = this.getCurrentSession();
    if (session) {
      // Mark as completed without results
      const endedSession = {
        ...session,
        isCompleted: true,
        completedAt: Date.now()
      };
      this.addToCompletedQuizzes(endedSession);
    }
    
    this.clearAllQuizData();
  }

  /**
   * Get completed quizzes list
   */
  private getCompletedQuizzes(): QuizSession[] {
    try {
      const completed = localStorage.getItem(this.COMPLETED_QUIZZES_KEY);
      return completed ? JSON.parse(completed) : [];
    } catch {
      return [];
    }
  }

  /**
   * Add quiz to completed list
   */
  private addToCompletedQuizzes(session: QuizSession): void {
    const completedQuizzes = this.getCompletedQuizzes();
    
    // Remove any existing entry for this quiz
    const filtered = completedQuizzes.filter(quiz => quiz.quizId !== session.quizId);
    
    // Add new completion
    filtered.push(session);
    
    // Keep only last 50 completed quizzes
    const limited = filtered.slice(-50);
    
    localStorage.setItem(this.COMPLETED_QUIZZES_KEY, JSON.stringify(limited));
  }

  /**
   * Validate navigation to quiz interface
   */
  validateQuizAccess(): { canAccess: boolean; reason?: string; redirectTo?: string } {
    const session = this.getCurrentSession();
    
    if (!session) {
      return {
        canAccess: false,
        reason: 'No active quiz session found',
        redirectTo: '/student-quiz'
      };
    }

    if (session.isCompleted) {
      return {
        canAccess: false,
        reason: 'Quiz already completed',
        redirectTo: '/quiz-results'
      };
    }

    return { canAccess: true };
  }

  /**
   * Validate navigation to results page
   */
  validateResultsAccess(): { canAccess: boolean; reason?: string; redirectTo?: string } {
    const results = this.getQuizResults();
    const friendResults = sessionStorage.getItem(this.FRIEND_MATCH_RESULTS_KEY);
    
    if (!results && !friendResults) {
      return {
        canAccess: false,
        reason: 'No quiz results found',
        redirectTo: '/student-quiz'
      };
    }

    return { canAccess: true };
  }
}

// Export singleton instance
export const quizSessionManager = QuizSessionManager.getInstance();

// Utility functions for components
export const useQuizSession = () => {
  return {
    startSession: (session: QuizSession) => quizSessionManager.startQuizSession(session),
    getCurrentSession: () => quizSessionManager.getCurrentSession(),
    updateSession: (updates: Partial<QuizSession>) => quizSessionManager.updateSession(updates),
    completeSession: (results: QuizResults) => quizSessionManager.completeQuizSession(results),
    hasActiveSession: () => quizSessionManager.hasActiveSession(),
    canAccessQuiz: (quizId: string) => quizSessionManager.canAccessQuiz(quizId),
    clearAllData: () => quizSessionManager.clearAllQuizData(),
    forceEndSession: () => quizSessionManager.forceEndSession(),
    validateQuizAccess: () => quizSessionManager.validateQuizAccess(),
    validateResultsAccess: () => quizSessionManager.validateResultsAccess()
  };
};
