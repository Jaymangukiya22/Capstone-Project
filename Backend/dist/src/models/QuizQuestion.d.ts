import { Model } from 'sequelize-typescript';
import { Quiz } from './Quiz';
import { QuestionBankItem } from './QuestionBankItem';
export declare class QuizQuestion extends Model {
    id: number;
    quizId: number;
    questionId: number;
    order?: number;
    createdAt: Date;
    quiz: Quiz;
    question: QuestionBankItem;
}
//# sourceMappingURL=QuizQuestion.d.ts.map