import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import categoryRoutes from './routes/categoryRoutes';
import quizRoutes from './routes/quizRoutes';
import questionRoutes from './routes/questionRoutes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { basicAuth } from './middleware/auth';

// Import Redis service
import { redisService } from './utils/redis';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Quiz App Backend',
    version: '1.0.0'
  });
});

// API Routes with basic authentication
app.use('/api/categories', basicAuth, categoryRoutes);
app.use('/api/quizzes', basicAuth, quizRoutes);
app.use('/api/questions', basicAuth, questionRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  await redisService.disconnect();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Connect to Redis
    await redisService.connect();
    console.log('✅ Connected to Redis');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
