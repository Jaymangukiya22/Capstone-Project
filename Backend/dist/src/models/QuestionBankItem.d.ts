import { Model } from 'sequelize-typescript';
import { User } from './User';
import { Category } from './Category';
import { QuestionBankOption } from './QuestionBankOption';
import { QuizQuestion } from './QuizQuestion';
import { Difficulty } from '../types/enums';
export declare class QuestionBankItem extends Model {
    id: number;
    questionText: string;
    categoryId: number;
    difficulty: Difficulty;
    createdById: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    category: Category;
    createdBy: User;
    options: QuestionBankOption[];
    quizQuestions: QuizQuestion[];
}
export { Difficulty } from '../types/enums';
//# sourceMappingURL=QuestionBankItem.d.ts.map