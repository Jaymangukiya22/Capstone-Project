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
import matchRoutes from './routes/matchRoutes';
import friendMatchRoutes from './routes/friendMatchRoutes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import utilities
import { logInfo, logError } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const IP_ADD = process.env.NETWORK_IP || '0.0.0.0';
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
// CORS Configuration
const allowedOrigins = [
  `http://${IP_ADD}:5173`,
  `http://${IP_ADD}:5174`,
  `http://${IP_ADD}:3001`,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3001',
  'http://10.80.5.18'
];
 
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow mobile apps, curl, etc.
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/friend-matches', friendMatchRoutes);

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

    app.listen(Number(PORT), '0.0.0.0', () => {
      const networkIP = process.env.NETWORK_IP || 'localhost';
      logInfo('Server started successfully', {
        port: PORT,
        host: '0.0.0.0',
        environment: process.env.NODE_ENV || 'development',
        healthCheck: `http://${networkIP}:${PORT}/health`,
        metrics: `http://${networkIP}:${PORT}/metrics`,
        networkAccess: `http://${networkIP}:${PORT}`
      });
    });
  } catch (error) {
    logError('Failed to start server', error as Error);
    process.exit(1);
  }
}

startServer();
