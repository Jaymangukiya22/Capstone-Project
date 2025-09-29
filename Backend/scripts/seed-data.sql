-- QuizUP Seed Data
-- This file contains sample data for development and testing

-- Sample users
INSERT INTO users (username, email, password_hash, role, first_name, last_name, elo_rating, created_at, updated_at)
VALUES
    ('admin', 'admin@quizup.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeU0Kz1a8Vq1Z1a8Vq', 'ADMIN', 'System', 'Administrator', 1500, NOW(), NOW()),
    ('teacher1', 'teacher1@quizup.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeU0Kz1a8Vq1Z1a8Vq', 'FACULTY', 'John', 'Smith', 1400, NOW(), NOW()),
    ('student1', 'student1@quizup.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeU0Kz1a8Vq1Z1a8Vq', 'STUDENT', 'Alice', 'Johnson', 1200, NOW(), NOW()),
    ('student2', 'student2@quizup.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeU0Kz1a8Vq1Z1a8Vq', 'STUDENT', 'Bob', 'Williams', 1100, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Sample categories
INSERT INTO categories (name, description, parent_id, level, path, is_active, created_at, updated_at)
VALUES
    ('Mathematics', 'Mathematical concepts and problems', NULL, 1, 'mathematics', true, NOW(), NOW()),
    ('Science', 'Scientific principles and discoveries', NULL, 1, 'science', true, NOW(), NOW()),
    ('History', 'Historical events and figures', NULL, 1, 'history', true, NOW(), NOW()),
    ('Algebra', 'Algebraic expressions and equations', 1, 2, 'mathematics/algebra', true, NOW(), NOW()),
    ('Geometry', 'Geometric shapes and theorems', 1, 2, 'mathematics/geometry', true, NOW(), NOW()),
    ('Physics', 'Physical laws and phenomena', 2, 2, 'science/physics', true, NOW(), NOW()),
    ('Chemistry', 'Chemical reactions and elements', 2, 2, 'science/chemistry', true, NOW(), NOW()),
    ('Biology', 'Biological systems and processes', 2, 2, 'science/biology', true, NOW(), NOW())
ON CONFLICT (path) DO NOTHING;

-- Sample quizzes
INSERT INTO quizzes (title, description, category_id, difficulty, time_limit, is_published, created_by_id, created_at, updated_at)
VALUES
    ('Basic Algebra Quiz', 'Test your algebra fundamentals', 4, 'EASY', 30, true, 2, NOW(), NOW()),
    ('Advanced Geometry', 'Challenge yourself with geometric proofs', 5, 'HARD', 45, true, 2, NOW(), NOW()),
    ('Physics Fundamentals', 'Basic physics principles', 6, 'MEDIUM', 35, true, 2, NOW(), NOW()),
    ('Chemistry Basics', 'Introduction to chemical elements', 7, 'EASY', 25, true, 2, NOW(), NOW())
ON CONFLICT (title) DO NOTHING;

-- Sample questions
INSERT INTO question_bank_items (question_text, explanation, category_id, difficulty, question_type, is_active, created_by_id, created_at, updated_at)
VALUES
    ('What is 2 + 2?', 'Basic arithmetic addition', 4, 'EASY', 'MULTIPLE_CHOICE', true, 2, NOW(), NOW()),
    ('Solve for x: 2x + 3 = 7', 'Simple algebraic equation', 4, 'MEDIUM', 'MULTIPLE_CHOICE', true, 2, NOW(), NOW()),
    ('What is the Pythagorean theorem?', 'Fundamental geometry theorem', 5, 'MEDIUM', 'MULTIPLE_CHOICE', true, 2, NOW(), NOW()),
    ('What is the speed of light?', 'Basic physics constant', 6, 'MEDIUM', 'MULTIPLE_CHOICE', true, 2, NOW(), NOW())
ON CONFLICT (question_text) DO NOTHING;

-- Sample options
INSERT INTO question_options (question_id, option_text, is_correct, order_index)
SELECT
    qbi.id,
    CASE
        WHEN qbi.question_text = 'What is 2 + 2?' THEN '4'
        WHEN qbi.question_text = 'Solve for x: 2x + 3 = 7' THEN '2'
        WHEN qbi.question_text = 'What is the Pythagorean theorem?' THEN 'a² + b² = c²'
        WHEN qbi.question_text = 'What is the speed of light?' THEN '299,792,458 m/s'
    END as option_text,
    true as is_correct,
    1 as order_index
FROM question_bank_items qbi
WHERE qbi.question_text IN ('What is 2 + 2?', 'Solve for x: 2x + 3 = 7', 'What is the Pythagorean theorem?', 'What is the speed of light?');

-- Link questions to quizzes
INSERT INTO quiz_questions (quiz_id, question_id, order_index, points, time_limit)
SELECT q.id, qbi.id, 1, 10, 30
FROM quizzes q
CROSS JOIN question_bank_items qbi
WHERE q.title = 'Basic Algebra Quiz' AND qbi.question_text = 'What is 2 + 2?'
UNION ALL
SELECT q.id, qbi.id, 2, 15, 45
FROM quizzes q
CROSS JOIN question_bank_items qbi
WHERE q.title = 'Basic Algebra Quiz' AND qbi.question_text = 'Solve for x: 2x + 3 = 7';

-- Update quiz statistics materialized view
REFRESH MATERIALIZED VIEW quiz_statistics;
