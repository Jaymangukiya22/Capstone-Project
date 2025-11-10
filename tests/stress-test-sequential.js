/**
 * SEQUENTIAL Stress Test - Runs matches ONE AT A TIME
 * This avoids performance bottlenecks and is more reliable
 */

const { chromium } = require('playwright');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'https://quizdash.dpdns.org';
const API_URL = process.env.API_URL || 'https://api.quizdash.dpdns.org';

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
async function playSingleMatch(browser, matchNum) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎮 MATCH ${matchNum}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  let gameCode = '';
  
  try {
    // === STEP 1: Login Player 1 ===
    console.log('🌐 Logging in Player 1...');
    await page1.goto(`${BASE_URL}/login`);
    await page1.waitForSelector('input[placeholder*="admin"], input[placeholder*="student"], input[type="email"], input[type="text"]', { timeout: 10000 });
    await page1.fill('input[placeholder*="admin"], input[placeholder*="student"], input[type="email"], input[type="text"]', 'arjun.sharma@student.edu');
    await page1.fill('input[type="password"]', '1234567890');
    await page1.click('button:has-text("Sign in"), button[type="submit"]');
    await sleep(3000); // Wait for redirect
    
    // === STEP 2: Login Player 2 ===
    console.log('🌐 Logging in Player 2...');
    await page2.goto(`${BASE_URL}/login`);
    await page2.waitForSelector('input[placeholder*="admin"], input[placeholder*="student"], input[type="email"], input[type="text"]', { timeout: 10000 });
    await page2.fill('input[placeholder*="admin"], input[placeholder*="student"], input[type="email"], input[type="text"]', 'priya.patel@student.edu');
    await page2.fill('input[type="password"]', '1234567890');
    await page2.click('button:has-text("Sign in"), button[type="submit"]');
    await sleep(3000); // Wait for redirect
    
    console.log('✅ Both players logged in');
    
    // === STEP 3: Player 1 - Select a quiz and open game mode ===
    console.log('📋 Player 1: Selecting quiz...');
    // Click on first quiz card
    await page1.click('div.rounded-lg.border-2, div[class*="border"][class*="rounded"]', { timeout: 10000 });
    await sleep(1000);
    
    // === STEP 4: Player 1 - Select "Play with Friend" from dropdown ===
    console.log('🎮 Player 1: Opening game mode selector...');
    // Click the game mode dropdown (in Quiz Overview section on right)
    await page1.waitForSelector('button:has-text("Choose how you want to play")', { timeout: 10000 });
    await page1.click('button:has-text("Choose how you want to play")');
    await sleep(1000);
    
    // Click "Play with Friend" option
    await page1.click('[role="option"]:has-text("Play with Friend"), div:has-text("Play with Friend")', { timeout: 5000 });
    await sleep(500);
    
    // === STEP 5: Player 1 - Click PLAY button (in QuizOverviewPanel) ===
    console.log('▶️ Player 1: Clicking PLAY button...');
    
    // Try multiple ways to click the PLAY button
    const playButton = await page1.locator('button:has-text("PLAY")').last(); // Get the last PLAY button (in overview panel)
    await playButton.click({ force: true });
    await sleep(4000); // Wait longer for modal animation
    
    // === STEP 6: Player 1 - Modal opens, click "Generate Game Code" ===
    console.log('🎲 Player 1: Waiting for modal...');
    await page1.screenshot({ path: 'debug-after-play.png' });
    
    // Wait for modal dialog to appear
    await page1.waitForSelector('[role="dialog"], [data-state="open"], .fixed.inset-0', { timeout: 10000 });
    await sleep(1000);
    
    // Look for "Generate Game Code" button inside modal
    await page1.waitForSelector('button:has-text("Generate Game Code")', { timeout: 5000 });
    await page1.click('button:has-text("Generate Game Code")');
    await sleep(3000); // Wait for API call
    
    // === STEP 7: Player 1 - Extract the generated code ===
    console.log('📝 Player 1: Extracting game code...');
    gameCode = await page1.locator('div.font-mono.font-bold').innerText();
    console.log(`✅ Game code generated: ${gameCode}`);
    
    metrics.matchesCreated++;
    
    // === STEP 8: Player 1 - Click "Start Game & Wait for Friend" ===
    console.log('⏳ Player 1: Starting game and waiting...');
    await page1.click('button:has-text("Start Game & Wait for Friend")');
    await sleep(2000);
    
    // === STEP 9: Player 2 - Open quiz and game mode (same as Player 1) ===
    console.log('📋 Player 2: Selecting quiz...');
    await page2.click('div.rounded-lg.border-2, div[class*="border"][class*="rounded"]', { timeout: 10000 });
    await sleep(1000);
    
    console.log('🎮 Player 2: Opening game mode selector...');
    await page2.waitForSelector('button:has-text("Choose how you want to play")', { timeout: 10000 });
    await page2.click('button:has-text("Choose how you want to play")');
    await sleep(1000);
    
    // Click "Play with Friend" option (same as Player 1)
    await page2.click('[role="option"]:has-text("Play with Friend"), div:has-text("Play with Friend")', { timeout: 5000 });
    await sleep(500);
    
    console.log('▶️ Player 2: Clicking PLAY button...');
    const playButton2 = await page2.locator('button:has-text("PLAY")').last();
    await playButton2.click({ force: true });
    await sleep(4000);
    
    // === STEP 10: Player 2 - Switch to "Enter Code" tab ===
    console.log('🔑 Player 2: Switching to Enter Code tab...');
    await page2.click('button:has-text("Enter Code")', { timeout: 5000 });
    await sleep(500);
    
    // === STEP 11: Player 2 - Enter code and join ===
    console.log(`🔢 Player 2: Entering code ${gameCode}...`);
    await page2.fill('input[placeholder*="Enter"][placeholder*="code"], input[id="joinCode"]', gameCode);
    await sleep(500);
    
    console.log('🚀 Player 2: Clicking Join Game...');
    await page2.click('button:has-text("Join Game")');
    await sleep(3000);
    
    console.log('✅ Both players joined match!');
    
    // === STEP 12: Wait for quiz to start (auto-starts, no Ready button!) ===
    console.log('⏳ Waiting for quiz to start...');
    await sleep(3000);
    
    // Wait for first question to appear
    const quizStarted = await Promise.race([
      Promise.all([
        page1.waitForSelector('input[type="radio"]', { timeout: 15000 }).then(() => true),
        page2.waitForSelector('input[type="radio"]', { timeout: 15000 }).then(() => true)
      ]).then(() => true),
      sleep(20000).then(() => false)
    ]);
    
    if (!quizStarted) {
      console.log('❌ Quiz did not start - taking screenshots...');
      await page1.screenshot({ path: `error-match${matchNum}-p1.png` });
      await page2.screenshot({ path: `error-match${matchNum}-p2.png` });
      throw new Error('Quiz did not start');
    }
    
    metrics.matchesStarted++;
    console.log('✅ Quiz started - questions loaded!');
    
    // Play 10 questions
    for (let q = 1; q <= 10; q++) {
      console.log(`\n  📝 Question ${q}/10`);
      
      // Take screenshots every 3 questions
      if (q % 3 === 1) {
        await page1.screenshot({ path: `match${matchNum}-p1-q${q}.png` });
        await page2.screenshot({ path: `match${matchNum}-p2-q${q}.png` });
      }
      
      // Both players answer in parallel
      const results = await Promise.allSettled([
        answerQuestion(page1, 'Player 1', q),
        answerQuestion(page2, 'Player 2', q)
      ]);
      
      // Count successful answers
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value === true) {
          metrics.answersSubmitted++;
        }
      });
      
      // Wait for next question (or completion for Q10)
      if (q === 10) {
        await sleep(3000); // Wait longer for final submission
        // Take final screenshots
        await page1.screenshot({ path: `match${matchNum}-p1-complete.png` });
        await page2.screenshot({ path: `match${matchNum}-p2-complete.png` });
      } else {
        await sleep(2000);
      }
    }
    
    // Wait for completion
    console.log('\n⏳ Waiting for match completion...');
    await sleep(5000);
    
    metrics.matchesCompleted++;
    console.log('✅ Match completed!');
    
    return true;
    
  } catch (error) {
    console.error(`❌ Match ${matchNum} failed:`, error.message);
    metrics.errors.push({ matchNum, error: error.message });
    return false;
  } finally {
    await context1.close();
    await context2.close();
  }
}

