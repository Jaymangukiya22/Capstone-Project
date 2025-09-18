import { MassiveSeeder } from '../seeders/massiveSeeder';
import { sequelize } from '../models';
import { connectDatabase } from '../config/database';

const seedDatabase = async () => {
  try {
    console.log('🚀 Starting database seeding...');
    
    // Connect and sync database
    await connectDatabase();
    console.log('✅ Database connection and sync completed');
    
    // Custom configuration for LARGE but manageable data
    const LARGE_CONFIG = {
      users: 500,               // 500 users
      categories: 20,           // 20 categories
      questionsPerCategory: 50, // 50 questions per category = 1,000 questions
      quizzesPerCategory: 15,   // 15 quizzes per category = 300 quizzes
      attemptsPerUser: 10,      // 10 attempts per user = 5,000 attempts
      questionsPerQuiz: 8       // 8 questions per quiz
    };
    
    console.log('📊 Seeding Configuration:', LARGE_CONFIG);
    console.log('📈 Expected Records:');
    console.log(`   Users: ${LARGE_CONFIG.users}`);
    console.log(`   Categories: ${LARGE_CONFIG.categories}`);
    console.log(`   Questions: ${LARGE_CONFIG.categories * LARGE_CONFIG.questionsPerCategory}`);
    console.log(`   Quizzes: ${LARGE_CONFIG.categories * LARGE_CONFIG.quizzesPerCategory}`);
    console.log(`   Quiz Attempts: ${LARGE_CONFIG.users * LARGE_CONFIG.attemptsPerUser}`);
    console.log(`   Estimated Total Records: ~${
      LARGE_CONFIG.users + 
      LARGE_CONFIG.categories + 
      (LARGE_CONFIG.categories * LARGE_CONFIG.questionsPerCategory * 4) + // questions + options
      (LARGE_CONFIG.categories * LARGE_CONFIG.quizzesPerCategory) +
      (LARGE_CONFIG.users * LARGE_CONFIG.attemptsPerUser * 16) // attempts + answers
    }`);
    
    const seeder = new MassiveSeeder(LARGE_CONFIG);
    await seeder.seed();
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('💾 Your database is now loaded with MASSIVE amounts of realistic data');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
