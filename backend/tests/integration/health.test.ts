import request from 'supertest';
import express from 'express';
import healthRoutes from '../../src/routes/healthRoutes';
import { testSequelize } from '../setup';

const app = express();
app.use(express.json());
app.use('/health', healthRoutes);

describe('Health Check Integration Tests', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.environment).toBeDefined();
    });

    it('should include database status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.database).toBeDefined();
      expect(response.body.database.status).toBe('connected');
    });

    it('should include memory usage', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.memory).toBeDefined();
      expect(response.body.memory.used).toBeDefined();
      expect(response.body.memory.total).toBeDefined();
      expect(response.body.memory.free).toBeDefined();
    });

    it('should include service information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.service).toBeDefined();
      expect(response.body.service.name).toBeDefined();
      expect(response.body.service.version).toBeDefined();
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.checks).toBeDefined();
      expect(Array.isArray(response.body.checks)).toBe(true);
    });

    it('should include database connectivity check', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const dbCheck = response.body.checks.find((check: any) => check.name === 'database');
      expect(dbCheck).toBeDefined();
      expect(dbCheck.status).toBe('healthy');
    });

    it('should include memory check', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const memoryCheck = response.body.checks.find((check: any) => check.name === 'memory');
      expect(memoryCheck).toBeDefined();
      expect(memoryCheck.status).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.ready).toBe(true);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should check database readiness', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.database).toBeDefined();
      expect(response.body.database.ready).toBe(true);
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body.alive).toBe(true);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should include process information', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body.process).toBeDefined();
      expect(response.body.process.pid).toBeDefined();
      expect(response.body.process.uptime).toBeDefined();
    });
  });
});
