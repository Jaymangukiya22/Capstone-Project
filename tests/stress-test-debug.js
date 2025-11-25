/**
 * DEBUG Stress Test - Single Match with Detailed Logging
 * Tests 1 match with extensive debugging to understand what's happening
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

console.log('🌐 BASE_URL:', BASE_URL);
console.log('');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function debugSingleMatch() {
  console.log('🚀 Starting DEBUG test for 1 match...\n');
  
  const browser = await chromium.launch({
    headless: false, // Show the browser so we can see what's happening
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-extensions'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // === STEP 1: Navigate to login ===
    console.log('📍 STEP 1: Navigating to login page...');
    console.log(`   URL: ${BASE_URL}/login`);
    
    const gotoResponse = await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    console.log(`   ✅ Page loaded. Status: ${gotoResponse?.status()}`);
    console.log(`   📄 Current URL: ${page.url()}`);
    
    // Wait a bit for page to render
    await sleep(2000);
    
    // === STEP 2: Check what's on the page ===
    console.log('\n📍 STEP 2: Checking page content...');
    
    // Get page title
    const title = await page.title();
    console.log(`   📌 Page Title: ${title}`);
    
    // Get all visible text
    const bodyText = await page.locator('body').innerText();
    console.log(`   📝 Page Text (first 500 chars):\n${bodyText.substring(0, 500)}`);
    
    // Check for email input
    const emailInputs = await page.locator('input[type="email"]').count();
    console.log(`   🔍 Email inputs found: ${emailInputs}`);
    
    // Check for password input
    const passwordInputs = await page.locator('input[type="password"]').count();
    console.log(`   🔍 Password inputs found: ${passwordInputs}`);
    
    // Check for submit button
    const submitButtons = await page.locator('button[type="submit"]').count();
    console.log(`   🔍 Submit buttons found: ${submitButtons}`);
    
    // Check for logout button
    const logoutButtons = await page.locator('button:has-text("Logout")').count();
    console.log(`   🔍 Logout buttons found: ${logoutButtons}`);
    
    // === STEP 3: Try to find email input with different selectors ===
    console.log('\n📍 STEP 3: Trying different selectors for email input...');
    
    const selectors = [
      'input[type="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[type="text"]'
    ];
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   ✅ Found with "${selector}": ${count} elements`);
      }
    }
    
    // === STEP 4: Try to interact with email input ===
    console.log('\n📍 STEP 4: Attempting to fill email input...');
    
    try {
      await page.fill('input[type="email"]', 'stresstest_1@test.com');
      console.log('   ✅ Email filled successfully');
    } catch (e) {
      console.log(`   ❌ Failed to fill email: ${e.message}`);
      
      // Try alternative selector
      try {
        await page.fill('input[type="text"]', 'stresstest_1@test.com');
        console.log('   ✅ Email filled using text input');
      } catch (e2) {
        console.log(`   ❌ Failed with text input too: ${e2.message}`);
      }
    }
    
    // === STEP 5: Try to fill password ===
    console.log('\n📍 STEP 5: Attempting to fill password input...');
    
    try {
      await page.fill('input[type="password"]', '1234567890');
      console.log('   ✅ Password filled successfully');
    } catch (e) {
      console.log(`   ❌ Failed to fill password: ${e.message}`);
    }
    
    // === STEP 6: Try to click submit ===
    console.log('\n📍 STEP 6: Attempting to click submit button...');
    
    try {
      await page.click('button[type="submit"]');
      console.log('   ✅ Submit button clicked');
      
      // Wait for navigation
      await sleep(3000);
      console.log(`   📄 After submit - URL: ${page.url()}`);
      
    } catch (e) {
      console.log(`   ❌ Failed to click submit: ${e.message}`);
    }
    
    // === STEP 7: Check if logged in ===
    console.log('\n📍 STEP 7: Checking if logged in...');
    const finalUrl = page.url();
    console.log(`   📄 Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('student-quiz') || finalUrl.includes('dashboard')) {
      console.log('   ✅ Successfully logged in!');
    } else if (finalUrl.includes('login')) {
      console.log('   ❌ Still on login page - login failed');
    } else {
      console.log('   ⚠️  Unknown page');
    }
    
    // Keep browser open for 10 seconds so you can see the result
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await sleep(10000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await context.close();
    await browser.close();
  }
}

debugSingleMatch().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
