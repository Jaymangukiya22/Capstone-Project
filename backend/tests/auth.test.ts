import request from 'supertest';
import express from 'express';
import { basicAuth } from '../src/middleware/auth';

// Create test app with auth middleware
const createAuthTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Protected route
  app.get('/protected', basicAuth, (req, res) => {
    res.json({ message: 'Access granted', user: (req as any).user });
  });
  
  // Public route
  app.get('/public', (req, res) => {
    res.json({ message: 'Public access' });
  });
  
  return app;
};

describe('Authentication', () => {
  const app = createAuthTestApp();
  const validCredentials = Buffer.from('aryan:admin').toString('base64');
  const invalidCredentials = Buffer.from('wrong:password').toString('base64');

  describe('Basic Authentication', () => {
    test('should allow access with valid credentials', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Basic ${validCredentials}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Access granted',
        user: { username: 'aryan' }
      });
    });

    test('should deny access with invalid credentials', async () => {
      await request(app)
        .get('/protected')
        .set('Authorization', `Basic ${invalidCredentials}`)
        .expect(401);
    });

    test('should deny access without credentials', async () => {
      await request(app)
        .get('/protected')
        .expect(401);
    });

    test('should deny access with malformed authorization header', async () => {
      await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    test('should allow access to public routes', async () => {
      const response = await request(app)
        .get('/public')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Public access'
      });
    });
  });
});
