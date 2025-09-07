import { Request, Response, NextFunction } from 'express';
export declare class QuestionController {
    createQuestion(req: Request, res: Response, next: NextFunction): Promise<void>;
    addQuestionToQuiz(req: Request, res: Response, next: NextFunction): Promise<void>;
    getQuestionsByQuizId(req: Request, res: Response, next: NextFunction): Promise<void>;
    getQuestionById(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void>;
    getQuestionStats(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const questionController: QuestionController;
//# sourceMappingURL=questionController.d.ts.map