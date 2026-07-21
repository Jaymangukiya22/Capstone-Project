/**
 * QuizUP match load / capacity test harness.
 *
 * Mints JWTs for existing user IDs (bypasses the auth rate limit) and ramps up
 * concurrent 2-player friend matches. Two modes:
 *   MODE=hold  (default) - establish matches and hold the sockets idle; use to
 *                          measure max concurrent connections / matches + resources.
 *   MODE=play            - both players answer every question to completion; use
 *                          to test throughput and that matches finish + persist.
 *
 * Run on the HOST (subject to Docker Desktop's ~2000 host-port-proxy cap on
 * Windows):
 *   node --max-old-space-size=4096 scripts/loadtest.js
 *
 * Run IN-CONTAINER on the compose network (bypasses the host port proxy - use
 * this to find the real server ceiling; on a Linux prod host this is the normal
 * path). The matchserver cap is MAX_WORKERS x MAX_MATCHES_PER_WORKER (24,000 by
 * default); split the load across parallel generators with distinct USER_OFFSET:
 *   docker run --rm --network <proj>_quizup_network --ulimit nofile=65535 \
 *     -v <repo>/backend:/app -w /app \
 *     -e MATCH_URL=http://matchserver:3001 -e API_URL=http://backend:3000 \
 *     -e NUM_MATCHES=2500 -e MODE=hold -e QUIZ_IDS=102-153 \
 *     node:20-alpine node --max-old-space-size=4096 scripts/loadtest.js
 *
 * Run against the PROD Cloudflare URLs (https/wss - TLS + socket path are
 * handled automatically; timings auto-relax for tunnel latency):
 *   MATCH_URL=https://match.quizdash.dpdns.org \
 *   API_URL=https://api.quizdash.dpdns.org \
 *   NUM_MATCHES=50 MODE=play node scripts/loadtest.js
 * (Keep prod runs modest - Cloudflare rate-limits, and this is the real public
 * path. Heavy ceiling tests belong in-container. See docs/STRESS_TESTING.md.)
 *
 * Env:
 *   NUM_MATCHES, USER_OFFSET (distinct user ranges for parallel generators),
 *   BATCH, BATCH_PAUSE_MS, HOLD_MS, MODE (hold|play), API_URL, MATCH_URL,
 *   JWT_SECRET, QUIZ_ID (single) or QUIZ_IDS (round-robin; comma list and/or
 *   ranges, e.g. QUIZ_IDS=102-153 or QUIZ_IDS=102,110,120-125).
 *   Connection/timing (auto-defaulted; override for high-latency paths):
 *   JOIN_WAIT_MS, READY_WAIT_MS, CONNECT_TIMEOUT_MS, SOCKET_PATH,
 *   INSECURE_TLS=1 (skip cert verification, for a self-signed origin).
 */
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');

const SECRET = process.env.JWT_SECRET || '7a0b42e9df5856f7cfe0094361f65630';
const API = process.env.API_URL || 'http://localhost:3000';
const MATCH = process.env.MATCH_URL || 'http://localhost:3001';
// TLS/prod path (https/wss) has higher round-trip latency than the in-container
// path, so the join handshake needs more slack. Auto-relax the defaults when the
// target is TLS; any explicit env override still wins.
const IS_TLS = /^(https|wss):/i.test(MATCH) || /^https:/i.test(API);
if (process.env.INSECURE_TLS === '1') process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SOCKET_PATH = process.env.SOCKET_PATH || '/socket.io';
const CONNECT_TIMEOUT_MS = parseInt(process.env.CONNECT_TIMEOUT_MS || (IS_TLS ? '30000' : '20000'), 10);
const JOIN_WAIT_MS = parseInt(process.env.JOIN_WAIT_MS || (IS_TLS ? '400' : '120'), 10);
const READY_WAIT_MS = parseInt(process.env.READY_WAIT_MS || (IS_TLS ? '600' : '220'), 10);

function parseQuizIds() {
  const raw = process.env.QUIZ_IDS;
  if (!raw) return [parseInt(process.env.QUIZ_ID || '146', 10)];
  const ids = [];
  for (const part of raw.split(',')) {
    const p = part.trim();
    if (!p) continue;
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) { for (let x = parseInt(m[1], 10); x <= parseInt(m[2], 10); x++) ids.push(x); }
    else ids.push(parseInt(p, 10));
  }
  if (!ids.length || ids.some(Number.isNaN)) throw new Error(`Bad QUIZ_IDS: "${raw}"`);
  return ids;
}
const QUIZ_IDS = parseQuizIds();
const NUM_MATCHES = parseInt(process.env.NUM_MATCHES || '1000', 10);
const USER_OFFSET = parseInt(process.env.USER_OFFSET || '0', 10);
const BATCH = parseInt(process.env.BATCH || '25', 10);
const BATCH_PAUSE_MS = parseInt(process.env.BATCH_PAUSE_MS || '250', 10);
const HOLD_MS = parseInt(process.env.HOLD_MS || '45000', 10);
const MODE = process.env.MODE || 'hold';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tokenFor = (u) => jwt.sign({ userId: u, username: `u${u}`, role: 'PLAYER' }, SECRET, { expiresIn: '1h' });
const stats = { created: 0, connected: 0, joined: 0, started: 0, completed: 0, errors: 0 };
const sockets = [];

