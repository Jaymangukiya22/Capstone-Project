import { PrismaClient } from '@prisma/client';
import { redisService } from '../src/utils/redis';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://quiz_user:quiz_password@localhost:5432/quiz_db_test?schema=public'
    }
  }
});

beforeAll(async () => {
  // Connect to Redis for tests
  await redisService.connect();
  
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  try {
    // Clean up database - check if tables exist first
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableNames = (tables as any[]).map(t => t.table_name);
    
    if (tableNames.includes('options')) {
      await prisma.option.deleteMany();
    }
    if (tableNames.includes('questions')) {
      await prisma.question.deleteMany();
    }
    if (tableNames.includes('quizzes')) {
      await prisma.quiz.deleteMany();
    }
    if (tableNames.includes('categories')) {
      await prisma.category.deleteMany();
    }
  } catch (error) {
    console.log('Database cleanup skipped - tables may not exist yet');
  }
  
  // Disconnect from database
  await prisma.$disconnect();
  
  // Clean up Redis
  try {
    await redisService.flushAll();
    await redisService.disconnect();
  } catch (error) {
    console.log('Redis cleanup skipped');
  }
});

beforeEach(async () => {
  // Clear Redis cache before each test
  await redisService.flushAll();
});

export { prisma };
