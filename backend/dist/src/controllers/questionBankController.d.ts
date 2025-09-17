import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare const uploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const createQuestion: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getQuestionsByCategory: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getAllQuestions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getQuestionById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const updateQuestion: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const deleteQuestion: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const bulkImport: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const uploadExcel: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const searchQuestions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
//# sourceMappingURL=questionBankController.d.ts.map