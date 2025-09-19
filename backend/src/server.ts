// Initialize tracing first
import './tracing';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import promBundle from 'express-prom-bundle';
import { connectDatabase } from './models';

// Import routes
import categoryRoutes from './routes/categoryRoutes';
import quizRoutes from './routes/quizRoutes';
import questionRoutes from './routes/questionRoutes';
import authRoutes from './routes/authRoutes';
import questionBankRoutes from './routes/questionBankRoutes';
import quizAttemptRoutes from './routes/quizAttemptRoutes';
import adminRoutes from './routes/adminRoutes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import utilities
import { logInfo, logError } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics middleware
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project_name: 'quiz-app-backend' },
  promClient: {
    collectDefaultMetrics: {},
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(compression());
app.use(metricsMiddleware);
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Quiz Management System Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint to check routes
app.get('/debug/routes', (req, res) => {
  const routes: any[] = [];
  
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({
    success: true,
    data: routes,
    message: 'Available routes'
  });
});

// Metrics endpoint (exposed by express-prom-bundle)
// Available at /metrics

// API Routes
// app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  logInfo('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logInfo('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logInfo('Connected to PostgreSQL database');

    app.listen(PORT, () => {
      logInfo('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthCheck: `http://localhost:${PORT}/health`,
        metrics: `http://localhost:${PORT}/metrics`
      });
    });
  } catch (error) {
    logError('Failed to start server', error as Error);
    process.exit(1);
  }
}

startServer();
