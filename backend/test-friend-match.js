// Simple test script to verify friend match functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const MATCH_SERVICE_URL = 'http://localhost:3001';

async function testFriendMatchFlow() {
  console.log('🧪 Testing Friend Match Flow...\n');

  try {
    // Test 1: Health check for main server
    console.log('1. Testing main server health...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Main server health:', healthData.status);

    // Test 2: Health check for match service
    console.log('\n2. Testing match service health...');
    const matchHealthResponse = await fetch(`${MATCH_SERVICE_URL}/health`);
    const matchHealthData = await matchHealthResponse.json();
    console.log('✅ Match service health:', matchHealthData.status);

    // Test 3: Create friend match via main API
    console.log('\n3. Creating friend match via main API...');
    const createResponse = await fetch(`${BASE_URL}/api/friend-matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: 165 })
    });
    const createData = await createResponse.json();
    
    if (createData.success) {
      console.log('✅ Friend match created:', {
        matchId: createData.data.matchId,
        joinCode: createData.data.joinCode
      });

      // Test 4: Find match by join code
      console.log('\n4. Finding match by join code...');
      const findResponse = await fetch(`${BASE_URL}/api/friend-matches/code/${createData.data.joinCode}`);
      const findData = await findResponse.json();
      
      if (findData.success) {
        console.log('✅ Match found by join code:', {
          matchId: findData.data.match.id,
          status: findData.data.match.status
        });
      } else {
        console.log('❌ Failed to find match by join code:', findData.error);
      }

      // Test 5: Get all active matches
      console.log('\n5. Getting all active matches...');
      const allMatchesResponse = await fetch(`${BASE_URL}/api/friend-matches`);
      const allMatchesData = await allMatchesResponse.json();
      
      if (allMatchesData.success) {
        console.log('✅ Active matches count:', allMatchesData.data.matches?.length || 0);
      } else {
        console.log('❌ Failed to get active matches:', allMatchesData.error);
      }

    } else {
      console.log('❌ Failed to create friend match:', createData.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n💡 Make sure both servers are running:');
    console.log('   - Main server: npm run dev (port 3000)');
    console.log('   - Match service: node src/matchServer-enhanced.ts (port 3001)');
  }

  console.log('\n🏁 Test completed!');
}

// Run the test
testFriendMatchFlow();
