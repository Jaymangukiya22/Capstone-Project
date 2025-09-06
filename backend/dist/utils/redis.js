"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.RedisService = void 0;
const redis_1 = require("redis");
class RedisService {
    constructor() {
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
            this.isConnected = false;
        });
        this.client.on('connect', () => {
            console.log('Redis Client Connected');
            this.isConnected = true;
        });
    }
    async connect() {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }
    async get(key) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            return await this.client.get(key);
        }
        catch (error) {
            console.error('Redis GET error:', error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            if (ttlSeconds) {
                await this.client.setEx(key, ttlSeconds, value);
            }
            else {
                await this.client.set(key, value);
            }
            return true;
        }
        catch (error) {
            console.error('Redis SET error:', error);
            return false;
        }
    }
    async del(key) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            await this.client.del(key);
            return true;
        }
        catch (error) {
            console.error('Redis DEL error:', error);
            return false;
        }
    }
    async exists(key) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error('Redis EXISTS error:', error);
            return false;
        }
    }
    async flushPattern(pattern) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
        }
        catch (error) {
            console.error('Redis FLUSH PATTERN error:', error);
        }
    }
    async cacheQuiz(quizId, data, ttlSeconds = 300) {
        const key = `quiz:${quizId}`;
        await this.set(key, JSON.stringify(data), ttlSeconds);
    }
    async getCachedQuiz(quizId) {
        const key = `quiz:${quizId}`;
        const data = await this.get(key);
        return data ? JSON.parse(data) : null;
    }
    async invalidateQuizCache(quizId) {
        const key = `quiz:${quizId}`;
        await this.del(key);
    }
    async cacheCategories(data, ttlSeconds = 600) {
        const key = 'categories:all';
        await this.set(key, JSON.stringify(data), ttlSeconds);
    }
    async getCachedCategories() {
        const key = 'categories:all';
        const data = await this.get(key);
        return data ? JSON.parse(data) : null;
    }
    async invalidateCategoriesCache() {
        const key = 'categories:all';
        await this.del(key);
    }
}
exports.RedisService = RedisService;
exports.redisService = new RedisService();
//# sourceMappingURL=redis.js.map