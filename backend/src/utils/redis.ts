import { createClient } from 'redis';

export class RedisService {
  private client: ReturnType<typeof createClient>;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
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

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async flushPattern(pattern: string): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Redis FLUSH PATTERN error:', error);
    }
  }

  async flushAll(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      await this.client.flushAll();
    } catch (error) {
      console.error('Redis FLUSH ALL error:', error);
    }
  }

  // Cache helper methods
  async cacheQuiz(quizId: number, data: any, ttlSeconds: number = 300): Promise<void> {
    const key = `quiz:${quizId}`;
    await this.set(key, JSON.stringify(data), ttlSeconds);
  }

  async getCachedQuiz(quizId: number): Promise<any | null> {
    const key = `quiz:${quizId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateQuizCache(quizId: number): Promise<void> {
    const key = `quiz:${quizId}`;
    await this.del(key);
  }

  async cacheCategories(data: any, ttlSeconds: number = 600): Promise<void> {
    const key = 'categories:all';
    await this.set(key, JSON.stringify(data), ttlSeconds);
  }

  async getCachedCategories(): Promise<any | null> {
    const key = 'categories:all';
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateCategoriesCache(): Promise<void> {
    const key = 'categories:all';
    await this.del(key);
  }
}

export const redisService = new RedisService();
