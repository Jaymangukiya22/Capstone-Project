"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = exports.StoreFactory = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
class InMemoryStore {
    constructor() {
        this.data = new Map();
        this.hashData = new Map();
        this.sortedSets = new Map();
        this.counters = new Map();
        (0, logger_1.logWarn)('Using in-memory store as Redis fallback - data will not persist across restarts');
        setInterval(() => {
            this.cleanupExpiredKeys();
        }, 60000);
    }
    cleanupExpiredKeys() {
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, item] of this.data.entries()) {
            if (item.expiry && item.expiry <= now) {
                expiredKeys.push(key);
            }
        }
        for (const key of expiredKeys) {
            this.data.delete(key);
        }
        if (expiredKeys.length > 0) {
            (0, logger_1.logInfo)(`Cleaned up ${expiredKeys.length} expired keys from in-memory store`);
        }
    }
    isExpired(key) {
        const item = this.data.get(key);
        if (!item)
            return true;
        if (!item.expiry)
            return false;
        return item.expiry <= Date.now();
    }
    async get(key) {
        if (this.isExpired(key)) {
            this.data.delete(key);
            return null;
        }
        return this.data.get(key)?.value || null;
    }
    async set(key, value, ttl) {
        const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
        this.data.set(key, { value, expiry });
    }
    async del(key) {
        this.data.delete(key);
        this.hashData.delete(key);
        this.sortedSets.delete(key);
        this.counters.delete(key);
    }
    async exists(key) {
        return !this.isExpired(key) && this.data.has(key);
    }
    async expire(key, ttl) {
        const item = this.data.get(key);
        if (item) {
            item.expiry = Date.now() + (ttl * 1000);
        }
    }
    async keys(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const matchingKeys = [];
        for (const key of this.data.keys()) {
            if (!this.isExpired(key) && regex.test(key)) {
                matchingKeys.push(key);
            }
        }
        return matchingKeys;
    }
    async incr(key) {
        const currentValue = this.counters.get(key) || 0;
        const newValue = currentValue + 1;
        this.counters.set(key, newValue);
        return newValue;
    }
    async decr(key) {
        const currentValue = this.counters.get(key) || 0;
        const newValue = currentValue - 1;
        this.counters.set(key, newValue);
        return newValue;
    }
    async hget(key, field) {
        const hash = this.hashData.get(key);
        return hash?.get(field) || null;
    }
    async hset(key, field, value) {
        if (!this.hashData.has(key)) {
            this.hashData.set(key, new Map());
        }
        this.hashData.get(key).set(field, value);
    }
    async hdel(key, field) {
        const hash = this.hashData.get(key);
        if (hash) {
            hash.delete(field);
            if (hash.size === 0) {
                this.hashData.delete(key);
            }
        }
    }
    async hgetall(key) {
        const hash = this.hashData.get(key);
        if (!hash)
            return {};
        const result = {};
        for (const [field, value] of hash.entries()) {
            result[field] = value;
        }
        return result;
    }
    async zadd(key, score, member) {
        if (!this.sortedSets.has(key)) {
            this.sortedSets.set(key, new Map());
        }
        this.sortedSets.get(key).set(member, score);
    }
    async zrange(key, start, stop) {
        const sortedSet = this.sortedSets.get(key);
        if (!sortedSet)
            return [];
        const entries = Array.from(sortedSet.entries())
            .sort((a, b) => a[1] - b[1])
            .map(([member]) => member);
        const actualStop = stop === -1 ? entries.length - 1 : stop;
        return entries.slice(start, actualStop + 1);
    }
    async zrem(key, member) {
        const sortedSet = this.sortedSets.get(key);
        if (sortedSet) {
            sortedSet.delete(member);
            if (sortedSet.size === 0) {
                this.sortedSets.delete(key);
            }
        }
    }
    async flushall() {
        this.data.clear();
        this.hashData.clear();
        this.sortedSets.clear();
        this.counters.clear();
    }
    async ping() {
        return 'PONG';
    }
    async disconnect() {
        (0, logger_1.logInfo)('In-memory store disconnected');
    }
}
class RedisStore {
    constructor(client) {
        this.client = client;
    }
    async get(key) {
        return await this.client.get(key);
    }
    async set(key, value, ttl) {
        if (ttl) {
            await this.client.setEx(key, ttl, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async del(key) {
        await this.client.del(key);
    }
    async exists(key) {
        const result = await this.client.exists(key);
        return result > 0;
    }
    async expire(key, ttl) {
        await this.client.expire(key, ttl);
    }
    async keys(pattern) {
        return await this.client.keys(pattern);
    }
    async incr(key) {
        return await this.client.incr(key);
    }
    async decr(key) {
        return await this.client.decr(key);
    }
    async hget(key, field) {
        const result = await this.client.hGet(key, field);
        return result || null;
    }
    async hset(key, field, value) {
        await this.client.hSet(key, field, value);
    }
    async hdel(key, field) {
        await this.client.hDel(key, field);
    }
    async hgetall(key) {
        return await this.client.hGetAll(key);
    }
    async zadd(key, score, member) {
        await this.client.zAdd(key, { score, value: member });
    }
    async zrange(key, start, stop) {
        return await this.client.zRange(key, start, stop);
    }
    async zrem(key, member) {
        await this.client.zRem(key, member);
    }
    async flushall() {
        await this.client.flushAll();
    }
    async ping() {
        return await this.client.ping();
    }
    async disconnect() {
        await this.client.disconnect();
    }
}
class StoreFactory {
    static async createStore(redisUrl, options = {}) {
        const { connectionTimeout = 3000, retryAttempts = 3, fallbackToMemory = true } = options;
        if (this.instance) {
            return this.instance;
        }
        if (redisUrl || process.env.REDIS_URL) {
            const url = redisUrl || process.env.REDIS_URL;
            for (let attempt = 1; attempt <= retryAttempts; attempt++) {
                try {
                    (0, logger_1.logInfo)(`Attempting Redis connection (attempt ${attempt}/${retryAttempts})`);
                    const client = (0, redis_1.createClient)({
                        url,
                        socket: {
                            connectTimeout: connectionTimeout,
                            reconnectStrategy: (retries) => {
                                if (retries > 5) {
                                    (0, logger_1.logError)('Redis reconnection failed after 5 attempts');
                                    return false;
                                }
                                return Math.min(retries * 100, 3000);
                            }
                        }
                    });
                    client.on('error', (error) => {
                        (0, logger_1.logError)('Redis client error:', error);
                    });
                    client.on('connect', () => {
                        (0, logger_1.logInfo)('Redis client connected');
                    });
                    client.on('ready', () => {
                        (0, logger_1.logInfo)('Redis client ready');
                        this.isRedisConnected = true;
                    });
                    client.on('end', () => {
                        (0, logger_1.logWarn)('Redis connection ended');
                        this.isRedisConnected = false;
                    });
                    await Promise.race([
                        client.connect(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), connectionTimeout))
                    ]);
                    await client.ping();
                    (0, logger_1.logInfo)('Successfully connected to Redis');
                    this.instance = new RedisStore(client);
                    this.isRedisConnected = true;
                    return this.instance;
                }
                catch (error) {
                    (0, logger_1.logWarn)(`Redis connection attempt ${attempt} failed:`, error);
                    if (attempt === retryAttempts) {
                        (0, logger_1.logError)('All Redis connection attempts failed');
                    }
                    else {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }
            }
        }
        if (fallbackToMemory) {
            (0, logger_1.logWarn)('Redis unavailable, using in-memory store as fallback');
            this.instance = new InMemoryStore();
            this.isRedisConnected = false;
            return this.instance;
        }
        else {
            throw new Error('Redis connection failed and fallback disabled');
        }
    }
    static getInstance() {
        return this.instance;
    }
    static isRedisActive() {
        return this.isRedisConnected;
    }
    static async reset() {
        if (this.instance) {
            await this.instance.disconnect();
            this.instance = null;
            this.isRedisConnected = false;
        }
    }
    static async healthCheck() {
        if (!this.instance) {
            return {
                healthy: false,
                type: 'memory',
                error: 'Store not initialized'
            };
        }
        try {
            const start = Date.now();
            await this.instance.ping();
            const latency = Date.now() - start;
            return {
                healthy: true,
                type: this.isRedisConnected ? 'redis' : 'memory',
                latency
            };
        }
        catch (error) {
            return {
                healthy: false,
                type: this.isRedisConnected ? 'redis' : 'memory',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.StoreFactory = StoreFactory;
StoreFactory.instance = null;
StoreFactory.isRedisConnected = false;
const store = async () => {
    return await StoreFactory.createStore();
};
exports.store = store;
exports.default = StoreFactory;
//# sourceMappingURL=store.js.map