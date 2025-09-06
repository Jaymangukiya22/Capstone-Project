import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        username: string;
        role: string;
    };
}
export declare const basicAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map