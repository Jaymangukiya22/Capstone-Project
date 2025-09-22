import { createClient } from 'redis';
import { logInfo, logError } from '../utils/logger';

// Create Redis client with fallback to in-memory if unavailable
class RedisWrapper {
  private client: any = null;
  private inMemoryStore: Map<string, { value: string; expiry?: number }> = new Map();
  private isConnected: boolean = false;

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 2000
        }
      });

      this.client.on('error', (err: any) => {
        logError('Redis Client Error', err);
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      logInfo('Connected to Redis');
    } catch (error) {
      logInfo('Redis unavailable, using in-memory fallback');
      this.isConnected = false;
    }
  }

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.setEx(key, seconds, value);
        return;
      } catch (error) {
        // Fall through to in-memory
      }
    }
    
    // In-memory fallback
    const expiry = Date.now() + (seconds * 1000);
    this.inMemoryStore.set(key, { value, expiry });
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (error) {
        // Fall through to in-memory
      }
    }
    
    // In-memory fallback
    const item = this.inMemoryStore.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.inMemoryStore.delete(key);
      return null;
    }
    
    return item.value;
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (error) {
        // Fall through to in-memory
      }
    }
    
    // In-memory fallback
    this.inMemoryStore.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.exists(key);
        return result === 1;
      } catch (error) {
        // Fall through to in-memory
      }
    }
    
    // In-memory fallback
    const item = this.inMemoryStore.get(key);
    if (!item) return false;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.inMemoryStore.delete(key);
      return false;
    }
    
    return true;
  }
}

// Export singleton instance
export const redis = new RedisWrapper();

// Initialize connection
redis.connect().catch(error => {
  logError('Failed to initialize Redis connection', error);
});
