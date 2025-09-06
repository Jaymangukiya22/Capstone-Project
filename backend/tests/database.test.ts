import { PrismaClient } from '@prisma/client';
import { redisService } from '../src/utils/redis';

const prisma = new PrismaClient();

describe('Database Connections', () => {
  describe('PostgreSQL Connection', () => {
    test('should connect to PostgreSQL', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
    });

    test('should execute raw query', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toEqual([{ test: 1 }]);
    });

    test('should check database schema', async () => {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      const tableNames = (tables as any[]).map(t => t.table_name);
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('quizzes');
      expect(tableNames).toContain('questions');
      expect(tableNames).toContain('options');
    });
  });

  describe('Redis Connection', () => {
    test('should connect to Redis', async () => {
      await expect(redisService.connect()).resolves.not.toThrow();
    });

    test('should set and get values', async () => {
      const key = 'test:key';
      const value = 'test-value';
      
      await redisService.set(key, value, 60);
      const retrieved = await redisService.get(key);
      
      expect(retrieved).toBe(value);
    });

    test('should handle expiration', async () => {
      const key = 'test:expire';
      const value = 'expire-value';
      
      await redisService.set(key, value, 1); // 1 second TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const retrieved = await redisService.get(key);
      expect(retrieved).toBeNull();
    });

    test('should delete keys', async () => {
      const key = 'test:delete';
      const value = 'delete-value';
      
      await redisService.set(key, value, 60);
      await redisService.del(key);
      
      const retrieved = await redisService.get(key);
      expect(retrieved).toBeNull();
    });
  });
});
