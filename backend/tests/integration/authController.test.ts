import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import authRoutes from '../../src/routes/authRoutes';
import { User } from '../../src/models/User';
import { testSequelize, createTestUser } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Controller Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'securepassword123',
        role: 'PLAYER'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.token).toBeDefined();
      
      // Password should not be returned
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should hash the password', async () => {
      const userData = {
        username: 'testuser2',
        email: 'testuser2@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'plainpassword',
        role: 'PLAYER'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const user = await User.findOne({ where: { username: userData.username } });
      expect(user).toBeDefined();
      expect(user!.passwordHash).not.toBe(userData.password);
      expect(user!.passwordHash.length).toBeGreaterThan(50); // Bcrypt hash length
    });

    it('should return 400 for invalid registration data', async () => {
      const invalidData = {
        username: '', // Empty username
        email: 'invalid-email', // Invalid email format
        password: '123' // Too short password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.toLowerCase()).toContain('validation');
    });

    it('should return 409 for duplicate username', async () => {
      const userData = {
        username: 'duplicateuser',
        email: 'duplicate@example.com',
        firstName: 'Duplicate',
        lastName: 'User',
        password: 'password123',
        role: 'PLAYER'
      };

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to create duplicate
      const duplicateData = {
        ...userData,
        email: 'different@example.com' // Different email but same username
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'shared@example.com',
        firstName: 'User',
        lastName: 'One',
        password: 'password123',
        role: 'PLAYER'
      };

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to create duplicate with same email
      const duplicateData = {
        ...userData,
        username: 'user2' // Different username but same email
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;
    const testPassword = 'testpassword123';

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      testUser = await createTestUser({
        username: 'loginuser',
        email: 'login@example.com',
        passwordHash: hashedPassword
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        username: 'loginuser',
        password: testPassword
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(loginData.username);
      expect(response.body.data.token).toBeDefined();
      
      // Password should not be returned
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should login with email instead of username', async () => {
      const loginData = {
        username: 'login@example.com', // Using email as username
        password: testPassword
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('login@example.com');
    });

    it('should return 401 for invalid username', async () => {
      const loginData = {
        username: 'nonexistentuser',
        password: testPassword
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        username: 'loginuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return 401 for inactive user', async () => {
      await User.update(
        { isActive: false },
        { where: { id: testUser.id } }
      );

      const loginData = {
        username: 'loginuser',
        password: testPassword
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Account is inactive');
    });

    it('should return 400 for missing credentials', async () => {
      const loginData = {
        username: 'loginuser'
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser: any;
    let validToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      testUser = await createTestUser({
        username: 'refreshuser',
        email: 'refresh@example.com',
        passwordHash: hashedPassword
      });

      // Get a valid token by logging in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'refreshuser',
          password: 'password123'
        });

      validToken = loginResponse.body.data.token;
    });

    it('should refresh token with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe('refreshuser');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });

    it('should return 401 for inactive user', async () => {
      await User.update(
        { isActive: false },
        { where: { id: testUser.id } }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let testUser: any;
    let validToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      testUser = await createTestUser({
        username: 'profileuser',
        email: 'profile@example.com',
        firstName: 'Profile',
        lastName: 'User',
        passwordHash: hashedPassword
      });

      // Get a valid token by logging in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'profileuser',
          password: 'password123'
        });

      validToken = loginResponse.body.data.token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('profileuser');
      expect(response.body.data.email).toBe('profile@example.com');
      expect(response.body.data.firstName).toBe('Profile');
      expect(response.body.data.lastName).toBe('User');
      
      // Sensitive data should not be returned
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });
  });
});
