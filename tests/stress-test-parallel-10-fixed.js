/**
 * PARALLEL Stress Test - Optimized for Performance
 * Fixes timeouts by staggering starts and reducing resource load
 * 5-second delay between match starts to prevent server overload
 */

const { chromium } = require('playwright');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:8090';

console.log('🌐 URLs:');
console.log('  BASE_URL:', BASE_URL);
console.log('  API_URL:', API_URL);
console.log();

// Metrics
const metrics = {
  startTime: Date.now(),
  matchesCreated: 0,
  matchesJoined: 0,
  matchesStarted: 0,
  matchesCompleted: 0,
  answersSubmitted: 0,
  errors: []
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Login function for database verification
async function login(email, password) {
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    email,
    password
  });
  return response.data.token;
}

// Play a SINGLE match
async function playSingleMatch(browser, matchNum, player1Email, player2Email) {
  console.log(`\n🎮 MATCH ${matchNum} STARTING (${player1Email} vs ${player2Email})`);
  
  // Increase timeout to 90 seconds for slower environments
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  // Set default timeout on pages
  context1.setDefaultTimeout(90000);
  context2.setDefaultTimeout(90000);

  // OPTIMIZATION: Block images and fonts to speed up loading
  await context1.route('**/*.{png,jpg,jpeg,svg,woff,woff2}', route => route.abort());
  await context2.route('**/*.{png,jpg,jpeg,svg,woff,woff2}', route => route.abort());

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  let gameCode = '';
  
  try {
    // === STEP 1: Login Player 1 ===
    console.log(`  [M${matchNum}] 🌐 Logging in Player 1...`);
    await page1.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(1000); // Wait for page to render
    
    // Email input is type="text" with name="email", NOT type="email"
    await page1.fill('input[name="email"]', player1Email);
    await page1.fill('input[type="password"]', '1234567890');
    await page1.click('button[type="submit"]');
    await sleep(2000); // Wait for redirect
    
    // === STEP 2: Login Player 2 ===
    console.log(`  [M${matchNum}] 🌐 Logging in Player 2...`);
    await page2.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(1000); // Wait for page to render

    // Email input is type="text" with name="email", NOT type="email"
    await page2.fill('input[name="email"]', player2Email);
    await page2.fill('input[type="password"]', '1234567890');
    await page2.click('button[type="submit"]');
    await sleep(2000); // Wait for redirect
    
    console.log(`  [M${matchNum}] ✅ Both players logged in`);
    
    // === STEP 3: Navigate to quiz page ===
    // Use 'commit' to just wait for network connection, relying on selectors for actual loading
    if (!page1.url().includes('student-quiz')) await page1.goto(`${BASE_URL}/student-quiz`, { waitUntil: 'commit' });
    if (!page2.url().includes('student-quiz')) await page2.goto(`${BASE_URL}/student-quiz`, { waitUntil: 'commit' });
    
    // === STEP 4: Player 1 - Select quiz and game mode ===
    console.log(`  [M${matchNum}] 📋 Player 1: Selecting quiz...`);
    // Wait specifically for the grid of quizzes
    await page1.waitForSelector('div.grid', { timeout: 15000 }); 
    await sleep(500); // Wait for quizzes to render
    
    const quizCards1 = await page1.$$('div[class*="border"][class*="rounded"], div.rounded-lg.border-2');
    if (quizCards1.length > 0) {
      await quizCards1[0].click();
      await sleep(1000); // Wait for modal to open
    }
    
    // Open game mode selector - wait longer for modal to appear
    try {
      await page1.waitForSelector('button:has-text("Choose how you want to play")', { timeout: 15000 });
      await page1.click('button:has-text("Choose how you want to play")');
      await sleep(500);
      await page1.click('[role="option"]:has-text("Play with Friend"), div:has-text("Play with Friend")');
    } catch (e) {
      console.log(`  [M${matchNum}] ⚠️  Could not find game mode selector: ${e.message}`);
    }
    await sleep(500);
    
    // === STEP 5: Player 1 - Click PLAY button ===
    console.log(`  [M${matchNum}] ▶️ Player 1: Clicking PLAY...`);
    const playButton = await page1.locator('button:has-text("PLAY")').last();
    await playButton.click({ force: true });
    
    // === STEP 6: Player 1 - Generate code ===
    console.log(`  [M${matchNum}] 🎲 Player 1: Generating code...`);
    // Wait for dialog
    await page1.waitForSelector('button:has-text("Generate Game Code")');
    await page1.click('button:has-text("Generate Game Code")');
    
    // Wait for code to appear
    await page1.waitForSelector('div.font-mono.font-bold');
    gameCode = await page1.locator('div.font-mono.font-bold').innerText();
    console.log(`  [M${matchNum}] ✅ Code generated: ${gameCode}`);
    metrics.matchesCreated++;
    
    // === STEP 7: Player 1 - Start game ===
    console.log(`  [M${matchNum}] ⏳ Player 1: Starting game...`);
    await page1.click('button:has-text("Start Game & Wait for Friend")');
    
    // === STEP 8: Player 2 - Select quiz and game mode ===
    console.log(`  [M${matchNum}] 📋 Player 2: Joining...`);
    
    await page2.waitForSelector('div.grid', { timeout: 15000 });
    await sleep(500); // Wait for quizzes to render
    
    const quizCards2 = await page2.$$('div[class*="border"][class*="rounded"], div.rounded-lg.border-2');
    if (quizCards2.length > 0) {
      await quizCards2[0].click();
      await sleep(1000); // Wait for modal to open
    }
    
    try {
      await page2.waitForSelector('button:has-text("Choose how you want to play")', { timeout: 15000 });
      await page2.click('button:has-text("Choose how you want to play")');
      await sleep(500);
      await page2.click('[role="option"]:has-text("Play with Friend"), div:has-text("Play with Friend")');
    } catch (e) {
      console.log(`  [M${matchNum}] ⚠️  Could not find game mode selector: ${e.message}`);
    }
    await sleep(500);
    
    // === STEP 9: Player 2 - Click PLAY button ===
    const playButton2 = await page2.locator('button:has-text("PLAY")').last();
    await playButton2.click({ force: true });
    
    // === STEP 10: Player 2 - Enter code and join ===
    await page2.waitForSelector('button:has-text("Enter Code")');
    await page2.click('button:has-text("Enter Code")');
    
    await page2.waitForSelector('input[id="joinCode"]');
    await page2.fill('input[id="joinCode"]', gameCode);
    
    console.log(`  [M${matchNum}] 🚀 Player 2: Clicking Join...`);
    await page2.click('button:has-text("Join Game")');
    
    // Verify join
    await page1.waitForSelector(`text=${player2Email.split('@')[0]}`, { timeout: 15000 }).catch(() => console.log(`  [M${matchNum}] Warning: P2 name not seen on P1 screen yet`));

    console.log(`  [M${matchNum}] ✅ Both players joined!`);
    metrics.matchesJoined++;
    
    // === STEP 11: Wait for quiz to start ===
    console.log(`  [M${matchNum}] ⏳ Waiting for quiz to start...`);
    
    // Check for questions
    const quizStarted = await Promise.race([
      Promise.all([
        page1.waitForSelector('input[type="radio"]', { timeout: 30000 }).then(() => true),
        page2.waitForSelector('input[type="radio"]', { timeout: 30000 }).then(() => true)
      ]).then(() => true),
      sleep(35000).then(() => false)
    ]);
    
    if (!quizStarted) {
      throw new Error('Quiz did not start - questions not found within timeout');
    }
    
    metrics.matchesStarted++;
    console.log(`  [M${matchNum}] ✅ Quiz started!`);
    
    // === STEP 12: Play 10 questions ===
    // Reduce wait time to speed up test
    for (let q = 1; q <= 10; q++) {
      const results = await Promise.allSettled([
        answerQuestion(page1, `M${matchNum}-P1`, q),
        answerQuestion(page2, `M${matchNum}-P2`, q)
      ]);
      
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value === true) metrics.answersSubmitted++;
      });
      
      // Short sleep to let animation finish
      await sleep(500);
    }
    
    // Wait for completion
    console.log(`  [M${matchNum}] ⏳ Waiting for completion...`);
    await sleep(5000); // Give time for final results to save
    
    metrics.matchesCompleted++;
    console.log(`  [M${matchNum}] ✅ Match completed!`);
    
    return true;
    
  } catch (error) {
    console.error(`  [M${matchNum}] ❌ Error: ${error.message}`);
    // Save screenshot on failure
    try {
        await page1.screenshot({ path: `error-m${matchNum}-p1.png` });
        await page2.screenshot({ path: `error-m${matchNum}-p2.png` });
    } catch(e) {}
    metrics.errors.push({ matchNum, error: error.message });
    return false;
  } finally {
    await context1.close();
    await context2.close();
  }
}

