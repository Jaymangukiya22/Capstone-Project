import { apiClient, WEBSOCKET_URL } from './api'
import { io, Socket } from 'socket.io-client'
import { sessionManager } from '../utils/sessionManager'
import type { MatchState } from '../utils/sessionManager'

// Types for AI Opponents
export interface AIOpponent {
  id: string
  name: string
  difficulty: 'easy' | 'medium' | 'hard'
  responseTimeRange: {
    min: number
    max: number
  }
  accuracyRate: number
  avatar?: string
}

// Types for Matches
export interface MatchPlayer {
  userId: number
  username: string
  score: number
  isReady: boolean
  isAI: boolean
  aiOpponent?: {
    id: string
    name: string
    difficulty: string
    avatar: string
  }
}

export interface Match {
  id: string
  quizId: number
  quiz: {
    id: number
    title: string
    description: string
    difficulty: string
    timeLimit: number
  }
  players: MatchPlayer[]
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'
  currentQuestionIndex: number
  maxPlayers: number
  timeLimit: number
  createdAt: string
}

export interface AvailableMatch {
  id: string
  quizId: number
  quiz: {
    id: number
    title: string
    description: string
    difficulty: string
  }
  playerCount: number
  maxPlayers: number
  status: string
  createdAt: string
}

// API Response types
interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

class MatchService {
  private baseUrl = '/matches'
  private friendMatchUrl = '/api/friend-matches'

  /**
   * Get available AI opponents
   */
  async getAIOpponents(): Promise<AIOpponent[]> {
    try {
      const response = await apiClient.get<ApiResponse<AIOpponent[]>>(
        `${this.baseUrl}/ai-opponents`
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to fetch AI opponents:', response.data.message)
        return []
      }
    } catch (error) {
      console.error('Error fetching AI opponents:', error)
      return []
    }
  }

