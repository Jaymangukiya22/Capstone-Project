import { apiClient } from './api'

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
      const response = await apiClient.post<ApiResponse<{ matchId: string; joinCode: string; websocketUrl: string }>>(
        this.friendMatchUrl,
        { quizId }
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to create friend match:', response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error creating friend match:', error)
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

// WebSocket connection for real-time gameplay
export class GameWebSocket {
  private socket: WebSocket | null = null
  private matchId: string | null = null
  private eventHandlers: Map<string, Function[]> = new Map()

  /**
   * Connect to match WebSocket
   */
  connect(websocketUrl: string, userId?: number, username?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(websocketUrl)

        this.socket.onopen = () => {
          console.log('Connected to match WebSocket')
          // Authenticate if userId and username are provided
          if (userId && username) {
            this.send('authenticate', { userId, username })
          }
          resolve()
        }

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data.type, data.payload)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.socket.onclose = () => {
          console.log('WebSocket connection closed')
          this.socket = null
        }

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    this.matchId = null
    this.eventHandlers.clear()
  }

  /**
   * Send message to server
   */
  send(type: string, payload: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }))
    } else {
      console.warn('WebSocket not connected')
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
   * Mark player as ready
   */
  setReady(ready: boolean = true): void {
    this.send('player_ready', { ready })
  }

  /**
   * Submit answer for current question
   */
  submitAnswer(questionId: number, selectedOptions: number[], timeSpent?: number): void {
    this.send('submit_answer', {
      questionId,
      selectedOptions,
      timeSpent: timeSpent || 0,
      timestamp: Date.now()
    })
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
    this.send('join_match_by_code', { joinCode: joinCode.toUpperCase() })
  }
}

// Export singleton WebSocket instance
export const gameWebSocket = new GameWebSocket()