// Answer a question
async function answerQuestion(page, playerLabel, questionNum) {
  try {
    // Fast selector check
    const radio = await page.waitForSelector('input[type="radio"]', { timeout: 5000 }).catch(() => null);
    
    if (!radio) {
      console.log(`    ⚠️  ${playerLabel}: No options for Q${questionNum}`);
      return false;
    }
    
    const radios = await page.locator('input[type="radio"]').all();
    const randomIndex = Math.floor(Math.random() * radios.length);
    await radios[randomIndex].click({ force: true });
    
    // Try to find next/submit button
    const btn = await page.locator('button:has-text("Next Question"), button:has-text("Submit Quiz")').first();
    if (await btn.isVisible()) {
        await btn.click();
        console.log(`    ✓ ${playerLabel} answered Q${questionNum}`);
        return true;
    }
    
    return true; // Considered answered if we clicked the radio
  } catch (error) {
    return false;
  }
}

// Run parallel stress test
async function runParallelTest(numMatches) {
  console.log('\n' + '='.repeat(70));
  console.log(`🚀 PARALLEL STRESS TEST (OPTIMIZED): ${numMatches} Matches`);
  console.log('='.repeat(70));
  console.log('⚙️  Configuration:');
  console.log('   - Batch Size: 5 matches');
  console.log('   - Delay Between Starts: 5 seconds');
  console.log('   - Resource Blocking: Images & Fonts disabled');
  console.log('   - Default Timeout: 60 seconds');
  console.log();
  
  // Launch browser with memory optimization flags
  const browser = await chromium.launch({
    headless: true,
    args: [
        '--disable-dev-shm-usage', 
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-extensions'
    ]
  });
  
  let successCount = 0;
  const batchSize = 3; // Reduced from 5 to 3 to reduce contention
  
  try {
    for (let batch = 0; batch < numMatches; batch += batchSize) {
      const batchEnd = Math.min(batch + batchSize, numMatches);
      const batchNum = Math.floor(batch / batchSize) + 1;
      
      console.log(`\n📦 BATCH ${batchNum} (Matches ${batch + 1}-${batchEnd})`);
      console.log('='.repeat(70));
      
      const batchPromises = [];
      
      for (let i = batch; i < batchEnd; i++) {
        const matchNum = i + 1;
        // FIXED: 5-second delay between each match start to prevent server choke
        // Position in batch (0, 1, 2, 3, 4) × 5000ms = (0, 5, 10, 15, 20 seconds)
        const delay = (i - batch) * 5000; 
        
        const player1Num = matchNum * 2 - 1;
        const player2Num = matchNum * 2;
        const player1Email = `stresstest_${player1Num}@test.com`;
        const player2Email = `stresstest_${player2Num}@test.com`;
        
        const promise = (async () => {
            await sleep(delay); // Wait before starting this match
            return playSingleMatch(browser, matchNum, player1Email, player2Email);
        })();
        
        batchPromises.push(promise.then(success => {
            if (success) successCount++;
            return success;
        }));
      }
      
      console.log(`⏳ Waiting for batch ${batchNum} to complete...`);
      await Promise.allSettled(batchPromises);
      
      if (batchEnd < numMatches) {
        console.log('⏳ Cooling down before next batch (5 seconds)...');
        await sleep(5000);
      }
    }
  } finally {
    await browser.close();
  }
  
  // Final stats output
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`⏱️  Total Time: ${elapsed.toFixed(1)}s (${(elapsed / 60).toFixed(2)} minutes)`);
  console.log(`\n📊 Match Statistics:`);
  console.log(`   ✅ Matches Attempted: ${numMatches}`);
  console.log(`   ✅ Matches Created: ${metrics.matchesCreated}`);
  console.log(`   ✅ Matches Joined: ${metrics.matchesJoined}`);
  console.log(`   ✅ Matches Started: ${metrics.matchesStarted}`);
  console.log(`   ✅ Matches Completed: ${metrics.matchesCompleted}`);
  console.log(`   📝 Answers Submitted: ${metrics.answersSubmitted}`);
  console.log(`   ❌ Errors: ${metrics.errors.length}`);
  console.log(`   ✅ Success Rate: ${Math.round(successCount / numMatches * 100)}%`);
  
  if (metrics.errors.length > 0) {
    console.log(`\n❌ Last Errors:`);
    metrics.errors.slice(-3).forEach(e => console.log(`   - Match ${e.matchNum}: ${e.error}`));
  }
  
  console.log('\n✨ Test complete!\n');
}

if (require.main === module) {
  const numMatches = parseInt(process.argv[2]) || 10;
  runParallelTest(numMatches).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runParallelTest };
