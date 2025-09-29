import { Model } from 'sequelize-typescript';
import { QuizAttempt } from './QuizAttempt';
import { QuestionBankItem } from './QuestionBankItem';
export declare class QuizAttemptAnswer extends Model {
    id: number;
    attemptId: number;
    questionId: number;
    selectedOptions: number[];
    isCorrect: boolean;
    timeSpent?: number;
    createdAt: Date;
    attempt: QuizAttempt;
    question: QuestionBankItem;
}
//# sourceMappingURL=QuizAttemptAnswer.d.ts.map