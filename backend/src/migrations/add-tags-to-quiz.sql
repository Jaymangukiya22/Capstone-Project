-- Migration: quiz tags column + search index
-- Description: `quizzes.tags` is a Postgres text[] (see the Quiz model:
--   DataType.ARRAY(DataType.TEXT), not null, default []). The column itself is
--   created by Sequelize sync from the model; this migration adds the GIN index
--   that sync does not manage, so tag-containment queries stay fast:
--     WHERE tags @> ARRAY['javascript']
--
-- Idempotent (safe to re-run / adopt an existing DB).
--
-- NOTE: this file previously targeted a JSONB design (jsonb_array_length, jsonb
-- fulltext) that was never adopted - the column shipped as text[], so those
-- statements always failed and their indexes never existed. Corrected here to
-- match the actual schema; only the text[] GIN index (which did get created) is
-- kept.

-- No-op when sync already made the column; guards a DB that somehow lacks it.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for array-containment tag search.
CREATE INDEX IF NOT EXISTS idx_quizzes_tags_gin
  ON quizzes USING GIN (tags);

ANALYZE quizzes;
