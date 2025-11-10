/**
 * ULTIMATE STRESS TEST - Production-Ready Friend Match Testing
 * 
 * Supports: 10, 15, 20, 30, 50, 100, 200, 500, 1000, 2000 concurrent matches
 * Uses: 2000 pre-seeded test users (stresstest_1@test.com to stresstest_2000@test.com)
 * Password: password123
 * 
 * Features:
 * - Real UI flow (modal, game code generation, join)
 * - Build-safe selectors
 * - Smart batching to prevent overwhelming system
 * - Resource monitoring
 * - Bottleneck detection
 * - Grafana-compatible metrics export
 * - Database verification
 */

const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
const os = require('os');

const BASE_URL = process.env.BASE_URL || 'https://quizdash.dpdns.org';
const API_URL = process.env.API_URL || 'https://api.quizdash.dpdns.org';

// Test configurations for different scales
const TEST_CONFIGS = {
  10: { batch: 5, delay: 1000 },
  15: { batch: 5, delay: 1000 },
  20: { batch: 10, delay: 1500 },
  30: { batch: 10, delay: 1500 },
  50: { batch: 10, delay: 2000 },
  100: { batch: 20, delay: 2000 },
  200: { batch: 25, delay: 2500 },
  500: { batch: 50, delay: 3000 },
  1000: { batch: 100, delay: 3000 },
  2000: { batch: 200, delay: 4000 }
};

// Metrics collection
const metrics = {
  startTime: Date.now(),
  matchesCreated: 0,
  matchesStarted: 0,
  matchesCompleted: 0,
  answersSubmitted: 0,
  errors: [],
  timings: {
    login: [],
    matchCreate: [],
    matchJoin: [],
    quizStart: [],
    questionAnswer: [],
    matchComplete: []
  },
  resources: {
    cpu: [],
    memory: [],
    network: []
  },
  bottlenecks: []
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get user pair for match
function getUserPair(matchNum) {
  const offset = (matchNum - 1) * 2;
  return {
    player1: {
      email: `stresstest_${offset + 1}@test.com`,
      password: 'password123'
    },
    player2: {
      email: `stresstest_${offset + 2}@test.com`,
      password: 'password123'
    }
  };
}

// Measure resource usage
function captureResources() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    timestamp: Date.now(),
    cpu: {
      count: cpus.length,
      model: cpus[0].model,
      usage: cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b);
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total * 100);
      }, 0) / cpus.length
    },
    memory: {
      total: Math.round(totalMem / 1024 / 1024),
      used: Math.round(usedMem / 1024 / 1024),
      free: Math.round(freeMem / 1024 / 1024),
      usage: ((usedMem / totalMem) * 100).toFixed(2)
    },
    node: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  };
}

