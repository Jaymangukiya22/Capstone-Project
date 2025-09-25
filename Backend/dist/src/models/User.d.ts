import { Model } from 'sequelize-typescript';
import { QuestionBankItem } from './QuestionBankItem';
import { Quiz } from './Quiz';
import { QuizAttempt } from './QuizAttempt';
import { MatchPlayer } from './MatchPlayer';
import { UserRole } from '../types/enums';
export declare class User extends Model {
    id: number;
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    eloRating: number;
    totalMatches: number;
    wins: number;
    losses: number;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    createdQuestions: QuestionBankItem[];
    createdQuizzes: Quiz[];
    quizAttempts: QuizAttempt[];
    matchPlayers: MatchPlayer[];
}
//# sourceMappingURL=User.d.ts.map