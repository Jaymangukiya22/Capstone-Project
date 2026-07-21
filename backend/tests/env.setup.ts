/// <reference types="node" />

process.env.NODE_ENV = 'test';

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'quizup_test';
process.env.DB_USER = process.env.DB_USER || 'quizup_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'quizup_password';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.TEST_BYPASS_AUTH = 'true';

process.env.LOG_LEVEL = 'error';