// Play a single match using real UI flow
async function playSingleMatch(browser, matchNum, users) {
  const startTime = Date.now();
  let gameCode = '';
  
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  try {
    // === LOGIN PHASE ===
    const loginStart = Date.now();
    
    // Login Player 1
    await page1.goto(`${BASE_URL}/login`, { timeout: 30000 });
    await page1.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    await page1.fill('input[type="email"], input[type="text"]', users.player1.email);
    await page1.fill('input[type="password"]', users.player1.password);
    await page1.click('button:has-text("Sign in")');
    await sleep(3000);
    
    // Login Player 2
    await page2.goto(`${BASE_URL}/login`, { timeout: 30000 });
    await page2.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    await page2.fill('input[type="email"], input[type="text"]', users.player2.email);
    await page2.fill('input[type="password"]', users.player2.password);
    await page2.click('button:has-text("Sign in")');
    await sleep(3000);
    
    metrics.timings.login.push(Date.now() - loginStart);
    
    // === MATCH CREATION PHASE ===
    const createStart = Date.now();
    
    // Player 1: Select quiz and create match
    await page1.click('div.rounded-lg.border-2, div[class*="border"][class*="rounded"]', { timeout: 10000 });
    await sleep(1000);
    
    await page1.waitForSelector('button:has-text("Choose how you want to play")', { timeout: 10000 });
    await page1.click('button:has-text("Choose how you want to play")');
    await sleep(1000);
    
    await page1.click('[role="option"]:has-text("Play with Friend"), div:has-text("Play with Friend")', { timeout: 5000 });
    await sleep(500);
    
    const playButton = await page1.locator('button:has-text("PLAY")').last();
    await playButton.click({ force: true });
    await sleep(4000);
    
    await page1.waitForSelector('[role="dialog"], [data-state="open"]', { timeout: 10000 });
    await sleep(1000);
    
    await page1.waitForSelector('button:has-text("Generate Game Code")', { timeout: 5000 });
    await page1.click('button:has-text("Generate Game Code")');
    await sleep(3000);
    
    gameCode = await page1.locator('div.font-mono.font-bold').innerText();
    
    metrics.matchesCreated++;
    metrics.timings.matchCreate.push(Date.now() - createStart);
    
    await page1.click('button:has-text("Start Game & Wait for Friend")');
    await sleep(2000);
    
    // === MATCH JOIN PHASE ===
    const joinStart = Date.now();
    
    // Player 2: Join match
    await page2.click('div.rounded-lg.border-2, div[class*="border"][class*="rounded"]', { timeout: 10000 });
    await sleep(1000);
    
    await page2.waitForSelector('button:has-text("Choose how you want to play")', { timeout: 10000 });
    await page2.click('button:has-text("Choose how you want to play")');
    await sleep(1000);
    
    await page2.click('[role="option"]:has-text("Play with Friend"), div:has-text("Play with Friend")', { timeout: 5000 });
    await sleep(500);
    
    const playButton2 = await page2.locator('button:has-text("PLAY")').last();
    await playButton2.click({ force: true });
    await sleep(4000);
    
    await page2.click('button:has-text("Enter Code")', { timeout: 5000 });
    await sleep(500);
    
    await page2.fill('input[placeholder*="Enter"][placeholder*="code"], input[id="joinCode"]', gameCode);
    await sleep(500);
    
    await page2.click('button:has-text("Join Game")');
    await sleep(3000);
    
    metrics.timings.matchJoin.push(Date.now() - joinStart);
    
    // === QUIZ START PHASE ===
    const quizStartTime = Date.now();
    await sleep(3000);
    
    const quizStarted = await Promise.race([
      Promise.all([
        page1.waitForSelector('input[type="radio"]', { timeout: 15000 }).then(() => true),
        page2.waitForSelector('input[type="radio"]', { timeout: 15000 }).then(() => true)
      ]).then(() => true),
      sleep(20000).then(() => false)
    ]);
    
    if (!quizStarted) {
      throw new Error('Quiz did not start');
    }
    
    metrics.matchesStarted++;
    metrics.timings.quizStart.push(Date.now() - quizStartTime);
    
    // === GAMEPLAY PHASE ===
    for (let q = 1; q <= 10; q++) {
      const answerStart = Date.now();
      
      const results = await Promise.allSettled([
        answerQuestion(page1, q),
        answerQuestion(page2, q)
      ]);
      
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value === true) {
          metrics.answersSubmitted++;
        }
      });
      
      metrics.timings.questionAnswer.push(Date.now() - answerStart);
      
      if (q === 10) {
        await sleep(3000);
      } else {
        await sleep(2000);
      }
    }
    
    // === COMPLETION PHASE ===
    await sleep(5000);
    
    metrics.matchesCompleted++;
    metrics.timings.matchComplete.push(Date.now() - startTime);
    
    return {
      success: true,
      matchNum,
      gameCode,
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    metrics.errors.push({
      matchNum,
      gameCode,
      error: error.message,
      phase: determinePhase(error.message),
      timestamp: Date.now()
    });
    
    return {
      success: false,
      matchNum,
      error: error.message
    };
  } finally {
    await context1.close();
    await context2.close();
  }
}

// Determine which phase failed
function determinePhase(errorMsg) {
  if (errorMsg.includes('login')) return 'LOGIN';
  if (errorMsg.includes('quiz')) return 'MATCH_CREATION';
  if (errorMsg.includes('code') || errorMsg.includes('join')) return 'MATCH_JOIN';
  if (errorMsg.includes('start')) return 'QUIZ_START';
  if (errorMsg.includes('radio') || errorMsg.includes('question')) return 'GAMEPLAY';
  return 'UNKNOWN';
}

