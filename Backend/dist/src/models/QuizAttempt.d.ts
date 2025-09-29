import { Model } from 'sequelize-typescript';
import { User } from './User';
import { Quiz } from './Quiz';
import { QuizAttemptAnswer } from './QuizAttemptAnswer';
import { AttemptStatus } from '../types/enums';
export declare class QuizAttempt extends Model {
    id: number;
    userId: number;
    quizId: number;
    status: AttemptStatus;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    timeSpent?: number;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    quiz: Quiz;
    answers: QuizAttemptAnswer[];
}
//# sourceMappingURL=QuizAttempt.d.ts.map