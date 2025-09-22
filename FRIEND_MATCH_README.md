# Friend Match (1v1 Play with Friend) Implementation

## Overview

This document outlines the complete implementation of the "Play with Friend" feature, which allows students to create and join 1v1 quiz matches using join codes with real-time synchronization.

## Architecture

### Backend Components

1. **Main Server (Port 3000)**
   - `src/routes/friendMatchRoutes.ts` - HTTP API endpoints for friend match operations
   - Proxies requests to the match service microservice

2. **Match Service (Port 3001)**
   - `src/matchServer-enhanced.ts` - WebSocket server for real-time match orchestration
   - Handles match creation, joining, question synchronization, and results

### Frontend Components

1. **Core Components**
   - `PlayWithFriendModal.tsx` - Modal for generating/joining match codes
   - `FriendMatchInterface.tsx` - Real-time quiz interface for friend matches
   - `FriendMatchLeaderboard.tsx` - Results display for friend matches

2. **Services**
   - `friendMatchService.ts` - HTTP API client for friend match operations
   - `matchService.ts` - Enhanced with friend match WebSocket support

## API Endpoints

### HTTP REST API (Main Server - Port 3000)

```
POST /api/friend-matches
- Creates a new friend match
- Body: { quizId: number }
- Returns: { matchId, joinCode, websocketUrl }

GET /api/friend-matches/code/:joinCode
- Finds match by join code
- Returns: { match, websocketUrl }

GET /api/friend-matches
- Gets all active matches (for monitoring)

GET /api/friend-matches/:matchId
- Gets specific match details
```

### WebSocket Events (Match Service - Port 3001)

#### Client → Server Events:
- `authenticate` - Authenticate user with match service
- `create_friend_match` - Create a new friend match
- `join_match_by_code` - Join match using join code
- `player_ready` - Mark player as ready to start
- `submit_answer` - Submit answer for current question

#### Server → Client Events:
- `authenticated` - Authentication successful
- `friend_match_created` - Match created with join code
- `match_joined` - Successfully joined match
- `player_joined` - Another player joined
- `player_ready` - Player marked as ready
- `match_started` - Match began, first question sent
- `next_question` - Next question in sequence
- `answer_result` - Feedback on submitted answer
- `player_answered` - Opponent submitted answer
- `match_completed` - Match finished with results
- `player_disconnected` - Player left match
- `error` - Error occurred

## User Flow

### Creating a Match

1. Student selects a quiz and clicks "Play with Friend"
2. Modal opens with "Generate Code" and "Join with Code" tabs
3. Student clicks "Generate Game Code"
4. Frontend calls `POST /api/friend-matches` with quizId
5. Backend creates match and returns join code
6. Student shares join code with friend
7. When both players are ready, match starts automatically

### Joining a Match

1. Student enters join code in modal
2. Frontend calls `GET /api/friend-matches/code/:joinCode`
3. If match exists, student joins via WebSocket
4. Real-time synchronization begins

### Match Gameplay

1. Both players connect to WebSocket
2. Questions are synchronized in real-time
3. Each player submits answers independently
4. Progress is tracked and shared between players
5. Match completes when all questions are answered
6. Results show winner, scores, and detailed breakdown

## File Structure

```
Backend/
├── src/
│   ├── routes/friendMatchRoutes.ts          # HTTP API routes
│   ├── matchServer-enhanced.ts              # WebSocket match service
│   └── server.ts                            # Main server with route registration

Frontend-admin/
├── src/
│   ├── components/student/
│   │   ├── PlayWithFriendModal.tsx          # Join code modal
│   │   ├── FriendMatchInterface.tsx         # Real-time quiz interface
│   │   └── quiz-results/
│   │       └── FriendMatchLeaderboard.tsx   # Friend match results
│   ├── services/
│   │   ├── friendMatchService.ts            # Friend match API client
│   │   └── matchService.ts                  # Enhanced match service
│   └── App.tsx                              # Updated with /friend-match route
```

## Key Features Implemented

### Real-time Synchronization
- Questions are sent simultaneously to both players
- Answer submissions are tracked in real-time
- Player status updates (ready, answered, disconnected)

### Join Code System
- 6-character alphanumeric codes (e.g., "ABC123")
- Unique code generation with collision detection
- Code validation and match lookup

### Match Orchestration
- Automatic match start when both players ready
- Sequential question delivery
- Graceful handling of player disconnections
- Complete match state management

### Results Integration
- Dedicated friend match leaderboard
- Winner announcement with celebration
- Detailed score breakdown and statistics
- Integration with existing quiz results system

## Environment Configuration

### Backend (.env)
```
MATCH_SERVICE_PORT=3001
MATCH_SERVICE_URL=http://localhost:3001
REDIS_URL=redis://localhost:6379
```

### Frontend
- WebSocket URL: `ws://localhost:3001`
- API Base URL: `/api/friend-matches`

## Testing

### Manual Testing
1. Start both backend servers:
   ```bash
   # Terminal 1: Main server
   cd Backend && npm run dev

   # Terminal 2: Match service
   cd Backend && node src/matchServer-enhanced.ts
   ```

2. Start frontend:
   ```bash
   cd Frontend-admin && npm run dev
   ```

3. Open two browser windows/tabs
4. Navigate to student quiz page
5. Select same quiz in both windows
6. Create match in first window, join with code in second
7. Test complete flow

### Automated Testing
```bash
cd Backend && node test-friend-match.js
```

## Error Handling

### Frontend
- Connection failures with retry logic
- Invalid join codes with user feedback
- Match not found scenarios
- WebSocket disconnection handling

### Backend
- Quiz validation before match creation
- Join code collision prevention
- Player disconnection cleanup
- Match state consistency

## Performance Considerations

- Redis for match state persistence
- Efficient WebSocket event handling
- Automatic cleanup of completed matches
- Connection pooling for database queries

## Security

- Input validation on all endpoints
- Join code uniqueness enforcement
- Rate limiting on match creation
- WebSocket authentication

## Future Enhancements

1. **Spectator Mode** - Allow others to watch matches
2. **Match Replay** - Save and replay match sessions
3. **Tournament Brackets** - Multi-round friend tournaments
4. **Custom Time Limits** - Per-match timing configuration
5. **Voice Chat Integration** - Real-time communication
6. **Match Statistics** - Detailed analytics and history

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure match service is running on port 3001
   - Check firewall settings
   - Verify WebSocket URL in frontend

2. **Join Code Not Working**
   - Verify code is exactly 6 characters
   - Check if match is still active
   - Ensure match service is accessible

3. **Questions Not Syncing**
   - Check WebSocket connection status
   - Verify quiz has questions in database
   - Check console for error messages

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in backend environment.

## Status

✅ **COMPLETED** - All core functionality implemented and tested
- Friend match creation and joining
- Real-time question synchronization  
- WebSocket communication
- Results integration
- Error handling and user feedback

The 1v1 "Play with Friend" feature is now production-ready and fully integrated into the QuizMaster system.
