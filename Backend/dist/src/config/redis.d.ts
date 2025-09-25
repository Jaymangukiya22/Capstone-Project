declare class RedisWrapper {
    private client;
    private inMemoryStore;
    private isConnected;
    connect(): Promise<void>;
    setEx(key: string, seconds: number, value: string): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
export declare const redis: RedisWrapper;
export {};
//# sourceMappingURL=redis.d.ts.map