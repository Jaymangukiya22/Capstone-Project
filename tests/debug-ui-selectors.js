/**
 * Debug script to find actual UI selectors on production
 */

const { chromium } = require('playwright');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'https://quizdash.dpdns.org';
const API_URL = process.env.API_URL || 'https://api.quizdash.dpdns.org';

async function debugUISelectors() {
  console.log('🔍 DEBUGGING UI SELECTORS\n');
  console.log('This will:');
  console.log('1. Login as User1');
  console.log('2. Create a friend match');
  console.log('3. Take screenshot of the page');
  console.log('4. List ALL elements that could be answer options');
  console.log('5. List ALL button texts\n');
  
  const browser = await chromium.launch({ headless: false }); // NON-HEADLESS so you can see!
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login
    console.log('1. Logging in as User1...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'arjun.sharma@student.edu',
      password: '1234567890'
    });
    const token = loginResponse.data.token;
    console.log('✅ Logged in');
    
    // Create match
    console.log('\n2. Creating friend match...');
    const matchResponse = await axios.post(
      `${API_URL}/api/friend-matches`,
      { quizId: 102 },
      { headers: { 'Authorization': `Bearer ${token}` }}
    );
    const matchId = matchResponse.data.matchId;
    const joinCode = matchResponse.data.joinCode;
    console.log(`✅ Match created: ${matchId} (code: ${joinCode})`);
    
    // Navigate to match
    console.log('\n3. Navigating to match page...');
    await page.goto(`${BASE_URL}/student/friend-match/${matchId}`);
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take screenshot
    console.log('\n4. Taking screenshot...');
    await page.screenshot({ path: 'debug-waiting-screen.png', fullPage: true });
    console.log('✅ Screenshot saved: debug-waiting-screen.png');
    
    // Get page HTML
    console.log('\n5. Analyzing page content...\n');
    
    // Check what's on the page
    const pageContent = await page.content();
    
    // Check for various texts
    console.log('='.repeat(60));
    console.log('TEXTS ON PAGE:');
    console.log('='.repeat(60));
    
    const hasWaiting = pageContent.includes('Waiting');
    const hasReady = pageContent.includes('Ready');
    const hasQuestion = pageContent.includes('Question');
    const hasOption = pageContent.includes('Option');
    
    console.log(`Contains "Waiting": ${hasWaiting}`);
    console.log(`Contains "Ready": ${hasReady}`);
    console.log(`Contains "Question": ${hasQuestion}`);
    console.log(`Contains "Option": ${hasOption}`);
    
    // List all buttons
    console.log('\n' + '='.repeat(60));
    console.log('ALL BUTTONS ON PAGE:');
    console.log('='.repeat(60));
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons:`);
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent().catch(() => '');
      const visible = await buttons[i].isVisible().catch(() => false);
      console.log(`  ${i + 1}. "${text}" (visible: ${visible})`);
    }
    
    // Try to find radio inputs
    console.log('\n' + '='.repeat(60));
    console.log('RADIO INPUTS:');
    console.log('='.repeat(60));
    const radios = await page.locator('input[type="radio"]').all();
    console.log(`Found ${radios.length} radio inputs`);
    
    // Try to find divs with cursor-pointer
    console.log('\n' + '='.repeat(60));
    console.log('CLICKABLE DIVS (cursor-pointer):');
    console.log('='.repeat(60));
    const clickableDivs = await page.locator('div.cursor-pointer').all();
    console.log(`Found ${clickableDivs.length} clickable divs`);
    
    // Try to find anything with "option" in class
    console.log('\n' + '='.repeat(60));
    console.log('ELEMENTS WITH "option" IN CLASS:');
    console.log('='.repeat(60));
    const optionElements = await page.locator('[class*="option"]').all();
    console.log(`Found ${optionElements.length} elements`);
    
    console.log('\n' + '='.repeat(60));
    console.log('WAITING FOR YOU TO INSPECT...');
    console.log('='.repeat(60));
    console.log('\nThe browser is open. You can:');
    console.log('1. Open DevTools (F12)');
    console.log('2. Inspect the page manually');
    console.log('3. Check what elements are actually there');
    console.log('\nPress Ctrl+C when done inspecting...\n');
    
    // Keep browser open for manual inspection
    await new Promise(resolve => setTimeout(resolve, 120000)); // Wait 2 minutes
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

debugUISelectors()
  .then(() => {
    console.log('\n✅ Debug complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });
