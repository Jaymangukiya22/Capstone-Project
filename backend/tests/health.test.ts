import request from 'supertest';
import express from 'express';

// Create a minimal app for health check testing
const createTestApp = () => {
  const app = express();
  
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Quiz App Backend',
      version: '1.0.0'
    });
  });
  
  return app;
};

describe('Health Check', () => {
  const app = createTestApp();

  test('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'OK',
      service: 'Quiz App Backend',
      version: '1.0.0'
    });
    expect(response.body.timestamp).toBeDefined();
  });

  test('should respond quickly', async () => {
    const start = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100); // Should respond within 100ms
  });
});
