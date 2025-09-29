import { Model } from 'sequelize-typescript';
import { QuestionBankItem } from './QuestionBankItem';
export declare class QuestionBankOption extends Model {
    id: number;
    questionId: number;
    optionText: string;
    isCorrect: boolean;
    createdAt: Date;
    updatedAt: Date;
    question: QuestionBankItem;
}
//# sourceMappingURL=QuestionBankOption.d.ts.map