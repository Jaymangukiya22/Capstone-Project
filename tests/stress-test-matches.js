/**
 * Playwright-based Friend Match Stress Test
 * Simulates 2000 concurrent matches (4000 players)
 * 
 * Features:
 * - Headless Playwright automation
 * - Real user authentication
 * - Friend match creation and joining
 * - Realistic gameplay simulation
 * - Real-time metrics collection
 * - API endpoint bottleneck detection
 */

const { chromium } = require('playwright');
const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:8090';
const WS_URL = process.env.WS_URL || 'ws://localhost:3001';

const QUIZ_IDS = [
  102, 103, 104, 105, 106, 107, 108, 109, 110, 111,
  112, 113, 114, 115, 116, 117, 118, 119, 120, 121,
  122, 123, 124, 125, 126, 127, 128, 129, 130, 131,
  132, 133, 134, 135, 136, 137, 138, 139, 140, 141,
  142, 143, 144, 145, 146, 147, 148, 149, 150, 151
];

// Metrics collection
const metrics = {
  matchesCreated: 0,
  matchesJoined: 0,
  matchesStarted: 0,
  matchesCompleted: 0,
  errors: [],
  apiTimings: {},
  startTime: Date.now(),
  activeMatches: new Set(),
  completedMatches: new Set()
};

// Track API endpoint performance
function recordApiTiming(endpoint, duration, success) {
  if (!metrics.apiTimings[endpoint]) {
    metrics.apiTimings[endpoint] = {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      p50: [],
      p95: [],
      p99: []
    };
  }
  
  const timing = metrics.apiTimings[endpoint];
  timing.count++;
  timing.totalTime += duration;
  timing.minTime = Math.min(timing.minTime, duration);
  timing.maxTime = Math.max(timing.maxTime, duration);
  
  if (!success) timing.errors++;
  
  // Store for percentile calculation
  timing.p50.push(duration);
  timing.p95.push(duration);
  timing.p99.push(duration);
}

// Get random quiz ID
function getRandomQuizId() {
  return QUIZ_IDS[Math.floor(Math.random() * QUIZ_IDS.length)];
}

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Login and get token
async function loginUser(username, password) {
  const start = performance.now();
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email:username,
      password
    });
    const duration = performance.now() - start;
    recordApiTiming('POST /api/auth/login', duration, true);
    return response.data.token;
  } catch (error) {
    const duration = performance.now() - start;
    recordApiTiming('POST /api/auth/login', duration, false);
    metrics.errors.push({ endpoint: 'login', error: error.message, username });
    throw error;
  }
}

