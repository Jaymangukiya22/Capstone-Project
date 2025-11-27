import { io, Socket } from 'socket.io-client';
import { logInfo, logError, logWarn } from '../utils/logger';

// Socket Event Types - Import from shared types
export interface SocketEventPayloads {
  // Authentication
  authenticate: {
    userId: number;
    username: string;
    firstName?: string;
    lastName?: string;
    token?: string;
  };
  authenticated: {
    success: boolean;
    userId: number;
    username: string;
    message: string;
  };
  authentication_error: {
    success: false;
    error: string;
    code: 'INVALID_USER' | 'INVALID_TOKEN' | 'USER_BANNED';
  };

  // Match Management
  create_friend_match: {
    quizId: number;
    maxPlayers?: number;
    timePerQuestion?: number;
  };
  friend_match_created: {
    success: true;
    matchId: string;
    joinCode: string;
    quiz: {
      id: number;
      title: string;
      description: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      timeLimit: number;
      questionCount: number;
    };
    maxPlayers: number;
    createdAt: string;
  };
  join_match_by_code: {
    joinCode: string;
  };
  match_joined: {
    success: true;
    matchId: string;
    quiz: QuizInfo;
    players: PlayerInfo[];
    maxPlayers: number;
    status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  };
  connect_to_match: {
    matchId: string;
  };
  match_connected: {
    matchId: string;
    joinCode?: string;
    players: PlayerInfo[];
    currentQuestionIndex: number;
    status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  };

  // Player Management
  player_ready: {
    isReady: boolean;
  };
  player_list_updated: {
    players: PlayerInfo[];
    event: 'PLAYER_JOINED' | 'PLAYER_LEFT' | 'PLAYER_READY' | 'PLAYER_NOT_READY';
    affectedPlayer?: PlayerInfo;
  };
  match_started: {
    matchId: string;
    totalQuestions: number;
    timePerQuestion: number;
    startedAt: string;
    message: string;
  };

  // Gameplay
  submit_answer: {
    questionId: number;
    selectedOptions: number[];
    timeToken: number;
    clientTimestamp: string;
    matchId?: string;
  };
  next_question: {
    questionIndex: number;
    totalQuestions: number;
    question: {
      id: number;
      questionText: string;
      options: {
        id: number;
        optionText: string;
      }[];
      timeLimit: number;
      explanation?: string;
    };
    startTime: string;
    timeRemaining: number;
  };
  answer_result: {
    questionId: number;
    isCorrect: boolean;
    points: number;
    timeBonus: number;
    correctOptions: number[];
    selectedOptions: number[];
    totalScore: number;
    explanation?: string;
    timeToken: number;
  };
  player_answered: {
    userId: number;
    username: string;
    timeToken: number;
  };

  // Match Completion
  match_completed: {
    matchId: string;
    results: PlayerResult[];
    winner: PlayerResult | null;
    completedAt: string;
    isFriendMatch: boolean;
    quiz: QuizInfo;
  };

  // Connection Management
  leave_match: {
    reason: 'USER_LEFT' | 'CONNECTION_LOST' | 'TIMEOUT';
  };
  player_disconnected: {
    userId: number;
    username: string;
    reason: 'CONNECTION_LOST' | 'USER_LEFT' | 'TIMEOUT';
    reconnectionWindow: number;
  };
  player_reconnected: {
    userId: number;
    username: string;
    currentState: {
      questionIndex: number;
      score: number;
      timeRemaining: number;
    };
  };

  // Errors
  match_error: {
    error: string;
    code: string;
    details?: any;
  };
  gameplay_error: {
    error: string;
    code: string;
    questionId?: number;
    details?: any;
  };
}

export interface PlayerInfo {
  userId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  isReady: boolean;
  isAI: boolean;
  score: number;
  aiOpponent?: {
    id: string;
    name: string;
    difficulty: string;
    avatar: string;
  };
}

export interface PlayerResult {
  userId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  accuracy: number;
  answers: {
    questionId: number;
    selectedOptions: number[];
    isCorrect: boolean;
  }[];
  timeToken: number;
  rank: number;
}

