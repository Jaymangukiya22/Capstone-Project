/**
 * BOT SWARM STRESS TEST - CONFIGURABLE SCALE
 * 
 * Usage: node stress-test-bots-small.js [numMatches]
 * Example: node stress-test-bots-small.js 100
 * Default: 100 matches
 */

const io = require('socket.io-client');
const axios = require('axios');
const http = require('http');
const https = require('https');

// ============================================================================
// CONFIG
// ============================================================================
// Parse command-line argument for number of matches
const NUM_MATCHES = parseInt(process.argv[2]) || 1;
const TOTAL_USERS = NUM_MATCHES * 2; // 2 users per match
const RAW_LOGIN_BATCH = parseInt(process.argv[3] || process.env.LOGIN_BATCH_SIZE || '20', 10);
const LOGIN_BATCH_SIZE = Number.isNaN(RAW_LOGIN_BATCH) || RAW_LOGIN_BATCH <= 0 ? 20 : RAW_LOGIN_BATCH;
const API_URL = process.env.API_URL || 'https://api.quizdash.dpdns.org';
const SOCKET_URL = process.env.SOCKET_URL || 'https://match.quizdash.dpdns.org';
const QUIZ_ID = 110;
const THINK_TIME_MS = 1000;

// HTTP client with keep-alive to avoid port exhaustion during local stress tests
const parsedApiUrl = new URL(API_URL);
const isHttps = parsedApiUrl.protocol === 'https:';

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: Infinity,
  maxFreeSockets: 256
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: Infinity,
  maxFreeSockets: 256
});

// Shared Axios instance for all bots
const apiClient = axios.create({
  baseURL: API_URL,
  httpAgent: isHttps ? undefined : httpAgent,
  httpsAgent: isHttps ? httpsAgent : undefined,
  timeout: 10000
});

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
  completedMatches: new Set(),
  // Track unique bot+match joins to avoid over-counting on reconnects
  joinedMatchesSet: new Set()
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

