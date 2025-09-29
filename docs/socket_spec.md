# QuizUP WebSocket Event Contract

## Overview

QuizUP uses Socket.io for real-time communication between clients and the match server. This document defines all WebSocket events, their payloads, and the expected flow for different game scenarios.

## Connection & Authentication

### Client → Server Events

#### `authenticate`
Authenticate user and establish socket session
```typescript
interface AuthenticatePayload {
  userId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  token?: string; // JWT token for verification
}
```

### Server → Client Events

#### `authenticated`
Confirmation of successful authentication
```typescript
interface AuthenticatedPayload {
  success: boolean;
  userId: number;
  username: string;
  message: string;
}
```

#### `authentication_error`
Authentication failed
```typescript
interface AuthenticationErrorPayload {
  success: false;
  error: string;
  code: 'INVALID_USER' | 'INVALID_TOKEN' | 'USER_BANNED';
}
```

## Match Management

### Client → Server Events

#### `create_friend_match`
Create a new friend match
```typescript
interface CreateFriendMatchPayload {
  quizId: number;
  maxPlayers?: number; // Default: 2
  timePerQuestion?: number; // Default: 30 seconds
}
```

#### `join_match_by_code`
Join an existing match using join code
```typescript
interface JoinMatchByCodePayload {
  joinCode: string;
}
```

#### `connect_to_match`
Connect to a specific match (for creators or reconnection)
```typescript
interface ConnectToMatchPayload {
  matchId: string;
}
```

#### `player_ready`
Signal that player is ready to start
```typescript
interface PlayerReadyPayload {
  isReady: boolean;
}
```

#### `leave_match`
Leave current match
```typescript
interface LeaveMatchPayload {
  reason?: 'USER_LEFT' | 'CONNECTION_LOST' | 'KICKED';
}
```

### Server → Client Events

#### `friend_match_created`
Friend match successfully created
```typescript
interface FriendMatchCreatedPayload {
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
}
```

#### `match_joined`
Successfully joined a match
```typescript
interface MatchJoinedPayload {
  success: true;
  matchId: string;
  quiz: {
    id: number;
    title: string;
    description: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    timeLimit: number;
    questionCount: number;
  };
  players: PlayerInfo[];
  maxPlayers: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
}

interface PlayerInfo {
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
```

#### `match_connected`
Successfully connected to match
```typescript
interface MatchConnectedPayload {
  matchId: string;
  joinCode?: string;
  players: PlayerInfo[];
  currentQuestionIndex: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
}
```

#### `player_list_updated`
Player list changed (someone joined/left/ready status changed)
```typescript
interface PlayerListUpdatedPayload {
  players: PlayerInfo[];
  event: 'PLAYER_JOINED' | 'PLAYER_LEFT' | 'PLAYER_READY' | 'PLAYER_NOT_READY';
  affectedPlayer?: PlayerInfo;
}
```

#### `match_started`
Match has begun, first question incoming
```typescript
interface MatchStartedPayload {
  matchId: string;
  totalQuestions: number;
  timePerQuestion: number;
  startedAt: string;
  message: string;
}
```

## Gameplay Events

### Client → Server Events

#### `submit_answer`
Submit answer for current question
```typescript
interface SubmitAnswerPayload {
  questionId: number;
  selectedOptions: number[]; // Array of option IDs
  timeToken: number; // Time in seconds when answered
  clientTimestamp: string; // For latency calculation
}
```

#### `request_question`
Request current question (for reconnection)
```typescript
interface RequestQuestionPayload {
  questionIndex?: number; // Optional, defaults to current
}
```

### Server → Client Events

#### `next_question`
Deliver next question to all players
```typescript
interface NextQuestionPayload {
  questionIndex: number;
  totalQuestions: number;
  question: {
    id: number;
    questionText: string;
    options: {
      id: number;
      optionText: string;
      // isCorrect is NEVER sent to client
    }[];
    timeLimit: number;
    explanation?: string; // Only sent after question ends
  };
  startTime: string; // ISO timestamp when question timer starts
  timeRemaining: number; // Seconds remaining for this question
}
```

#### `answer_result`
Individual player's answer result
```typescript
interface AnswerResultPayload {
  questionId: number;
  isCorrect: boolean;
  points: number;
  timeBonus: number;
  correctOptions: number[]; // The correct option IDs
  selectedOptions: number[]; // What player selected
  totalScore: number; // Player's updated total score
  explanation?: string;
  timeToken: number; // Time when answered
}
```

#### `player_answered`
Notification that another player submitted an answer
```typescript
interface PlayerAnsweredPayload {
  userId: number;
  username: string;
  timeToken: number;
  // Note: Does NOT include what they answered
}
```

#### `question_timeout`
Question time limit reached
```typescript
interface QuestionTimeoutPayload {
  questionId: number;
  correctOptions: number[];
  explanation?: string;
  nextQuestionIn: number; // Seconds until next question
}
```

#### `score_update`
Real-time score updates
```typescript
interface ScoreUpdatePayload {
  scores: {
    userId: number;
    username: string;
    score: number;
    correctAnswers: number;
    totalAnswers: number;
  }[];
  leaderboard: {
    rank: number;
    userId: number;
    username: string;
    score: number;
  }[];
}
```

## Match Completion

### Server → Client Events

#### `match_completed`
Match has ended with final results
```typescript
interface MatchCompletedPayload {
  matchId: string;
  results: PlayerResult[];
  winner: PlayerResult | null;
  completedAt: string;
  isFriendMatch: boolean;
  quiz: {
    id: number;
    title: string;
    totalQuestions: number;
  };
}

interface PlayerResult {
  userId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  accuracy: number; // Percentage
  answers: {
    questionId: number;
    selectedOptions: number[];
    isCorrect: boolean;
  }[];
  timeToken: number; // Total time taken
  rank: number;
}
```

