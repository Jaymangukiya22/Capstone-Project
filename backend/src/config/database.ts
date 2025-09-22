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
import dotenv from 'dotenv';
dotenv.config();
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
    
    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force: false }); // Recreate tables to fix schema issues
      logInfo('Database models synchronized with force: true - tables recreated');
      
      // Run engineering seeder after sync
      try {
        const EngineeringSeeder = await import('../scripts/engineeringSeeder');
        const seeder = new EngineeringSeeder.EngineeringSeeder();
        await seeder.run();
        logInfo('Engineering database seeded successfully');
      } catch (seedError) {
        logError('Error seeding engineering database', seedError as Error);
        // Fallback to quick seeder if engineering seeder fails
        // try {
        //   const { default: quickSeed } = await import('../scripts/quickEngineeringSeeder');
        //   logInfo('Running quick engineering seeder as fallback...');
        // } catch (fallbackError) {
        //   logError('Fallback seeder also failed', fallbackError as Error);
        // }
      }
    } else {
      logInfo('Database sync skipped - using existing schema');
    }
  } catch (error) {
    logError('Unable to connect to database', error as Error);
    throw error;
  }
};

export { sequelize };
export default sequelize;