// Answer a question
async function answerQuestion(page, playerName, questionNum) {
  try {
    // BUILD-SAFE: Wait for radio inputs (never change with build)
    await page.waitForSelector('input[type="radio"]', { timeout: 5000 });
    await sleep(500);
    
    // Get all radio inputs
    const radios = await page.locator('input[type="radio"]').all();
    
    if (radios.length === 0) {
      console.log(`    ⚠ ${playerName}: No options found`);
      return false;
    }
    
    // Click random option
    const randomIndex = Math.floor(Math.random() * radios.length);
    await radios[randomIndex].click({ force: true });
    await sleep(300);
    
    // BUILD-SAFE: Use button TEXT (never changes with build)
    let clicked = false;
    
    if (questionNum === 10) {
      // Question 10: Use specific Submit Quiz button selector
      try {
        // Wait for submit button in navigation area
        await page.waitForSelector('div.flex.justify-end button, button:has-text("Submit Quiz")', { timeout: 2000 });
        const submitBtn = page.locator('div.flex.justify-end button').last();
        await submitBtn.click({ force: true, timeout: 2000 });
        clicked = true;
      } catch (e) {
        // Fallback to text-based selector
        try {
          await page.click('button:has-text("Submit Quiz")', { timeout: 2000 });
          clicked = true;
        } catch (e2) {
          console.log(`    ⚠ ${playerName}: Couldn't find Submit button`);
        }
      }
    } else {
      // Questions 1-9: Use Next Question button
      try {
        const nextBtn = page.locator('button:has-text("Next Question")');
        if (await nextBtn.isVisible({ timeout: 1000 })) {
          await nextBtn.click({ timeout: 2000 });
          clicked = true;
        }
      } catch (e) {
        console.log(`    ⚠ ${playerName}: Couldn't find Next button`);
      }
    }
    
    if (clicked) {
      console.log(`    ✓ ${playerName} answered Q${questionNum}`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.log(`    ❌ ${playerName}: ${error.message}`);
    return false;
  }
}

// Run sequential stress test
async function runSequentialTest(numMatches) {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 SEQUENTIAL STRESS TEST: ${numMatches} Matches`);
  console.log('='.repeat(60));
  console.log('\nThis will run matches ONE AT A TIME (more reliable)');
  console.log(`Estimated time: ${Math.ceil(numMatches * 3)} minutes\n`);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox']
  });
  
  let successCount = 0;
  
  try {
    for (let i = 1; i <= numMatches; i++) {
      const success = await playSingleMatch(browser, i);
      if (success) successCount++;
      
      // Small delay between matches
      if (i < numMatches) {
        await sleep(1000);
      }
    }
  } finally {
    await browser.close();
  }
  
  // Final report
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`\n⏱️  Total Duration: ${elapsed.toFixed(1)}s`);
  console.log(`\n📊 Match Statistics:`);
  console.log(`   ✅ Matches Attempted: ${numMatches}`);
  console.log(`   ✅ Matches Created: ${metrics.matchesCreated}`);
  console.log(`   ✅ Matches Started: ${metrics.matchesStarted}`);
  console.log(`   ✅ Matches Completed: ${metrics.matchesCompleted}`);
  console.log(`   📝 Answers Submitted: ${metrics.answersSubmitted} (expected: ${numMatches * 20})`);
  console.log(`   ❌ Errors: ${metrics.errors.length}`);
  console.log(`   ✅ Success Rate: ${Math.round(successCount / numMatches * 100)}%`);
  
  if (metrics.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    metrics.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. Match ${err.matchNum}: ${err.error}`);
    });
  }
  
  // Verify database
  console.log('\n🔍 Checking database...');
  try {
    // Login as admin to check database
    const adminResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin5@engineering.edu',
      password: '1234567890'
    });
    const token = adminResponse.data.token || adminResponse.data.data?.token;
    
    if (!token) {
      throw new Error('Admin login failed - no token');
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
    
    if (dbCompleted >= metrics.matchesCompleted * 0.8) {
      console.log(`   ✅ Save rate: ${Math.round(dbCompleted / metrics.matchesCompleted * 100)}%`);
    } else {
      console.log(`   ⚠️  Only ${dbCompleted}/${metrics.matchesCompleted} saved!`);
    }
  } catch (error) {
    console.log(`   ❌ Could not verify database: ${error.message}`);
  }
  
  console.log('\n✨ Test complete!\n');
}

// CLI
if (require.main === module) {
  const numMatches = parseInt(process.argv[2]) || 5;
  
  runSequentialTest(numMatches)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runSequentialTest };
