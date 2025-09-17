export interface CreateCategoryData {
    name: string;
    parentId?: number | null;
}
export declare class CategoryService {
    createCategory(data: CreateCategoryData): Promise<any>;
    getAllCategories(): Promise<any[]>;
    getCategoryById(id: number): Promise<any | null>;
    getCategoryHierarchy(): Promise<any[]>;
    updateCategory(id: number, data: Partial<CreateCategoryData>): Promise<any>;
    deleteCategory(id: number): Promise<boolean>;
    private checkCircularReference;
}
export declare const categoryService: CategoryService;
//# sourceMappingURL=categoryService.d.ts.map