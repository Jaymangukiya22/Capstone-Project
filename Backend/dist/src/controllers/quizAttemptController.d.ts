import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare const startQuizAttempt: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const submitAnswer: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const completeQuizAttempt: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getAttemptById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getUserAttempts: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getLeaderboard: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getUserStats: (req: AuthenticatedRequest, res: Response) => Promise<void>;
//# sourceMappingURL=quizAttemptController.d.ts.map