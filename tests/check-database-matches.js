/**
 * Quick script to check if matches are being saved to database
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'https://api.quizdash.dpdns.org';

async function checkDatabase() {
  try {
    console.log('🔍 Checking database for friend matches...\n');
    console.log('API URL:', API_URL);
    
    // Login as admin (use actual admin from database)
    console.log('\n1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin5@engineering.edu',
      password: '1234567890'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Check friend matches
    console.log('\n2. Fetching friend matches from database...');
    const matchesResponse = await axios.get(`${API_URL}/api/performance/friend-matches`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (matchesResponse.data.success) {
      const matches = matchesResponse.data.data || [];
      const summary = matchesResponse.data.summary || {};
      
      console.log('\n💾 DATABASE RESULTS:');
      console.log('='.repeat(60));
      console.log(`Total Matches: ${summary.totalMatches || matches.length}`);
      console.log(`Completed Matches: ${summary.completedMatches || 0}`);
      console.log(`Total Players: ${summary.totalPlayers || 0}`);
      console.log('='.repeat(60));
      
      if (matches.length === 0) {
        console.log('\n⚠️  NO MATCHES FOUND IN DATABASE!');
        console.log('\nPossible causes:');
        console.log('  1. Matches not completing (check matchServer logs)');
        console.log('  2. Database save failing (check for errors)');
        console.log('  3. endMatch() not being called');
        console.log('\nCheck matchServer logs for:');
        console.log('  - "Match completed - final results calculated"');
        console.log('  - "✅ Match data saved to database successfully"');
        console.log('  - "Match record created in database"');
      } else {
        console.log(`\n✅ Found ${matches.length} matches in database!\n`);
        
        // Show last 5 matches
        console.log('Last 5 matches:');
        matches.slice(0, 5).forEach((match, i) => {
          const m = match.match;
          console.log(`\n${i + 1}. Match ID: ${m.matchId}`);
          console.log(`   Quiz: ${m.quiz?.title || 'Unknown'}`);
          console.log(`   Status: ${m.status}`);
          console.log(`   Players: ${match.players?.length || 0}`);
          console.log(`   Created: ${new Date(m.createdAt).toLocaleString()}`);
          
          if (match.players && match.players.length > 0) {
            console.log(`   Scores:`);
            match.players.forEach(p => {
              console.log(`     - ${p.user?.username || 'Unknown'}: ${p.score} (${p.correctAnswers} correct)`);
            });
          }
        });
      }
    } else {
      console.log('❌ Failed to fetch matches:', matchesResponse.data.error);
    }
    
    // Check player match history
    console.log('\n\n3. Checking player match history endpoint...');
    const myMatchesResponse = await axios.get(`${API_URL}/api/performance/my-matches`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (myMatchesResponse.data.success) {
      const data = myMatchesResponse.data.data;
      const playerMatches = data.matches || [];
      const stats = data.statistics || {};
      
      console.log('\n📊 PLAYER HISTORY (Admin account):');
      console.log('='.repeat(60));
      console.log(`Total Matches: ${stats.totalMatches || 0}`);
      console.log(`Wins: ${stats.wins || 0}`);
      console.log(`Losses: ${stats.losses || 0}`);
      console.log(`Win Rate: ${stats.winRate || 0}%`);
      console.log('='.repeat(60));
      
      if (playerMatches.length > 0) {
        console.log('\n✅ Player history endpoint working!');
      }
    }
    
    console.log('\n\n✨ Database check complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run check
checkDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
