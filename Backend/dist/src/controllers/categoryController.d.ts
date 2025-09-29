import { Request, Response, NextFunction } from 'express';
export declare class CategoryController {
    createCategory(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateCategory(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCategoryPath(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSubcategories(req: Request, res: Response, next: NextFunction): Promise<void>;
    searchCategories(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const categoryController: CategoryController;
//# sourceMappingURL=categoryController.d.ts.map