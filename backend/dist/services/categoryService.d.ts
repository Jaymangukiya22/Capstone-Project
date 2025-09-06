import { Category } from '@prisma/client';
export declare class CategoryService {
    createCategory(name: string, parentId?: number): Promise<Category>;
    getAllCategories(): Promise<Category[]>;
    getCategoryById(id: number): Promise<Category | null>;
    getCategoryHierarchy(): Promise<Category[]>;
    updateCategory(id: number, name: string, parentId?: number): Promise<Category>;
    deleteCategory(id: number): Promise<void>;
    private checkCircularReference;
}
export declare const categoryService: CategoryService;
//# sourceMappingURL=categoryService.d.ts.map