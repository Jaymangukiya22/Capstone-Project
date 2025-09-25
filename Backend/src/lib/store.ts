import { createClient, RedisClientType } from 'redis';
import { logInfo, logError, logWarn } from '../utils/logger';

/**
 * Unified storage interface for Redis with in-memory fallback
 * Provides identical API regardless of underlying storage mechanism
 */
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

/**
 * In-memory storage implementation as Redis fallback
 * Implements all Redis-like operations in memory with TTL support
 */
class InMemoryStore implements StoreInterface {
  private data: Map<string, { value: string; expiry?: number }> = new Map();
  private hashData: Map<string, Map<string, string>> = new Map();
  private sortedSets: Map<string, Map<string, number>> = new Map();
  private counters: Map<string, number> = new Map();

  constructor() {
    logWarn('Using in-memory store as Redis fallback - data will not persist across restarts');
    
    // Cleanup expired keys every 60 seconds
    setInterval(() => {
      this.cleanupExpiredKeys();
    }, 60000);
  }

  private cleanupExpiredKeys(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.data.entries()) {
      if (item.expiry && item.expiry <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.data.delete(key);
    }

    if (expiredKeys.length > 0) {
      logInfo(`Cleaned up ${expiredKeys.length} expired keys from in-memory store`);
    }
  }

