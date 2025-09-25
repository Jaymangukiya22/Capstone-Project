"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryStore = void 0;
class InMemoryStore {
    constructor() {
        this.store = new Map();
    }
    async set(key, value) {
        this.store.set(key, value);
        return 'OK';
    }
    async get(key) {
        return this.store.get(key) || null;
    }
    async del(key) {
        const existed = this.store.has(key);
        this.store.delete(key);
        return existed ? 1 : 0;
    }
    async exists(key) {
        return this.store.has(key) ? 1 : 0;
    }
    async keys(pattern) {
        const keys = Array.from(this.store.keys());
        if (pattern === '*') {
            return keys;
        }
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return keys.filter(key => regex.test(key));
    }
    async flushall() {
        this.store.clear();
    }
    size() {
        return this.store.size;
    }
}
exports.InMemoryStore = InMemoryStore;
//# sourceMappingURL=InMemoryStore.js.map