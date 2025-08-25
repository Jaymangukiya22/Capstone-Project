import { Request } from 'express';
import { UserRole } from '@prisma/client';

// Extend Express Request to include user information
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  };
}

// JWT Payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth related types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    avatar?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// Course related types
export interface CreateCourseRequest {
  title: string;
  description?: string;
  code: string;
  imageUrl?: string;
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  code?: string;
  imageUrl?: string;
  isActive?: boolean;
}

// Quiz related types
export interface CreateQuizRequest {
  title: string;
  description?: string;
  courseId: string;
  timeLimit: number;
  scheduledAt?: Date;
}

export interface CreateQuestionRequest {
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points?: number;
  options: CreateOptionRequest[];
}

export interface CreateOptionRequest {
  text: string;
  imageUrl?: string;
  isCorrect: boolean;
}

// Match related types
export interface MatchResult {
  matchId: string;
  playerId: string;
  opponentId: string;
  playerScore: number;
  opponentScore: number;
  winner: string;
  playerEloChange: number;
  opponentEloChange: number;
  duration: number;
}

export interface QuestionAnswer {
  questionId: string;
  optionId?: string;
  timeSpent: number;
  points: number;
  isCorrect: boolean;
}

// ELO Rating types
export interface EloCalculation {
  newPlayerRating: number;
  newOpponentRating: number;
  playerChange: number;
  opponentChange: number;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
}

// WebSocket message types for match service
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface MatchStartMessage extends WebSocketMessage {
  type: 'MATCH_START';
  payload: {
    matchId: string;
    quiz: {
      id: string;
      title: string;
      questions: Array<{
        id: string;
        text: string;
        imageUrl?: string;
        timeLimit: number;
        options: Array<{
          id: string;
          text: string;
          imageUrl?: string;
        }>;
      }>;
    };
    opponent: {
      id: string;
      username: string;
      avatar?: string;
    };
  };
}

export interface QuestionAnswerMessage extends WebSocketMessage {
  type: 'QUESTION_ANSWER';
  payload: {
    matchId: string;
    questionId: string;
    optionId?: string;
    timeSpent: number;
  };
}

export interface MatchEndMessage extends WebSocketMessage {
  type: 'MATCH_END';
  payload: MatchResult;
}

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}
