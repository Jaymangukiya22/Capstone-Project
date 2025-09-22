import { apiClient } from './api'

// Types for Friend Match API
export interface FriendMatchResponse {
  matchId: string
  joinCode: string
  message: string
  websocketUrl: string
}

export interface MatchInfo {
  id: string
  quizId: number
  quiz: {
    id: number
    title: string
    description: string
    difficulty: string
    timeLimit: number
  }
  playerCount: number
  maxPlayers: number
  status: string
  joinCode: string
  matchType: string
  createdAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

class FriendMatchService {
  private baseUrl = '/api/friend-matches'

  /**
   * Create a friend match (1v1 with join code)
   */
  async createFriendMatch(quizId: number): Promise<FriendMatchResponse | null> {
    try {
      const response = await apiClient.post<ApiResponse<FriendMatchResponse>>(
        this.baseUrl,
        { quizId }
      )
      
      if (response.data.success) {
        return response.data.data
      } else {
        console.error('Failed to create friend match:', response.data.error || response.data.message)
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
  async findMatchByCode(joinCode: string): Promise<MatchInfo | null> {
    try {
      const response = await apiClient.get<ApiResponse<{ match: MatchInfo }>>(
        `${this.baseUrl}/code/${joinCode.toUpperCase()}`
      )
      
      if (response.data.success) {
        return response.data.data.match
      } else {
        console.error('Failed to find match by code:', response.data.error || response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error finding match by code:', error)
      return null
    }
  }

  /**
   * Get all active friend matches
   */
  async getActiveMatches(): Promise<MatchInfo[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ matches: MatchInfo[] }>>(
        this.baseUrl
      )
      
      if (response.data.success) {
        return response.data.data.matches || []
      } else {
        console.error('Failed to get active matches:', response.data.error || response.data.message)
        return []
      }
    } catch (error) {
      console.error('Error getting active matches:', error)
      return []
    }
  }

  /**
   * Get specific match details
   */
  async getMatchDetails(matchId: string): Promise<MatchInfo | null> {
    try {
      const response = await apiClient.get<ApiResponse<{ match: MatchInfo }>>(
        `${this.baseUrl}/${matchId}`
      )
      
      if (response.data.success) {
        return response.data.data.match
      } else {
        console.error('Failed to get match details:', response.data.error || response.data.message)
        return null
      }
    } catch (error) {
      console.error('Error getting match details:', error)
      return null
    }
  }

  /**
   * Generate a random join code (fallback if backend doesn't provide one)
   */
  generateJoinCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }
}

// Export singleton instance
export const friendMatchService = new FriendMatchService()

// WebSocket connection for friend matches
export class FriendMatchWebSocket {
  private socket: WebSocket | null = null
  private eventHandlers: Map<string, Function[]> = new Map()

  /**
   * Connect to friend match WebSocket
   */
  connect(websocketUrl: string, userId: number, username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(websocketUrl)

        this.socket.onopen = () => {
          console.log('Connected to friend match WebSocket')
          // Authenticate with the match service
          this.send('authenticate', { userId, username })
          resolve()
        }

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data.type || data.event, data.payload || data)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.socket.onclose = () => {
          console.log('Friend match WebSocket connection closed')
          this.socket = null
        }

        this.socket.onerror = (error) => {
          console.error('Friend match WebSocket error:', error)
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
    this.eventHandlers.clear()
  }

  /**
   * Send message to server
   */
  send(type: string, payload: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }))
    } else {
      console.warn('Friend match WebSocket not connected')
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
   * Create friend match
   */
  createFriendMatch(quizId: number): void {
    this.send('create_friend_match', { quizId })
  }

  /**
   * Join match by code
   */
  joinMatchByCode(joinCode: string): void {
    this.send('join_match_by_code', { joinCode: joinCode.toUpperCase() })
  }

  /**
   * Mark player as ready
   */
  setReady(): void {
    this.send('player_ready', {})
  }

  /**
   * Submit answer for current question
   */
  submitAnswer(questionId: number, selectedOptions: number[], timeSpent: number): void {
    this.send('submit_answer', {
      questionId,
      selectedOptions,
      timeSpent
    })
  }
}

// Export singleton WebSocket instance
export const friendMatchWebSocket = new FriendMatchWebSocket()
