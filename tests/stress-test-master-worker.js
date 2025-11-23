/**
 * MASTER-WORKER Architecture Stress Test
 * Tests the distributed match system with real load
 */

const { chromium } = require('playwright');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:8090';
const MATCH_SERVER_URL = process.env.MATCH_SERVER_URL || 'http://localhost:3001';

console.log('🌐 Configuration:');
console.log('  BASE_URL:', BASE_URL);
console.log('  API_URL:', API_URL);
console.log('  MATCH_SERVER:', MATCH_SERVER_URL);
console.log();

// Enhanced metrics
const metrics = {
  startTime: Date.now(),
  matchesCreated: 0,
  matchesJoined: 0,
  matchesStarted: 0,
  matchesCompleted: 0,
  answersSubmitted: 0,
  reconnections: 0,
  workerAssignments: new Map(), // Track which worker handled which match
  errors: [],
  timings: {
    matchCreation: [],
    matchJoin: [],
    matchCompletion: [],
    answerSubmission: []
  }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check master server health
async function checkMasterHealth() {
  try {
    const response = await axios.get(`${MATCH_SERVER_URL}/health`, { timeout: 5000 });
    const health = response.data;
    
    console.log('🏥 Master Server Health:');
    console.log(`   Status: ${health.status}`);
    console.log(`   Workers: ${health.workers?.totalWorkers || 'N/A'}`);
    console.log(`   Active Matches: ${health.matches || 'N/A'}`);
    console.log(`   Connected Players: ${health.players || 'N/A'}`);
    console.log();
    
    return health.status === 'OK';
  } catch (error) {
    console.error('❌ Master server not responding:', error.message);
    return false;
  }
}

// Get worker stats
async function getWorkerStats() {
  try {
    const response = await axios.get(`${MATCH_SERVER_URL}/workers/stats`, { timeout: 5000 });
    return response.data.data;
  } catch (error) {
    console.log('⚠️  Could not fetch worker stats:', error.message);
    return null;
  }
}

// Track match to worker assignment
async function trackMatchWorker(matchId) {
  try {
    // Get match details from Redis via API
    const response = await axios.get(`${API_URL}/api/matches/${matchId}`, {
      timeout: 3000
    }).catch(() => null);
    
    if (response?.data?.data?.workerId) {
      const workerId = response.data.data.workerId;
      if (!metrics.workerAssignments.has(workerId)) {
        metrics.workerAssignments.set(workerId, []);
      }
      metrics.workerAssignments.get(workerId).push(matchId);
    }
  } catch (error) {
    // Silently fail - this is just for metrics
  }
}

// Play a SINGLE match with timing
async function playSingleMatch(browser, matchNum, concurrent = false) {
  const matchStartTime = Date.now();
  const prefix = concurrent ? `[Match ${matchNum}]` : '';
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎮 ${prefix} MATCH ${matchNum} - START`);
  console.log(`${'='.repeat(60)}\n`);
  
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  let gameCode = '';
  let matchId = '';
  
  try {
    // === STEP 1: Login Both Players ===
    const loginStart = Date.now();
    console.log(`${prefix} 🌐 Logging in both players...`);
    
    await Promise.all([
      (async () => {
        await page1.goto(`${BASE_URL}/login`);
        await page1.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
        await page1.fill('input[type="email"], input[type="text"]', 'stresstest_1@test.com');
        await page1.fill('input[type="password"]', '1234567890');
        await page1.click('button:has-text("Sign in"), button[type="submit"]');
        await sleep(2000);
      })(),
      (async () => {
        await page2.goto(`${BASE_URL}/login`);
        await page2.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
        await page2.fill('input[type="email"], input[type="text"]', 'stresstest_2@test.com');
        await page2.fill('input[type="password"]', '1234567890');
        await page2.click('button:has-text("Sign in"), button[type="submit"]');
        await sleep(2000);
      })()
    ]);
    
    console.log(`${prefix} ✅ Both players logged in (${Date.now() - loginStart}ms)`);
    
    // === STEP 2: Navigate to Quiz Page ===
    await Promise.all([
      page1.goto(`${BASE_URL}/student-quiz`, { waitUntil: 'networkidle' }),
      page2.goto(`${BASE_URL}/student-quiz`, { waitUntil: 'networkidle' })
    ]);
    await sleep(2000);
    
    // === STEP 3: Player 1 Creates Match ===
    const createStart = Date.now();
    console.log(`${prefix} 🎲 Player 1: Creating match...`);
    
    // Select quiz
    const quizCards1 = await page1.$$('div[class*="border"][class*="rounded"]');
    if (quizCards1.length === 0) throw new Error('No quiz cards found');
    await quizCards1[0].click();
    await sleep(1500);
    
    // Open game mode selector
    await page1.click('button:has-text("Choose how you want to play")');
    await sleep(800);
    
    // Select Play with Friend
    await page1.click('[role="option"]:has-text("Play with Friend")');
    await sleep(500);
    
    // Click PLAY button
    const playButton = await page1.locator('button:has-text("PLAY")').last();
    await playButton.click({ force: true });
    await sleep(3000);
    
    // Wait for modal
    await page1.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await sleep(800);
    
    // Generate code
    await page1.click('button:has-text("Generate Game Code")');
    await sleep(2500);
    
    // Extract code
    gameCode = await page1.locator('div.font-mono.font-bold').innerText();
    console.log(`${prefix} ✅ Game code: ${gameCode} (${Date.now() - createStart}ms)`);
    
    metrics.matchesCreated++;
    metrics.timings.matchCreation.push(Date.now() - createStart);
    
    // Track worker assignment
    await trackMatchWorker(gameCode);
    
    // Start waiting for friend
    await page1.click('button:has-text("Start Game & Wait for Friend")');
    await sleep(1500);
    
    // === STEP 4: Player 2 Joins ===
    const joinStart = Date.now();
    console.log(`${prefix} 🔑 Player 2: Joining match...`);
    
    // Select quiz
    const quizCards2 = await page2.$$('div[class*="border"][class*="rounded"]');
    if (quizCards2.length === 0) throw new Error('No quiz cards found for Player 2');
    await quizCards2[0].click();
    await sleep(1500);
    
    // Open game mode selector
    await page2.click('button:has-text("Choose how you want to play")');
    await sleep(800);
    
    // Select Play with Friend
    await page2.click('[role="option"]:has-text("Play with Friend")');
    await sleep(500);
    
    // Click PLAY
    const playButton2 = await page2.locator('button:has-text("PLAY")').last();
    await playButton2.click({ force: true });
    await sleep(3000);
    
    // Wait for modal and switch to Enter Code
    await page2.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await sleep(800);
    await page2.click('button:has-text("Enter Code")');
    await sleep(500);
    
    // Enter code and join
    await page2.fill('input[placeholder*="Enter"][placeholder*="code"]', gameCode);
    await sleep(400);
    await page2.click('button:has-text("Join Game")');
    await sleep(2500);
    
    console.log(`${prefix} ✅ Player 2 joined (${Date.now() - joinStart}ms)`);
    metrics.matchesJoined++;
    metrics.timings.matchJoin.push(Date.now() - joinStart);
    
    // === STEP 5: Wait for Quiz Start ===
    console.log(`${prefix} ⏳ Waiting for quiz to start...`);
    await sleep(4000);
    
    // Check for start buttons
    const startButtons = [
      'button:has-text("Start")',
      'button:has-text("Ready")',
      'button:has-text("Begin")'
    ];
    
    for (const selector of startButtons) {
      const btn1 = await page1.$(selector);
      const btn2 = await page2.$(selector);
      if (btn1) await btn1.click().catch(() => {});
      if (btn2) await btn2.click().catch(() => {});
      await sleep(500);
    }
    
    // Wait for questions
    const quizStarted = await Promise.race([
      Promise.all([
        page1.waitForSelector('input[type="radio"]', { timeout: 15000 }),
        page2.waitForSelector('input[type="radio"]', { timeout: 15000 })
      ]).then(() => true),
      sleep(20000).then(() => false)
    ]);
    
    if (!quizStarted) {
      await page1.screenshot({ path: `error-match${matchNum}-p1.png` });
      await page2.screenshot({ path: `error-match${matchNum}-p2.png` });
      throw new Error('Quiz did not start');
    }
    
    metrics.matchesStarted++;
    console.log(`${prefix} ✅ Quiz started!`);
    
    // === STEP 6: Play Questions ===
    for (let q = 1; q <= 10; q++) {
      const answerStart = Date.now();
      
      if (!concurrent) {
        console.log(`${prefix}   📝 Question ${q}/10`);
      }
      
      // Both players answer in parallel
      const results = await Promise.allSettled([
        answerQuestion(page1, 'P1', q, prefix),
        answerQuestion(page2, 'P2', q, prefix)
      ]);
      
      const answerTime = Date.now() - answerStart;
      metrics.timings.answerSubmission.push(answerTime);
      
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value === true) {
          metrics.answersSubmitted++;
        }
      });
      
      if (q === 10) {
        await sleep(3000);
      } else {
        await sleep(1500);
      }
    }
    
    // === STEP 7: Wait for Completion ===
    console.log(`${prefix} ⏳ Waiting for match completion...`);
    await sleep(4000);
    
    const totalTime = Date.now() - matchStartTime;
    metrics.timings.matchCompletion.push(totalTime);
    metrics.matchesCompleted++;
    
    console.log(`${prefix} ✅ Match completed in ${(totalTime / 1000).toFixed(1)}s`);
    
    return true;
    
  } catch (error) {
    console.error(`${prefix} ❌ Match ${matchNum} failed:`, error.message);
    metrics.errors.push({ 
      matchNum, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return false;
  } finally {
    await context1.close();
    await context2.close();
  }
}

// Answer question (simplified)
async function answerQuestion(page, playerName, questionNum, prefix = '') {
  try {
    await page.waitForSelector('input[type="radio"]', { timeout: 4000 });
    await sleep(300);
    
    const radios = await page.locator('input[type="radio"]').all();
    if (radios.length === 0) return false;
    
    const randomIndex = Math.floor(Math.random() * radios.length);
    await radios[randomIndex].click({ force: true });
    await sleep(200);
    
    let clicked = false;
    
    if (questionNum === 10) {
      const submitBtn = page.locator('div.flex.justify-end button').last();
      await submitBtn.click({ force: true, timeout: 2000 });
      clicked = true;
    } else {
      const nextBtn = page.locator('button:has-text("Next Question")');
      if (await nextBtn.isVisible({ timeout: 1000 })) {
        await nextBtn.click({ timeout: 2000 });
        clicked = true;
      }
    }
    
    return clicked;
    
  } catch (error) {
    return false;
  }
}

// Calculate percentile
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

// Sequential test mode
async function runSequentialTest(numMatches) {
  console.log('\n' + '='.repeat(70));
  console.log(`🚀 SEQUENTIAL STRESS TEST: ${numMatches} Matches`);
  console.log('='.repeat(70));
  console.log('\n⏱️  Estimated time: ~3 minutes per match');
  console.log('📊 Tests worker distribution and load balancing\n');
  
  // Check master health
  const healthy = await checkMasterHealth();
  if (!healthy) {
    throw new Error('Master server not healthy');
  }
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox']
  });
  
  let successCount = 0;
  
  try {
    for (let i = 1; i <= numMatches; i++) {
      const success = await playSingleMatch(browser, i, false);
      if (success) successCount++;
      
      // Check worker stats every 5 matches
      if (i % 5 === 0) {
        const stats = await getWorkerStats();
        if (stats) {
          console.log(`\n📊 Worker Pool Status (after ${i} matches):`);
          console.log(`   Total Workers: ${stats.totalWorkers}`);
          console.log(`   Active Workers: ${stats.activeWorkers}`);
          console.log(`   Idle Workers: ${stats.idleWorkers}`);
          console.log(`   Total Matches: ${stats.totalMatches}`);
          console.log(`   Total Players: ${stats.totalPlayers}\n`);
        }
      }
      
      if (i < numMatches) {
        await sleep(1000);
      }
    }
  } finally {
    await browser.close();
  }
  
  await printFinalReport(numMatches, successCount);
}

// Concurrent test mode (NEW!)
async function runConcurrentTest(numMatches, concurrency = 5) {
  console.log('\n' + '='.repeat(70));
  console.log(`🚀 CONCURRENT STRESS TEST: ${numMatches} Matches (${concurrency} at a time)`);
  console.log('='.repeat(70));
  console.log('\n⚡ This tests true parallel load on the master-worker system');
  console.log(`📊 Expected to complete in ~${Math.ceil(numMatches / concurrency * 3)} minutes\n`);
  
  // Check master health
  const healthy = await checkMasterHealth();
  if (!healthy) {
    throw new Error('Master server not healthy');
  }
  
  const browsers = [];
  let successCount = 0;
  
  try {
    // Launch multiple browsers for parallel execution
    for (let i = 0; i < concurrency; i++) {
      const browser = await chromium.launch({
        headless: true,
        args: ['--disable-dev-shm-usage', '--no-sandbox']
      });
      browsers.push(browser);
    }
    
    // Create batches of matches
    const batches = [];
    for (let i = 0; i < numMatches; i += concurrency) {
      const batch = [];
      for (let j = 0; j < concurrency && i + j < numMatches; j++) {
        batch.push(i + j + 1);
      }
      batches.push(batch);
    }
    
    // Run batches
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      console.log(`\n🔄 Starting batch ${batchIdx + 1}/${batches.length} (Matches: ${batch.join(', ')})`);
      
      const batchStart = Date.now();
      
      // Run matches in parallel
      const results = await Promise.allSettled(
        batch.map((matchNum, idx) => 
          playSingleMatch(browsers[idx % browsers.length], matchNum, true)
        )
      );
      
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value === true) {
          successCount++;
        }
      });
      
      const batchTime = (Date.now() - batchStart) / 1000;
      console.log(`✅ Batch ${batchIdx + 1} completed in ${batchTime.toFixed(1)}s`);
      
      // Check worker stats after each batch
      const stats = await getWorkerStats();
      if (stats) {
        console.log(`📊 Workers: ${stats.activeWorkers}/${stats.totalWorkers} active, Matches: ${stats.totalMatches}, Players: ${stats.totalPlayers}`);
      }
      
      if (batchIdx < batches.length - 1) {
        await sleep(2000); // Small delay between batches
      }
    }
    
  } finally {
    // Close all browsers
    await Promise.all(browsers.map(b => b.close()));
  }
  
  await printFinalReport(numMatches, successCount);
}

// Print final report
async function printFinalReport(numMatches, successCount) {
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(70));
  
  console.log(`\n⏱️  Total Duration: ${elapsed.toFixed(1)}s (${(elapsed / 60).toFixed(1)} minutes)`);
  console.log(`⚡  Average per match: ${(elapsed / numMatches).toFixed(1)}s`);
  
  console.log(`\n📊 Match Statistics:`);
  console.log(`   ✅ Matches Attempted: ${numMatches}`);
  console.log(`   ✅ Matches Created: ${metrics.matchesCreated}`);
  console.log(`   ✅ Matches Started: ${metrics.matchesStarted}`);
  console.log(`   ✅ Matches Completed: ${metrics.matchesCompleted}`);
  console.log(`   📝 Answers Submitted: ${metrics.answersSubmitted} / ${numMatches * 20}`);
  console.log(`   🔄 Reconnections: ${metrics.reconnections}`);
  console.log(`   ❌ Errors: ${metrics.errors.length}`);
  console.log(`   ✅ Success Rate: ${Math.round(successCount / numMatches * 100)}%`);
  
  // Timing statistics
  if (metrics.timings.matchCreation.length > 0) {
    console.log(`\n⏱️  Timing Statistics (milliseconds):`);
    console.log(`   Match Creation:`);
    console.log(`      Min: ${Math.min(...metrics.timings.matchCreation)}ms`);
    console.log(`      Avg: ${Math.round(metrics.timings.matchCreation.reduce((a, b) => a + b) / metrics.timings.matchCreation.length)}ms`);
    console.log(`      Max: ${Math.max(...metrics.timings.matchCreation)}ms`);
    console.log(`      P95: ${percentile(metrics.timings.matchCreation, 95)}ms`);
    
    console.log(`   Match Join:`);
    console.log(`      Min: ${Math.min(...metrics.timings.matchJoin)}ms`);
    console.log(`      Avg: ${Math.round(metrics.timings.matchJoin.reduce((a, b) => a + b) / metrics.timings.matchJoin.length)}ms`);
    console.log(`      Max: ${Math.max(...metrics.timings.matchJoin)}ms`);
    console.log(`      P95: ${percentile(metrics.timings.matchJoin, 95)}ms`);
    
    console.log(`   Full Match Completion:`);
    console.log(`      Min: ${Math.min(...metrics.timings.matchCompletion)}ms`);
    console.log(`      Avg: ${Math.round(metrics.timings.matchCompletion.reduce((a, b) => a + b) / metrics.timings.matchCompletion.length)}ms`);
    console.log(`      Max: ${Math.max(...metrics.timings.matchCompletion)}ms`);
    console.log(`      P95: ${percentile(metrics.timings.matchCompletion, 95)}ms`);
  }
  
  // Worker distribution
  if (metrics.workerAssignments.size > 0) {
    console.log(`\n🏭 Worker Distribution:`);
    console.log(`   Total Workers Used: ${metrics.workerAssignments.size}`);
    const matchesPerWorker = Array.from(metrics.workerAssignments.values()).map(m => m.length);
    console.log(`   Matches per Worker:`);
    console.log(`      Min: ${Math.min(...matchesPerWorker)}`);
    console.log(`      Avg: ${Math.round(matchesPerWorker.reduce((a, b) => a + b) / matchesPerWorker.length)}`);
    console.log(`      Max: ${Math.max(...matchesPerWorker)}`);
  }
  
  // Errors
  if (metrics.errors.length > 0) {
    console.log(`\n❌ Errors (showing first 10):`);
    metrics.errors.slice(0, 10).forEach((err, i) => {
      console.log(`   ${i + 1}. Match ${err.matchNum}: ${err.error}`);
    });
  }
  
  // Final worker stats
  const finalStats = await getWorkerStats();
  if (finalStats) {
    console.log(`\n🏭 Final Worker Pool Status:`);
    console.log(`   Total Workers: ${finalStats.totalWorkers}`);
    console.log(`   Active Workers: ${finalStats.activeWorkers}`);
    console.log(`   Idle Workers: ${finalStats.idleWorkers}`);
    console.log(`   Active Matches: ${finalStats.totalMatches}`);
    console.log(`   Connected Players: ${finalStats.totalPlayers}`);
    
    if (finalStats.workers && finalStats.workers.length > 0) {
      console.log(`\n   Worker Details (showing first 10):`);
      finalStats.workers.slice(0, 10).forEach(w => {
        console.log(`      Worker ${w.workerId} (PID ${w.pid}): ${w.matchCount}/${w.capacity} matches (${w.utilization})`);
      });
    }
  }
  
  // Database verification
  await verifyDatabase();
  
  console.log('\n✨ Test complete!\n');
}

// Verify database
async function verifyDatabase() {
  console.log('\n🔍 Checking database...');
  try {
    const adminResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin5@engineering.edu',
      password: '1234567890'
    });
    const token = adminResponse.data.token || adminResponse.data.data?.token;
    
    if (!token) {
      throw new Error('Admin login failed');
    }
    
    const response = await axios.get(`${API_URL}/api/performance/friend-matches`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const dbMatches = response.data.data || [];
    const dbCompleted = dbMatches.filter(m => m.match.status === 'COMPLETED').length;
    
    console.log(`\n💾 DATABASE VERIFICATION:`);
    console.log(`   Total matches in DB: ${dbMatches.length}`);
    console.log(`   Completed in DB: ${dbCompleted}`);
    console.log(`   Test completed: ${metrics.matchesCompleted}`);
    
    const saveRate = Math.round(dbCompleted / metrics.matchesCompleted * 100);
    if (saveRate >= 80) {
      console.log(`   ✅ Save rate: ${saveRate}%`);
    } else {
      console.log(`   ⚠️  Low save rate: ${saveRate}% - Check workers!`);
    }
  } catch (error) {
    console.log(`   ❌ Could not verify database: ${error.message}`);
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'sequential'; // 'sequential' or 'concurrent'
  const numMatches = parseInt(args[1]) || 5;
  const concurrency = parseInt(args[2]) || 5;
  
  console.log(`\n🎯 Test Mode: ${mode.toUpperCase()}`);
  
  const testFn = mode === 'concurrent' 
    ? () => runConcurrentTest(numMatches, concurrency)
    : () => runSequentialTest(numMatches);
  
  testFn()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runSequentialTest, runConcurrentTest };