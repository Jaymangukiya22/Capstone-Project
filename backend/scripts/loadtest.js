/**
 * QuizUP match load / capacity test harness.
 *
 * Mints JWTs for existing user IDs (bypasses the auth rate limit) and ramps up
 * concurrent matches. Three modes:
 *   MODE=hold  (default) - establish FRIEND matches and hold the sockets idle;
 *                          use to measure max concurrent connections / matches
 *                          + resources.
 *   MODE=play            - both FRIEND-match players answer every question to
 *                          completion; use to test throughput and that matches
 *                          finish + persist.
 *   MODE=auto             - ramp concurrent AUTO-matchmaking searchers (no
 *                          friend-match create/join-by-code) and PROVE the
 *                          no-double-match invariant: every user gets at most
 *                          one `auto_match_found`, and every matchId is held by
 *                          at most 2 distinct users. Also measures search-wait
 *                          latency (p50/p95) and timeout count. See
 *                          docs/MATCHMAKING.md and docs/STRESS_TESTING.md.
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
 * Run MODE=auto in-container (proves the no-double-match invariant under
 * concurrent enqueue/pairing load; CATEGORY_ID is required - see
 * docs/MATCHMAKING.md for how to find one):
 *   docker run --rm --network <proj>_quizup_network --ulimit nofile=65535 \
 *     -v <repo>/backend:/app -w /app \
 *     -e MATCH_URL=http://matchserver:3001 -e API_URL=http://backend:3000 \
 *     -e NUM_MATCHES=500 -e MODE=auto -e CATEGORY_ID=1 \
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
 *   BATCH, BATCH_PAUSE_MS, HOLD_MS, MODE (hold|play|auto), API_URL, MATCH_URL,
 *   JWT_SECRET, QUIZ_ID (single) or QUIZ_IDS (round-robin; comma list and/or
 *   ranges, e.g. QUIZ_IDS=102-153 or QUIZ_IDS=102,110,120-125).
 *   MODE=auto only:
 *     CATEGORY_ID (required - a categories.id with active quizzes; all
 *       searchers in a run share this category so they can pair),
 *     QUIZ_ID (optional - pins a preferred quizId instead of letting the
 *       server pick randomly within the category),
 *     AUTO_WAIT_MS (default 20000 - how long to wait after the ramp for
 *       pairing/sweep to settle before reporting results).
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
const MODE = process.env.MODE || 'hold';
// AUTO mode wants tight waves (many concurrent enqueues hitting the pairing
// sweep at once) by default; FRIEND modes keep the original gentler pacing.
// An explicit BATCH/BATCH_PAUSE_MS always wins.
const BATCH = parseInt(process.env.BATCH || (MODE === 'auto' ? '50' : '25'), 10);
const BATCH_PAUSE_MS = parseInt(process.env.BATCH_PAUSE_MS || (MODE === 'auto' ? '20' : '250'), 10);
const HOLD_MS = parseInt(process.env.HOLD_MS || '45000', 10);

// MODE=auto only.
const CATEGORY_ID = process.env.CATEGORY_ID ? parseInt(process.env.CATEGORY_ID, 10) : null;
const AUTO_QUIZ_ID = process.env.QUIZ_ID ? parseInt(process.env.QUIZ_ID, 10) : undefined;
const AUTO_WAIT_MS = parseInt(process.env.AUTO_WAIT_MS || '20000', 10);

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

// ===================== MODE=auto: matchmaking harness =====================
// Ramps concurrent AUTO-matchmaking searchers (no friend-match create/join),
// then PROVES the no-double-match invariant: every user receives at most one
// `auto_match_found`, and every matchId is reported by at most 2 distinct
// users. Also measures startSearch -> auto_match_found latency (p50/p95) and
// counts `auto_match_timeout`. See docs/MATCHMAKING.md for the design.
const autoStats = { connected: 0, connectErrors: 0, searching: 0, matched: 0, timeouts: 0, matchmakingErrors: 0 };
const autoSockets = [];
const matchIdToUsers = new Map();    // matchId -> Set<userId> (everyone who ever reported it)
const doubleMatchUsers = new Set();  // userIds that received auto_match_found more than once
const latenciesMs = [];

function connectAuto(userId) {
  return new Promise((resolve) => {
    const s = io(MATCH, { transports: ['websocket'], forceNew: true, reconnection: false, timeout: CONNECT_TIMEOUT_MS, path: SOCKET_PATH, rejectUnauthorized: process.env.INSECURE_TLS !== '1' });
    const st = { s, userId, searchStartMs: null, matchFoundCount: 0, matchId: null, latencyMs: null };
    let settled = false;
    const done = (val) => { if (!settled) { settled = true; resolve(val); } };
    s.on('connect', () => { autoStats.connected++; s.emit('authenticate', { userId, username: `u${userId}`, token: tokenFor(userId) }); });
    s.on('authenticated', () => done(st));
    s.on('connect_error', () => { autoStats.connectErrors++; done(null); });
    s.on('auth_error', () => { autoStats.connectErrors++; done(null); });
    s.on('matchmaking_error', (d) => { autoStats.matchmakingErrors++; console.error(`  ! matchmaking_error user=${userId}: ${d && d.message}`); });
    s.on('auto_match_timeout', () => { autoStats.timeouts++; });
    s.on('auto_match_found', (d) => {
      const mid = d && d.matchId;
      st.matchFoundCount++;
      if (st.matchFoundCount === 1) {
        st.matchId = mid;
        st.latencyMs = st.searchStartMs != null ? (Date.now() - st.searchStartMs) : null;
        if (st.latencyMs != null) latenciesMs.push(st.latencyMs);
        autoStats.matched++;
      } else {
        doubleMatchUsers.add(userId);
        console.error(`  !! DOUBLE MATCH: user=${userId} received auto_match_found #${st.matchFoundCount} (matchId=${mid})`);
      }
      let set = matchIdToUsers.get(mid);
      if (!set) { set = new Set(); matchIdToUsers.set(mid, set); }
      set.add(userId);
    });
    setTimeout(() => done(st), CONNECT_TIMEOUT_MS);
  });
}

async function startSearch(userId) {
  const st = await connectAuto(userId);
  if (!st) { autoStats.connectErrors++; return null; }
  autoSockets.push(st);
  autoStats.searching++;
  st.searchStartMs = Date.now();
  const payload = AUTO_QUIZ_ID ? { categoryId: CATEGORY_ID, quizId: AUTO_QUIZ_ID } : { categoryId: CATEGORY_ID };
  st.s.emit('start_auto_matchmaking', payload);
  return st;
}

function percentile(arr, p) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

// Best-effort: fetch MATCH_URL/metrics and print the matchmaking series so the
// operator can eyeball matches_found_total / queue_depth returning to 0.
// Skips quietly if the endpoint or series aren't available.
async function printMatchmakingMetrics() {
  try {
    let signal;
    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      signal = controller.signal;
    }
    const r = await fetch(`${MATCH}/metrics`, signal ? { signal } : undefined);
    if (!r.ok) return;
    const text = await r.text();
    const wanted = ['matchserver_matchmaking_queue_depth', 'matchserver_matchmaking_wait_seconds', 'matchserver_matchmaking_matches_found_total', 'matchserver_matchmaking_timeouts_total'];
    const lines = text.split('\n').filter(l => !l.startsWith('#') && wanted.some(w => l.startsWith(w)));
    console.log(`\n=== matchmaking metrics (${MATCH}/metrics) ===`);
    if (lines.length) lines.forEach(l => console.log('  ' + l));
    else console.log('  (no matchserver_matchmaking_* series found - may not be deployed on this server yet)');
  } catch (e) {
    console.log(`\n(skipped /metrics fetch: ${e && e.message})`);
  }
}

async function runAuto() {
  if (!CATEGORY_ID || Number.isNaN(CATEGORY_ID)) {
    console.error('MODE=auto requires CATEGORY_ID (a categories.id with active quizzes) so all searchers can pair.');
    console.error('Discover one, e.g.:');
    console.error(`  SELECT DISTINCT q.category_id, c.name FROM quizzes q`);
    console.error(`  JOIN categories c ON c.id = q.category_id WHERE q.is_active = true ORDER BY q.category_id;`);
    console.error('See docs/MATCHMAKING.md.');
    process.exit(1);
  }
  const total = NUM_MATCHES * 2;
  console.log(`=== LOAD (auto): ${NUM_MATCHES} intended matches / ${total} searchers via ${MATCH}${IS_TLS ? ' [TLS]' : ''} | categoryId=${CATEGORY_ID}${AUTO_QUIZ_ID ? ` quizId=${AUTO_QUIZ_ID}` : ''} | batch=${BATCH}/${BATCH_PAUSE_MS}ms ===`);
  const t0 = Date.now();
  for (let start = 1; start <= total; start += BATCH) {
    const wave = [];
    for (let i = start; i < start + BATCH && i <= total; i++) wave.push(startSearch(i + USER_OFFSET));
    await Promise.all(wave);
    if ((start - 1) % 400 === 0 || start + BATCH > total) {
      console.log(`  connected=${autoStats.connected} searching=${autoStats.searching} matched=${autoStats.matched} timeouts=${autoStats.timeouts} connectErrors=${autoStats.connectErrors} mmErrors=${autoStats.matchmakingErrors} | rss=${(process.memoryUsage().rss / 1048576).toFixed(0)}MB | ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    await sleep(BATCH_PAUSE_MS);
  }
  console.log(`\n=== RAMP DONE in ${((Date.now() - t0) / 1000).toFixed(0)}s - waiting ${AUTO_WAIT_MS / 1000}s for pairing/sweep to settle ===`);
  await sleep(AUTO_WAIT_MS);

  console.log(`\n=== AUTO RESULT ===`);
  console.log(`searching=${autoStats.searching} matched=${autoStats.matched} timeouts=${autoStats.timeouts} connectErrors=${autoStats.connectErrors} matchmakingErrors=${autoStats.matchmakingErrors}`);
  console.log(`unique matchIds=${matchIdToUsers.size} matchedSockets=${autoStats.matched} (expect matchedSockets == 2 x uniqueMatchIds when everything paired cleanly)`);
  const p50 = percentile(latenciesMs, 50), p95 = percentile(latenciesMs, 95);
  console.log(`wait latency (startSearch -> auto_match_found): p50=${p50 == null ? '-' : p50 + 'ms'} p95=${p95 == null ? '-' : p95 + 'ms'} n=${latenciesMs.length}`);

  const violations = [];
  if (doubleMatchUsers.size > 0) {
    violations.push(`${doubleMatchUsers.size} user(s) received auto_match_found more than once: [${[...doubleMatchUsers].slice(0, 20).join(',')}${doubleMatchUsers.size > 20 ? ',...' : ''}]`);
  }
  const overCrowded = [];
  for (const [mid, users] of matchIdToUsers) { if (users.size > 2) overCrowded.push(mid); }
  if (overCrowded.length) {
    violations.push(`${overCrowded.length} matchId(s) reported by >2 distinct users: [${overCrowded.slice(0, 10).join(',')}]`);
  }

  for (const c of autoSockets) { try { c.s.close(); } catch {} }
  await printMatchmakingMetrics();

  if (violations.length) {
    console.error('\n=== FAIL: no-double-match invariant VIOLATED ===');
    violations.forEach(v => console.error('  - ' + v));
    process.exit(1);
  }
  console.log('\n=== PASS: no-double-match invariant holds (every user matched at most once; every matchId held by <=2 users) ===');
  process.exit(0);
}

const pct = (n, d) => d ? ((n / d) * 100).toFixed(0) + '%' : '-';
(async () => {
  if (MODE === 'auto') {
    await runAuto();
    return;
  }
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