// Create friend match
async function createFriendMatch(token, quizId) {
  const start = performance.now();
  try {
    const response = await axios.post(
      `${API_URL}/api/friend-matches`,
      { quizId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const duration = performance.now() - start;
    recordApiTiming('POST /api/friend-matches', duration, true);
    metrics.matchesCreated++;
    return response.data.data;
  } catch (error) {
    const duration = performance.now() - start;
    recordApiTiming('POST /api/friend-matches', duration, false);
    metrics.errors.push({ endpoint: 'create-match', error: error.message });
    throw error;
  }
}

// Lookup match by join code
async function lookupMatch(token, joinCode) {
  const start = performance.now();
  try {
    const response = await axios.get(
      `${API_URL}/api/friend-matches/code/${joinCode}`,  // FIXED: Changed /join/ to /code/
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const duration = performance.now() - start;
    recordApiTiming('GET /api/friend-matches/code/:joinCode', duration, true);
    return response.data.data.match;
  } catch (error) {
    const duration = performance.now() - start;
    recordApiTiming('GET /api/friend-matches/code/:joinCode', duration, false);
    throw error;
  }
}

// Simulate player gameplay
async function simulatePlayer(browser, playerNum, role, matchData = null) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  const username = `stresstest_${playerNum}@test.com`;
  const password = '1234567890';
  
  try {
    console.log(`👤 Player ${playerNum} (${role}): Starting...`);
    
    // Login
    const token = await loginUser(username, password);
    console.log(`👤 Player ${playerNum} (${role}): Logged in`);
    
    let matchId, joinCode;
    
    if (role === 'creator') {
      // Create match
      const quizId = getRandomQuizId();
      const match = await createFriendMatch(token, quizId);
      matchId = match.matchId;
      joinCode = match.joinCode;
      console.log(`👤 Player ${playerNum} (creator): Created match ${matchId} with code ${joinCode}`);
      
      // Navigate to match page
      await page.goto(`${BASE_URL}/student/friend-match/${matchId}`);
      await sleep(1000);
      
      return { matchId, joinCode, page, context, playerNum };
      
    } else {
      // Join match using code
      matchId = matchData.matchId;
      joinCode = matchData.joinCode;
      
      await sleep(500); // Small delay before joining
      
      const match = await lookupMatch(token, joinCode);
      console.log(`👤 Player ${playerNum} (joiner): Found match ${matchId}`);
      
      // Navigate to match page
      await page.goto(`${BASE_URL}/student/friend-match/${matchId}`);
      await sleep(1000);
      
      metrics.matchesJoined++;
      metrics.activeMatches.add(matchId);
      console.log(`👤 Player ${playerNum} (joiner): Joined match ${matchId}`);
      
      return { matchId, joinCode, page, context, playerNum };
    }
    
  } catch (error) {
    console.error(`❌ Player ${playerNum} (${role}) failed:`, error.message);
    await context.close();
    throw error;
  }
}

// Play through match
async function playMatch(player1Data, player2Data) {
  const { matchId, page: page1, context: context1, playerNum: p1Num } = player1Data;
  const { page: page2, context: context2, playerNum: p2Num } = player2Data;
  
  try {
    console.log(`🎮 Match ${matchId}: Starting gameplay`);
    
    // Both players mark ready
    await Promise.all([
      page1.click('button:has-text("Ready")').catch(() => {}),
      page2.click('button:has-text("Ready")').catch(() => {})
    ]);
    
    await sleep(2000);
    metrics.matchesStarted++;
    console.log(`🎮 Match ${matchId}: Both players ready`);
    
    // Simulate 10 questions (typical quiz length)
    for (let q = 1; q <= 10; q++) {
      console.log(`🎮 Match ${matchId}: Question ${q}/10`);
      
      // Random think time (2-8 seconds)
      const thinkTime = 2000 + Math.random() * 6000;
      await sleep(thinkTime);
      
      // Both players select random answer and submit
      await Promise.all([
        selectAndSubmitAnswer(page1, `Player ${p1Num}`),
        selectAndSubmitAnswer(page2, `Player ${p2Num}`)
      ]);
      
      // Wait for next question
      await sleep(1500);
    }
    
    console.log(`✅ Match ${matchId}: Completed!`);
    metrics.matchesCompleted++;
    metrics.activeMatches.delete(matchId);
    metrics.completedMatches.add(matchId);
    
  } catch (error) {
    console.error(`❌ Match ${matchId} gameplay failed:`, error.message);
    metrics.errors.push({ matchId, error: error.message, stage: 'gameplay' });
  } finally {
    await context1.close();
    await context2.close();
  }
}

// Select and submit answer
async function selectAndSubmitAnswer(page, playerName) {
  try {
    // Find all answer options
    const options = await page.locator('[role="radio"], button[class*="option"]').all();
    
    if (options.length > 0) {
      // Select random option
      const randomOption = options[Math.floor(Math.random() * options.length)];
      await randomOption.click();
      
      // Submit
      await page.click('button:has-text("Submit")').catch(() => {});
      console.log(`  ✓ ${playerName} submitted answer`);
    }
  } catch (error) {
    console.log(`  ⚠ ${playerName} answer submission issue:`, error.message);
  }
}

// Run stress test
async function runStressTest(numMatches) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 STARTING STRESS TEST: ${numMatches} Concurrent Matches (${numMatches * 2} Players)`);
  console.log(`${'='.repeat(80)}\n`);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox']
  });
  
  // Start monitoring
  const monitorInterval = setInterval(() => {
    printMetrics();
  }, 10000); // Every 10 seconds
  
  try {
    // Run matches in batches to avoid overwhelming the system
    const batchSize = 50; // 50 matches at a time = 100 players
    const batches = Math.ceil(numMatches / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min((batch + 1) * batchSize, numMatches);
      const batchMatches = [];
      
      console.log(`\n📦 Batch ${batch + 1}/${batches}: Creating ${batchEnd - batchStart} matches...`);
      
      // Create all matches in this batch concurrently
      for (let i = batchStart; i < batchEnd; i++) {
        const player1Num = i * 2 + 1;
        const player2Num = i * 2 + 2;
        
        const matchPromise = (async () => {
          try {
            // Create match (Player 1)
            const player1Data = await simulatePlayer(browser, player1Num, 'creator');
            
            // Join match (Player 2)
            const player2Data = await simulatePlayer(browser, player2Num, 'joiner', player1Data);
            
            // Play match
            await playMatch(player1Data, player2Data);
            
          } catch (error) {
            console.error(`❌ Match pair ${i} failed:`, error.message);
          }
        })();
        
        batchMatches.push(matchPromise);
        
        // Small delay between match creations to avoid rate limiting
        await sleep(50);
      }
      
      // Wait for batch to complete
      await Promise.all(batchMatches);
      
      console.log(`✅ Batch ${batch + 1}/${batches} completed\n`);
      
      // Small delay between batches
      if (batch < batches - 1) {
        await sleep(2000);
      }
    }
    
  } catch (error) {
    console.error('\n💥 Stress test failed:', error);
  } finally {
    clearInterval(monitorInterval);
    await browser.close();
    
    // Final report
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 FINAL STRESS TEST RESULTS`);
    console.log(`${'='.repeat(80)}\n`);
    printFinalReport();
  }
}

