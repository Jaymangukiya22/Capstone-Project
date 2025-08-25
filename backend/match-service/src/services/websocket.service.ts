import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { MatchService } from './match.service';
import {
  WebSocketMessage,
  JoinMatchMessage,
  PlayerReadyMessage,
  SubmitAnswerMessage,
  MatchJoinedMessage,
  MatchStartMessage,
  QuestionStartMessage,
  QuestionEndMessage,
  MatchEndMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  PlayerReadyUpdateMessage,
  ErrorMessage,
  MatchStateUpdate,
  MatchStatus
} from '@/types/match.types';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  matchId?: string;
  isAlive?: boolean;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private matchService: MatchService;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map(); // matchId -> Set of WebSockets
  private userSockets: Map<string, AuthenticatedWebSocket> = new Map(); // userId -> WebSocket

  constructor(server: any, matchService: MatchService) {
    this.matchService = matchService;
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.setupWebSocketServer();
    this.setupHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
      console.log('New WebSocket connection');
      
      ws.isAlive = true;
      
      // Handle pong responses for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });
    });
  }

  private setupHeartbeat(): void {
    // Ping clients every 30 seconds to check if they're still connected
    setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'JOIN_MATCH':
        await this.handleJoinMatch(ws, message as JoinMatchMessage);
        break;
      case 'PLAYER_READY':
        await this.handlePlayerReady(ws, message as PlayerReadyMessage);
        break;
      case 'SUBMIT_ANSWER':
        await this.handleSubmitAnswer(ws, message as SubmitAnswerMessage);
        break;
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleJoinMatch(ws: AuthenticatedWebSocket, message: JoinMatchMessage): Promise<void> {
    try {
      const { matchId, token } = message.payload;

      // Verify JWT token
      if (!process.env.JWT_SECRET) {
        this.sendError(ws, 'Server configuration error');
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      const userId = decoded.userId;

      // Load match if not in memory
      let match = this.matchService.getMatch(matchId);
      if (!match) {
        const loaded = await this.matchService.loadMatchFromRedis(matchId);
        if (!loaded) {
          this.sendError(ws, 'Match not found');
          return;
        }
        match = loaded;
      }

      // Check if user is part of this match
      if (!match.players.has(userId)) {
        this.sendError(ws, 'You are not part of this match');
        return;
      }

      // Set user info on WebSocket
      ws.userId = userId;
      ws.matchId = matchId;

      // Add to client tracking
      if (!this.clients.has(matchId)) {
        this.clients.set(matchId, new Set());
      }
      this.clients.get(matchId)!.add(ws);
      this.userSockets.set(userId, ws);

      // Join match
      const player = match.players.get(userId)!;
      await this.matchService.joinMatch(matchId, userId, {
        username: decoded.username || 'Player',
        rating: decoded.rating || 1200,
        avatar: decoded.avatar
      });

      // Send match joined confirmation
      const matchJoinedMessage: MatchJoinedMessage = {
        type: 'MATCH_JOINED',
        payload: {
          match: {
            id: match.id,
            quiz: {
              id: match.quiz.id,
              title: match.quiz.title,
              totalQuestions: match.quiz.questions.length
            },
            players: Array.from(match.players.values()).map(p => ({
              id: p.id,
              username: p.username,
              avatar: p.avatar,
              rating: p.rating,
              isReady: p.isReady
            })),
            status: match.status
          }
        },
        timestamp: Date.now()
      };

      this.sendToClient(ws, matchJoinedMessage);

      // Notify other players
      const playerJoinedMessage: PlayerJoinedMessage = {
        type: 'PLAYER_JOINED',
        payload: {
          player: {
            id: player.id,
            username: player.username,
            avatar: player.avatar,
            rating: player.rating
          }
        },
        timestamp: Date.now()
      };

      this.broadcastToMatch(matchId, playerJoinedMessage, userId);

    } catch (error) {
      console.error('Error handling join match:', error);
      this.sendError(ws, 'Failed to join match');
    }
  }

  private async handlePlayerReady(ws: AuthenticatedWebSocket, message: PlayerReadyMessage): Promise<void> {
    if (!ws.userId || !ws.matchId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    const { matchId } = message.payload;
    if (matchId !== ws.matchId) {
      this.sendError(ws, 'Invalid match ID');
      return;
    }

    const success = await this.matchService.setPlayerReady(matchId, ws.userId, true);
    if (!success) {
      this.sendError(ws, 'Failed to set ready status');
      return;
    }

    // Notify all players about ready status change
    const readyUpdateMessage: PlayerReadyUpdateMessage = {
      type: 'PLAYER_READY_UPDATE',
      payload: {
        playerId: ws.userId,
        isReady: true
      },
      timestamp: Date.now()
    };

    this.broadcastToMatch(matchId, readyUpdateMessage);

    // Check if match should start
    const match = this.matchService.getMatch(matchId);
    if (match && match.status === MatchStatus.STARTING) {
      await this.startMatchCountdown(matchId);
    }
  }

  private async handleSubmitAnswer(ws: AuthenticatedWebSocket, message: SubmitAnswerMessage): Promise<void> {
    if (!ws.userId || !ws.matchId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    const { matchId, questionId, optionId, timeSpent } = message.payload;
    if (matchId !== ws.matchId) {
      this.sendError(ws, 'Invalid match ID');
      return;
    }

    const success = await this.matchService.submitAnswer(matchId, ws.userId, questionId, optionId, timeSpent);
    if (!success) {
      this.sendError(ws, 'Failed to submit answer');
      return;
    }

    // Check if all players have answered
    if (this.matchService.allPlayersAnswered(matchId)) {
      await this.endCurrentQuestion(matchId);
    }
  }

  private async startMatchCountdown(matchId: string): Promise<void> {
    const countdownMessage: MatchStartMessage = {
      type: 'MATCH_START',
      payload: {
        matchId,
        countdown: 3
      },
      timestamp: Date.now()
    };

    this.broadcastToMatch(matchId, countdownMessage);

    // Start match after countdown
    setTimeout(async () => {
      await this.matchService.startMatch(matchId);
      await this.startNextQuestion(matchId);
    }, 3000);
  }

  private async startNextQuestion(matchId: string): Promise<void> {
    const question = await this.matchService.startNextQuestion(matchId);
    if (!question) {
      // No more questions, match ended
      await this.endMatch(matchId);
      return;
    }

    const match = this.matchService.getMatch(matchId);
    if (!match) return;

    const questionStartMessage: QuestionStartMessage = {
      type: 'QUESTION_START',
      payload: {
        questionIndex: match.currentQuestionIndex,
        question: {
          id: question.id,
          text: question.text,
          imageUrl: question.imageUrl,
          timeLimit: question.timeLimit,
          points: question.points,
          options: question.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            imageUrl: opt.imageUrl
          }))
        }
      },
      timestamp: Date.now()
    };

    this.broadcastToMatch(matchId, questionStartMessage);

    // Auto-end question after time limit
    setTimeout(async () => {
      const currentMatch = this.matchService.getMatch(matchId);
      if (currentMatch && currentMatch.status === MatchStatus.QUESTION_ACTIVE) {
        await this.endCurrentQuestion(matchId);
      }
    }, question.timeLimit * 1000);
  }

  private async endCurrentQuestion(matchId: string): Promise<void> {
    await this.matchService.endQuestion(matchId);
    
    const results = this.matchService.getCurrentQuestionResults(matchId);
    if (!results) return;

    const questionEndMessage: QuestionEndMessage = {
      type: 'QUESTION_END',
      payload: results,
      timestamp: Date.now()
    };

    this.broadcastToMatch(matchId, questionEndMessage);

    // Start next question after showing results
    setTimeout(async () => {
      await this.startNextQuestion(matchId);
    }, 3000);
  }

  private async endMatch(matchId: string): Promise<void> {
    await this.matchService.endMatch(matchId);
    
    const results = this.matchService.getMatchResults(matchId);
    if (!results) return;

    // TODO: Calculate ELO rating changes here
    // This would require calling the main service API

    const matchEndMessage: MatchEndMessage = {
      type: 'MATCH_END',
      payload: {
        matchId,
        winner: results.winner,
        finalScores: results.results,
        ratingChanges: [] // Would be populated with actual ELO changes
      },
      timestamp: Date.now()
    };

    this.broadcastToMatch(matchId, matchEndMessage);

    // Clean up clients after match ends
    setTimeout(() => {
      this.clients.delete(matchId);
    }, 60000); // 1 minute
  }

  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (ws.userId && ws.matchId) {
      console.log(`Player ${ws.userId} disconnected from match ${ws.matchId}`);

      // Remove from tracking
      this.userSockets.delete(ws.userId);
      const matchClients = this.clients.get(ws.matchId);
      if (matchClients) {
        matchClients.delete(ws);
      }

      // Update match service
      this.matchService.leaveMatch(ws.matchId, ws.userId);

      // Notify other players
      const playerLeftMessage: PlayerLeftMessage = {
        type: 'PLAYER_LEFT',
        payload: {
          playerId: ws.userId
        },
        timestamp: Date.now()
      };

      this.broadcastToMatch(ws.matchId, playerLeftMessage, ws.userId);
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastToMatch(matchId: string, message: WebSocketMessage, excludeUserId?: string): void {
    const matchClients = this.clients.get(matchId);
    if (!matchClients) return;

    matchClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN && ws.userId !== excludeUserId) {
        this.sendToClient(ws, message);
      }
    });
  }

  private sendError(ws: WebSocket, message: string): void {
    const errorMessage: ErrorMessage = {
      type: 'ERROR',
      payload: {
        message
      },
      timestamp: Date.now()
    };

    this.sendToClient(ws, errorMessage);
  }

  public getMatchClientsCount(matchId: string): number {
    const matchClients = this.clients.get(matchId);
    return matchClients ? matchClients.size : 0;
  }

  public isUserConnected(userId: string): boolean {
    const ws = this.userSockets.get(userId);
    return ws ? ws.readyState === WebSocket.OPEN : false;
  }
}