#### `individual_completed`
Individual player finished (while others still playing)
```typescript
interface IndividualCompletedPayload {
  userId: number;
  matchId: string;
  playerResults: {
    score: number;
    correctAnswers: number;
    totalAnswers: number;
    accuracy: number;
    timeToken: number;
  };
  message: string;
}
```

## AI Opponent Events

### Server → Client Events

#### `ai_answer_submitted`
AI opponent submitted an answer
```typescript
interface AIAnswerSubmittedPayload {
  aiOpponent: {
    id: string;
    name: string;
    difficulty: string;
  };
  questionId: number;
  timeToken: number;
  score: number;
  // Note: Does NOT reveal AI's selected answer
}
```

#### `ai_player_joined`
AI opponent joined the match
```typescript
interface AIPlayerJoinedPayload {
  aiOpponent: {
    userId: number; // Negative number for AI
    username: string;
    firstName: string;
    lastName: string;
    isAI: true;
    isReady: true;
    score: 0;
    aiOpponent: {
      id: string;
      name: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      avatar: string;
      accuracyRate: number;
      responseTime: string;
    };
  };
}
```

## Connection Management

### Client → Server Events

#### `ping`
Heartbeat to maintain connection
```typescript
interface PingPayload {
  timestamp: string;
}
```

#### `reconnect_to_match`
Attempt to reconnect to ongoing match
```typescript
interface ReconnectToMatchPayload {
  matchId: string;
  lastQuestionIndex?: number;
  sessionId?: string;
}
```

### Server → Client Events

#### `pong`
Heartbeat response
```typescript
interface PongPayload {
  timestamp: string;
  serverTime: string;
  latency: number; // Calculated round-trip time
}
```

#### `player_disconnected`
Another player lost connection
```typescript
interface PlayerDisconnectedPayload {
  userId: number;
  username: string;
  reason: 'CONNECTION_LOST' | 'USER_LEFT' | 'TIMEOUT';
  reconnectionWindow: number; // Seconds allowed for reconnection
}
```

#### `player_reconnected`
Player reconnected to match
```typescript
interface PlayerReconnectedPayload {
  userId: number;
  username: string;
  currentState: {
    questionIndex: number;
    score: number;
    timeRemaining: number;
  };
}
```

## Error Events

### Server → Client Events

#### `match_error`
Match-related error occurred
```typescript
interface MatchErrorPayload {
  error: string;
  code: 'MATCH_NOT_FOUND' | 'MATCH_FULL' | 'ALREADY_IN_MATCH' | 'INVALID_JOIN_CODE' | 'MATCH_ENDED';
  details?: any;
}
```

#### `gameplay_error`
Gameplay-related error
```typescript
interface GameplayErrorPayload {
  error: string;
  code: 'INVALID_ANSWER' | 'TIME_EXPIRED' | 'QUESTION_NOT_ACTIVE' | 'ALREADY_ANSWERED';
  questionId?: number;
  details?: any;
}
```

#### `server_error`
General server error
```typescript
interface ServerErrorPayload {
  error: string;
  code: 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE' | 'RATE_LIMITED';
  message: string;
  timestamp: string;
}
```

## Event Flow Diagrams

### Friend Match Flow
```
Player 1 (Creator):
authenticate → create_friend_match → friend_match_created → connect_to_match → match_connected

Player 2 (Joiner):
authenticate → join_match_by_code → match_joined

Both Players:
player_ready → (when both ready) → match_started → next_question → submit_answer → answer_result → ... → match_completed
```

### Solo vs AI Flow
```
Player:
authenticate → create_solo_match → match_created → ai_player_joined → match_started → next_question → submit_answer → answer_result → ai_answer_submitted → ... → match_completed
```

### Reconnection Flow
```
Player:
authenticate → reconnect_to_match → match_connected → (if match active) → next_question → continue gameplay
```

## Rate Limiting

### Per Socket Limits
- **Authentication attempts**: 5 per minute
- **Match creation**: 10 per hour
- **Answer submissions**: 1 per second per question
- **General events**: 100 per minute

### Global Limits
- **Concurrent matches**: 1000 active matches
- **Players per match**: 10 maximum
- **Match duration**: 30 minutes maximum

## Security Considerations

### Data Validation
- All incoming payloads validated against TypeScript interfaces
- User authentication verified on every sensitive operation
- Match permissions checked before allowing actions

### Anti-Cheat Measures
- Server-side timer enforcement (client timestamps for UX only)
- Answer validation happens server-side
- Rate limiting prevents automated play
- Suspicious patterns logged and flagged

### Privacy Protection
- Correct answers never sent to clients before question ends
- Player personal data only shared with match participants
- Chat messages (if implemented) are moderated

## Implementation Notes

### TypeScript Interfaces
All event payloads should be defined as TypeScript interfaces in:
- `backend/src/types/socketEvents.ts`
- `frontend-admin/src/types/socketEvents.ts`

### Event Handling Pattern
```typescript
// Server-side
socket.on('event_name', (payload: EventPayload, callback?) => {
  // Validate payload
  // Process event
  // Emit response/broadcast
});

// Client-side
socket.on('event_name', (payload: EventPayload) => {
  // Update UI state
  // Handle user feedback
});
```

### Error Handling
All events should include comprehensive error handling with appropriate error codes and user-friendly messages.

### Testing
Each event should have corresponding unit tests and integration tests to ensure proper payload validation and event flow.
