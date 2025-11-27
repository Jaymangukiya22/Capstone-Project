/**
 * BOT SWARM STRESS TEST - CONFIGURABLE SCALE
 * 
 * Usage: node stress-test-bots-small.js [numMatches]
 * Example: node stress-test-bots-small.js 100
 * Default: 100 matches
 */

const io = require('socket.io-client');
const axios = require('axios');

// ============================================================================
// CONFIG
// ============================================================================
// Parse command-line argument for number of matches
const NUM_MATCHES = parseInt(process.argv[2]) || 1;
const TOTAL_USERS = NUM_MATCHES * 2; // 2 users per match
const API_URL = process.env.API_URL || 'https://api.quizdash.dpdns.org';
const SOCKET_URL = process.env.SOCKET_URL || 'https://match.quizdash.dpdns.org';
const QUIZ_ID = 110;
const THINK_TIME_MS = 1000;

// Metrics
const metrics = {
  usersLoggedIn: 0,
  socketsConnected: 0,
  matchesCreated: 0,
  matchesJoined: 0,
  matchesStarted: 0,
  matchesCompleted: 0,
  answersSubmitted: 0,
  errors: 0,
  errorList: [],
  startTime: Date.now(),
  // Track which matches have started/completed to avoid double-counting
  startedMatches: new Set(),
  completedMatches: new Set()
};

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     🤖 BOT SWARM STRESS TEST - CONFIGURABLE SCALE             ║
║                    (${NUM_MATCHES} Simultaneous Matches)                  ║
╚════════════════════════════════════════════════════════════════╝

📊 Configuration:
   Total Users: ${TOTAL_USERS}
   Total Matches: ${NUM_MATCHES}
   API URL: ${API_URL}
   WebSocket URL: ${SOCKET_URL}
   Quiz ID: ${QUIZ_ID}

Starting in 2 seconds...
`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function logProgress(message) {
  const elapsed = Math.floor((Date.now() - metrics.startTime) / 1000);
  console.log(`[${elapsed}s] ${message}`);
}

function logMetrics() {
  console.log(`
📊 CURRENT METRICS:
   ✅ Users Logged In: ${metrics.usersLoggedIn}/${TOTAL_USERS}
   ✅ Sockets Connected: ${metrics.socketsConnected}/${TOTAL_USERS}
   ✅ Matches Created: ${metrics.matchesCreated}/${TOTAL_USERS / 2}
   ✅ Matches Joined: ${metrics.matchesJoined}/${TOTAL_USERS / 2}
   ✅ Matches Started: ${metrics.matchesStarted}/${TOTAL_USERS / 2}
   ✅ Matches Completed: ${metrics.matchesCompleted}/${TOTAL_USERS / 2}
   📝 Answers Submitted: ${metrics.answersSubmitted}/${(TOTAL_USERS / 2) * 10}
   ❌ Errors: ${metrics.errors}
