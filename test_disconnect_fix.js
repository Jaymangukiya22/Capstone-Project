const io = require('socket.io-client');
const fetch = require('node-fetch');

const MATCH_SERVER_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:3000';

async function createFriendMatch() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/friend-matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: 1,
        userId: 1,
        username: 'TestPlayer1'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Failed to create match:', error.message);
    throw error;
  }
}

async function testDisconnectFix() {
  console.log('🧪 Testing Disconnect/Reconnection Fix...\n');

  // Create match via backend API
  console.log('📝 Creating friend match via backend API...');
  const matchData = await createFriendMatch();
  
  if (!matchData.success) {
    console.error('❌ Failed to create match:', matchData.error);
    return false;
  }
  
  const { matchId, joinCode } = matchData;
  console.log('✅ Match created:', { matchId, joinCode });

  // Create two socket connections for two players
  const socket1 = io(MATCH_SERVER_URL, {
    reconnection: true,
    reconnectionDelay: 100,
    reconnectionDelayMax: 1000,
    reconnectionAttempts: 10,
    auth: {
      token: 'test-token-1',
      userId: 1,
      username: 'TestPlayer1'
    }
  });

  const socket2 = io(MATCH_SERVER_URL, {
    reconnection: true,
    reconnectionDelay: 100,
    reconnectionDelayMax: 1000,
    reconnectionAttempts: 10,
    auth: {
      token: 'test-token-2',
      userId: 2,
      username: 'TestPlayer2'
    }
  });

  let testPassed = false;
  let reconnectedSuccessfully = false;

  return new Promise((resolve) => {
    // Setup event listeners for socket1 (Player 1)
    socket1.on('connect', () => {
      console.log('✅ Player 1 connected to match server');
      
      // Join the match
      console.log('📝 Player 1 joining match with code:', joinCode);
      socket1.emit('join_match_by_code', { joinCode }, (response) => {
        if (response && response.success) {
          console.log('✅ Player 1 joined match');
        } else {
          console.error('❌ Player 1 failed to join:', response?.error);
        }
      });
    });

    socket1.on('match_joined', (data) => {
      console.log('✅ Player 1 received match_joined event');
      console.log('   Players in match:', data.players.map(p => p.username));
      
      // Mark player as ready
      console.log('📝 Player 1 marking as ready...');
      socket1.emit('player_ready', {});
    });

    socket1.on('match_started', (data) => {
      console.log('✅ Match started');
      if (data.question) {
        console.log('📊 Current question:', data.question.questionText);
      }

      // Simulate Player 1 disconnecting after match starts
      console.log('\n⏱️  Simulating Player 1 disconnect in 2 seconds...');
      setTimeout(() => {
        console.log('🔌 Player 1 disconnecting...');
        socket1.disconnect();

        // Wait 3 seconds (within grace period) and reconnect
        setTimeout(() => {
          console.log('🔌 Player 1 reconnecting...');
          socket1.connect();
        }, 3000);
      }, 2000);
    });

    socket1.on('player_temporarily_disconnected', (data) => {
      console.log('⚠️  Player 1 marked as temporarily disconnected');
      console.log('   Message:', data.message);
    });

    socket1.on('match_reconnected', (data) => {
      console.log('✅ Player 1 reconnected to match!');
      if (data.question) {
        console.log('📊 Current question restored:', data.question.questionText);
      }
      console.log('⏱️  Time elapsed:', data.timeElapsed, 'seconds');
      console.log('📊 Player score:', data.playerScore);
      reconnectedSuccessfully = true;
      testPassed = true;

      // Cleanup
      setTimeout(() => {
        socket1.disconnect();
        socket2.disconnect();
        resolve(testPassed);
      }, 1000);
    });

    socket1.on('disconnect', (reason) => {
      console.log('🔌 Player 1 disconnected:', reason);
    });

    socket1.on('error', (error) => {
      console.error('❌ Player 1 error:', error);
    });

    // Setup event listeners for socket2 (Player 2)
    socket2.on('connect', () => {
      console.log('✅ Player 2 connected to match server');
      
      // Join the match
      console.log('📝 Player 2 joining match with code:', joinCode);
      socket2.emit('join_match_by_code', { joinCode }, (response) => {
        if (response && response.success) {
          console.log('✅ Player 2 joined match');
        } else {
          console.error('❌ Player 2 failed to join:', response?.error);
        }
      });
    });

    socket2.on('match_joined', (data) => {
      console.log('✅ Player 2 received match_joined event');
      
      // Mark player as ready
      console.log('📝 Player 2 marking as ready...');
      socket2.emit('player_ready', {});
    });

    socket2.on('player_temporarily_disconnected', (data) => {
      console.log('⚠️  Player 2 notified: Player 1 temporarily disconnected');
      console.log('   Message:', data.message);
    });

    socket2.on('player_reconnected', (data) => {
      console.log('✅ Player 2 notified: Player 1 reconnected');
      console.log('   Player:', data.username);
    });

    socket2.on('disconnect', (reason) => {
      console.log('🔌 Player 2 disconnected:', reason);
    });

    socket2.on('error', (error) => {
      console.error('❌ Player 2 error:', error);
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      console.log('\n❌ Test timeout - no reconnection detected');
      socket1.disconnect();
      socket2.disconnect();
      resolve(false);
    }, 60000);
  });
}

// Run the test
testDisconnectFix().then((passed) => {
  if (passed) {
    console.log('\n✅ TEST PASSED: Disconnect/Reconnection fix is working!');
    process.exit(0);
  } else {
    console.log('\n❌ TEST FAILED: Disconnect/Reconnection fix did not work');
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