  /**
   * Create a solo match with AI opponent
   */
  async createSoloMatch(quizId: number, aiOpponentId?: string): Promise<string | null> {
    try {
      const response = await apiClient.post<ApiResponse<{ matchId: string }>>(
        `${this.baseUrl}/solo`,
        {
          quizId,
          aiOpponentId
        }
      )
      
      if (response.data.success) {
        return response.data.data.matchId
      } else {
        console.error('Failed to create solo match:', response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error creating solo match:', error)
      return null
    }
  }

  /**
   * Create a multiplayer match
   */
  async createMultiplayerMatch(quizId: number, maxPlayers: number = 10): Promise<string | null> {
    try {
      const response = await apiClient.post<ApiResponse<{ matchId: string }>>(
        `${this.baseUrl}/multiplayer`,
        {
          quizId,
          maxPlayers
        }
      )
      
      if (response.data.success) {
        return response.data.data.matchId
      } else {
        console.error('Failed to create multiplayer match:', response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error creating multiplayer match:', error)
      return null
    }
  }

  /**
   * Join an existing match
   */
  async joinMatch(matchId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<ApiResponse<{ matchId: string }>>(
        `${this.baseUrl}/${matchId}/join`
      )
      
      if (response.data.success) {
        return true
      } else {
        console.error('Failed to join match:', response.data.message)
        return false
      }
    } catch (error) {
      console.error('Error joining match:', error)
      return false
    }
  }

  /**
   * Get match details
   */
  async getMatch(matchId: string): Promise<Match | null> {
    try {
      const response = await apiClient.get<ApiResponse<Match>>(
        `${this.baseUrl}/${matchId}`
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to fetch match:', response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error fetching match:', error)
      return null
    }
  }

  /**
   * Get available matches for joining
   */
  async getAvailableMatches(): Promise<AvailableMatch[]> {
    try {
      const response = await apiClient.get<ApiResponse<AvailableMatch[]>>(
        `${this.baseUrl}/available`
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to fetch available matches:', response.data.message)
        return []
      }
    } catch (error) {
      console.error('Error fetching available matches:', error)
      return []
    }
  }

  /**
   * Get user's match history
   */
  async getMatchHistory(page: number = 1, limit: number = 20): Promise<{
    matches: any[]
    pagination: {
      currentPage: number
      totalPages: number
      totalMatches: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `${this.baseUrl}/history/user?page=${page}&limit=${limit}`
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to fetch match history:', response.data.message)
        return {
          matches: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalMatches: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    } catch (error) {
      console.error('Error fetching match history:', error)
      return {
        matches: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalMatches: 0,
          hasNext: false,
          hasPrev: false
        }
      }
    }
  }

  /**
   * Create a friend match (1v1 with join code)
   */
  async createFriendMatch(quizId: number): Promise<{ matchId: string; joinCode: string; websocketUrl: string } | null> {
    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('user');
      let userId = 1;
      let username = 'Player1';
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          userId = user.id;
          username = user.email || user.username;
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      const response = await apiClient.post<ApiResponse<{ matchId: string; joinCode: string }>>(
        this.friendMatchUrl,
        { quizId, userId, username }
      )
      
      if (response.data.success && response.data.data) {
        // Use the dynamic WEBSOCKET_URL from api.ts
        return {
          ...response.data.data,
          websocketUrl: WEBSOCKET_URL
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to create friend match:', error)
      return null
    }
  }

  /**
   * Find match by join code
   */
  async findMatchByCode(joinCode: string): Promise<any | null> {
    try {
      const response = await apiClient.get<ApiResponse<{ match: any }>>(
        `${this.friendMatchUrl}/code/${joinCode.toUpperCase()}`
      )
      
      if (response.data.success) {
        return response.data.data.match
      } else {
        console.error('Failed to find match by code:', response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error finding match by code:', error)
      return null
    }
  }
}

// Export singleton instance
export const matchService = new MatchService()

// WebSocket connection for real-time gameplay using Socket.IO
export class GameWebSocket {
  private socket: Socket | null = null
  private matchId: string | null = null
  private eventHandlers: Map<string, Function[]> = new Map()
  public onLoadGameScene(callback: (data: any) => void) {
    // Use the generic event handler system so this works even if connect()
    // hasn't run yet. onAny() will dispatch LOAD_GAME_SCENE to this handler.
    this.on('LOAD_GAME_SCENE', callback)
  }

  // ✅ ADD THIS METHOD
  public emitClientReady(matchId: string, userId: number) {
    if (this.socket) {
      console.log('📤 Sending CLIENT_READY signal', { matchId, userId });
      this.socket.emit('CLIENT_READY', { matchId, userId });
    }
  }

  // Allow React components to synchronize the current matchId with the
  // WebSocket layer so that events like submit_answer always include it.
  public setMatchId(matchId: string | null) {
    this.matchId = matchId;
  }
  /**
   * Connect to match WebSocket using Socket.IO with session management
   */
  connect(websocketUrl: string, userId?: number, username?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Check for existing session and reconnection data
        const reconnectionData = sessionManager.getReconnectionData();
        if (reconnectionData) {
          console.log('Found reconnection data:', reconnectionData);
          this.matchId = reconnectionData.matchId;
        }

        // Use websocketUrl directly - it already has the correct protocol and path
        console.log('🔌 [SOCKET] Connecting to match server:', websocketUrl);
        console.log('🔌 [SOCKET] User:', { userId, username });
        console.log('🔌 [SOCKET] Window location:', window.location.href);
        
        this.socket = io(websocketUrl, {
          transports: ['websocket'],
          upgrade: false,
          timeout: 10000,
        });

        console.log('🔌 [SOCKET] Socket.IO instance created, waiting for connection...');

        this.socket.on('connect', () => {
          console.log('✅ [SOCKET] Connected to match WebSocket via Socket.IO')
          console.log('✅ [SOCKET] Socket ID:', this.socket?.id);
          
          // Update session with connection info
          sessionManager.updateMatchState({
            connectedAt: Date.now(),
            lastActivity: Date.now()
          });

          // Authenticate if userId and username are provided
          if (userId && username) {
            // Get user data from localStorage for firstName/lastName
            const userData = localStorage.getItem('user');
            let firstName = '';
            let lastName = '';
            if (userData) {
              try {
                const user = JSON.parse(userData);
                firstName = user.firstName || '';
                lastName = user.lastName || '';
              } catch (e) {
                console.error('Error parsing user data:', e);
              }
            }
            console.log('🔐 [SOCKET] Sending authenticate with:', { userId, username, firstName, lastName });
            this.send('authenticate', { userId, username, firstName, lastName })
          }
          resolve()
        })

        this.socket.on('disconnect', (reason) => {
          console.log('❌ [SOCKET] Socket.IO connection closed. Reason:', reason)
          this.socket = null
        })

        this.socket.on('connect_error', (error) => {
          console.error('❌ [SOCKET] Socket.IO connection error:', error)
          reject(error)
        })

        this.socket.on('error', (error) => {
          console.error('❌ [SOCKET] Socket.IO error:', error)
        })

        // Listen for all events and forward to handlers
        this.socket.onAny((eventName, ...args) => {
          const data = args[0] || {}
          console.log('📨 [SOCKET] Received event:', eventName, data);
          this.handleMessage(eventName, data)
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from Socket.IO
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.matchId = null
    this.eventHandlers.clear()
  }

  /**
   * Send message to server via Socket.IO
   */
  send(type: string, payload: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(type, payload)
    } else {
      console.warn('Socket.IO not connected')
    }
  }

  /**
   * Add event listener
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(type: string, payload: any): void {
    const handlers = this.eventHandlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (error) {
          console.error(`Error in ${type} handler:`, error)
        }
      })
    }
  }

  /**
   * Join match room
   */
  joinMatch(): void {
    this.send('join_match', { matchId: this.matchId })
  }

  /**
   * Emit event (alias for send)
   */
  emit(event: string, data?: any): void {
    this.send(event, data)
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.eventHandlers.clear()
    if (this.socket) {
      this.socket.removeAllListeners()
    }
  }

  /**
   * Mark player as ready
   */
  setReady(ready: boolean = true, matchId?: string): void {
    console.log('🚀 SENDING player_ready event with ready:', ready, 'matchId:', matchId)
    // CRITICAL FIX: Include matchId so master server can route to correct worker
    const payload: any = { ready };
    if (matchId) {
      payload.matchId = matchId;
    }
    this.send('player_ready', payload)
  }

  /**
   * Submit answer for current question with session tracking
   */
  submitAnswer(questionId: number, selectedOptions: number[], timeSpent?: number): void {
    // Ensure we have a matchId even for friend matches where the
    // GameWebSocket.startMatch helper is not used. Fall back to
    // the friendMatch info stored in sessionStorage.
    if (!this.matchId) {
      try {
        const friendMatchInfo = sessionStorage.getItem('friendMatch');
        if (friendMatchInfo) {
          const parsed = JSON.parse(friendMatchInfo);
          if (parsed.matchId) {
            this.matchId = parsed.matchId;
          }
        }
      } catch (e) {
        console.error('Failed to restore matchId from friendMatch session:', e);
      }
    }

    const answerData: any = {
      questionId,
      selectedOptions,
      timeSpent: timeSpent || 0,
      timestamp: Date.now()
    };
    
    // CRITICAL FIX: Include matchId so worker can route to correct match
    if (this.matchId) {
      answerData.matchId = this.matchId;
    }

    // Update session with answer data
    const currentState = sessionManager.getMatchState();
    const currentGameState = currentState?.gameState;
    sessionManager.updateMatchState({
      gameState: {
        currentQuestionIndex: currentGameState?.currentQuestionIndex || 0,
        score: currentGameState?.score || 0,
        timeRemaining: currentGameState?.timeRemaining,
        answers: [
          ...(currentGameState?.answers || []),
          {
            questionId,
            selectedOptionId: selectedOptions[0], // Take first option for now
            timeSpent: timeSpent || 0,
            timestamp: Date.now()
          }
        ]
      },
      lastActivity: Date.now()
    });

    this.send('submit_answer', answerData)
  }

  /**
   * Start match with session tracking
   */
  startMatch(matchId: string, quizId: number, mode: 'solo' | '1v1' | 'multiplayer' | 'friend'): void {
    this.matchId = matchId;
    
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    let playerData = undefined;
    if (userData) {
      try {
        const user = JSON.parse(userData);
        playerData = {
          userId: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        };
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    // Save match state to session
    const matchState: MatchState = {
      matchId,
      quizId,
      playerData,
      mode,
      status: 'waiting',
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      gameState: {
        currentQuestionIndex: 0,
        score: 0,
        answers: []
      }
    };

    sessionManager.saveMatchState(matchState);
    console.log('Match session saved:', matchState);
  }

  /**
   * Update match progress in session
   */
  updateMatchProgress(questionIndex: number, score: number, timeRemaining?: number): void {
    const currentState = sessionManager.getMatchState();
    const currentGameState = currentState?.gameState;
    sessionManager.updateMatchState({
      gameState: {
        currentQuestionIndex: questionIndex,
        score,
        timeRemaining,
        answers: currentGameState?.answers || []
      },
      lastActivity: Date.now()
    });
  }

  /**
   * Handle reconnection if session exists
   */
  attemptReconnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const reconnectionData = sessionManager.getReconnectionData();
      if (!reconnectionData) {
        resolve(false);
        return;
      }

      console.log('Attempting to reconnect to match:', reconnectionData.matchId);
      
      // Try to reconnect to the existing match
      this.send('reconnect_to_match', {
        matchId: reconnectionData.matchId,
        gameState: reconnectionData.gameState
      });

      // Set timeout for reconnection attempt
      setTimeout(() => {
        resolve(true); // Return true to indicate attempt was made
      }, 2000);
    });
  }

  /**
   * Clear session when match ends
   */
  endMatch(): void {
    sessionManager.updateMatchState({
      status: 'finished',
      lastActivity: Date.now()
    });
    
    // Clear session after a delay to allow for result viewing
    setTimeout(() => {
      sessionManager.clearMatchState();
    }, 30000); // Clear after 30 seconds
  }

  /**
   * Handle match completion results
   */
  onMatchCompleted(callback: (data: { results: any[], winner: any, matchId: string, playerResult?: any }) => void): void {
    this.on('match_completed', callback);
  }

  /**
   * Create friend match via WebSocket
   */
  createFriendMatch(quizId: number): void {
    this.send('create_friend_match', { quizId })
  }

  /**
   * Join match by code via WebSocket
   */
  joinMatchByCode(joinCode: string): void {
    console.log('🚀 SENDING join_match event with code:', joinCode.toUpperCase())
    this.send('join_match', { joinCode: joinCode.toUpperCase() })
  }
}

// Export singleton WebSocket instance
export const gameWebSocket = new GameWebSocket()
