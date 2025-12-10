-- Adminer 5.4.1 PostgreSQL 15.14 dump

DROP TABLE IF EXISTS "categories";
DROP SEQUENCE IF EXISTS categories_id_seq;
CREATE SEQUENCE categories_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."categories" (
    "id" integer DEFAULT nextval('categories_id_seq') NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" text,
    "parent_id" integer,
    "level" integer DEFAULT '0',
    "path" character varying(500),
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX unique_name_per_parent ON public.categories USING btree (name, parent_id);

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);

CREATE INDEX idx_categories_path ON public.categories USING gin (string_to_array((path)::text, '/'::text));

CREATE INDEX idx_categories_active ON public.categories USING btree (is_active) WHERE (is_active = true);


DELIMITER ;;

CREATE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

DROP TABLE IF EXISTS "leaderboards";
DROP SEQUENCE IF EXISTS leaderboards_id_seq;
CREATE SEQUENCE leaderboards_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."leaderboards" (
    "id" integer DEFAULT nextval('leaderboards_id_seq') NOT NULL,
    "user_id" integer,
    "category_id" integer,
    "elo_rating" integer DEFAULT '1200',
    "total_matches" integer DEFAULT '0',
    "wins" integer DEFAULT '0',
    "losses" integer DEFAULT '0',
    "win_rate" numeric(5,2) DEFAULT '0.00',
    "avg_score" numeric(8,2) DEFAULT '0.00',
    "best_streak" integer DEFAULT '0',
    "current_streak" integer DEFAULT '0',
    "last_match_at" timestamptz,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX unique_user_category ON public.leaderboards USING btree (user_id, category_id);

CREATE INDEX idx_leaderboards_user_id ON public.leaderboards USING btree (user_id);

CREATE INDEX idx_leaderboards_category_id ON public.leaderboards USING btree (category_id);

CREATE INDEX idx_leaderboards_elo ON public.leaderboards USING btree (elo_rating DESC);

CREATE INDEX idx_leaderboards_win_rate ON public.leaderboards USING btree (win_rate DESC);


DROP TABLE IF EXISTS "match_players";
DROP SEQUENCE IF EXISTS match_players_id_seq;
CREATE SEQUENCE match_players_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."match_players" (
    "id" integer DEFAULT nextval('match_players_id_seq') NOT NULL,
    "matchId" integer NOT NULL,
    "userId" integer NOT NULL,
    "status" enum_match_players_status DEFAULT 'JOINED',
    "score" integer DEFAULT '0',
    "correctAnswers" integer DEFAULT '0',
    "timeSpent" integer,
    "joinedAt" timestamptz,
    "finishedAt" timestamptz,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "match_players_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);


DROP TABLE IF EXISTS "matches";
DROP SEQUENCE IF EXISTS matches_id_seq;
CREATE SEQUENCE matches_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."matches" (
    "id" integer DEFAULT nextval('matches_id_seq') NOT NULL,
    "matchId" character varying(50) NOT NULL,
    "quizId" integer,
    "type" enum_matches_type DEFAULT 'MULTIPLAYER',
    "status" enum_matches_status DEFAULT 'WAITING',
    "maxPlayers" integer DEFAULT '2',
    "startedAt" timestamptz,
    "endedAt" timestamptz,
    "winnerId" integer,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);


DROP TABLE IF EXISTS "question_bank_items";
DROP SEQUENCE IF EXISTS question_bank_items_id_seq;
CREATE SEQUENCE question_bank_items_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."question_bank_items" (
    "id" integer DEFAULT nextval('question_bank_items_id_seq') NOT NULL,
    "question_text" text NOT NULL,
    "explanation" text,
    "category_id" integer,
    "difficulty" difficulty_level DEFAULT MEDIUM,
    "question_type" character varying(20) DEFAULT 'MCQ',
    "tags" text[],
    "is_active" boolean DEFAULT true,
    "usage_count" integer DEFAULT '0',
    "created_by_id" integer,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_bank_items_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE INDEX idx_question_bank_category ON public.question_bank_items USING btree (category_id);

CREATE INDEX idx_question_bank_difficulty ON public.question_bank_items USING btree (difficulty);

CREATE INDEX idx_question_bank_active ON public.question_bank_items USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_question_bank_tags ON public.question_bank_items USING gin (tags);

CREATE INDEX idx_question_bank_usage ON public.question_bank_items USING btree (usage_count DESC);


DELIMITER ;;

CREATE TRIGGER "update_question_bank_items_updated_at" BEFORE UPDATE ON "public"."question_bank_items" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

DROP TABLE IF EXISTS "question_bank_options";
DROP SEQUENCE IF EXISTS question_bank_options_id_seq;
CREATE SEQUENCE question_bank_options_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."question_bank_options" (
    "id" integer DEFAULT nextval('question_bank_options_id_seq') NOT NULL,
    "question_id" integer NOT NULL,
    "option_text" text NOT NULL,
    "is_correct" boolean DEFAULT false,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL,
    CONSTRAINT "question_bank_options_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);


DROP TABLE IF EXISTS "quiz_attempt_answers";
DROP SEQUENCE IF EXISTS quiz_attempt_answers_id_seq;
CREATE SEQUENCE quiz_attempt_answers_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."quiz_attempt_answers" (
    "id" integer DEFAULT nextval('quiz_attempt_answers_id_seq') NOT NULL,
    "attemptId" integer NOT NULL,
    "questionId" integer NOT NULL,
    "selectedOptions" json,
    "isCorrect" boolean DEFAULT false,
    "timeSpent" integer,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "quiz_attempt_answers_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);


DROP TABLE IF EXISTS "quiz_attempts";
DROP SEQUENCE IF EXISTS quiz_attempts_id_seq;
CREATE SEQUENCE quiz_attempts_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."quiz_attempts" (
    "id" integer DEFAULT nextval('quiz_attempts_id_seq') NOT NULL,
    "user_id" integer,
    "quiz_id" integer,
    "status" attempt_status DEFAULT IN_PROGRESS,
    "score" integer DEFAULT '0',
    "max_score" integer DEFAULT '0',
    "correct_answers" integer DEFAULT '0',
    "total_questions" integer DEFAULT '0',
    "time_spent" integer DEFAULT '0',
    "completion_percentage" numeric(5,2) DEFAULT '0.00',
    "started_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "completed_at" timestamptz,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts USING btree (user_id);

CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts USING btree (quiz_id);

CREATE INDEX idx_quiz_attempts_status ON public.quiz_attempts USING btree (status);

CREATE INDEX idx_quiz_attempts_completed ON public.quiz_attempts USING btree (completed_at) WHERE (completed_at IS NOT NULL);


DELIMITER ;;

CREATE TRIGGER "refresh_quiz_statistics_trigger" AFTER DELETE OR INSERT OR UPDATE ON "public"."quiz_attempts" FOR EACH STATEMENT EXECUTE FUNCTION refresh_quiz_statistics();;

CREATE TRIGGER "update_quiz_attempts_updated_at" BEFORE UPDATE ON "public"."quiz_attempts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

DROP TABLE IF EXISTS "quiz_questions";
DROP SEQUENCE IF EXISTS quiz_questions_id_seq;
CREATE SEQUENCE quiz_questions_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."quiz_questions" (
    "id" integer DEFAULT nextval('quiz_questions_id_seq') NOT NULL,
    "quiz_id" integer,
    "question_id" integer,
    "order_index" integer NOT NULL,
    "points" integer DEFAULT '100',
    "time_limit" integer,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz,
    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX unique_question_per_quiz ON public.quiz_questions USING btree (quiz_id, question_id);

CREATE UNIQUE INDEX unique_order_per_quiz ON public.quiz_questions USING btree (quiz_id, order_index);

CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions USING btree (quiz_id);

CREATE INDEX idx_quiz_questions_question_id ON public.quiz_questions USING btree (question_id);

CREATE INDEX idx_quiz_questions_order ON public.quiz_questions USING btree (quiz_id, order_index);


DROP VIEW IF EXISTS "quiz_statistics";
CREATE TABLE "quiz_statistics" ("quiz_id" integer, "title" character varying(255), "category_id" integer, "total_attempts" bigint, "unique_users" bigint, "avg_score" numeric, "max_score" integer, "avg_time_taken" numeric, "total_questions" bigint, "created_at" timestamptz, "last_attempted" timestamptz);


DROP TABLE IF EXISTS "quizzes";
DROP SEQUENCE IF EXISTS quizzes_id_seq;
CREATE SEQUENCE quizzes_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."quizzes" (
    "id" integer DEFAULT nextval('quizzes_id_seq') NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" text,
    "category_id" integer,
    "difficulty" difficulty_level DEFAULT MEDIUM,
    "time_limit" integer DEFAULT '30',
    "points_per_question" integer DEFAULT '100',
    "time_bonus_enabled" boolean DEFAULT true,
    "max_time_bonus" integer DEFAULT '50',
    "negative_marking" boolean DEFAULT false,
    "negative_points" integer DEFAULT '25',
    "shuffle_questions" boolean DEFAULT true,
    "shuffle_options" boolean DEFAULT true,
    "max_questions" integer DEFAULT '3',
    "is_published" boolean DEFAULT false,
    "tags" text[],
    "created_by_id" integer,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "is_active" boolean DEFAULT true NOT NULL,
    "popularity" integer DEFAULT '0' NOT NULL,
    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

COMMENT ON COLUMN "public"."quizzes"."tags" IS 'Array of tags for categorizing and searching quizzes';

CREATE INDEX idx_quizzes_category_id ON public.quizzes USING btree (category_id);

CREATE INDEX idx_quizzes_difficulty ON public.quizzes USING btree (difficulty);

CREATE INDEX idx_quizzes_created_by ON public.quizzes USING btree (created_by_id);

CREATE INDEX idx_quizzes_published ON public.quizzes USING btree (is_published) WHERE (is_published = true);

CREATE INDEX idx_quizzes_tags ON public.quizzes USING gin (tags);


DELIMITER ;;

CREATE TRIGGER "update_quizzes_updated_at" BEFORE UPDATE ON "public"."quizzes" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

DROP TABLE IF EXISTS "users";
DROP SEQUENCE IF EXISTS users_id_seq;
CREATE SEQUENCE users_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."users" (
    "id" integer DEFAULT nextval('users_id_seq') NOT NULL,
    "username" character varying(50) NOT NULL,
    "email" character varying(100) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "role" user_role DEFAULT STUDENT,
    "first_name" character varying(50),
    "last_name" character varying(50),
    "avatar" character varying(255),
    "elo_rating" integer DEFAULT '1200',
    "total_matches" integer DEFAULT '0',
    "wins" integer DEFAULT '0',
    "losses" integer DEFAULT '0',
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamptz,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE INDEX idx_users_username ON public.users USING btree (username);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE INDEX idx_users_elo_rating ON public.users USING btree (elo_rating DESC);

CREATE INDEX idx_users_role ON public.users USING btree (role);

CREATE INDEX idx_users_active ON public.users USING btree (is_active) WHERE (is_active = true);


DELIMITER ;;

CREATE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;

DELIMITER ;

ALTER TABLE ONLY "public"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."leaderboards" ADD CONSTRAINT "leaderboards_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."leaderboards" ADD CONSTRAINT "leaderboards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."match_players" ADD CONSTRAINT "match_players_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES matches(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."match_players" ADD CONSTRAINT "match_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."matches" ADD CONSTRAINT "matches_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES quizzes(id) ON UPDATE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."question_bank_items" ADD CONSTRAINT "question_bank_items_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."question_bank_items" ADD CONSTRAINT "question_bank_items_created_by_id_fkey" FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_question_id_fkey" FOREIGN KEY (question_id) REFERENCES question_bank_items(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."quizzes" ADD CONSTRAINT "quizzes_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."quizzes" ADD CONSTRAINT "quizzes_created_by_id_fkey" FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL NOT DEFERRABLE;

DROP TABLE IF EXISTS "quiz_statistics";
CREATE VIEW "quiz_statistics" AS SELECT q.id AS quiz_id,
    q.title,
    q.category_id,
    count(DISTINCT qa.id) AS total_attempts,
    count(DISTINCT qa.user_id) AS unique_users,
    avg(qa.score) AS avg_score,
    max(qa.score) AS max_score,
    avg(qa.time_spent) AS avg_time_taken,
    count(DISTINCT qq.id) AS total_questions,
    q.created_at,
    max(qa.completed_at) AS last_attempted
   FROM ((quizzes q
     LEFT JOIN quiz_attempts qa ON (((q.id = qa.quiz_id) AND (qa.status = 'COMPLETED'::attempt_status))))
     LEFT JOIN quiz_questions qq ON ((q.id = qq.quiz_id)))
  GROUP BY q.id, q.title, q.category_id, q.created_at;

-- 2025-11-13 04:42:22 UTC