function answerCurrent(st) {
  const q = st.currentQ;
  if (MODE !== 'play' || !q || !q.options || !q.options.length || st.done) return;
  st.s.emit('submit_answer', { matchId: st.matchId, questionId: q.id, selectedOptions: [q.options[0].id], timeSpent: 1 });
}

function connectSock(userId) {
  return new Promise((resolve) => {
    const s = io(MATCH, { transports: ['websocket'], forceNew: true, reconnection: false, timeout: CONNECT_TIMEOUT_MS, path: SOCKET_PATH, rejectUnauthorized: process.env.INSECURE_TLS !== '1' });
    const st = { s, userId, matchId: null, started: false, currentQ: null, done: false };
    s.on('connect', () => { stats.connected++; s.emit('authenticate', { userId, username: `u${userId}`, token: tokenFor(userId) }); });
    s.on('authenticated', () => resolve(st));
    s.on('match_joined', d => { if (d.matchId) st.matchId = d.matchId; if (d.question) st.currentQ = d.question; });
    s.on('LOAD_GAME_SCENE', d => { if (d.matchId) st.matchId = d.matchId; });
    s.on('match_started', d => { if (!st.started) { st.started = true; stats.started++; } st.currentQ = d.question; setTimeout(() => answerCurrent(st), 50 + Math.random() * 150); });
    s.on('next_question', d => { st.currentQ = d.question; setTimeout(() => answerCurrent(st), 50 + Math.random() * 150); });
    s.on('match_completed', () => { if (!st.done) { st.done = true; stats.completed++; } });
    s.on('connect_error', () => { stats.errors++; resolve(null); });
    s.on('auth_error', () => { stats.errors++; resolve(null); });
    setTimeout(() => resolve(st), CONNECT_TIMEOUT_MS);
  });
}

async function establishMatch(i) {
  const creatorId = 2 * i - 1 + USER_OFFSET, joinerId = 2 * i + USER_OFFSET;
  const quizId = QUIZ_IDS[(i - 1) % QUIZ_IDS.length];
  try {
    const r = await fetch(`${API}/api/friend-matches`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenFor(creatorId)}` },
      body: JSON.stringify({ quizId })
    });
    const b = await r.json();
    if (!b || !b.success) { stats.errors++; return; }
    stats.created++;
    const joinCode = b.data.joinCode;
    const [ca, cb] = await Promise.all([connectSock(creatorId), connectSock(joinerId)]);
    if (ca) sockets.push(ca); if (cb) sockets.push(cb);
    if (!ca || !cb) { stats.errors++; return; }
    ca.s.emit('join_match_by_code', { joinCode });
    await sleep(JOIN_WAIT_MS);
    cb.s.emit('join_match_by_code', { joinCode });
    await sleep(READY_WAIT_MS);
    if (ca.matchId) stats.joined++;
    if (cb.matchId) stats.joined++;
    const mid = ca.matchId || cb.matchId;
    if (mid) { ca.s.emit('CLIENT_READY', { matchId: mid, userId: creatorId }); cb.s.emit('CLIENT_READY', { matchId: mid, userId: joinerId }); }
  } catch (e) { stats.errors++; }
}

const pct = (n, d) => d ? ((n / d) * 100).toFixed(0) + '%' : '-';
(async () => {
  console.log(`=== LOAD (${MODE}): ${NUM_MATCHES} matches / ${NUM_MATCHES * 2} users via ${MATCH}${IS_TLS ? ' [TLS]' : ''} | ${QUIZ_IDS.length} quiz${QUIZ_IDS.length > 1 ? `zes (${QUIZ_IDS[0]}..${QUIZ_IDS[QUIZ_IDS.length - 1]})` : ` (${QUIZ_IDS[0]})`} | join/ready ${JOIN_WAIT_MS}/${READY_WAIT_MS}ms ===`);
  const t0 = Date.now();
  for (let start = 1; start <= NUM_MATCHES; start += BATCH) {
    const wave = [];
    for (let i = start; i < start + BATCH && i <= NUM_MATCHES; i++) wave.push(establishMatch(i));
    await Promise.all(wave);
    if ((start - 1) % 200 === 0 || start + BATCH > NUM_MATCHES) {
      console.log(`  created=${stats.created} connected=${stats.connected} started=${stats.started} completed=${stats.completed} errors=${stats.errors} | rss=${(process.memoryUsage().rss / 1048576).toFixed(0)}MB | ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    await sleep(BATCH_PAUSE_MS);
  }
  console.log(`\n=== RAMP DONE in ${((Date.now() - t0) / 1000).toFixed(0)}s ===`);
  console.log(`created ${stats.created}/${NUM_MATCHES} (${pct(stats.created, NUM_MATCHES)}) | connected ${stats.connected}/${NUM_MATCHES * 2} (${pct(stats.connected, NUM_MATCHES * 2)}) | started ${stats.started} | errors ${stats.errors}`);
  console.log(`Holding ${sockets.length} sockets ${HOLD_MS / 1000}s (mode=${MODE})...`);
  await sleep(HOLD_MS);
  console.log(`final: completed=${stats.completed}/${stats.created}`);
  for (const c of sockets) { try { c.s.close(); } catch {} }
  process.exit(0);
})();
