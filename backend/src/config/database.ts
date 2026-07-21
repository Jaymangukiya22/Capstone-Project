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
import { MatchAnswer } from '../models/MatchAnswer';
import { logInfo, logError } from '../utils/logger';

// Environment variables should be loaded automatically
// Database configuration
const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'quizup_app',
  username: process.env.DB_USER || 'quizup_user',
  password: process.env.DB_PASSWORD || 'quizup_password',
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
    MatchPlayer,
    MatchAnswer
  ],
  pool: {
    // Previously hardcoded to max:10 regardless of DB_POOL_MAX/DB_POOL_MIN -
    // Postgres itself is tuned for a much larger max_connections budget
    // (docker-compose.yml POSTGRES_MAX_CONNECTIONS), so a pool this small was
    // the actual bottleneck under concurrent load, not the database.
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000', 10),
    idle: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '10000', 10),
  },
});

// Test database connection with retry logic
export const connectDatabase = async (): Promise<void> => {
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      logInfo('Database connection established successfully');
      break;
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        logInfo(`Database connection failed (attempt ${retries}/${maxRetries}), retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }
  
  try {
    
    // Sync models in development - preserve existing data
    if (process.env.NODE_ENV === 'development') {
      // Use force: false and alter: false to avoid constraint conflicts
      // Just sync without altering to prevent duplicate constraint errors
      await sequelize.sync({ alter: true });
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
      await sequelize.sync({ force: false });
      logInfo('Database models synchronized - production mode');
    }
  } catch (error) {
    logError('Unable to connect to database', error as Error);
    throw error;
  }
};

export { sequelize };
export default sequelize;
