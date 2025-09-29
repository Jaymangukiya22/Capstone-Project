-- Initialize database with proper permissions
-- This file is executed when the PostgreSQL container starts

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- Grant necessary permissions to the user
GRANT ALL PRIVILEGES ON DATABASE quiz_db TO quiz_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO quiz_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO quiz_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO quiz_user;
