/**
 * QuizUP Metrics Setup
 * Add this to your backend server.ts to enable monitoring
 */

import promClient from 'prom-client';
import { Sequelize } from 'sequelize';

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'quizup-backend'
});

// Create custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'quizup_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'quizup_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeUsers = new promClient.Gauge({
  name: 'quizup_active_users',
  help: 'Number of currently active users'
});

const quizAttemptsTotal = new promClient.Counter({
  name: 'quizup_quiz_attempts_total',
  help: 'Total number of quiz attempts',
  labelNames: ['difficulty', 'status']
});

const databaseConnections = new promClient.Gauge({
  name: 'quizup_database_connections',
  help: 'Number of active database connections'
});

// Register the metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(activeUsers);
register.registerMetric(quizAttemptsTotal);
register.registerMetric(databaseConnections);

// Middleware to track HTTP requests
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });

    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path
    }, duration);
  });

  next();
};

// Update metrics periodically
export const updateMetrics = async () => {
  try {
    // Update active users count (example)
    activeUsers.set(Math.floor(Math.random() * 100));

    // Update database connections (example)
    // const connectionCount = await sequelize.query(
    //   "SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'",
    //   { type: Sequelize.QueryTypes.SELECT }
    // );
    // databaseConnections.set(parseInt(connectionCount[0].count) || 0);

  } catch (error) {
    console.error('Error updating metrics:', error);
  }
};

// Export metrics endpoint
export const metricsEndpoint = async (req: any, res: any) => {
  try {
    // Update metrics
    await updateMetrics();

    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end((error as Error).message);
  }
};

// Initialize metrics
export const initMetrics = () => {
  // Update metrics every 30 seconds
  setInterval(updateMetrics, 30000);

  console.log('📊 Metrics initialized');
};