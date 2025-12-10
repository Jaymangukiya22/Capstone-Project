import Redis from 'ioredis';

let redisClient: Redis | null = null;
let redisPub: Redis | null = null;
let redisSub: Redis | null = null;
let initPromise: Promise<void> | null = null;

export async function initializeRedis() {
  if (initPromise) return initPromise;
  
  if (!redisClient) {
    initPromise = (async () => {
      const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

      redisClient = new Redis(url);
      redisPub = new Redis(url);
      redisSub = new Redis(url);

      // Wait for connections to be ready
      await Promise.all([
        redisClient.ping(),
        redisPub.ping(),
        redisSub.ping()
      ]);

      console.log('✅ Redis initialized successfully');
    })();
    
    await initPromise;
  }
  
  return initPromise || Promise.resolve();
}

export function getRedisClient(): Redis {
  if (!redisClient) throw new Error('Redis not initialized. Call initializeRedis() first.');
  return redisClient;
}

export function getRedisPubSub(): { pub: Redis; sub: Redis } {
  if (!redisPub || !redisSub) throw new Error('Redis not initialized. Call initializeRedis() first.');
  return { pub: redisPub, sub: redisSub };
}
