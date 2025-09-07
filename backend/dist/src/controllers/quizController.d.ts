import { Request, Response, NextFunction } from 'express';
export declare class QuizController {
    createQuiz(req: Request, res: Response, next: NextFunction): Promise<void>;
    getQuizById(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAllQuizzes(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateQuiz(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteQuiz(req: Request, res: Response, next: NextFunction): Promise<void>;
    getQuizStats(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const quizController: QuizController;
//# sourceMappingURL=quizController.d.ts.map