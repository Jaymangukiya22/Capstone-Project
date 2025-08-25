export interface Player {
  id: string;
  username: string;
  avatar?: string;
  rating: number;
  isReady: boolean;
  isConnected: boolean;
  score: number;
  answers: Map<string, PlayerAnswer>;
}

export interface PlayerAnswer {
  questionId: string;
  optionId?: string;
  timeSpent: number;
  points: number;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  options: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
  isCorrect: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  courseId: string;
  questions: Question[];
}

export interface Match {
  id: string;
  quizId: string;
  quiz: Quiz;
  players: Map<string, Player>;
  status: MatchStatus;
  currentQuestionIndex: number;
  currentQuestionStartTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export enum MatchStatus {
  WAITING = 'WAITING',
  STARTING = 'STARTING',
  IN_PROGRESS = 'IN_PROGRESS',
  QUESTION_ACTIVE = 'QUESTION_ACTIVE',
  QUESTION_RESULTS = 'QUESTION_RESULTS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

// Client to Server Messages
export interface JoinMatchMessage extends WebSocketMessage {
  type: 'JOIN_MATCH';
  payload: {
    matchId: string;
    token: string;
  };
}

export interface PlayerReadyMessage extends WebSocketMessage {
  type: 'PLAYER_READY';
  payload: {
    matchId: string;
  };
}

export interface SubmitAnswerMessage extends WebSocketMessage {
  type: 'SUBMIT_ANSWER';
  payload: {
    matchId: string;
    questionId: string;
    optionId?: string;
    timeSpent: number;
  };
}

// Server to Client Messages
export interface MatchJoinedMessage extends WebSocketMessage {
  type: 'MATCH_JOINED';
  payload: {
    match: {
      id: string;
      quiz: {
        id: string;
        title: string;
        totalQuestions: number;
      };
      players: Array<{
        id: string;
        username: string;
        avatar?: string;
        rating: number;
        isReady: boolean;
      }>;
      status: MatchStatus;
    };
  };
}

export interface MatchStartMessage extends WebSocketMessage {
  type: 'MATCH_START';
  payload: {
    matchId: string;
    countdown: number;
  };
}

export interface QuestionStartMessage extends WebSocketMessage {
  type: 'QUESTION_START';
  payload: {
    questionIndex: number;
    question: {
      id: string;
      text: string;
      imageUrl?: string;
      timeLimit: number;
      points: number;
      options: Array<{
        id: string;
        text: string;
        imageUrl?: string;
      }>;
    };
  };
}

export interface QuestionEndMessage extends WebSocketMessage {
  type: 'QUESTION_END';
  payload: {
    questionId: string;
    correctOptionId?: string;
    results: Array<{
      playerId: string;
      optionId?: string;
      timeSpent: number;
      points: number;
      isCorrect: boolean;
    }>;
    scores: Array<{
      playerId: string;
      score: number;
    }>;
  };
}

export interface MatchEndMessage extends WebSocketMessage {
  type: 'MATCH_END';
  payload: {
    matchId: string;
    winner?: string;
    finalScores: Array<{
      playerId: string;
      username: string;
      score: number;
      correctAnswers: number;
      totalAnswers: number;
      averageTime: number;
    }>;
    ratingChanges: Array<{
      playerId: string;
      oldRating: number;
      newRating: number;
      change: number;
    }>;
  };
}

export interface PlayerJoinedMessage extends WebSocketMessage {
  type: 'PLAYER_JOINED';
  payload: {
    player: {
      id: string;
      username: string;
      avatar?: string;
      rating: number;
    };
  };
}

export interface PlayerLeftMessage extends WebSocketMessage {
  type: 'PLAYER_LEFT';
  payload: {
    playerId: string;
  };
}

export interface PlayerReadyUpdateMessage extends WebSocketMessage {
  type: 'PLAYER_READY_UPDATE';
  payload: {
    playerId: string;
    isReady: boolean;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'ERROR';
  payload: {
    message: string;
    code?: string;
  };
}

export interface MatchStateUpdate extends WebSocketMessage {
  type: 'MATCH_STATE_UPDATE';
  payload: {
    status: MatchStatus;
    currentQuestionIndex?: number;
    timeRemaining?: number;
  };
}
