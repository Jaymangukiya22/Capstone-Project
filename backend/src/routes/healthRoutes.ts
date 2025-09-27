import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      service: {
        name: 'QuizUP Backend',
        version: '1.0.0'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        free: Math.round((process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) / 1024 / 1024)
      }
    };

    // Test database connection
    try {
      await sequelize.authenticate();
      (healthData as any).database = {
        status: 'connected'
      };
    } catch (error) {
      (healthData as any).database = {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    res.status(200).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const checks = [];

    // Database check
    try {
      await sequelize.authenticate();
      checks.push({
        name: 'database',
        status: 'healthy',
        message: 'Database connection successful'
      });
    } catch (error) {
      checks.push({
        name: 'database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed'
      });
    }

    // Memory check
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    checks.push({
      name: 'memory',
      status: memoryUsedMB < 500 ? 'healthy' : 'warning',
      message: `Memory usage: ${memoryUsedMB}MB`
    });

    const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';

    res.status(200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness check
router.get('/ready', async (req: Request, res: Response) => {
  try {
    let ready = true;
    const checks: any = {};

    // Check database readiness
    try {
      await sequelize.authenticate();
      checks.database = { ready: true };
    } catch (error) {
      checks.database = { ready: false, error: error instanceof Error ? error.message : 'Unknown error' };
      ready = false;
    }

    res.status(ready ? 200 : 503).json({
      ready,
      timestamp: new Date().toISOString(),
      ...checks
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness check
router.get('/live', async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({
      alive: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
