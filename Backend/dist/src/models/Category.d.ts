import { Model } from 'sequelize-typescript';
import { QuestionBankItem } from './QuestionBankItem';
import { Quiz } from './Quiz';
export declare class Category extends Model {
    id: number;
    name: string;
    description?: string;
    parentId?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    parent?: Category;
    children: Category[];
    questionBankItems: QuestionBankItem[];
    quizzes: Quiz[];
}
//# sourceMappingURL=Category.d.ts.map