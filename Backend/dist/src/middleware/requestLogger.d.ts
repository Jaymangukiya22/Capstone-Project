import { Request, Response } from 'express';
export declare const requestLogger: (req: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>, callback: (err?: Error) => void) => void;
export declare const enhancedRequestLogger: (req: Request, res: Response, next: Function) => void;
export default requestLogger;
//# sourceMappingURL=requestLogger.d.ts.map