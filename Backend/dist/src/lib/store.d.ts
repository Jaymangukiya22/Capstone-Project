export interface StoreInterface {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    expire(key: string, ttl: number): Promise<void>;
    keys(pattern: string): Promise<string[]>;
    incr(key: string): Promise<number>;
    decr(key: string): Promise<number>;
    hget(key: string, field: string): Promise<string | null>;
    hset(key: string, field: string, value: string): Promise<void>;
    hdel(key: string, field: string): Promise<void>;
    hgetall(key: string): Promise<Record<string, string>>;
    zadd(key: string, score: number, member: string): Promise<void>;
    zrange(key: string, start: number, stop: number): Promise<string[]>;
    zrem(key: string, member: string): Promise<void>;
    flushall(): Promise<void>;
    ping(): Promise<string>;
    disconnect(): Promise<void>;
}
export declare class StoreFactory {
    private static instance;
    private static isRedisConnected;
    static createStore(redisUrl?: string, options?: {
        connectionTimeout?: number;
        retryAttempts?: number;
        fallbackToMemory?: boolean;
    }): Promise<StoreInterface>;
    static getInstance(): StoreInterface | null;
    static isRedisActive(): boolean;
    static reset(): Promise<void>;
    static healthCheck(): Promise<{
        healthy: boolean;
        type: 'redis' | 'memory';
        latency?: number;
        error?: string;
    }>;
}
export declare const store: () => Promise<StoreInterface>;
export default StoreFactory;
//# sourceMappingURL=store.d.ts.map