export interface QuizInfo {
  id: number;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit: number;
  questionCount: number;
}

/**
 * Auto-detect WebSocket server URL based on current location
 * Handles both development and production environments
 */
function getWebSocketURL(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return 'ws://localhost:8090/socket.io/';
  }

  const { protocol, hostname, port } = window.location;
  
  // 🔍 DIAGNOSTIC LOGGING
  const diagnostics = {
    protocol,
    hostname,
    port,
    fullURL: window.location.href,
    viteWebSocketURL: import.meta.env.VITE_WEBSOCKET_URL
  };
  console.log('🔍 WebSocket URL Detection - Diagnostics:', diagnostics);
  
  // ✅ PRODUCTION: Use environment variable if available (set during build)
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    console.log(`✅ Using VITE_WEBSOCKET_URL from environment: ${import.meta.env.VITE_WEBSOCKET_URL}`);
    return import.meta.env.VITE_WEBSOCKET_URL;
  }
  
  // Development detection - auto-detect based on current location
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168.')) {
    // Check if we're running on a specific port (Vite dev server usually 5173)
    const currentPort = port || '5173';
    
    console.log(`🔍 Detected localhost environment - port: ${currentPort}`);
    
    // If on Vite dev server, connect to match server on 3001
    if (currentPort === '5173' || currentPort === '3000') {
      console.log(`🔍 Vite dev server detected - connecting to ws://${hostname}:3001`);
      return `ws://${hostname}:3001`;
    }
    
    // If on Nginx proxy (port 8090), connect through Nginx's /socket.io/ proxy
    if (currentPort === '8090' || currentPort === '80') {
      const wsURL = `ws://${hostname}:${currentPort}/socket.io/`;
      console.log(`🔍 Nginx proxy detected (port ${currentPort}) - connecting to ${wsURL}`);
      return wsURL;
    }
    
    // Otherwise use current host with match server port
    console.log(`🔍 Direct connection to ws://${hostname}:3001`);
    return `ws://${hostname}:3001`;
  }
  
  // Production: use same hostname with wss if https and route through /socket.io/
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const wsPort = port ? `:${port}` : '';
  const wsURL = `${wsProtocol}//${hostname}${wsPort}/socket.io/`;
  
  console.log(`🔍 Production environment detected - connecting to ${wsURL}`);
  return wsURL;
}

/**
 * Enhanced WebSocket client for QuizUP real-time communication
 * Provides type-safe event handling and automatic reconnection
 */
