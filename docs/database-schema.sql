-- QuizUP Database Schema (PostgreSQL)
-- Complete database schema with optimized indexes and constraints

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enumeration
CREATE TYPE user_role AS ENUM ('ADMIN', 'FACULTY', 'STUDENT', 'PLAYER');
CREATE TYPE difficulty_level AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE match_status AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE match_type AS ENUM ('FRIEND', 'RANKED', 'TOURNAMENT', 'AI');
CREATE TYPE attempt_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- Users table - Core user management
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'STUDENT',
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar VARCHAR(255),
    elo_rating INTEGER DEFAULT 1200,
    total_matches INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table - Hierarchical quiz categorization
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0,
    path VARCHAR(500), -- Materialized path for efficient tree queries
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_name_per_parent UNIQUE(name, parent_id)
);

-- Quizzes table - Quiz metadata and configuration
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    difficulty difficulty_level DEFAULT 'MEDIUM',
    time_limit INTEGER DEFAULT 30, -- seconds per question
    points_per_question INTEGER DEFAULT 100,
    time_bonus_enabled BOOLEAN DEFAULT TRUE,
    max_time_bonus INTEGER DEFAULT 50,
    negative_marking BOOLEAN DEFAULT FALSE,
    negative_points INTEGER DEFAULT 25,
    shuffle_questions BOOLEAN DEFAULT TRUE,
    shuffle_options BOOLEAN DEFAULT TRUE,
    max_attempts INTEGER DEFAULT 3,
    is_published BOOLEAN DEFAULT FALSE,
    tags TEXT[], -- Array of tags for flexible categorization
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question Bank Items - Reusable question repository
CREATE TABLE question_bank_items (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    explanation TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    difficulty difficulty_level DEFAULT 'MEDIUM',
    question_type VARCHAR(20) DEFAULT 'MCQ', -- MCQ, TRUE_FALSE, FILL_BLANK
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question Bank Options - Answer choices for questions
CREATE TABLE question_bank_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES question_bank_items(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz Questions - Association between quizzes and questions
CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES question_bank_items(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    points INTEGER DEFAULT 100,
    time_limit INTEGER, -- Override quiz default if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_question_per_quiz UNIQUE(quiz_id, question_id),
    CONSTRAINT unique_order_per_quiz UNIQUE(quiz_id, order_index)
);

-- Quiz Attempts - Individual user quiz sessions
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    status attempt_status DEFAULT 'IN_PROGRESS',
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    time_taken INTEGER DEFAULT 0, -- Total seconds
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz Attempt Answers - Individual question responses
CREATE TABLE quiz_attempt_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES question_bank_items(id) ON DELETE CASCADE,
    selected_options INTEGER[], -- Array of selected option IDs
    is_correct BOOLEAN DEFAULT FALSE,
    points_earned INTEGER DEFAULT 0,
    time_taken INTEGER DEFAULT 0, -- Seconds for this question
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Matches - Real-time match sessions
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
    match_type match_type DEFAULT 'FRIEND',
    status match_status DEFAULT 'WAITING',
    join_code VARCHAR(10) UNIQUE,
    max_players INTEGER DEFAULT 2,
    current_question_index INTEGER DEFAULT 0,
    time_per_question INTEGER DEFAULT 30,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Match Players - Participants in matches
CREATE TABLE match_players (
    id SERIAL PRIMARY KEY,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_ai BOOLEAN DEFAULT FALSE,
    ai_difficulty difficulty_level,
    score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_answers INTEGER DEFAULT 0,
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_per_match UNIQUE(match_id, user_id)
);

-- Leaderboards - Global and category-specific rankings
CREATE TABLE leaderboards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    elo_rating INTEGER DEFAULT 1200,
    total_matches INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_score DECIMAL(8,2) DEFAULT 0.00,
    best_streak INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_match_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_category UNIQUE(user_id, category_id)
);

-- Performance-optimized indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_elo_rating ON users(elo_rating DESC);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_path ON categories USING gin(string_to_array(path, '/'));
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;

CREATE INDEX idx_quizzes_category_id ON quizzes(category_id);
CREATE INDEX idx_quizzes_difficulty ON quizzes(difficulty);
CREATE INDEX idx_quizzes_created_by ON quizzes(created_by_id);
CREATE INDEX idx_quizzes_published ON quizzes(is_published) WHERE is_published = true;
CREATE INDEX idx_quizzes_tags ON quizzes USING gin(tags);

CREATE INDEX idx_question_bank_category ON question_bank_items(category_id);
CREATE INDEX idx_question_bank_difficulty ON question_bank_items(difficulty);
CREATE INDEX idx_question_bank_active ON question_bank_items(is_active) WHERE is_active = true;
CREATE INDEX idx_question_bank_tags ON question_bank_items USING gin(tags);
CREATE INDEX idx_question_bank_usage ON question_bank_items(usage_count DESC);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_question_id ON quiz_questions(question_id);
CREATE INDEX idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);

CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_join_code ON matches(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX idx_matches_created_by ON matches(created_by_id);
CREATE INDEX idx_matches_active ON matches(status) WHERE status IN ('WAITING', 'IN_PROGRESS');

CREATE INDEX idx_match_players_match_id ON match_players(match_id);
CREATE INDEX idx_match_players_user_id ON match_players(user_id);
CREATE INDEX idx_match_players_ready ON match_players(is_ready) WHERE is_ready = true;

CREATE INDEX idx_leaderboards_user_id ON leaderboards(user_id);
CREATE INDEX idx_leaderboards_category_id ON leaderboards(category_id);
CREATE INDEX idx_leaderboards_elo ON leaderboards(elo_rating DESC);
CREATE INDEX idx_leaderboards_win_rate ON leaderboards(win_rate DESC);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_bank_items_updated_at BEFORE UPDATE ON question_bank_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_attempts_updated_at BEFORE UPDATE ON quiz_attempts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Materialized view for quiz statistics
CREATE MATERIALIZED VIEW quiz_statistics AS
SELECT 
    q.id as quiz_id,
    q.title,
    q.category_id,
    COUNT(DISTINCT qa.id) as total_attempts,
    COUNT(DISTINCT qa.user_id) as unique_users,
    AVG(qa.score) as avg_score,
    MAX(qa.score) as max_score,
    AVG(qa.time_taken) as avg_time_taken,
    COUNT(DISTINCT qq.id) as total_questions,
    q.created_at,
    MAX(qa.completed_at) as last_attempted
FROM quizzes q
LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.status = 'COMPLETED'
LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.category_id, q.created_at;

CREATE UNIQUE INDEX idx_quiz_statistics_id ON quiz_statistics(quiz_id);
CREATE INDEX idx_quiz_statistics_category ON quiz_statistics(category_id);

-- Function to refresh quiz statistics
CREATE OR REPLACE FUNCTION refresh_quiz_statistics()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY quiz_statistics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_quiz_statistics_trigger
AFTER INSERT OR UPDATE OR DELETE ON quiz_attempts
FOR EACH STATEMENT EXECUTE FUNCTION refresh_quiz_statistics();

-- Sample data for development (optional)
INSERT INTO categories (name, description, parent_id, is_active, created_at, updated_at) VALUES
('Science', 'Scientific subjects', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Technology', 'Technology and programming', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Mathematics', 'Mathematical concepts', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO categories (name, description, parent_id, is_active, created_at, updated_at) VALUES
('Physics', 'Physics concepts', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Chemistry', 'Chemistry concepts', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Programming', 'Programming languages', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Web Development', 'Web technologies', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Initial admin user (password: 'admin123' - change in production)
INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active, created_at, updated_at) VALUES
('admin', 'admin@quizup.com', '$2b$10$YourHashedPasswordHere', 'ADMIN', 'Admin', 'User', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;
