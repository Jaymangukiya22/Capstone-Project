// Updated massive seeder to use engineering data
import { EngineeringSeeder } from '../scripts/engineeringSeeder';
import { logInfo, logError } from '../utils/logger';

interface SeederConfig {
  users: number;
  categories: number;
  questionsPerCategory: number;
  quizzesPerCategory: number;
  attemptsPerUser: number;
  questionsPerQuiz: number;
}

const DEFAULT_CONFIG: SeederConfig = {
  users: 2,                // 2 users (admin/student)
  categories: 9,           // B.Tech Engineering categories
  questionsPerCategory: 5, // 5 questions per category
  quizzesPerCategory: 1,   // 1 quiz per category
  attemptsPerUser: 0,      // No pre-created attempts
  questionsPerQuiz: 5      // 5 questions per quiz
};

class MassiveSeeder {
  private config: SeederConfig;

  constructor(config: SeederConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  async seed() {
    try {
      logInfo('🚀 Starting Engineering database seeding via MassiveSeeder...', this.config);
      
      // Use the engineering seeder instead of the old massive seeder
      const engineeringSeeder = new EngineeringSeeder();
      await engineeringSeeder.run();
      
      logInfo('✅ Engineering database seeding completed successfully via MassiveSeeder');
    } catch (error) {
      logError('❌ Engineering seeding failed via MassiveSeeder', error as Error);
      throw error;
    }
  }
}

export { MassiveSeeder, DEFAULT_CONFIG };
export default MassiveSeeder;