export class MatchClient {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private eventHandlers: Map<string, Function[]> = new Map();
  private matchId: string | null = null;
  private userId: number | null = null;
  private options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    heartbeatInterval?: number;
  };

  constructor(options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    heartbeatInterval?: number;
  } = {}) {
    this.options = options;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(wsURL?: string, userId?: number, username?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const finalURL = wsURL || getWebSocketURL();
      logInfo(`Connecting to WebSocket server: ${finalURL}`, { userId, username });

      this.socket = io(finalURL, {
        // ✅ CRITICAL FIX: Force WebSockets only to avoid multi-worker routing issues
        // HTTP polling causes requests to route to different workers, breaking session continuity
        // This matches the bot behavior and ensures sticky session behavior
        transports: ['websocket'],
        upgrade: false,  // Don't try to upgrade from polling
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.options.reconnectDelay || 1000,
        reconnectionDelayMax: 5000
      });

      // Store userId for later use
      if (userId) {
        this.userId = userId;
      }

      // Connection events
      this.socket.on('connect', () => {
        logInfo('WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        logError('WebSocket connection error:', error);
        this.isConnected = false;
        
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        logWarn('WebSocket disconnected:', reason);
        this.isConnected = false;
      });

      this.socket.on('reconnecting', (attemptNumber) => {
        logInfo(`WebSocket reconnecting... Attempt ${attemptNumber}`);
        this.reconnectAttempts = attemptNumber;
      });

      this.socket.on('reconnect', (attemptNumber) => {
        logInfo(`WebSocket reconnected after ${attemptNumber} attempts`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Re-authenticate and rejoin match if applicable
        if (this.userId && this.matchId) {
          this.rejoinMatch();
        }
      });

      this.socket.on('reconnect_failed', () => {
        logError('WebSocket reconnection failed');
        this.isConnected = false;
      });

      // Set up connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Authenticate with the server
   */
  async authenticate(params: SocketEventPayloads['authenticate']): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.userId = params.userId;

      this.socket.emit('authenticate', params);

      // Set up one-time listeners for auth response
      const onAuthenticated = (data: SocketEventPayloads['authenticated']) => {
        if (data.success) {
          logInfo('Authentication successful');
          resolve();
        } else {
          reject(new Error('Authentication failed'));
        }
        cleanup();
      };

      const onAuthError = (data: SocketEventPayloads['authentication_error']) => {
        logError('Authentication error:', data.error);
        reject(new Error(data.error));
        cleanup();
      };

      const cleanup = () => {
        this.socket?.off('authenticated', onAuthenticated);
        this.socket?.off('authentication_error', onAuthError);
      };

      this.socket.once('authenticated', onAuthenticated);
      this.socket.once('authentication_error', onAuthError);

      // Timeout after 5 seconds
      setTimeout(() => {
        cleanup();
        reject(new Error('Authentication timeout'));
      }, 5000);
    });
  }

  /**
   * Type-safe event emission
   */
  emit<T extends keyof SocketEventPayloads>(
    event: T,
    payload: SocketEventPayloads[T]
  ): void {
    if (!this.socket || !this.isConnected) {
      logError(`Cannot emit ${event}: Socket not connected`);
      return;
    }

    logInfo(`Emitting event: ${event}`, payload);
    this.socket.emit(event, payload);
  }

  /**
   * Type-safe event listening
   */
  on<T extends keyof SocketEventPayloads>(
    event: T,
    handler: (payload: SocketEventPayloads[T]) => void
  ): void {
    if (!this.socket) {
      logError(`Cannot listen to ${event}: Socket not connected`);
      return;
    }

    // Store handler for cleanup
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    this.socket.on(event, handler as any);
  }

  /**
   * Remove event listener
   */
  off<T extends keyof SocketEventPayloads>(
    event: T,
    handler?: (payload: SocketEventPayloads[T]) => void
  ): void {
    if (!this.socket) return;

    if (handler) {
      this.socket.off(event, handler as any);
      
      // Remove from our handler tracking
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Emit CLIENT_READY when the game UI is loaded
   * This tells the server that the client is ready to receive the first question
   */
  emitClientReady(matchId: string, userId: number): void {
    if (!this.socket || !this.isConnected) {
      logError('Cannot emit CLIENT_READY: Socket not connected');
      console.error('❌ Socket not ready for CLIENT_READY', { isConnected: this.isConnected, hasSocket: !!this.socket });
      return;
    }

    logInfo('Emitting CLIENT_READY - game UI loaded', { matchId, userId });
    console.log('🔌 Socket emitting: CLIENT_READY', { matchId, userId });
    this.socket.emit('CLIENT_READY', { matchId, userId });
  }

  /**
   * Listen for LOAD_GAME_SCENE event
   * This is emitted by the server when all players have joined
   */
  onLoadGameScene(handler: (data: any) => void): void {
    if (!this.socket) {
      logError('Cannot listen to LOAD_GAME_SCENE: Socket not connected');
      return;
    }

    logInfo('Setting up LOAD_GAME_SCENE listener');
    this.socket.on('LOAD_GAME_SCENE', (data: any) => {
      logInfo('LOAD_GAME_SCENE received from server', data);
      handler(data);
    });
  }

  /**
   * Create friend match
   */
  async createFriendMatch(params: SocketEventPayloads['create_friend_match']): Promise<SocketEventPayloads['friend_match_created']> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.emit('create_friend_match', params);

      const onSuccess = (data: SocketEventPayloads['friend_match_created']) => {
        this.matchId = data.matchId;
        resolve(data);
        cleanup();
      };

      const onError = (data: SocketEventPayloads['match_error']) => {
        reject(new Error(data.error));
        cleanup();
      };

      const cleanup = () => {
        this.socket?.off('friend_match_created', onSuccess);
        this.socket?.off('match_error', onError);
      };

      this.socket.once('friend_match_created', onSuccess);
      this.socket.once('match_error', onError);

      setTimeout(() => {
        cleanup();
        reject(new Error('Create match timeout'));
      }, 10000);
    });
  }

  /**
   * Join match by code
   */
  async joinMatchByCode(joinCode: string): Promise<SocketEventPayloads['match_joined']> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.emit('join_match_by_code', { joinCode });

      const onSuccess = (data: SocketEventPayloads['match_joined']) => {
        this.matchId = data.matchId;
        resolve(data);
        cleanup();
      };

      const onError = (data: SocketEventPayloads['match_error']) => {
        reject(new Error(data.error));
        cleanup();
      };

      const cleanup = () => {
        this.socket?.off('match_joined', onSuccess);
        this.socket?.off('match_error', onError);
      };

      this.socket.once('match_joined', onSuccess);
      this.socket.once('match_error', onError);

      setTimeout(() => {
        cleanup();
        reject(new Error('Join match timeout'));
      }, 10000);
    });
  }

  /**
   * Connect to specific match
   */
  connectToMatch(matchId: string): void {
    this.matchId = matchId;
    this.emit('connect_to_match', { matchId });
  }

  /**
   * Set player ready status
   */
  setReady(isReady: boolean, matchId?: string): void {
    // CRITICAL FIX: Include matchId so master server can route to correct worker
    // Without matchId, master cannot find the match and returns "Not in any match" error
    const payload: any = { isReady };
    const actualMatchId = matchId || this.matchId;
    if (actualMatchId) {
      payload.matchId = actualMatchId;
    }
    this.emit('player_ready', payload);
  }

  /**
   * Submit answer for current question
   */
  submitAnswer(params: SocketEventPayloads['submit_answer']): void {
    // CRITICAL FIX: Include matchId so worker can route to correct match
    const payload: any = {
      ...params,
      matchId: params.matchId || this.matchId
    };
    this.emit('submit_answer', payload);
  }

  /**
   * Leave current match
   */
  leaveMatch(): void {
    this.emit('leave_match', { reason: 'USER_LEFT' });
    this.matchId = null;
  }

  /**
   * Rejoin match after reconnection
   */
  private rejoinMatch(): void {
    if (this.matchId && this.userId) {
      logInfo(`Rejoining match ${this.matchId} after reconnection`);
      this.connectToMatch(this.matchId);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    inMatch: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      authenticated: this.userId !== null,
      inMatch: this.matchId !== null,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      logInfo('Disconnecting from WebSocket server');
      
      // Clear all event handlers
      this.eventHandlers.clear();
      
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.matchId = null;
      this.userId = null;
    }
  }

  /**
   * Get current match ID
   */
  getCurrentMatchId(): string | null {
    return this.matchId;
  }

  /**
   * Check if currently in a match
   */
  isInMatch(): boolean {
    return this.matchId !== null;
  }
}

// Export singleton instance
export const matchClient = new MatchClient();

// Export utility functions
export const connectToMatchServer = async (): Promise<MatchClient> => {
  await matchClient.connect();
  return matchClient;
};

export const authenticateUser = async (userInfo: {
  userId: number;
  username: string;
  firstName?: string;
  lastName?: string;
}): Promise<void> => {
  // Get user data from localStorage for complete auth info
  const userData = localStorage.getItem('user');
  let authData = userInfo;
  
  if (userData) {
    try {
      const user = JSON.parse(userData);
      authData = {
        ...userInfo,
        firstName: user.firstName || userInfo.firstName,
        lastName: user.lastName || userInfo.lastName
      };
    } catch (error) {
      logWarn('Failed to parse user data from localStorage:', error);
    }
  }

  await matchClient.authenticate(authData);
};

export default MatchClient;
