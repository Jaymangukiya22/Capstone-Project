import { Sequelize } from 'sequelize-typescript';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { QuestionBankItem } from '../models/QuestionBankItem';
import { QuestionBankOption } from '../models/QuestionBankOption';
import { Quiz } from '../models/Quiz';
import { QuizQuestion } from '../models/QuizQuestion';
import { QuizAttempt } from '../models/QuizAttempt';
import { QuizAttemptAnswer } from '../models/QuizAttemptAnswer';
import { Match } from '../models/Match';
import { MatchPlayer } from '../models/MatchPlayer';
import { logInfo, logError } from '../utils/logger';
// Environment variables should be loaded automatically
// Database configuration
const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'quiz_app',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  models: [
    User,
    Category,
    QuestionBankItem,
    QuestionBankOption,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    QuizAttemptAnswer,
    Match,
    MatchPlayer
  ],
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },

});

// Test database connection
export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logInfo('Database connection established successfully');
    
    // Sync models in development - preserve existing data
    if (process.env.NODE_ENV === 'development') {
      // Use force: false and alter: false to avoid constraint conflicts
      // Just sync without altering to prevent duplicate constraint errors
      await sequelize.sync({ force: false, alter: false });
      logInfo('Database models synchronized - schema validation only');
      
      // Only seed if tables are empty (first time setup)
      const userCount = await User.count();
      const categoryCount = await Category.count();
      
      if (userCount === 0 && categoryCount === 0) {
        logInfo('Database is empty - running initial seeding...');
        try {
          const EngineeringSeeder = await import('../scripts/engineeringSeeder');
          const seeder = new EngineeringSeeder.EngineeringSeeder();
          await seeder.run();
          logInfo('Engineering database seeded successfully');
        } catch (seedError) {
          logError('Error seeding engineering database', seedError as Error);
        }
      } else {
        logInfo(`Database already contains data (${userCount} users, ${categoryCount} categories) - skipping seeding`);
      }
    } else {
      // Production: only sync without altering
      await sequelize.sync({ force: false, alter: false });
      logInfo('Database models synchronized - production mode');
    }
  } catch (error) {
    logError('Unable to connect to database', error as Error);
    throw error;
  }
};

export { sequelize };
export default sequelize;