// Answer a question
async function answerQuestion(page, questionNum) {
  try {
    await page.waitForSelector('input[type="radio"]', { timeout: 5000 });
    await sleep(500);
    
    const radios = await page.locator('input[type="radio"]').all();
    if (radios.length === 0) return false;
    
    const randomIndex = Math.floor(Math.random() * radios.length);
    await radios[randomIndex].click({ force: true });
    await sleep(300);
    
    let clicked = false;
    
    if (questionNum === 10) {
      try {
        await page.waitForSelector('div.flex.justify-end button, button:has-text("Submit Quiz")', { timeout: 2000 });
        const submitBtn = page.locator('div.flex.justify-end button').last();
        await submitBtn.click({ force: true, timeout: 2000 });
        clicked = true;
      } catch (e) {
        await page.click('button:has-text("Submit Quiz")', { timeout: 2000 });
        clicked = true;
      }
    } else {
      try {
        const nextBtn = page.locator('button:has-text("Next Question")');
        if (await nextBtn.isVisible({ timeout: 1000 })) {
          await nextBtn.click({ timeout: 2000 });
          clicked = true;
        }
      } catch (e) {
        // Ignore
      }
    }
    
    return clicked;
    
  } catch (error) {
    return false;
  }
}

// Detect bottlenecks
function analyzeBottlenecks() {
  const bottlenecks = [];
  
  // Analyze timing data
  const phases = ['login', 'matchCreate', 'matchJoin', 'quizStart', 'questionAnswer'];
  
  phases.forEach(phase => {
    if (metrics.timings[phase].length > 0) {
      const times = metrics.timings[phase];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      
      if (avg > 5000) {
        bottlenecks.push({
          phase,
          severity: 'HIGH',
          avgTime: avg.toFixed(0),
          maxTime: max.toFixed(0),
          recommendation: `${phase} is taking ${(avg/1000).toFixed(1)}s on average. Consider optimizing.`
        });
      } else if (avg > 3000) {
        bottlenecks.push({
          phase,
          severity: 'MEDIUM',
          avgTime: avg.toFixed(0),
          maxTime: max.toFixed(0),
          recommendation: `${phase} could be faster (${(avg/1000).toFixed(1)}s avg).`
        });
      }
    }
  });
  
  // Analyze error patterns
  const errorsByPhase = {};
  metrics.errors.forEach(err => {
    errorsByPhase[err.phase] = (errorsByPhase[err.phase] || 0) + 1;
  });
  
  Object.entries(errorsByPhase).forEach(([phase, count]) => {
    if (count > metrics.matchesCreated * 0.1) {
      bottlenecks.push({
        phase,
        severity: 'CRITICAL',
        errorCount: count,
        errorRate: ((count / metrics.matchesCreated) * 100).toFixed(1) + '%',
        recommendation: `${phase} has high failure rate (${count} errors). Investigate immediately.`
      });
    }
  });
  
  // Analyze resource usage
  if (metrics.resources.memory.length > 0) {
    const avgMemUsage = metrics.resources.memory.reduce((a, b) => a + parseFloat(b.memory.usage), 0) / metrics.resources.memory.length;
    if (avgMemUsage > 80) {
      bottlenecks.push({
        phase: 'SYSTEM_MEMORY',
        severity: 'HIGH',
        usage: avgMemUsage.toFixed(1) + '%',
        recommendation: 'Memory usage is high. Consider increasing available RAM or reducing batch size.'
      });
    }
  }
  
  return bottlenecks;
}

