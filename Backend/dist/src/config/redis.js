"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
class RedisWrapper {
    constructor() {
        this.client = null;
        this.inMemoryStore = new Map();
        this.isConnected = false;
    }
    async connect() {
        try {
            this.client = (0, redis_1.createClient)({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                socket: {
                    connectTimeout: 2000
                }
            });
            this.client.on('error', (err) => {
                (0, logger_1.logError)('Redis Client Error', err);
                this.isConnected = false;
            });
            await this.client.connect();
            this.isConnected = true;
            (0, logger_1.logInfo)('Connected to Redis');
        }
        catch (error) {
            (0, logger_1.logInfo)('Redis unavailable, using in-memory fallback');
            this.isConnected = false;
        }
    }
    async setEx(key, seconds, value) {
        if (this.isConnected && this.client) {
            try {
                await this.client.setEx(key, seconds, value);
                return;
            }
            catch (error) {
            }
        }
        const expiry = Date.now() + (seconds * 1000);
        this.inMemoryStore.set(key, { value, expiry });
    }
    async get(key) {
        if (this.isConnected && this.client) {
            try {
                return await this.client.get(key);
            }
            catch (error) {
            }
        }
        const item = this.inMemoryStore.get(key);
        if (!item)
            return null;
        if (item.expiry && Date.now() > item.expiry) {
            this.inMemoryStore.delete(key);
            return null;
        }
        return item.value;
    }
    async del(key) {
        if (this.isConnected && this.client) {
            try {
                await this.client.del(key);
                return;
            }
            catch (error) {
            }
        }
        this.inMemoryStore.delete(key);
    }
    async exists(key) {
        if (this.isConnected && this.client) {
            try {
                const result = await this.client.exists(key);
                return result === 1;
            }
            catch (error) {
            }
        }
        const item = this.inMemoryStore.get(key);
        if (!item)
            return false;
        if (item.expiry && Date.now() > item.expiry) {
            this.inMemoryStore.delete(key);
            return false;
        }
        return true;
    }
}
exports.redis = new RedisWrapper();
exports.redis.connect().catch(error => {
    (0, logger_1.logError)('Failed to initialize Redis connection', error);
});
//# sourceMappingURL=redis.js.map