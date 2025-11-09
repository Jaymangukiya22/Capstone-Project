/**
 * JavaScript-based user seeder (alternative to SQL)
 * Connects to database and creates 4000 test users
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/quizdb',
  max: 20
});

const QUIZ_IDS = [
  102, 103, 104, 105, 106, 107, 108, 109, 110, 111,
  112, 113, 114, 115, 116, 117, 118, 119, 120, 121,
  122, 123, 124, 125, 126, 127, 128, 129, 130, 131,
  132, 133, 134, 135, 136, 137, 138, 139, 140, 141,
  142, 143, 144, 145, 146, 147, 148, 149, 150, 151
];

async function seedUsers() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting user seeding...');
    
    // Use a pre-hashed password for speed (hash of '1234567890')
    const passwordHash = await bcrypt.hash('1234567890', 10);  // 10 rounds for performance
    console.log('🔐 Generated password hash');
    
    let created = 0;
    let skipped = 0;
    
    // Batch insert for performance
    const batchSize = 100;
    
    for (let batch = 0; batch < 4000 / batchSize; batch++) {
      const values = [];
      const placeholders = [];
      
      for (let i = 0; i < batchSize; i++) {
        const userNum = batch * batchSize + i + 1;
        // ⬇️ 1. FIXED: Changed from 12 to 14
        const offset = values.length / 14; 
        
        // ⬇️ 2. FIXED: Added placeholders 13 and 14
        placeholders.push(
          `($${offset * 14 + 1}, $${offset * 14 + 2}, $${offset * 14 + 3}, $${offset * 14 + 4}, ` +
          `$${offset * 14 + 5}, $${offset * 14 + 6}, $${offset * 14 + 7}, $${offset * 14 + 8}, ` +
          `$${offset * 14 + 9}, $${offset * 14 + 10}, $${offset * 14 + 11}, $${offset * 14 + 12}, ` +
          `$${offset * 14 + 13}, $${offset * 14 + 14})`
        );
        
        // ⬇️ 3. FIXED: Corrected value order
        values.push(
          `stresstest_user_${userNum}`,    // 1. username
          `stresstest_${userNum}@test.com`, // 2. email
          passwordHash,                     // 3. passwordHash
          'PLAYER',                         // 4. role
          'Stress',                         // 5. firstName
          `User${userNum}`,                  // 6. lastName
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${userNum}`, // 7. avatar
          1200 + (userNum % 400),         // 8. eloRating
          0,                                // 9. totalMatches
          0,                                // 10. wins
          0,                                // 11. losses
          true,                             // 12. isActive
          new Date(),                       // 13. createdAt
          new Date()                        // 14. updatedAt
        );
      }
      
      // ⬇️ 4. FIXED: Added "createdAt" and "updatedAt"
      const query = `
        INSERT INTO users (
          username, email, "passwordHash", role, "firstName", "lastName", 
          avatar, "eloRating", "totalMatches", wins, losses, "isActive",
          "createdAt", "updatedAt"
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (username) DO NOTHING
        RETURNING id
      `;
      
      const result = await client.query(query, values);
      created += result.rowCount;
      skipped += batchSize - result.rowCount;
      
      console.log(`✅ Batch ${batch + 1}/20: Created ${result.rowCount} users (Total: ${created})`);
    }
    
    console.log('\n🎉 User seeding complete!');
    console.log(`   ✅ Created: ${created} users`);
    console.log(`   ⏭️  Skipped: ${skipped} users (already exist)`);
    console.log(`   👤 Username pattern: stresstest_user_1 to stresstest_user_2000`);
    console.log(`   📧 Email pattern: stresstest_1@test.com to stresstest_2000@test.com`);
    console.log(`   🔑 Password for all: 1234567890`);
    
    // Verify
    const countResult = await client.query(
      "SELECT COUNT(*) as total FROM users WHERE username LIKE 'stresstest_user_%'"
    );
    console.log(`\n📊 Total stress test users in database: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedUsers, QUIZ_IDS };