# QuizUP API Documentation

Complete API documentation for QuizUP backend including REST endpoints and WebSocket (Socket.IO) events.

## 📋 Table of Contents

1. [REST API (OpenAPI)](#rest-api-openapi)
2. [WebSocket API (AsyncAPI)](#websocket-api-asyncapi)
3. [Quick Start](#quick-start)
4. [Authentication](#authentication)
5. [Friend Matches Flow](#friend-matches-flow)
6. [Error Handling](#error-handling)

---

## REST API (OpenAPI)

### Overview

The REST API provides HTTP endpoints for:
- **Authentication**: Login, registration, token refresh
- **Quiz Management**: CRUD operations on quizzes and questions
- **Categories**: Browse and manage quiz categories
- **Matches**: Create and manage matches
- **Friend Matches**: Create 1v1 friend matches with join codes
- **Performance Analytics**: View quiz and match performance data
- **Health Checks**: Monitor service health

### Documentation

**Online**: Access at `http://localhost:8090/api-docs` (Swagger UI)

**Files**:
- `backend/docs/openapi.yaml` - Complete OpenAPI 3.1.2 specification
- `backend/docs/openapi.json` - JSON version (auto-generated)

### Key Endpoints

#### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - User login
POST   /api/auth/refresh       - Refresh access token
```

#### Quizzes
```
GET    /api/quizzes            - Get all quizzes (with filtering)
POST   /api/quizzes            - Create new quiz
GET    /api/quizzes/{id}       - Get quiz by ID
PUT    /api/quizzes/{id}       - Update quiz
DELETE /api/quizzes/{id}       - Delete quiz
GET    /api/quizzes/{id}/stats - Get quiz statistics
```

#### Friend Matches
```
POST   /api/friend-matches                    - Create friend match
GET    /api/friend-matches                    - Get all active matches
GET    /api/friend-matches/code/{joinCode}    - Get match by join code
GET    /api/friend-matches/{matchId}          - Get match details
```

#### Performance Analytics
```
GET    /api/performance/quiz-performance           - Combined quiz performance (admin)
GET    /api/performance/solo-performance           - Solo quiz performance (admin)
GET    /api/performance/student-performance/{id}   - Student performance (admin)
GET    /api/performance/friend-matches             - Friend match history (admin)
GET    /api/performance/my-matches                 - User's match history
```

#### Health Checks
```
GET    /health              - Basic health check
GET    /health/detailed     - Detailed health status
GET    /health/ready        - Readiness check (Kubernetes)
GET    /health/live         - Liveness check (Kubernetes)
```

### Authentication

All endpoints except `/api/auth/*` and `/health*` require a Bearer token:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8090/api/quizzes
```

---

## WebSocket API (AsyncAPI)

### Overview

The WebSocket API provides real-time communication for:
- **Match Creation**: Create friend matches with join codes
- **Player Joining**: Join matches using join codes
- **Game Flow**: Receive questions, submit answers, track progress
- **Real-time Updates**: Player status, score updates, match completion

### Documentation

**Files**:
- `backend/docs/asyncapi.match-server.yaml` - Complete AsyncAPI 3.0.0 specification

### Connection

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3001', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket']
});
```

### Event Flow

#### 1. Authentication
```javascript
// Client sends
socket.emit('authenticate', {
  userId: 123,
  username: 'player1'
});

// Server responds
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data.user);
});
```

#### 2. Create Friend Match
```javascript
// Client sends
socket.emit('create_friend_match', {
  quizId: 110
});

// Server responds
socket.on('friend_match_created', (data) => {
  console.log('Match created:', data.matchId);
  console.log('Join code:', data.joinCode);
});
```

#### 3. Join Match
```javascript
// Client sends
socket.emit('join_match', {
  joinCode: 'ABC123'
});

// Server responds
socket.on('match_joined', (data) => {
  console.log('Players:', data.players);
  console.log('Total questions:', data.totalQuestions);
});
```

#### 4. Load Game Scene
```javascript
// Server sends
socket.on('LOAD_GAME_SCENE', (data) => {
  console.log('Match data:', data);
  // Load game UI with match data
});

// Client sends when ready
socket.emit('CLIENT_READY', {
  matchId: data.matchId,
  userId: 123
});
```

#### 5. Match Starts
```javascript
// Server broadcasts
socket.on('match_started', (data) => {
  console.log('First question:', data.question);
  console.log('Question index:', data.questionIndex);
});
```

#### 6. Submit Answer
```javascript
// Client sends
socket.emit('submit_answer', {
  questionId: 1005,
  selectedOptions: [4011],
  timeSpent: 15
});

// Server broadcasts next question
socket.on('next_question', (data) => {
  console.log('Next question:', data.question);
});
```

#### 7. Match Completion
```javascript
// Server broadcasts
socket.on('match_completed', (data) => {
  console.log('Results:', data.results);
  console.log('Winner:', data.winner);
});
```

### Key Events

#### Client → Server (Publish)
| Event | Description | Payload |
|-------|-------------|---------|
| `authenticate` | Authenticate user | `{ userId, username }` |
| `create_friend_match` | Create 1v1 match | `{ quizId }` |
| `join_match` | Join by code | `{ joinCode }` |
| `connect_to_match` | Connect by ID | `{ matchId, userId, username }` |
| `player_ready` | Mark as ready | `{ matchId?, ready? }` |
| `CLIENT_READY` | UI loaded, ready | `{ matchId, userId }` |
| `submit_answer` | Submit answer | `{ questionId, selectedOptions[], timeSpent }` |

#### Server → Client (Subscribe)
| Event | Description | Payload |
|-------|-------------|---------|
| `authenticated` | Auth successful | `{ user: { id, username } }` |
| `friend_match_created` | Match created | `{ matchId, joinCode }` |
| `match_joined` | Joined match | `{ matchId, players[], quiz, totalQuestions, question? }` |
| `LOAD_GAME_SCENE` | Load UI | `{ matchId, players[], quiz, totalQuestions }` |
| `player_list_updated` | Players changed | `{ players[] }` |
| `match_started` | Match started | `{ question, questionIndex, totalQuestions }` |
| `next_question` | Next question | `{ question, questionIndex }` |
| `match_completed` | Match ended | `{ matchId, results[], winner }` |
| `error` | Error occurred | `{ message, code? }` |

---

## Quick Start

### 1. REST API Example

```bash
# Register
curl -X POST http://localhost:8090/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:8090/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "password": "password123"
  }'

# Get quizzes (with token)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8090/api/quizzes
```

### 2. WebSocket Example

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3001', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket']
});

// Authenticate
socket.emit('authenticate', {
  userId: 123,
  username: 'player1'
});

// Create friend match
socket.emit('create_friend_match', { quizId: 110 });

socket.on('friend_match_created', (data) => {
  console.log('Share code:', data.joinCode);
});
```

---

## Friend Matches Flow

### Complete Flow Diagram

```
Player 1                          Server                          Player 2
   |                                |                                |
   |------ authenticate ----------->|                                |
   |<----- authenticated -----------|                                |
   |                                |                                |
   |-- create_friend_match -------->|                                |
   |<- friend_match_created --------|                                |
   |     (matchId, joinCode)        |                                |
   |                                |                                |
   |                          [Share Code]                           |
   |                                |                                |
   |                                |<---- authenticate ------------|
   |                                |---- authenticated ----------->|
   |                                |                                |
   |                                |<---- join_match (code) -------|
   |                                |---- match_joined ----------->|
   |<----- player_list_updated -----|---- player_list_updated ----->|
   |                                |                                |
   |-- player_ready (matchId) ----->|                                |
   |                                |---- player_ready_event ------>|
   |<----- LOAD_GAME_SCENE ---------|---- LOAD_GAME_SCENE -------->|
   |                                |                                |
   |-- CLIENT_READY (matchId) ----->|                                |
   |                                |---- CLIENT_READY ----------->|
   |                                |                                |
   |<----- match_started ------------|---- match_started ---------->|
   |     (question 1)               |     (question 1)              |
   |                                |                                |
   |-- submit_answer (Q1) --------->|                                |
   |                                |---- next_question ----------->|
   |<----- next_question ------------|     (question 2)              |
   |     (question 2)               |                                |
   |                                |<---- submit_answer (Q1) ------|
   |                                |                                |
   |-- submit_answer (Q2) --------->|                                |
   |                                |---- next_question ----------->|
   |<----- next_question ------------|     (question 3)              |
   |     (question 3)               |                                |
   |                                |<---- submit_answer (Q2) ------|
   |                                |                                |
   |                            [Continue until all questions]      |
   |                                |                                |
   |<----- match_completed ---------|---- match_completed -------->|
   |     (results, winner)          |     (results, winner)         |
```

### Step-by-Step Implementation

1. **Player 1 creates match**
   - Calls `POST /api/friend-matches` with `quizId`
   - Receives `matchId` and `joinCode`
   - Shares `joinCode` with Player 2

2. **Player 1 connects WebSocket**
   - Emits `authenticate` event
   - Emits `create_friend_match` event
   - Listens for `friend_match_created` event

3. **Player 2 joins match**
   - Connects WebSocket
   - Emits `authenticate` event
   - Emits `join_match` with `joinCode`
   - Receives `match_joined` event

4. **Both players ready**
   - Emit `player_ready` event
   - Receive `LOAD_GAME_SCENE` event
   - Emit `CLIENT_READY` event

5. **Match starts**
   - Receive `match_started` with first question
   - Submit answers with `submit_answer` event
   - Receive `next_question` events

6. **Match completes**
   - Receive `match_completed` with results

---

## Authentication

### JWT Token

All WebSocket connections require a JWT token in the `auth` field:

```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

### Getting a Token

1. Register or login via REST API
2. Receive JWT token in response
3. Use token for WebSocket authentication

---

## Error Handling

### REST API Errors

All errors follow a standard format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### WebSocket Errors

Errors are sent as events:

```javascript
socket.on('error', (data) => {
  console.error('Error:', data.message);
  console.error('Code:', data.code);
});

socket.on('match_error', (data) => {
  console.error('Match error:', data.message);
});
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid input data |
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists |
| `INTERNAL_ERROR` | Server error |

---

## Deployment

### Online Documentation

- **REST API**: `http://localhost:8090/api-docs` (Swagger UI)
- **WebSocket API**: Generate HTML from AsyncAPI spec

### Offline Documentation

Both specifications are available as YAML files:
- `backend/docs/openapi.yaml` - REST API specification
- `backend/docs/asyncapi.match-server.yaml` - WebSocket API specification

You can view these in any text editor or use online viewers:
- [Swagger Editor](https://editor.swagger.io/) - for OpenAPI
- [AsyncAPI Studio](https://studio.asyncapi.com/) - for AsyncAPI

---

## Support

For issues or questions:
- Check the specification files in `backend/docs/`
- Review example implementations in `tests/`
- Contact the QuizUP team at dev@quizup.com
