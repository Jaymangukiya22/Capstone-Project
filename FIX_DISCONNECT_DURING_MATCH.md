# 🔧 Fix: "Not in Match" Error When Player Disconnects During Match

## Problem

When a player disconnects right after the match starts (especially in hosted/production environments), they get "not in match" errors when trying to rejoin. This happens because:

1. **Immediate removal**: Old code removed players from the match immediately on disconnect
2. **No grace period**: No time allowed for reconnection
3. **Network latency**: In hosted environments, network issues can cause brief disconnects
4. **Question not received**: If player disconnects before receiving the next question, they're out of sync

## Root Cause

The disconnect handler was removing players immediately:
```typescript
// OLD CODE - WRONG
socket.on('disconnect', () => {
  match.players.delete(socket.data.userId);  // ❌ Removes immediately
  this.userToMatch.delete(socket.data.userId);
});
```

When the next question was emitted, it only went to players in the Socket.IO room:
```typescript
this.io.to(matchId).emit('next_question', { ... });  // ❌ Disconnected players don't receive
```

## Solution Applied

### 1. **Grace Period for Reconnection** (30 seconds)

When a player disconnects during an active match, they're kept in the match for 30 seconds:

```typescript
if (match.status === 'IN_PROGRESS' && player) {
  // Keep player in match for 30 seconds
  const gracePeriodTimer = setTimeout(() => {
    if (stillDisconnected) {
      match.players.delete(socket.data.userId);  // ✅ Only remove after grace period
    }
  }, 30000);
  
  this.disconnectTimers.set(socket.data.userId, gracePeriodTimer);
}
```

### 2. **Automatic Reconnection**

When player reconnects, their socket is updated and grace period is cleared:

```typescript
if (match.players.has(socket.data.userId)) {
  const existingPlayer = match.players.get(socket.data.userId);
  existingPlayer.socketId = socket.id;  // ✅ Update socket
  
  // Clear grace period timer
  if (this.disconnectTimers.has(socket.data.userId)) {
    clearTimeout(this.disconnectTimers.get(socket.data.userId));
  }
}
```

### 3. **Current Question State on Reconnection**

When reconnecting during an active match, send the current question:

```typescript
if (match.status === 'IN_PROGRESS') {
  const currentQuestion = match.questions[match.currentQuestionIndex];
  const timeElapsed = Date.now() - match.questionStartTime;
  
  socket.emit('match_reconnected', {
    question: currentQuestion,
    questionIndex: match.currentQuestionIndex,
    timeElapsed: Math.floor(timeElapsed / 1000),
    playerScore: existingPlayer.score,
    hasSubmittedCurrent: existingPlayer.hasSubmittedCurrent
  });
}
```

### 4. **Notifications**

Notify other players of temporary/permanent disconnects:

```typescript
// Temporary disconnect
socket.to(matchId).emit('player_temporarily_disconnected', {
  userId, username,
  message: `${username} disconnected - reconnecting...`
});

// Permanent disconnect (after grace period)
socket.to(matchId).emit('player_permanently_disconnected', {
  userId, username,
  message: `${username} disconnected permanently`
});

// Reconnection
socket.to(matchId).emit('player_reconnected', {
  userId, username,
  message: `${username} reconnected`
});
```

## Why This Fixes the Hosted Version Issue

### Network Latency Problem
- **Hosted environments** have higher latency and packet loss
- Brief disconnects are common (100-500ms)
- **Grace period** allows reconnection before player is removed

### WebSocket Connection Issues
- Cloudflare tunnels can cause temporary connection drops
- Players need time to re-establish connection
- **30 seconds** is enough for most network issues

### Question Sync Problem
- When player reconnects, they immediately receive the current question
- No need to wait for next question emission
- Player can continue playing without interruption

## Testing

### Test Case 1: Brief Disconnect (< 5 seconds)
```
1. Start match
2. Disconnect player 1
3. Reconnect within 5 seconds
4. ✅ Player should receive current question and continue
```

### Test Case 2: Longer Disconnect (5-30 seconds)
```
1. Start match
2. Disconnect player 1
3. Reconnect within 30 seconds
4. ✅ Player should receive current question and continue
5. ✅ Other player should see "reconnected" notification
```

### Test Case 3: Grace Period Expiration (> 30 seconds)
```
1. Start match
2. Disconnect player 1
3. Wait 31 seconds
4. Try to reconnect
5. ✅ Player should get "Match not found" error (grace period expired)
```

## Files Modified

```
✅ backend/src/matchServer-enhanced.ts
   - Updated disconnect handler (lines 1336-1403)
   - Updated join_match_by_code handler (lines 787-859)
   - Added grace period timer management
   - Added reconnection state restoration
```

## Configuration

### Grace Period Duration
- **Current**: 30 seconds
- **Adjustable**: Change `30000` to desired milliseconds

```typescript
}, 30000); // Change this value
```

### For Different Environments

**Localhost** (low latency):
```typescript
}, 10000); // 10 seconds
```

**Network** (medium latency):
```typescript
}, 20000); // 20 seconds
```

**Hosted/Production** (high latency):
```typescript
}, 30000); // 30 seconds (default)
```

## Deployment

### Rebuild Backend
```bash
docker compose build backend
docker compose restart backend
```

### Or Full Restart
```bash
docker compose down
source .env.self-hosted
docker compose up -d
```

## Monitoring

Watch for these logs:

```
✅ Player disconnected during match - allowing reconnection
✅ Grace period cleared - player reconnected
✅ Player reconnected to match
❌ Grace period expired - removing player from match
```

## Summary

| Issue | Before | After |
|-------|--------|-------|
| **Disconnect handling** | Immediate removal | 30-second grace period |
| **Reconnection** | Not possible | Automatic with state restore |
| **Current question** | Not sent | Sent on reconnection |
| **Hosted version** | Frequent errors | Stable with reconnection |
| **Network latency** | Causes removal | Tolerated with grace period |

**Result**: Players can now disconnect and reconnect seamlessly during matches! 🎉