async function withRetry(fn, options = {}) {
  const {
    attempts = 3,
    baseDelay = 300,
    maxDelay = 3000,
    factor = 2,
    jitter = 0.3,
    label = 'operation'
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await fn();
      if (result === false || result === null) {
        throw new Error(`${label} returned falsy result`);
      }
      return result;
    } catch (e) {
      lastError = e;
      if (attempt === attempts) {
        break;
      }
      const base = Math.min(maxDelay, baseDelay * Math.pow(factor, attempt - 1));
      const jitterOffset = base * jitter * (Math.random() * 2 - 1);
      const delay = Math.max(0, base + jitterOffset);
      console.log(`Retrying ${label} (attempt ${attempt + 1}/${attempts}) after ${Math.round(delay)}ms: ${e.message}`);
      await sleep(delay);
    }
  }
  throw lastError || new Error(`${label} failed`);
}

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
    this.botKey = `bot-${id}`;
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
    this.matchIsCompleted = false;
  }

  async login() {
    const attemptLogin = async () => {
      const res = await apiClient.post('/api/auth/login', {
        email: this.email,
        password: this.password
      }, {
        timeout: 10000,
        headers: {
          'X-Bot-ID': this.botKey
        }
      });

      this.token = res.data.token;
      this.userData = res.data.user || res.data.data?.user || res.data;

      if (!this.userData || !this.userData.id) {
        throw new Error('login response missing user data');
      }

      return true;
    };

    try {
      await withRetry(() => attemptLogin(), {
        attempts: 3,
        baseDelay: 300,
        maxDelay: 3000,
        label: `login bot ${this.id}`
      });

      metrics.usersLoggedIn++;
      console.log(`✅ Bot ${this.id} logged in (ID: ${this.userData.id})`);
      return true;
    } catch (e) {
      const err = `Bot ${this.id} login failed after retries: ${e.message}`;
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
          reconnectionAttempts: 5,
          extraHeaders: {
            "X-Bot-ID": this.botKey,
            "X-Forwarded-For": `192.168.${Math.floor(this.id / 255)}.${this.id % 255}`
          }
        });

        this.socket.on('connect', () => {
          if (this.userData) {
            this.socket.emit('authenticate', {
              userId: this.userData.id,
              username: this.userData.username
            });

            // If this bot was already in a match before a disconnect, re-join it
            if (this.matchId && this.joinCode) {
              console.log(`🔄 Bot ${this.id} re-joining match ${this.matchId} after reconnection`);
              this.socket.emit('join_match', {
                matchId: this.matchId,
                joinCode: this.joinCode,
                userId: this.userData.id,
                username: this.userData.username
              });
            }
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

          // Only count unique bot+match joins to avoid inflating metrics on reconnects
          const joinKey = `${this.id}-${this.matchId}`;
          if (!metrics.joinedMatchesSet.has(joinKey)) {
            metrics.joinedMatchesSet.add(joinKey);
            metrics.matchesJoined++;
          }

          console.log(`✅ Bot ${this.id} joined match ${this.matchId} (players now: ${this.players.length})`);

          // PROACTIVE READY: if both players are already present when we join (e.g. after reconnect),
          // don't wait for another player_list_updated event that may never come.
          if (this.players.length === 2 && !this.hasEmittedReady && !this.matchHasStarted && !this.matchIsCompleted) {
            this.hasEmittedReady = true;
            console.log(`✅ Bot ${this.id} PROACTIVE READY - Room full on join for match ${this.matchId}`);
            this.socket.emit('player_ready', {
              matchId: this.matchId,
              userId: this.userData.id,
              ready: true
            });
          }
          
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
          if (data.players.length < 2 && this.hasEmittedReady) {
            console.log(`⚠️ Match ${this.matchId} dropped to ${data.players.length} players. Resetting Ready State.`);
            this.hasEmittedReady = false; 
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
          this.matchIsCompleted = true;
          // Only increment once per match, not per bot
          if (!metrics.completedMatches.has(this.matchId)) {
            metrics.completedMatches.add(this.matchId);
            metrics.matchesCompleted++;
          }
          console.log(`🏆 Bot ${this.id} MATCH COMPLETED - Match: ${this.matchId}, Completed ${this.currentQuestion + 1}/${this.totalQuestions} questions`);
          this.socket.disconnect();
        });

        this.socket.on('error', (error) => {
          let detail;
          if (typeof error === 'string') {
            detail = error;
          } else if (error && error.message) {
            detail = error.message;
          } else {
            try {
              detail = JSON.stringify(error);
            } catch (_) {
              detail = String(error);
            }
          }
          console.error(`❌ Bot ${this.id} socket error: ${detail}`);
          metrics.errors++;
          metrics.errorList.push({ type: 'socket', bot: this.id, error });
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
          // Reset ready flag so bot can re-declare readiness after reconnection
          this.hasEmittedReady = false;
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

    const attemptCreate = async () => {
      const res = await apiClient.post(
        '/api/friend-matches',
        {
          quizId: QUIZ_ID,
          userId: this.userData.id
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'X-Bot-ID': this.botKey
          },
          timeout: 10000
        }
      );

      return res.data && res.data.data ? res.data.data : null;
    };

    try {
      const data = await withRetry(() => attemptCreate(), {
        attempts: 3,
        baseDelay: 300,
        maxDelay: 3000,
        label: `create match bot ${this.id}`
      });

      if (!data || !data.matchId || !data.joinCode) {
        throw new Error('invalid match creation response');
      }

      const { matchId, joinCode } = data;
      this.matchId = matchId;
      this.joinCode = joinCode;
      metrics.matchesCreated++;
      console.log(`✅ Bot ${this.id} created match ${matchId} with code ${joinCode}`);

      return { matchId, joinCode };
    } catch (e) {
      const err = `Bot ${this.id} failed to create match after retries: ${e.message}`;
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

    if (this.matchIsCompleted) {
      return;
    }

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

  logProgress(`🤖 Initializing ${TOTAL_USERS} bots...`);
  for (let i = 1; i <= TOTAL_USERS; i++) {
    bots.push(new Bot(i));
  }

  logProgress(`🔐 Logging in all bots in batches of ${LOGIN_BATCH_SIZE}...`);
  const LOGIN_BATCH = LOGIN_BATCH_SIZE;
  for (let i = 0; i < bots.length; i += LOGIN_BATCH) {
    const batch = bots.slice(i, i + LOGIN_BATCH);
    await Promise.all(batch.map(b => b.login()));
    await sleep(300); // Small delay between batches
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
    await sleep(100);
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
      errors.forEach((err, idx) => {
        let detail = err.error;
        if (detail && typeof detail !== 'string') {
          try {
            detail = JSON.stringify(detail);
          } catch (_) {
            detail = String(detail);
          }
        }
        console.log(`   ${idx + 1}. Bot ${err.bot}: ${detail}`);
      });
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
