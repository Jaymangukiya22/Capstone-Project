export declare class InMemoryStore {
    private store;
    set(key: string, value: string): Promise<string | null>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    flushall(): Promise<void>;
    size(): number;
}
//# sourceMappingURL=InMemoryStore.d.ts.map