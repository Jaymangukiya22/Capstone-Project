export declare class RedisService {
    private client;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<boolean>;
    del(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    flushPattern(pattern: string): Promise<void>;
    cacheQuiz(quizId: number, data: any, ttlSeconds?: number): Promise<void>;
    getCachedQuiz(quizId: number): Promise<any | null>;
    invalidateQuizCache(quizId: number): Promise<void>;
    cacheCategories(data: any, ttlSeconds?: number): Promise<void>;
    getCachedCategories(): Promise<any | null>;
    invalidateCategoriesCache(): Promise<void>;
}
export declare const redisService: RedisService;
//# sourceMappingURL=redis.d.ts.map