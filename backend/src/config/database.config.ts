import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

// Prisma Client Configuration
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
});

// Redis Client Configuration
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Initialize Redis connection
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};

// Database connection function
const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL database');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    await redisClient.quit();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
};

export {
  prisma,
  redisClient,
  connectDatabase,
  connectRedis,
  disconnectDatabase
};
