import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare const createQuiz: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const assignQuestionsToQuiz: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const searchQuizzes: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getQuizById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getQuizForPlay: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const updateQuiz: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const deleteQuiz: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getQuizStats: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getPopularQuizzes: (req: AuthenticatedRequest, res: Response) => Promise<void>;
//# sourceMappingURL=quizController.d.ts.map