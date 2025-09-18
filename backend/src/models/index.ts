// Export all models
export { User } from './User';
export { Category } from './Category';
export { QuestionBankItem } from './QuestionBankItem';
export { QuestionBankOption } from './QuestionBankOption';
export { Quiz } from './Quiz';
export { QuizQuestion } from './QuizQuestion';
export { QuizAttempt } from './QuizAttempt';
export { QuizAttemptAnswer } from './QuizAttemptAnswer';
export { Match } from './Match';
export { MatchPlayer } from './MatchPlayer';

// Export all enums from shared location
export { 
  UserRole, 
  Difficulty, 
  AttemptStatus, 
  MatchStatus, 
  MatchType, 
  PlayerStatus 
} from '../types/enums';

// Export database connection
export { sequelize, connectDatabase } from '../config/database';