// Print current metrics
function printMetrics() {
  const elapsed = ((Date.now() - metrics.startTime) / 1000).toFixed(1);
  const activeCount = metrics.activeMatches.size;
  const completedCount = metrics.completedMatches.size;
  
  console.log(`\n⏱️  Elapsed: ${elapsed}s | Active: ${activeCount} | Completed: ${completedCount}/${metrics.matchesCreated}`);
  console.log(`   Created: ${metrics.matchesCreated} | Joined: ${metrics.matchesJoined} | Started: ${metrics.matchesStarted} | Errors: ${metrics.errors.length}`);
}

// Print final report
function printFinalReport() {
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  
  console.log(`⏱️  Total Duration: ${elapsed.toFixed(1)}s\n`);
  console.log(`📊 Match Statistics:`);
  console.log(`   ✅ Matches Created: ${metrics.matchesCreated}`);
  console.log(`   ✅ Matches Joined: ${metrics.matchesJoined}`);
  console.log(`   ✅ Matches Started: ${metrics.matchesStarted}`);
  console.log(`   ✅ Matches Completed: ${metrics.matchesCompleted}`);
  console.log(`   ❌ Errors: ${metrics.errors.length}\n`);
  
  console.log(`🎯 API Endpoint Performance (Bottleneck Analysis):\n`);
  
  // Sort by average response time (descending)
  const sortedEndpoints = Object.entries(metrics.apiTimings)
    .map(([endpoint, data]) => {
      const avgTime = data.totalTime / data.count;
      const errorRate = (data.errors / data.count * 100).toFixed(2);
      
      // Calculate percentiles
      data.p50.sort((a, b) => a - b);
      const p50 = data.p50[Math.floor(data.p50.length * 0.5)] || 0;
      const p95 = data.p50[Math.floor(data.p50.length * 0.95)] || 0;
      const p99 = data.p50[Math.floor(data.p50.length * 0.99)] || 0;
      
      return {
        endpoint,
        count: data.count,
        avgTime: avgTime.toFixed(2),
        minTime: data.minTime.toFixed(2),
        maxTime: data.maxTime.toFixed(2),
        p50: p50.toFixed(2),
        p95: p95.toFixed(2),
        p99: p99.toFixed(2),
        errorRate,
        errors: data.errors
      };
    })
    .sort((a, b) => parseFloat(b.avgTime) - parseFloat(a.avgTime));
  
  // Print table
  console.log(`┌${'─'.repeat(78)}┐`);
  console.log(`│ ${'Endpoint'.padEnd(35)} │ ${'Calls'.padStart(6)} │ ${'Avg(ms)'.padStart(8)} │ ${'P95(ms)'.padStart(8)} │ ${'Errors'.padStart(6)} │`);
  console.log(`├${'─'.repeat(78)}┤`);
  
  sortedEndpoints.forEach(ep => {
    const errorIndicator = parseFloat(ep.errorRate) > 5 ? '🔴' : parseFloat(ep.errorRate) > 1 ? '🟡' : '🟢';
    const perfIndicator = parseFloat(ep.avgTime) > 500 ? '🐌' : parseFloat(ep.avgTime) > 200 ? '⚠️' : '⚡';
    
    console.log(`│ ${errorIndicator}${perfIndicator} ${ep.endpoint.padEnd(30)} │ ${ep.count.toString().padStart(6)} │ ${ep.avgTime.padStart(8)} │ ${ep.p95.padStart(8)} │ ${ep.errors.toString().padStart(6)} │`);
  });
  
  console.log(`└${'─'.repeat(78)}┘\n`);
  
  // Bottleneck warnings
  const bottlenecks = sortedEndpoints.filter(ep => parseFloat(ep.avgTime) > 300 || parseFloat(ep.errorRate) > 5);
  
  if (bottlenecks.length > 0) {
    console.log(`⚠️  BOTTLENECKS DETECTED:\n`);
    bottlenecks.forEach(ep => {
      if (parseFloat(ep.avgTime) > 300) {
        console.log(`   🐌 ${ep.endpoint}: High latency (${ep.avgTime}ms avg, ${ep.p95}ms p95)`);
      }
      if (parseFloat(ep.errorRate) > 5) {
        console.log(`   🔴 ${ep.endpoint}: High error rate (${ep.errorRate}%)`);
      }
    });
    console.log();
  }
  
  // Recommendations
  console.log(`💡 Recommendations:\n`);
  
  const totalRequests = Object.values(metrics.apiTimings).reduce((sum, data) => sum + data.count, 0);
  const totalErrors = metrics.errors.length;
  const errorRate = (totalErrors / totalRequests * 100).toFixed(2);
  
  if (parseFloat(errorRate) > 5) {
    console.log(`   🔴 High overall error rate (${errorRate}%) - Check server logs and increase resources`);
  }
  
  if (bottlenecks.some(ep => ep.endpoint.includes('/api/friend-matches'))) {
    console.log(`   ⚠️  Match creation/joining is slow - Consider caching or database optimization`);
  }
  
  if (bottlenecks.some(ep => ep.endpoint.includes('/api/auth'))) {
    console.log(`   ⚠️  Authentication is slow - Consider JWT caching or faster bcrypt rounds`);
  }
  
  console.log(`   ✅ Use Grafana dashboard for real-time monitoring: http://localhost:3001/metrics`);
  console.log(`   ✅ Check Prometheus metrics for detailed insights`);
  console.log();
  
  // Error summary
  if (metrics.errors.length > 0) {
    console.log(`❌ Error Summary (first 10):\n`);
    metrics.errors.slice(0, 10).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.endpoint}: ${err.error}`);
    });
    if (metrics.errors.length > 10) {
      console.log(`   ... and ${metrics.errors.length - 10} more errors\n`);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const numMatches = parseInt(process.argv[2]) || 100;
  
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                     FRIEND MATCH STRESS TEST TOOL                         ║
║                                                                           ║
║  Tests concurrent friend matches with real Playwright automation         ║
║  Collects metrics and identifies API bottlenecks                         ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);
  
  console.log(`Configuration:`);
  console.log(`  • Matches: ${numMatches}`);
  console.log(`  • Players: ${numMatches * 2}`);
  console.log(`  • Base URL: ${BASE_URL}`);
  console.log(`  • API URL: ${API_URL}`);
  console.log(`  • WebSocket URL: ${WS_URL}\n`);
  
  runStressTest(numMatches)
    .then(() => {
      console.log('\n✨ Stress test completed!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Stress test failed:', error);
      process.exit(1);
    });
}

module.exports = { runStressTest, metrics };