// Export metrics for Grafana
function exportMetrics() {
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  
  const report = {
    timestamp: new Date().toISOString(),
    duration: elapsed,
    summary: {
      matchesAttempted: metrics.matchesCreated,
      matchesStarted: metrics.matchesStarted,
      matchesCompleted: metrics.matchesCompleted,
      answersSubmitted: metrics.answersSubmitted,
      errors: metrics.errors.length,
      successRate: ((metrics.matchesCompleted / metrics.matchesCreated) * 100).toFixed(2)
    },
    timings: {},
    resources: metrics.resources,
    bottlenecks: metrics.bottlenecks,
    errors: metrics.errors.slice(0, 50) // Limit to first 50 errors
  };
  
  // Calculate timing statistics
  Object.entries(metrics.timings).forEach(([phase, times]) => {
    if (times.length > 0) {
      const sorted = times.slice().sort((a, b) => a - b);
      report.timings[phase] = {
        count: times.length,
        avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0),
        min: Math.min(...times).toFixed(0),
        max: Math.max(...times).toFixed(0),
        p50: sorted[Math.floor(sorted.length * 0.5)].toFixed(0),
        p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(0),
        p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(0)
      };
    }
  });
  
  const filename = `stress-test-metrics-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  
  return filename;
}

// Run the ultimate stress test
async function runUltimateStressTest(numMatches) {
  if (!TEST_CONFIGS[numMatches]) {
    console.log(`❌ Invalid match count. Supported: ${Object.keys(TEST_CONFIGS).join(', ')}`);
    process.exit(1);
  }
  
  const config = TEST_CONFIGS[numMatches];
  const requiredUsers = numMatches * 2;
  
  console.log('\n' + '='.repeat(80));
  console.log(`🚀 ULTIMATE STRESS TEST: ${numMatches} MATCHES`);
  console.log('='.repeat(80));
  console.log(`\n📊 Configuration:`);
  console.log(`   Matches: ${numMatches}`);
  console.log(`   Users Required: ${requiredUsers} (stresstest_1@test.com to stresstest_${requiredUsers}@test.com)`);
  console.log(`   Batch Size: ${config.batch} concurrent matches`);
  console.log(`   Batch Delay: ${config.delay}ms`);
  console.log(`   Total Batches: ${Math.ceil(numMatches / config.batch)}`);
  console.log(`   Estimated Time: ${Math.ceil(numMatches / config.batch * 2)} minutes\n`);
  
  if (requiredUsers > 2000) {
    console.log(`⚠️  WARNING: ${requiredUsers} users required but only 2000 exist in database!`);
    console.log(`   Please run: docker exec quizup_postgres psql -U quizup_user -d quizup_db -f /app/tests/seed-2000-users.sql\n`);
    return;
  }
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-gpu']
  });
  
  // Resource monitoring
  const resourceInterval = setInterval(() => {
    metrics.resources.memory.push(captureResources());
  }, 5000);
  
  try {
    const batches = Math.ceil(numMatches / config.batch);
    
    for (let b = 0; b < batches; b++) {
      const batchStart = b * config.batch;
      const batchEnd = Math.min(batchStart + config.batch, numMatches);
      const batchNum = b + 1;
      
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📦 BATCH ${batchNum}/${batches}: Matches ${batchStart + 1}-${batchEnd}`);
      console.log(`${'─'.repeat(80)}\n`);
      
      const batchPromises = [];
      
      for (let m = batchStart; m < batchEnd; m++) {
        const matchNum = m + 1;
        const users = getUserPair(matchNum);
        batchPromises.push(playSingleMatch(browser, matchNum, users));
      }
      
      const batchResults = await Promise.allSettled(batchPromises);
      const batchSuccess = batchResults.filter(r => r.status === 'fulfilled' && r.value.success === true).length;
      
      console.log(`\n✅ Batch ${batchNum} Complete: ${batchSuccess}/${batchEnd - batchStart} succeeded`);
      console.log(`   Created: ${metrics.matchesCreated}, Started: ${metrics.matchesStarted}, Completed: ${metrics.matchesCompleted}`);
      console.log(`   Errors: ${metrics.errors.length}`);
      
      // Delay between batches
      if (batchEnd < numMatches) {
        console.log(`\n⏳ Waiting ${config.delay}ms before next batch...`);
        await sleep(config.delay);
      }
    }
    
  } finally {
    clearInterval(resourceInterval);
    await browser.close();
  }
  
  // Final analysis
  metrics.bottlenecks = analyzeBottlenecks();
  
  // Generate reports
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(80));
  
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  const successRate = ((metrics.matchesCompleted / numMatches) * 100).toFixed(2);
  
  console.log(`\n⏱️  Duration: ${(elapsed / 60).toFixed(2)} minutes (${elapsed.toFixed(1)}s)`);
  console.log(`\n✅ Match Statistics:`);
  console.log(`   Attempted: ${numMatches}`);
  console.log(`   Created: ${metrics.matchesCreated}`);
  console.log(`   Started: ${metrics.matchesStarted}`);
  console.log(`   Completed: ${metrics.matchesCompleted}`);
  console.log(`   Success Rate: ${successRate}%`);
  console.log(`\n📝 Gameplay:`);
  console.log(`   Answers Submitted: ${metrics.answersSubmitted} / ${numMatches * 20} (${((metrics.answersSubmitted / (numMatches * 20)) * 100).toFixed(1)}%)`);
  console.log(`   Errors: ${metrics.errors.length}`);
  
  // Timing analysis
  console.log(`\n⚡ Performance (avg):`);
  Object.entries(metrics.timings).forEach(([phase, times]) => {
    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      console.log(`   ${phase}: ${(avg / 1000).toFixed(2)}s (max: ${(max / 1000).toFixed(2)}s)`);
    }
  });
  
  // Bottleneck analysis
  if (metrics.bottlenecks.length > 0) {
    console.log(`\n⚠️  BOTTLENECKS DETECTED:`);
    metrics.bottlenecks.forEach((b, i) => {
      console.log(`   ${i + 1}. [${b.severity}] ${b.phase}`);
      console.log(`      ${b.recommendation}`);
    });
  } else {
    console.log(`\n✅ No significant bottlenecks detected!`);
  }
  
  // Resource summary
  if (metrics.resources.memory.length > 0) {
    const avgMem = metrics.resources.memory.reduce((a, b) => a + parseFloat(b.memory.usage), 0) / metrics.resources.memory.length;
    const maxMem = Math.max(...metrics.resources.memory.map(r => parseFloat(r.memory.usage)));
    console.log(`\n💾 Resource Usage:`);
    console.log(`   Memory: ${avgMem.toFixed(1)}% avg, ${maxMem.toFixed(1)}% peak`);
  }
  
  // Export metrics
  const filename = exportMetrics();
  console.log(`\n📄 Metrics exported to: ${filename}`);
  console.log(`   Use this file with Grafana for visualization`);
  
  // Database verification
  console.log(`\n🔍 Verifying database...`);
  try {
    const adminResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin5@engineering.edu',
      password: '1234567890'
    });
    const token = adminResponse.data.token || adminResponse.data.data?.token;
    
    if (token) {
      const response = await axios.get(`${API_URL}/api/performance/friend-matches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const dbMatches = response.data.data || [];
      const dbCompleted = dbMatches.filter(m => m.match.status === 'COMPLETED').length;
      
      console.log(`   Database matches: ${dbMatches.length}`);
      console.log(`   Database completed: ${dbCompleted}`);
      console.log(`   Test completed: ${metrics.matchesCompleted}`);
      console.log(`   ✅ Persistence rate: ${((dbCompleted / metrics.matchesCompleted) * 100).toFixed(1)}%`);
    }
  } catch (error) {
    console.log(`   ⚠️  Database verification failed: ${error.message}`);
  }
  
  console.log(`\n✨ Test complete!\n`);
}

// CLI
if (require.main === module) {
  const numMatches = parseInt(process.argv[2]);
  
  if (!numMatches) {
    console.log('\n📚 Usage: node stress-test-ultimate.js <matches>');
    console.log('\n🎯 Supported match counts:');
    Object.keys(TEST_CONFIGS).forEach(count => {
      const config = TEST_CONFIGS[count];
      console.log(`   ${count.padStart(4)} matches - Batch: ${config.batch}, Delay: ${config.delay}ms`);
    });
    console.log('\n💡 Example: node stress-test-ultimate.js 30\n');
    process.exit(0);
  }
  
  runUltimateStressTest(numMatches)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runUltimateStressTest };
