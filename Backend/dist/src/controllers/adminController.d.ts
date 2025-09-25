import { Request, Response, NextFunction } from 'express';
export declare class AdminController {
    getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteUser(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSystemStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    seedDatabase(req: Request, res: Response, next: NextFunction): Promise<void>;
    clearDatabase(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSystemLogs(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const adminController: AdminController;
//# sourceMappingURL=adminController.d.ts.map