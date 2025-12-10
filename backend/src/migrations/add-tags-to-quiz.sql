-- Migration: Add tags column to Quiz table with optimized indexes
-- Date: 2025-09-27
-- Description: Add tags as JSON array field with GIN index for efficient searching

-- Add tags column to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quizzes.tags IS 'Array of tags for categorizing and searching quizzes';

-- Create GIN index for efficient tag searching
-- This allows fast queries like: WHERE tags @> '["javascript"]'
CREATE INDEX IF NOT EXISTS idx_quizzes_tags_gin 
ON quizzes USING GIN (tags);

-- Create additional index for tag array length (for analytics)
CREATE INDEX IF NOT EXISTS idx_quizzes_tags_length 
ON quizzes ((jsonb_array_length(tags)));

-- Create composite index for common query patterns (category + tags)
CREATE INDEX IF NOT EXISTS idx_quizzes_category_tags 
ON quizzes (categoryId, tags);

-- Create index for full-text search combining title, description, and tags
CREATE INDEX IF NOT EXISTS idx_quizzes_fulltext_search 
ON quizzes USING GIN (
  to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(tags)), ' '), '')
  )
);

-- Update existing quizzes to have empty tags array if they don't have one
UPDATE quizzes 
SET tags = '[]'::jsonb 
WHERE tags IS NULL;

-- Add constraint to ensure tags is always an array
ALTER TABLE quizzes 
ADD CONSTRAINT check_tags_is_array 
CHECK (jsonb_typeof(tags) = 'array');

-- Performance optimization: Update table statistics
ANALYZE quizzes;

-- Example queries that will be optimized:
-- 1. Find quizzes with specific tag: SELECT * FROM quizzes WHERE tags @> '["javascript"]';
-- 2. Find quizzes with any of multiple tags: SELECT * FROM quizzes WHERE tags ?| array['javascript', 'programming'];
-- 3. Find quizzes with all specified tags: SELECT * FROM quizzes WHERE tags @> '["javascript", "beginner"]';
-- 4. Full-text search including tags: SELECT * FROM quizzes WHERE to_tsvector('english', title || ' ' || description || ' ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(tags)), ' ')) @@ plainto_tsquery('javascript programming');