  private isExpired(key: string): boolean {
    const item = this.data.get(key);
    if (!item) return true;
    if (!item.expiry) return false;
    return item.expiry <= Date.now();
  }

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) {
      this.data.delete(key);
      return null;
    }
    return this.data.get(key)?.value || null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.data.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
    this.hashData.delete(key);
    this.sortedSets.delete(key);
    this.counters.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return !this.isExpired(key) && this.data.has(key);
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = this.data.get(key);
    if (item) {
      item.expiry = Date.now() + (ttl * 1000);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys: string[] = [];

    for (const key of this.data.keys()) {
      if (!this.isExpired(key) && regex.test(key)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  async incr(key: string): Promise<number> {
    const currentValue = this.counters.get(key) || 0;
    const newValue = currentValue + 1;
    this.counters.set(key, newValue);
    return newValue;
  }

  async decr(key: string): Promise<number> {
    const currentValue = this.counters.get(key) || 0;
    const newValue = currentValue - 1;
    this.counters.set(key, newValue);
    return newValue;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashData.get(key);
    return hash?.get(field) || null;
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.hashData.has(key)) {
      this.hashData.set(key, new Map());
    }
    this.hashData.get(key)!.set(field, value);
  }

  async hdel(key: string, field: string): Promise<void> {
    const hash = this.hashData.get(key);
    if (hash) {
      hash.delete(field);
      if (hash.size === 0) {
        this.hashData.delete(key);
      }
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashData.get(key);
    if (!hash) return {};
    
    const result: Record<string, string> = {};
    for (const [field, value] of hash.entries()) {
      result[field] = value;
    }
    return result;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    this.sortedSets.get(key)!.set(member, score);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const sortedSet = this.sortedSets.get(key);
    if (!sortedSet) return [];

    const entries = Array.from(sortedSet.entries())
      .sort((a, b) => a[1] - b[1]) // Sort by score
      .map(([member]) => member);

    const actualStop = stop === -1 ? entries.length - 1 : stop;
    return entries.slice(start, actualStop + 1);
  }

  async zrem(key: string, member: string): Promise<void> {
    const sortedSet = this.sortedSets.get(key);
    if (sortedSet) {
      sortedSet.delete(member);
      if (sortedSet.size === 0) {
        this.sortedSets.delete(key);
      }
    }
  }

  async flushall(): Promise<void> {
    this.data.clear();
    this.hashData.clear();
    this.sortedSets.clear();
    this.counters.clear();
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async disconnect(): Promise<void> {
    // No actual connection to close for in-memory store
    logInfo('In-memory store disconnected');
  }
}

/**
 * Redis wrapper that implements StoreInterface
 */
class RedisStore implements StoreInterface {
  constructor(private client: any) {}

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result > 0;
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return await this.client.decr(key);
  }

  async hget(key: string, field: string): Promise<string | null> {
    const result = await this.client.hGet(key, field);
    return result || null;
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hSet(key, field, value);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hDel(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hGetAll(key);
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zAdd(key, { score, value: member });
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.zRange(key, start, stop);
  }

  async zrem(key: string, member: string): Promise<void> {
    await this.client.zRem(key, member);
  }

  async flushall(): Promise<void> {
    await this.client.flushAll();
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}

/**
 * Store factory with automatic Redis fallback to in-memory
 * Attempts Redis connection first, falls back to in-memory if Redis unavailable
 */
export class StoreFactory {
  private static instance: StoreInterface | null = null;
  private static isRedisConnected: boolean = false;

  /**
   * Get store instance with automatic fallback
   * @param redisUrl Optional Redis connection URL
   * @param options Connection options
   * @returns Store instance (Redis or in-memory fallback)
   */
  static async createStore(
    redisUrl?: string,
    options: {
      connectionTimeout?: number;
      retryAttempts?: number;
      fallbackToMemory?: boolean;
    } = {}
  ): Promise<StoreInterface> {
    const {
      connectionTimeout = 3000,
      retryAttempts = 3,
      fallbackToMemory = true
    } = options;

    // Return existing instance if available
    if (this.instance) {
      return this.instance;
    }

    // Try Redis connection first
    if (redisUrl || process.env.REDIS_URL) {
      const url = redisUrl || process.env.REDIS_URL!;
      
      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          logInfo(`Attempting Redis connection (attempt ${attempt}/${retryAttempts})`);
          
          const client = createClient({
            url,
            socket: {
              connectTimeout: connectionTimeout,
              reconnectStrategy: (retries) => {
                if (retries > 5) {
                  logError('Redis reconnection failed after 5 attempts');
                  return false;
                }
                return Math.min(retries * 100, 3000);
              }
            }
          });

          // Handle Redis errors
          client.on('error', (error) => {
            logError('Redis client error:', error);
          });

          client.on('connect', () => {
            logInfo('Redis client connected');
          });

          client.on('ready', () => {
            logInfo('Redis client ready');
            this.isRedisConnected = true;
          });

          client.on('end', () => {
            logWarn('Redis connection ended');
            this.isRedisConnected = false;
          });

          // Connect with timeout
          await Promise.race([
            client.connect(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Redis connection timeout')), connectionTimeout)
            )
          ]);

          // Test connection
          await client.ping();

          logInfo('Successfully connected to Redis');
          this.instance = new RedisStore(client);
          this.isRedisConnected = true;
          return this.instance;

        } catch (error) {
          logWarn(`Redis connection attempt ${attempt} failed:`, error);
          
          if (attempt === retryAttempts) {
            logError('All Redis connection attempts failed');
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    }

    // Fallback to in-memory store
    if (fallbackToMemory) {
      logWarn('Redis unavailable, using in-memory store as fallback');
      this.instance = new InMemoryStore();
      this.isRedisConnected = false;
      return this.instance;
    } else {
      throw new Error('Redis connection failed and fallback disabled');
    }
  }

  /**
   * Get current store instance
   * @returns Current store instance or null if not initialized
   */
  static getInstance(): StoreInterface | null {
    return this.instance;
  }

  /**
   * Check if Redis is connected
   * @returns True if Redis is connected, false if using fallback
   */
  static isRedisActive(): boolean {
    return this.isRedisConnected;
  }

  /**
   * Reset store instance (useful for testing)
   */
  static async reset(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
      this.isRedisConnected = false;
    }
  }

  /**
   * Health check for store
   * @returns Health status and metadata
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    type: 'redis' | 'memory';
    latency?: number;
    error?: string;
  }> {
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
    } catch (error) {
      return {
        healthy: false,
        type: this.isRedisConnected ? 'redis' : 'memory',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export convenience instance
export const store = async (): Promise<StoreInterface> => {
  return await StoreFactory.createStore();
};

// Export for direct usage in match server and other services
export default StoreFactory;
