import { Model } from 'sequelize-typescript';
import { Category } from './Category';
import { User } from './User';
import { QuizQuestion } from './QuizQuestion';
import { Difficulty } from '../types/enums';
export declare class Quiz extends Model {
    id: number;
    title: string;
    description?: string;
    difficulty: Difficulty;
    timeLimit?: number;
    maxQuestions?: number;
    categoryId: number;
    createdById: number;
    isActive: boolean;
    popularity: number;
    createdAt: Date;
    updatedAt: Date;
    category: Category;
    createdBy: User;
    quizQuestions: QuizQuestion[];
}
//# sourceMappingURL=Quiz.d.ts.map