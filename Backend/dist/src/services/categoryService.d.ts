export interface CreateCategoryData {
    name: string;
    description?: string;
    parentId?: number | null;
    isActive?: boolean;
}
export interface CategoryQueryOptions {
    page?: number;
    limit?: number;
    parentId?: number | null;
    includeChildren?: boolean;
    includeQuizzes?: boolean;
    depth?: number;
    isActive?: boolean;
    search?: string;
}
export declare class CategoryService {
    createCategory(data: CreateCategoryData): Promise<any>;
    getAllCategories(options?: CategoryQueryOptions): Promise<{
        categories: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getCategoryById(id: number, includeChildren?: boolean, depth?: number): Promise<any | null>;
    getCategoryHierarchy(maxDepth?: number, includeQuizzes?: boolean): Promise<any[]>;
    getCategoryPath(id: number): Promise<any[]>;
    getSubcategories(parentId: number, depth?: number): Promise<any[]>;
    updateCategory(id: number, data: Partial<CreateCategoryData>): Promise<any>;
    deleteCategory(id: number): Promise<boolean>;
    searchCategories(query: string, options?: CategoryQueryOptions): Promise<{
        categories: any[];
        total: number;
    }>;
    private buildChildrenInclude;
    private checkCircularReference;
}
export declare const categoryService: CategoryService;
//# sourceMappingURL=categoryService.d.ts.map