`);
}

// ============================================================================
// BOT CLASS
// ============================================================================

class Bot {
  constructor(id) {
    this.id = id;
    this.email = `stresstest_${id}@test.com`;
    this.password = '1234567890';
    this.token = null;
    this.socket = null;
    this.userData = null;
    this.matchId = null;
    this.joinCode = null;
    this.questionsAnswered = 0;
    this.isCreator = (id % 2 === 1);
    this.isConnected = false;
    this.currentQuestion = 0;
    this.totalQuestions = 0;
    this.players = [];
    this.hasEmittedReady = false; // Track if player_ready has been emitted
    this.matchHasStarted = false; // Track if match_started has been received
  }

  async login() {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email: this.email,
        password: this.password
      }, {
        timeout: 10000
      });

      this.token = res.data.token;
      this.userData = res.data.user || res.data.data?.user || res.data;
      
      if (!this.userData || !this.userData.id) {
        const err = `Bot ${this.id} login response missing user data`;
        console.error(`❌ ${err}`);
        metrics.errors++;
        metrics.errorList.push({ type: 'login', bot: this.id, error: err });
        return false;
      }
      
      metrics.usersLoggedIn++;
      console.log(`✅ Bot ${this.id} logged in (ID: ${this.userData.id})`);
      return true;
    } catch (e) {
      const err = `Bot ${this.id} login failed: ${e.message}`;
      console.error(`❌ ${err}`);
      metrics.errors++;
      metrics.errorList.push({ type: 'login', bot: this.id, error: e.message });
      return false;
    }
  }

  connect() {
    return new Promise((resolve) => {
      try {
        this.socket = io(SOCKET_URL, {
          auth: { token: this.token },
          transports: ['websocket'],
          forceNew: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          if (this.userData) {
            this.socket.emit('authenticate', {
              userId: this.userData.id,
              username: this.userData.username
            });
          } else {
            console.error(`❌ Bot ${this.id}: userData is null, cannot authenticate`);
            resolve(false);
          }
        });

        this.socket.on('authenticated', () => {
          this.isConnected = true;
          metrics.socketsConnected++;
          console.log(`✅ Bot ${this.id} socket connected (socket ID: ${this.socket.id})`);
          resolve(true);
        });

        this.socket.on('match_joined', (data) => {
          this.matchId = data.matchId;
          this.players = data.players || [];
          metrics.matchesJoined++;
          console.log(`✅ Bot ${this.id} joined match ${this.matchId}`);
          
          resolve(true);
        });

        this.socket.on('player_list_updated', (data) => {
          this.players = data.players;
          console.log(`👥 Bot ${this.id} PLAYER LIST UPDATED - Match: ${this.matchId}, Players: ${data.players.length}/2 (${data.players.map(p => p.username).join(', ')})`);
          
          // Only emit player_ready when ALL players have joined AND we haven't already emitted it
          if (data.players.length === 2 && !this.hasEmittedReady && !this.matchHasStarted) {
            this.hasEmittedReady = true; // Set flag BEFORE emitting to prevent race conditions
            console.log(`✅ Bot ${this.id} ALL PLAYERS READY - Emitting player_ready for match ${this.matchId}`);
            this.socket.emit('player_ready', { 
              matchId: this.matchId,
              userId: this.userData.id,
              ready: true 
            });
            console.log(`✅ Bot ${this.id} emitted player_ready`);
          }
        });

        this.socket.on('match_started', (data) => {
          // Only increment once per match, not per bot
          if (!this.matchHasStarted) {
            this.matchHasStarted = true;
            if (!metrics.startedMatches.has(this.matchId)) {
              metrics.startedMatches.add(this.matchId);
              metrics.matchesStarted++;
            }
          }
          this.currentQuestion = 0;
          this.totalQuestions = data.totalQuestions || 10;
          console.log(`✅ Bot ${this.id} MATCH STARTED - Match: ${this.matchId}, Q${this.currentQuestion + 1}/${this.totalQuestions}`);
          if (data.question) {
            this.answerQuestion(data.question);
          }
        });

        this.socket.on('next_question', (data) => {
          this.currentQuestion++;
          console.log(`📝 Bot ${this.id} NEXT QUESTION - Match: ${this.matchId}, Q${this.currentQuestion + 1}/${this.totalQuestions}`);
          if (data.question) {
            this.answerQuestion(data.question);
          }
        });

        this.socket.on('match_completed', (data) => {
          // Only increment once per match, not per bot
          if (!metrics.completedMatches.has(this.matchId)) {
            metrics.completedMatches.add(this.matchId);
            metrics.matchesCompleted++;
          }
          console.log(`🏆 Bot ${this.id} MATCH COMPLETED - Match: ${this.matchId}, Completed ${this.currentQuestion + 1}/${this.totalQuestions} questions`);
          this.socket.disconnect();
        });

        this.socket.on('error', (error) => {
          console.error(`❌ Bot ${this.id} socket error: ${error}`);
          metrics.errors++;
          metrics.errorList.push({ type: 'socket', bot: this.id, error: String(error) });
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
        });

        setTimeout(() => {
          if (!this.isConnected) {
            const err = `Bot ${this.id} connection timeout`;
            console.error(`❌ ${err}`);
            metrics.errors++;
            metrics.errorList.push({ type: 'connection', bot: this.id, error: 'timeout' });
            resolve(false);
          }
        }, 10000);

      } catch (e) {
        const err = `Bot ${this.id} connection failed: ${e.message}`;
        console.error(`❌ ${err}`);
        metrics.errors++;
        metrics.errorList.push({ type: 'connection', bot: this.id, error: e.message });
        resolve(false);
      }
    });
  }

  async createMatch() {
    if (!this.isCreator) return null;

    try {
      const res = await axios.post(
        `${API_URL}/api/friend-matches`,
        {
          quizId: QUIZ_ID,
          userId: this.userData.id
        },
        {
          headers: { Authorization: `Bearer ${this.token}` },
          timeout: 10000
        }
      );

      const { matchId, joinCode } = res.data.data;
      this.matchId = matchId;
      this.joinCode = joinCode;
      metrics.matchesCreated++;
      console.log(`✅ Bot ${this.id} created match ${matchId} with code ${joinCode}`);

      return { matchId, joinCode };
    } catch (e) {
      const err = `Bot ${this.id} failed to create match: ${e.message}`;
      console.error(`❌ ${err}`);
      metrics.errors++;
      metrics.errorList.push({ type: 'match_creation', bot: this.id, error: e.message });
      return null;
    }
  }

  connectToMatch(matchId) {
    if (!this.socket || !this.socket.connected) {
      console.error(`❌ Bot ${this.id}: Socket not connected`);
      return;
    }

    this.socket.emit('connect_to_match', {
      matchId,
      userId: this.userData.id,
      username: this.userData.username
    });
  }

  joinMatch(matchId, joinCode) {
    if (!this.socket || !this.socket.connected) {
      console.error(`❌ Bot ${this.id}: Socket not connected`);
      return;
    }

    this.socket.emit('join_match', {
      matchId,
      joinCode,
      userId: this.userData.id,
      username: this.userData.username
    });
  }

  async answerQuestion(questionData) {
    await sleep(Math.random() * THINK_TIME_MS + 500);

    if (!this.socket || !this.socket.connected || !this.matchId) {
      return;
    }

    try {
      const options = questionData.options || [];
      if (options.length === 0) {
        console.error(`❌ Bot ${this.id}: No options for question ${questionData.id}`);
        return;
      }

      const randomOption = options[Math.floor(Math.random() * options.length)];

      this.socket.emit('submit_answer', {
        matchId: this.matchId,
        userId: this.userData.id,
        questionId: questionData.id,
        selectedOptions: [randomOption.id],
        timeSpent: Math.floor(Math.random() * 20 + 5)
      });

      this.questionsAnswered++;
      metrics.answersSubmitted++;
      console.log(`✅ Bot ${this.id} answered Q${questionData.id}`);

    } catch (e) {
      const err = `Bot ${this.id} failed to answer question: ${e.message}`;
      console.error(`❌ ${err}`);
      metrics.errors++;
      metrics.errorList.push({ type: 'answer_submission', bot: this.id, error: e.message });
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runSwarm() {
  const bots = [];

  logProgress('🤖 Initializing 20 bots...');
  for (let i = 1; i <= TOTAL_USERS; i++) {
    bots.push(new Bot(i));
  }

  logProgress('🔐 Logging in all bots (sequential to avoid 503 errors)...');
  const LOGIN_BATCH = 1; // Sequential logins to avoid overwhelming backend
  for (let i = 0; i < bots.length; i += LOGIN_BATCH) {
    const batch = bots.slice(i, i + LOGIN_BATCH);
    await Promise.all(batch.map(b => b.login()));
    await sleep(200); // Small delay between logins
  }
  
  const successfulBots = bots.filter(b => b.token !== null);
  if (successfulBots.length === 0) {
    console.error('❌ FATAL: No bots could log in. Backend may be down.');
    process.exit(1);
  }
  logProgress(`✅ ${metrics.usersLoggedIn} bots logged in (${metrics.errors} failed)`);

  logProgress('🔌 Connecting WebSockets...');
  const WS_BATCH_SIZE = 10; // Connect 10 at a time
  for (let i = 0; i < successfulBots.length; i += WS_BATCH_SIZE) {
    const batch = successfulBots.slice(i, i + WS_BATCH_SIZE);
    await Promise.all(batch.map(b => b.connect()));
    await sleep(1000); // 1 second delay between batches
  }
  logProgress(`✅ ${metrics.socketsConnected} sockets connected`);

  logProgress('🎮 Creating matches...');
  const matchPairs = [];
  for (let i = 0; i < successfulBots.length - 1; i += 2) {
    const creator = successfulBots[i];
    const joiner = successfulBots[i + 1];

    const matchData = await creator.createMatch();
    if (matchData) {
      matchPairs.push({ creator, joiner, ...matchData });
    }
    await sleep(200);
  }
  logProgress(`✅ Created ${metrics.matchesCreated} matches`);

  logProgress('🔗 Connecting players to matches...');
  for (const pair of matchPairs) {
    pair.creator.connectToMatch(pair.matchId);
    pair.joiner.joinMatch(pair.matchId, pair.joinCode);
    await sleep(200);
  }
  logProgress(`✅ All players connected to matches`);

  logProgress('⏳ Waiting for matches to complete...');
  
  const progressInterval = setInterval(() => {
    logMetrics();
  }, 5000);

  const maxWaitTime = 5 * 60 * 1000; // 5 minutes
  const startWait = Date.now();
  
  while (metrics.matchesCompleted < matchPairs.length && (Date.now() - startWait) < maxWaitTime) {
    await sleep(1000);
  }

  clearInterval(progressInterval);

  // Final results
  const totalTime = Math.floor((Date.now() - metrics.startTime) / 1000);
  const expectedAnswers = NUM_MATCHES * 10 * 2; // 10 questions × 2 players per match
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    ✅ TEST COMPLETE                           ║
╚════════════════════════════════════════════════════════════════╝

⏱️  Total Time: ${totalTime}s (${Math.floor(totalTime / 60)}m ${totalTime % 60}s)

📊 FINAL RESULTS:
   ✅ Users Logged In: ${metrics.usersLoggedIn}/${TOTAL_USERS}
   ✅ Sockets Connected: ${metrics.socketsConnected}/${TOTAL_USERS}
   ✅ Matches Created: ${metrics.matchesCreated}/${NUM_MATCHES}
   ✅ Matches Joined: ${metrics.matchesJoined}/${NUM_MATCHES}
   ✅ Matches Started: ${metrics.matchesStarted}/${NUM_MATCHES}
   ✅ Matches Completed: ${metrics.matchesCompleted}/${NUM_MATCHES}
   📝 Answers Submitted: ${metrics.answersSubmitted}/${expectedAnswers}
   ❌ Errors: ${metrics.errors}

📈 SUCCESS RATE:
   Login: ${((metrics.usersLoggedIn / TOTAL_USERS) * 100).toFixed(1)}%
   Socket Connection: ${((metrics.socketsConnected / TOTAL_USERS) * 100).toFixed(1)}%
   Match Creation: ${((metrics.matchesCreated / NUM_MATCHES) * 100).toFixed(1)}%
   Match Completion: ${((metrics.matchesCompleted / NUM_MATCHES) * 100).toFixed(1)}%
   Answers: ${((metrics.answersSubmitted / expectedAnswers) * 100).toFixed(1)}%

🎯 THROUGHPUT:
   Matches/sec: ${(metrics.matchesCompleted / totalTime).toFixed(2)}
   Answers/sec: ${(metrics.answersSubmitted / totalTime).toFixed(2)}
   Users/sec: ${(TOTAL_USERS / totalTime).toFixed(2)}
`);

  // Log errors if any
  if (metrics.errors > 0) {
    console.log(`
❌ ERROR REPORT (${metrics.errors} total errors):
════════════════════════════════════════════════════════════════`);
    
    // Group errors by type
    const errorsByType = {};
    metrics.errorList.forEach(err => {
      if (!errorsByType[err.type]) {
        errorsByType[err.type] = [];
      }
      errorsByType[err.type].push(err);
    });
    
    // Print errors grouped by type
    Object.entries(errorsByType).forEach(([type, errors]) => {
      console.log(`\n📌 ${type.toUpperCase()} (${errors.length} errors):`);
      errors.slice(0, 5).forEach((err, idx) => {
        console.log(`   ${idx + 1}. Bot ${err.bot}: ${err.error}`);
      });
      if (errors.length > 5) {
        console.log(`   ... and ${errors.length - 5} more`);
      }
    });
    
    console.log(`\n════════════════════════════════════════════════════════════════`);
  } else {
    console.log(`\n✅ NO ERRORS - ALL SYSTEMS GO!\n`);
  }

  for (const bot of successfulBots) {
    if (bot.socket && bot.socket.connected) {
      bot.socket.disconnect();
    }
  }

  process.exit(metrics.errors > 0 ? 1 : 0);
}

setTimeout(() => {
  runSwarm().catch(e => {
    console.error('💥 FATAL ERROR:', e);
    process.exit(1);
  });
}, 2000);
