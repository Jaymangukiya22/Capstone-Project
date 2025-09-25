import { Request, Response, NextFunction } from 'express';
interface CustomError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare const errorHandler: (error: CustomError, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export default errorHandler;
//# sourceMappingURL=errorHandler.d.ts.map