-- Initialize database with proper permissions
-- This file is executed when the PostgreSQL container starts as the postgres superuser

-- Create user if it doesn't exist (using DO block for compatibility)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'quizup_user') THEN
    CREATE USER quizup_user WITH PASSWORD 'quizup_password';
  END IF;
END $$;

-- Grant necessary permissions to the user
GRANT ALL PRIVILEGES ON DATABASE quizup_db TO quizup_user;

-- Grant schema permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO quizup_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO quizup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO quizup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO quizup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO quizup_user;
