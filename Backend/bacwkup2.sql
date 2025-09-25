--
-- PostgreSQL database dump
--

\restrict AMpHNQRV07C6ZZhfojQZ48PgHkl68FT8Y2Ab8Npr5myDc1AlztC0VRs5Q8H6T8b

-- Dumped from database version 15.14
-- Dumped by pg_dump version 17.6

-- Started on 2025-09-23 12:46:42

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 17711)
-- Name: public; Type: SCHEMA; Schema: -; Owner: quiz_user
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO quiz_user;

--
-- TOC entry 913 (class 1247 OID 17713)
-- Name: Difficulty; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public."Difficulty" AS ENUM (
    'EASY',
    'MEDIUM',
    'HARD'
);


ALTER TYPE public."Difficulty" OWNER TO quiz_user;

--
-- TOC entry 922 (class 1247 OID 17734)
-- Name: MatchStatus; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public."MatchStatus" AS ENUM (
    'WAITING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."MatchStatus" OWNER TO quiz_user;

--
-- TOC entry 925 (class 1247 OID 17744)
-- Name: MatchType; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public."MatchType" AS ENUM (
    'SOLO',
    'MULTIPLAYER',
    'TOURNAMENT'
);


ALTER TYPE public."MatchType" OWNER TO quiz_user;

--
-- TOC entry 919 (class 1247 OID 17726)
-- Name: QuizAttemptStatus; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public."QuizAttemptStatus" AS ENUM (
    'IN_PROGRESS',
    'COMPLETED',
    'ABANDONED'
);


ALTER TYPE public."QuizAttemptStatus" OWNER TO quiz_user;

--
-- TOC entry 916 (class 1247 OID 17720)
-- Name: UserRole; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'PLAYER'
);


ALTER TYPE public."UserRole" OWNER TO quiz_user;

--
-- TOC entry 907 (class 1247 OID 86633)
-- Name: enum_match_players_status; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public.enum_match_players_status AS ENUM (
    'JOINED',
    'WAITING',
    'READY',
    'PLAYING',
    'FINISHED',
    'DISCONNECTED'
);


ALTER TYPE public.enum_match_players_status OWNER TO quiz_user;

--
-- TOC entry 901 (class 1247 OID 86608)
-- Name: enum_matches_status; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public.enum_matches_status AS ENUM (
    'WAITING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public.enum_matches_status OWNER TO quiz_user;

--
-- TOC entry 898 (class 1247 OID 86601)
-- Name: enum_matches_type; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public.enum_matches_type AS ENUM (
    'SOLO',
    'MULTIPLAYER',
    'TOURNAMENT'
);


ALTER TYPE public.enum_matches_type OWNER TO quiz_user;

--
-- TOC entry 871 (class 1247 OID 86462)
-- Name: enum_question_bank_items_difficulty; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public.enum_question_bank_items_difficulty AS ENUM (
    'EASY',
    'MEDIUM',
    'HARD'
);


ALTER TYPE public.enum_question_bank_items_difficulty OWNER TO quiz_user;

--
-- TOC entry 889 (class 1247 OID 86553)
-- Name: enum_quiz_attempts_status; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public.enum_quiz_attempts_status AS ENUM (
    'IN_PROGRESS',
    'COMPLETED',
    'ABANDONED'
);


ALTER TYPE public.enum_quiz_attempts_status OWNER TO quiz_user;

--
-- TOC entry 880 (class 1247 OID 86506)
-- Name: enum_quizzes_difficulty; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public.enum_quizzes_difficulty AS ENUM (
    'EASY',
    'MEDIUM',
    'HARD'
);


ALTER TYPE public.enum_quizzes_difficulty OWNER TO quiz_user;

--
-- TOC entry 862 (class 1247 OID 86423)
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: quiz_user
--

CREATE TYPE public.enum_users_role AS ENUM (
    'ADMIN',
    'PLAYER'
);


ALTER TYPE public.enum_users_role OWNER TO quiz_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 223 (class 1259 OID 86447)
-- Name: categories; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    "parentId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.categories OWNER TO quiz_user;

--
-- TOC entry 222 (class 1259 OID 86446)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO quiz_user;

--
-- TOC entry 3617 (class 0 OID 0)
-- Dependencies: 222
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- TOC entry 239 (class 1259 OID 86646)
-- Name: match_players; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.match_players (
    id integer NOT NULL,
    "matchId" integer NOT NULL,
    "userId" integer NOT NULL,
    status public.enum_match_players_status DEFAULT 'JOINED'::public.enum_match_players_status,
    score integer DEFAULT 0,
    "correctAnswers" integer DEFAULT 0,
    "timeSpent" integer,
    "joinedAt" timestamp with time zone,
    "finishedAt" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.match_players OWNER TO quiz_user;

--
-- TOC entry 238 (class 1259 OID 86645)
-- Name: match_players_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.match_players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.match_players_id_seq OWNER TO quiz_user;

--
-- TOC entry 3618 (class 0 OID 0)
-- Dependencies: 238
-- Name: match_players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.match_players_id_seq OWNED BY public.match_players.id;


--
-- TOC entry 237 (class 1259 OID 86618)
-- Name: matches; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    "matchId" character varying(50) NOT NULL,
    "quizId" integer,
    type public.enum_matches_type DEFAULT 'MULTIPLAYER'::public.enum_matches_type,
    status public.enum_matches_status DEFAULT 'WAITING'::public.enum_matches_status,
    "maxPlayers" integer DEFAULT 2,
    "startedAt" timestamp with time zone,
    "endedAt" timestamp with time zone,
    "winnerId" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.matches OWNER TO quiz_user;

--
-- TOC entry 236 (class 1259 OID 86617)
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matches_id_seq OWNER TO quiz_user;

--
-- TOC entry 3619 (class 0 OID 0)
-- Dependencies: 236
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;


--
-- TOC entry 217 (class 1259 OID 17829)
-- Name: options; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.options (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.options OWNER TO quiz_user;

--
-- TOC entry 216 (class 1259 OID 17828)
-- Name: options_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.options_id_seq OWNER TO quiz_user;

--
-- TOC entry 3620 (class 0 OID 0)
-- Dependencies: 216
-- Name: options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.options_id_seq OWNED BY public.options.id;


--
-- TOC entry 225 (class 1259 OID 86470)
-- Name: question_bank_items; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.question_bank_items (
    id integer NOT NULL,
    "questionText" text NOT NULL,
    "categoryId" integer NOT NULL,
    difficulty public.enum_question_bank_items_difficulty DEFAULT 'MEDIUM'::public.enum_question_bank_items_difficulty,
    "createdById" integer NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.question_bank_items OWNER TO quiz_user;

--
-- TOC entry 224 (class 1259 OID 86469)
-- Name: question_bank_items_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.question_bank_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.question_bank_items_id_seq OWNER TO quiz_user;

--
-- TOC entry 3621 (class 0 OID 0)
-- Dependencies: 224
-- Name: question_bank_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.question_bank_items_id_seq OWNED BY public.question_bank_items.id;


--
-- TOC entry 227 (class 1259 OID 86491)
-- Name: question_bank_options; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.question_bank_options (
    id integer NOT NULL,
    "questionId" integer NOT NULL,
    "optionText" text NOT NULL,
    "isCorrect" boolean DEFAULT false,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.question_bank_options OWNER TO quiz_user;

--
-- TOC entry 226 (class 1259 OID 86490)
-- Name: question_bank_options_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.question_bank_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.question_bank_options_id_seq OWNER TO quiz_user;

--
-- TOC entry 3622 (class 0 OID 0)
-- Dependencies: 226
-- Name: question_bank_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.question_bank_options_id_seq OWNED BY public.question_bank_options.id;


--
-- TOC entry 215 (class 1259 OID 17819)
-- Name: questions; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    question_text text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.questions OWNER TO quiz_user;

--
-- TOC entry 214 (class 1259 OID 17818)
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questions_id_seq OWNER TO quiz_user;

--
-- TOC entry 3623 (class 0 OID 0)
-- Dependencies: 214
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- TOC entry 219 (class 1259 OID 17851)
-- Name: quiz_answers; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.quiz_answers (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    question_id integer NOT NULL,
    selected_options text[],
    is_correct boolean NOT NULL,
    time_spent integer,
    answered_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.quiz_answers OWNER TO quiz_user;

--
-- TOC entry 218 (class 1259 OID 17850)
-- Name: quiz_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.quiz_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_answers_id_seq OWNER TO quiz_user;

--
-- TOC entry 3624 (class 0 OID 0)
-- Dependencies: 218
-- Name: quiz_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.quiz_answers_id_seq OWNED BY public.quiz_answers.id;


--
-- TOC entry 235 (class 1259 OID 86581)
-- Name: quiz_attempt_answers; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.quiz_attempt_answers (
    id integer NOT NULL,
    "attemptId" integer NOT NULL,
    "questionId" integer NOT NULL,
    "selectedOptions" json,
    "isCorrect" boolean DEFAULT false,
    "timeSpent" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.quiz_attempt_answers OWNER TO quiz_user;

--
-- TOC entry 234 (class 1259 OID 86580)
-- Name: quiz_attempt_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.quiz_attempt_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_attempt_answers_id_seq OWNER TO quiz_user;

--
-- TOC entry 3625 (class 0 OID 0)
-- Dependencies: 234
-- Name: quiz_attempt_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.quiz_attempt_answers_id_seq OWNED BY public.quiz_attempt_answers.id;


--
-- TOC entry 233 (class 1259 OID 86560)
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.quiz_attempts (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "quizId" integer NOT NULL,
    status public.enum_quiz_attempts_status DEFAULT 'IN_PROGRESS'::public.enum_quiz_attempts_status,
    score integer DEFAULT 0,
    "totalQuestions" integer DEFAULT 0,
    "correctAnswers" integer DEFAULT 0,
    "timeSpent" integer,
    "startedAt" timestamp with time zone,
    "completedAt" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.quiz_attempts OWNER TO quiz_user;

--
-- TOC entry 232 (class 1259 OID 86559)
-- Name: quiz_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.quiz_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_attempts_id_seq OWNER TO quiz_user;

--
-- TOC entry 3626 (class 0 OID 0)
-- Dependencies: 232
-- Name: quiz_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.quiz_attempts_id_seq OWNED BY public.quiz_attempts.id;


--
-- TOC entry 231 (class 1259 OID 86536)
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.quiz_questions (
    id integer NOT NULL,
    "quizId" integer NOT NULL,
    "questionId" integer NOT NULL,
    "order" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.quiz_questions OWNER TO quiz_user;

--
-- TOC entry 230 (class 1259 OID 86535)
-- Name: quiz_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.quiz_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_questions_id_seq OWNER TO quiz_user;

--
-- TOC entry 3627 (class 0 OID 0)
-- Dependencies: 230
-- Name: quiz_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.quiz_questions_id_seq OWNED BY public.quiz_questions.id;


--
-- TOC entry 229 (class 1259 OID 86514)
-- Name: quizzes; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.quizzes (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    difficulty public.enum_quizzes_difficulty DEFAULT 'MEDIUM'::public.enum_quizzes_difficulty,
    "timeLimit" integer,
    "maxQuestions" integer,
    "categoryId" integer NOT NULL,
    "createdById" integer NOT NULL,
    "isActive" boolean DEFAULT true,
    popularity integer DEFAULT 0,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.quizzes OWNER TO quiz_user;

--
-- TOC entry 228 (class 1259 OID 86513)
-- Name: quizzes_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.quizzes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quizzes_id_seq OWNER TO quiz_user;

--
-- TOC entry 3628 (class 0 OID 0)
-- Dependencies: 228
-- Name: quizzes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.quizzes_id_seq OWNED BY public.quizzes.id;


--
-- TOC entry 221 (class 1259 OID 86428)
-- Name: users; Type: TABLE; Schema: public; Owner: quiz_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    "passwordHash" character varying(255) NOT NULL,
    role public.enum_users_role DEFAULT 'PLAYER'::public.enum_users_role,
    "firstName" character varying(50),
    "lastName" character varying(50),
    avatar character varying(255),
    "eloRating" integer DEFAULT 1200,
    "totalMatches" integer DEFAULT 0,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    "isActive" boolean DEFAULT true,
    "lastLoginAt" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.users OWNER TO quiz_user;

--
-- TOC entry 220 (class 1259 OID 86427)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: quiz_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO quiz_user;

--
-- TOC entry 3629 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quiz_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3370 (class 2604 OID 86450)
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- TOC entry 3393 (class 2604 OID 86649)
-- Name: match_players id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.match_players ALTER COLUMN id SET DEFAULT nextval('public.match_players_id_seq'::regclass);


--
-- TOC entry 3389 (class 2604 OID 86621)
-- Name: matches id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);


--
-- TOC entry 3358 (class 2604 OID 17832)
-- Name: options id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.options ALTER COLUMN id SET DEFAULT nextval('public.options_id_seq'::regclass);


--
-- TOC entry 3372 (class 2604 OID 86473)
-- Name: question_bank_items id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.question_bank_items ALTER COLUMN id SET DEFAULT nextval('public.question_bank_items_id_seq'::regclass);


--
-- TOC entry 3375 (class 2604 OID 86494)
-- Name: question_bank_options id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.question_bank_options ALTER COLUMN id SET DEFAULT nextval('public.question_bank_options_id_seq'::regclass);


--
-- TOC entry 3356 (class 2604 OID 17822)
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- TOC entry 3361 (class 2604 OID 17854)
-- Name: quiz_answers id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_answers ALTER COLUMN id SET DEFAULT nextval('public.quiz_answers_id_seq'::regclass);


--
-- TOC entry 3387 (class 2604 OID 86584)
-- Name: quiz_attempt_answers id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_attempt_answers ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempt_answers_id_seq'::regclass);


--
-- TOC entry 3382 (class 2604 OID 86563)
-- Name: quiz_attempts id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_attempts ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempts_id_seq'::regclass);


--
-- TOC entry 3381 (class 2604 OID 86539)
-- Name: quiz_questions id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_questions ALTER COLUMN id SET DEFAULT nextval('public.quiz_questions_id_seq'::regclass);


--
-- TOC entry 3377 (class 2604 OID 86517)
-- Name: quizzes id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quizzes ALTER COLUMN id SET DEFAULT nextval('public.quizzes_id_seq'::regclass);


--
-- TOC entry 3363 (class 2604 OID 86431)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3594 (class 0 OID 86447)
-- Dependencies: 223
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.categories (id, name, description, "parentId", "isActive", "createdAt", "updatedAt") FROM stdin;
1	Computer Science & Engineering	Core Computer Science and Engineering subjects	\N	t	2025-09-23 06:50:32.446+00	2025-09-23 06:50:32.446+00
2	Programming Languages	Programming languages and syntax	1	t	2025-09-23 06:50:32.452+00	2025-09-23 06:50:32.452+00
3	C Programming	C language fundamentals and advanced concepts	2	t	2025-09-23 06:50:32.455+00	2025-09-23 06:50:32.455+00
4	C++ Programming	Object-oriented programming with C++	2	t	2025-09-23 06:50:32.458+00	2025-09-23 06:50:32.458+00
5	Java Programming	Java language and OOP concepts	2	t	2025-09-23 06:50:32.463+00	2025-09-23 06:50:32.463+00
6	Python Programming	Python programming and applications	2	t	2025-09-23 06:50:32.468+00	2025-09-23 06:50:32.468+00
7	JavaScript	JavaScript for web development	2	t	2025-09-23 06:50:32.471+00	2025-09-23 06:50:32.471+00
8	TypeScript	TypeScript for type-safe development	2	t	2025-09-23 06:50:32.473+00	2025-09-23 06:50:32.473+00
9	Data Structures & Algorithms	Core DSA concepts and problem solving	1	t	2025-09-23 06:50:32.476+00	2025-09-23 06:50:32.476+00
10	Arrays & Strings	Array and string manipulation	9	t	2025-09-23 06:50:32.479+00	2025-09-23 06:50:32.479+00
11	Linked Lists	Linear data structures	9	t	2025-09-23 06:50:32.483+00	2025-09-23 06:50:32.483+00
12	Stacks & Queues	LIFO and FIFO data structures	9	t	2025-09-23 06:50:32.486+00	2025-09-23 06:50:32.486+00
13	Trees & Graphs	Hierarchical and network data structures	9	t	2025-09-23 06:50:32.488+00	2025-09-23 06:50:32.488+00
14	Sorting Algorithms	Various sorting techniques	9	t	2025-09-23 06:50:32.491+00	2025-09-23 06:50:32.491+00
15	Searching Algorithms	Linear and binary search methods	9	t	2025-09-23 06:50:32.493+00	2025-09-23 06:50:32.493+00
16	Database Management	Database concepts and management systems	1	t	2025-09-23 06:50:32.497+00	2025-09-23 06:50:32.497+00
17	SQL Fundamentals	Structured Query Language basics	16	t	2025-09-23 06:50:32.499+00	2025-09-23 06:50:32.499+00
18	Database Design	ER diagrams and normalization	16	t	2025-09-23 06:50:32.502+00	2025-09-23 06:50:32.502+00
19	RDBMS Concepts	Relational database management	16	t	2025-09-23 06:50:32.504+00	2025-09-23 06:50:32.504+00
20	NoSQL Databases	MongoDB, Redis, and document stores	16	t	2025-09-23 06:50:32.508+00	2025-09-23 06:50:32.508+00
21	Database Optimization	Query optimization and indexing	16	t	2025-09-23 06:50:32.511+00	2025-09-23 06:50:32.511+00
22	Web Development	Frontend and backend web technologies	1	t	2025-09-23 06:50:32.515+00	2025-09-23 06:50:32.515+00
23	HTML & CSS	Web markup and styling	22	t	2025-09-23 06:50:32.517+00	2025-09-23 06:50:32.517+00
24	React.js	Frontend JavaScript library	22	t	2025-09-23 06:50:32.52+00	2025-09-23 06:50:32.52+00
25	Node.js	Server-side JavaScript runtime	22	t	2025-09-23 06:50:32.523+00	2025-09-23 06:50:32.523+00
26	Express.js	Web application framework	22	t	2025-09-23 06:50:32.526+00	2025-09-23 06:50:32.526+00
27	REST APIs	RESTful web services	22	t	2025-09-23 06:50:32.529+00	2025-09-23 06:50:32.529+00
28	Artificial Intelligence & Machine Learning	AI/ML concepts and applications	\N	t	2025-09-23 06:50:32.531+00	2025-09-23 06:50:32.531+00
29	Machine Learning Fundamentals	Core ML concepts and algorithms	28	t	2025-09-23 06:50:32.534+00	2025-09-23 06:50:32.534+00
30	Supervised Learning	Classification and regression	29	t	2025-09-23 06:50:32.536+00	2025-09-23 06:50:32.536+00
31	Unsupervised Learning	Clustering and dimensionality reduction	29	t	2025-09-23 06:50:32.54+00	2025-09-23 06:50:32.54+00
32	Neural Networks	Perceptrons and deep learning basics	29	t	2025-09-23 06:50:32.543+00	2025-09-23 06:50:32.543+00
33	Model Evaluation	Metrics and validation techniques	29	t	2025-09-23 06:50:32.545+00	2025-09-23 06:50:32.545+00
34	Deep Learning	Advanced neural network architectures	28	t	2025-09-23 06:50:32.549+00	2025-09-23 06:50:32.549+00
35	CNN	Convolutional Neural Networks	34	t	2025-09-23 06:50:32.553+00	2025-09-23 06:50:32.553+00
36	RNN & LSTM	Recurrent Neural Networks	34	t	2025-09-23 06:50:32.557+00	2025-09-23 06:50:32.557+00
37	Transformers	Attention mechanisms and transformers	34	t	2025-09-23 06:50:32.559+00	2025-09-23 06:50:32.559+00
38	Computer Vision	Image processing and recognition	34	t	2025-09-23 06:50:32.562+00	2025-09-23 06:50:32.562+00
39	Natural Language Processing	Text processing and language understanding	28	t	2025-09-23 06:50:32.566+00	2025-09-23 06:50:32.566+00
40	Text Preprocessing	Tokenization and cleaning	39	t	2025-09-23 06:50:32.569+00	2025-09-23 06:50:32.569+00
41	Sentiment Analysis	Opinion mining and classification	39	t	2025-09-23 06:50:32.572+00	2025-09-23 06:50:32.572+00
42	Language Models	N-grams and transformer models	39	t	2025-09-23 06:50:32.574+00	2025-09-23 06:50:32.574+00
43	Information Technology	IT infrastructure and systems	\N	t	2025-09-23 06:50:32.576+00	2025-09-23 06:50:32.576+00
44	Network Security	Cybersecurity and network protection	43	t	2025-09-23 06:50:32.579+00	2025-09-23 06:50:32.579+00
45	Cryptography	Encryption and security protocols	44	t	2025-09-23 06:50:32.583+00	2025-09-23 06:50:32.583+00
46	Network Protocols	TCP/IP, HTTP, and security protocols	44	t	2025-09-23 06:50:32.585+00	2025-09-23 06:50:32.585+00
47	Ethical Hacking	Penetration testing and security auditing	44	t	2025-09-23 06:50:32.589+00	2025-09-23 06:50:32.589+00
48	Cloud Computing	Cloud platforms and services	43	t	2025-09-23 06:50:32.591+00	2025-09-23 06:50:32.591+00
49	AWS Services	Amazon Web Services	48	t	2025-09-23 06:50:32.594+00	2025-09-23 06:50:32.594+00
50	Docker & Kubernetes	Containerization and orchestration	48	t	2025-09-23 06:50:32.597+00	2025-09-23 06:50:32.597+00
51	Microservices	Distributed system architecture	48	t	2025-09-23 06:50:32.6+00	2025-09-23 06:50:32.6+00
52	Big Data & Analytics	Big data processing and analytics	\N	t	2025-09-23 06:50:32.602+00	2025-09-23 06:50:32.602+00
53	Big Data Technologies	Tools and frameworks for big data	52	t	2025-09-23 06:50:32.605+00	2025-09-23 06:50:32.605+00
54	Hadoop Ecosystem	HDFS, MapReduce, and Hive	53	t	2025-09-23 06:50:32.607+00	2025-09-23 06:50:32.607+00
55	Apache Spark	In-memory data processing	53	t	2025-09-23 06:50:32.61+00	2025-09-23 06:50:32.61+00
56	Apache Kafka	Stream processing and messaging	53	t	2025-09-23 06:50:32.612+00	2025-09-23 06:50:32.612+00
57	Data Analytics	Data analysis and visualization	52	t	2025-09-23 06:50:32.614+00	2025-09-23 06:50:32.614+00
58	Statistical Analysis	Descriptive and inferential statistics	57	t	2025-09-23 06:50:32.618+00	2025-09-23 06:50:32.618+00
59	Data Visualization	Charts, graphs, and dashboards	57	t	2025-09-23 06:50:32.621+00	2025-09-23 06:50:32.621+00
60	Business Intelligence	BI tools and reporting	57	t	2025-09-23 06:50:32.624+00	2025-09-23 06:50:32.624+00
\.


--
-- TOC entry 3610 (class 0 OID 86646)
-- Dependencies: 239
-- Data for Name: match_players; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.match_players (id, "matchId", "userId", status, score, "correctAnswers", "timeSpent", "joinedAt", "finishedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 3608 (class 0 OID 86618)
-- Dependencies: 237
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.matches (id, "matchId", "quizId", type, status, "maxPlayers", "startedAt", "endedAt", "winnerId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 3588 (class 0 OID 17829)
-- Dependencies: 217
-- Data for Name: options; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.options (id, question_id, option_text, is_correct, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3596 (class 0 OID 86470)
-- Dependencies: 225
-- Data for Name: question_bank_items; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.question_bank_items (id, "questionText", "categoryId", difficulty, "createdById", "isActive", "createdAt", "updatedAt") FROM stdin;
1	What is the correct syntax to declare a pointer in C?	3	EASY	1	t	2025-09-23 06:50:32.628+00	2025-09-23 06:50:32.628+00
2	Which function is used to allocate memory dynamically in C?	3	MEDIUM	1	t	2025-09-23 06:50:32.645+00	2025-09-23 06:50:32.645+00
3	What does the 'sizeof' operator return in C?	3	EASY	1	t	2025-09-23 06:50:32.66+00	2025-09-23 06:50:32.66+00
4	Which of the following is NOT a valid C data type?	3	EASY	1	t	2025-09-23 06:50:32.678+00	2025-09-23 06:50:32.678+00
5	Which principle of OOP is achieved by using access modifiers in Java?	5	MEDIUM	1	t	2025-09-23 06:50:32.693+00	2025-09-23 06:50:32.693+00
6	What is the default value of a boolean variable in Java?	5	EASY	1	t	2025-09-23 06:50:32.709+00	2025-09-23 06:50:32.709+00
7	Which method is called when an object is created in Java?	5	EASY	1	t	2025-09-23 06:50:32.724+00	2025-09-23 06:50:32.724+00
8	What does JVM stand for?	5	EASY	1	t	2025-09-23 06:50:32.739+00	2025-09-23 06:50:32.739+00
9	What is the time complexity of accessing an element in an array by index?	10	EASY	1	t	2025-09-23 06:50:32.753+00	2025-09-23 06:50:32.753+00
10	Which of the following is the best algorithm to sort an array of integers?	10	MEDIUM	1	t	2025-09-23 06:50:32.769+00	2025-09-23 06:50:32.769+00
11	What is the space complexity of merge sort?	10	HARD	1	t	2025-09-23 06:50:32.785+00	2025-09-23 06:50:32.785+00
12	Which SQL command is used to retrieve data from a database?	17	EASY	1	t	2025-09-23 06:50:32.801+00	2025-09-23 06:50:32.801+00
13	What does ACID stand for in database management?	17	MEDIUM	1	t	2025-09-23 06:50:32.834+00	2025-09-23 06:50:32.834+00
14	Which normal form eliminates partial dependencies?	17	HARD	1	t	2025-09-23 06:50:32.856+00	2025-09-23 06:50:32.856+00
15	Which algorithm is commonly used for binary classification?	30	MEDIUM	1	t	2025-09-23 06:50:32.873+00	2025-09-23 06:50:32.873+00
16	What is overfitting in machine learning?	30	MEDIUM	1	t	2025-09-23 06:50:32.89+00	2025-09-23 06:50:32.89+00
17	Which metric is best for evaluating a classification model with imbalanced data?	30	HARD	1	t	2025-09-23 06:50:32.906+00	2025-09-23 06:50:32.906+00
18	What is JSX in React?	24	EASY	1	t	2025-09-23 06:50:32.926+00	2025-09-23 06:50:32.926+00
19	Which hook is used to manage state in functional components?	24	MEDIUM	1	t	2025-09-23 06:50:32.943+00	2025-09-23 06:50:32.943+00
20	What is the virtual DOM in React?	24	MEDIUM	1	t	2025-09-23 06:50:32.961+00	2025-09-23 06:50:32.961+00
21	What type of encryption uses the same key for encryption and decryption?	45	MEDIUM	1	t	2025-09-23 06:50:32.975+00	2025-09-23 06:50:32.975+00
22	Which protocol provides secure communication over the internet?	45	EASY	1	t	2025-09-23 06:50:32.992+00	2025-09-23 06:50:32.992+00
23	What is the main advantage of Apache Spark over Hadoop MapReduce?	55	MEDIUM	1	t	2025-09-23 06:50:33.006+00	2025-09-23 06:50:33.006+00
24	What is an RDD in Apache Spark?	55	HARD	1	t	2025-09-23 06:50:33.019+00	2025-09-23 06:50:33.019+00
\.


--
-- TOC entry 3598 (class 0 OID 86491)
-- Dependencies: 227
-- Data for Name: question_bank_options; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.question_bank_options (id, "questionId", "optionText", "isCorrect", "createdAt", "updatedAt") FROM stdin;
1	1	int *ptr;	t	2025-09-23 06:50:32.633+00	2025-09-23 06:50:32.633+00
2	1	int ptr*;	f	2025-09-23 06:50:32.637+00	2025-09-23 06:50:32.637+00
3	1	pointer int ptr;	f	2025-09-23 06:50:32.639+00	2025-09-23 06:50:32.639+00
4	1	*int ptr;	f	2025-09-23 06:50:32.642+00	2025-09-23 06:50:32.642+00
5	2	alloc()	f	2025-09-23 06:50:32.649+00	2025-09-23 06:50:32.649+00
6	2	malloc()	t	2025-09-23 06:50:32.652+00	2025-09-23 06:50:32.652+00
7	2	calloc()	f	2025-09-23 06:50:32.654+00	2025-09-23 06:50:32.654+00
8	2	Both malloc() and calloc()	f	2025-09-23 06:50:32.657+00	2025-09-23 06:50:32.657+00
9	3	Size of variable in bits	f	2025-09-23 06:50:32.663+00	2025-09-23 06:50:32.663+00
10	3	Size of variable in bytes	t	2025-09-23 06:50:32.667+00	2025-09-23 06:50:32.667+00
11	3	Address of variable	f	2025-09-23 06:50:32.67+00	2025-09-23 06:50:32.67+00
12	3	Value of variable	f	2025-09-23 06:50:32.675+00	2025-09-23 06:50:32.675+00
13	4	int	f	2025-09-23 06:50:32.682+00	2025-09-23 06:50:32.682+00
14	4	float	f	2025-09-23 06:50:32.685+00	2025-09-23 06:50:32.685+00
15	4	string	t	2025-09-23 06:50:32.688+00	2025-09-23 06:50:32.688+00
16	4	char	f	2025-09-23 06:50:32.69+00	2025-09-23 06:50:32.69+00
17	5	Inheritance	f	2025-09-23 06:50:32.697+00	2025-09-23 06:50:32.697+00
18	5	Polymorphism	f	2025-09-23 06:50:32.7+00	2025-09-23 06:50:32.7+00
19	5	Encapsulation	t	2025-09-23 06:50:32.703+00	2025-09-23 06:50:32.703+00
20	5	Abstraction	f	2025-09-23 06:50:32.705+00	2025-09-23 06:50:32.705+00
21	6	true	f	2025-09-23 06:50:32.712+00	2025-09-23 06:50:32.712+00
22	6	false	t	2025-09-23 06:50:32.715+00	2025-09-23 06:50:32.715+00
23	6	0	f	2025-09-23 06:50:32.719+00	2025-09-23 06:50:32.719+00
24	6	null	f	2025-09-23 06:50:32.722+00	2025-09-23 06:50:32.722+00
25	7	main()	f	2025-09-23 06:50:32.727+00	2025-09-23 06:50:32.727+00
26	7	constructor	t	2025-09-23 06:50:32.731+00	2025-09-23 06:50:32.731+00
27	7	init()	f	2025-09-23 06:50:32.734+00	2025-09-23 06:50:32.734+00
28	7	start()	f	2025-09-23 06:50:32.736+00	2025-09-23 06:50:32.736+00
29	8	Java Virtual Machine	t	2025-09-23 06:50:32.742+00	2025-09-23 06:50:32.742+00
30	8	Java Variable Method	f	2025-09-23 06:50:32.745+00	2025-09-23 06:50:32.745+00
31	8	Java Verified Module	f	2025-09-23 06:50:32.748+00	2025-09-23 06:50:32.748+00
32	8	Java Version Manager	f	2025-09-23 06:50:32.751+00	2025-09-23 06:50:32.751+00
33	9	O(1)	t	2025-09-23 06:50:32.756+00	2025-09-23 06:50:32.756+00
34	9	O(n)	f	2025-09-23 06:50:32.759+00	2025-09-23 06:50:32.759+00
35	9	O(log n)	f	2025-09-23 06:50:32.762+00	2025-09-23 06:50:32.762+00
36	9	O(n²)	f	2025-09-23 06:50:32.766+00	2025-09-23 06:50:32.766+00
37	10	Bubble Sort	f	2025-09-23 06:50:32.773+00	2025-09-23 06:50:32.773+00
38	10	Selection Sort	f	2025-09-23 06:50:32.775+00	2025-09-23 06:50:32.775+00
39	10	Quick Sort	t	2025-09-23 06:50:32.778+00	2025-09-23 06:50:32.778+00
40	10	Insertion Sort	f	2025-09-23 06:50:32.782+00	2025-09-23 06:50:32.782+00
41	11	O(1)	f	2025-09-23 06:50:32.787+00	2025-09-23 06:50:32.787+00
42	11	O(log n)	f	2025-09-23 06:50:32.79+00	2025-09-23 06:50:32.79+00
43	11	O(n)	t	2025-09-23 06:50:32.794+00	2025-09-23 06:50:32.794+00
44	11	O(n log n)	f	2025-09-23 06:50:32.797+00	2025-09-23 06:50:32.797+00
45	12	GET	f	2025-09-23 06:50:32.804+00	2025-09-23 06:50:32.804+00
46	12	SELECT	t	2025-09-23 06:50:32.808+00	2025-09-23 06:50:32.808+00
47	12	RETRIEVE	f	2025-09-23 06:50:32.817+00	2025-09-23 06:50:32.817+00
48	12	FETCH	f	2025-09-23 06:50:32.828+00	2025-09-23 06:50:32.828+00
49	13	Atomicity, Consistency, Isolation, Durability	t	2025-09-23 06:50:32.839+00	2025-09-23 06:50:32.839+00
50	13	Access, Control, Integration, Data	f	2025-09-23 06:50:32.844+00	2025-09-23 06:50:32.844+00
51	13	Automatic, Consistent, Independent, Durable	f	2025-09-23 06:50:32.85+00	2025-09-23 06:50:32.85+00
52	13	Atomic, Concurrent, Isolated, Distributed	f	2025-09-23 06:50:32.853+00	2025-09-23 06:50:32.853+00
53	14	1NF	f	2025-09-23 06:50:32.859+00	2025-09-23 06:50:32.859+00
54	14	2NF	t	2025-09-23 06:50:32.862+00	2025-09-23 06:50:32.862+00
55	14	3NF	f	2025-09-23 06:50:32.867+00	2025-09-23 06:50:32.867+00
56	14	BCNF	f	2025-09-23 06:50:32.87+00	2025-09-23 06:50:32.87+00
57	15	K-means	f	2025-09-23 06:50:32.877+00	2025-09-23 06:50:32.877+00
58	15	Logistic Regression	t	2025-09-23 06:50:32.881+00	2025-09-23 06:50:32.881+00
59	15	DBSCAN	f	2025-09-23 06:50:32.884+00	2025-09-23 06:50:32.884+00
60	15	PCA	f	2025-09-23 06:50:32.887+00	2025-09-23 06:50:32.887+00
61	16	Model performs well on training but poor on test data	t	2025-09-23 06:50:32.893+00	2025-09-23 06:50:32.893+00
62	16	Model performs poorly on both training and test data	f	2025-09-23 06:50:32.897+00	2025-09-23 06:50:32.897+00
63	16	Model takes too long to train	f	2025-09-23 06:50:32.9+00	2025-09-23 06:50:32.9+00
64	16	Model uses too much memory	f	2025-09-23 06:50:32.903+00	2025-09-23 06:50:32.903+00
65	17	Accuracy	f	2025-09-23 06:50:32.909+00	2025-09-23 06:50:32.909+00
66	17	Precision	f	2025-09-23 06:50:32.912+00	2025-09-23 06:50:32.912+00
67	17	F1-Score	t	2025-09-23 06:50:32.918+00	2025-09-23 06:50:32.918+00
68	17	Mean Squared Error	f	2025-09-23 06:50:32.922+00	2025-09-23 06:50:32.922+00
69	18	JavaScript XML	t	2025-09-23 06:50:32.931+00	2025-09-23 06:50:32.931+00
70	18	Java Syntax Extension	f	2025-09-23 06:50:32.934+00	2025-09-23 06:50:32.934+00
71	18	JSON Extended	f	2025-09-23 06:50:32.937+00	2025-09-23 06:50:32.937+00
72	18	JavaScript Extension	f	2025-09-23 06:50:32.94+00	2025-09-23 06:50:32.94+00
73	19	useEffect	f	2025-09-23 06:50:32.948+00	2025-09-23 06:50:32.948+00
74	19	useState	t	2025-09-23 06:50:32.951+00	2025-09-23 06:50:32.951+00
75	19	useContext	f	2025-09-23 06:50:32.955+00	2025-09-23 06:50:32.955+00
76	19	useReducer	f	2025-09-23 06:50:32.958+00	2025-09-23 06:50:32.958+00
77	20	A copy of the real DOM kept in memory	t	2025-09-23 06:50:32.964+00	2025-09-23 06:50:32.964+00
78	20	A new HTML standard	f	2025-09-23 06:50:32.966+00	2025-09-23 06:50:32.966+00
79	20	A CSS framework	f	2025-09-23 06:50:32.969+00	2025-09-23 06:50:32.969+00
80	20	A JavaScript library	f	2025-09-23 06:50:32.972+00	2025-09-23 06:50:32.972+00
81	21	Asymmetric encryption	f	2025-09-23 06:50:32.978+00	2025-09-23 06:50:32.978+00
82	21	Symmetric encryption	t	2025-09-23 06:50:32.982+00	2025-09-23 06:50:32.982+00
83	21	Hash encryption	f	2025-09-23 06:50:32.985+00	2025-09-23 06:50:32.985+00
84	21	Digital signature	f	2025-09-23 06:50:32.988+00	2025-09-23 06:50:32.988+00
85	22	HTTP	f	2025-09-23 06:50:32.995+00	2025-09-23 06:50:32.995+00
86	22	HTTPS	t	2025-09-23 06:50:32.998+00	2025-09-23 06:50:32.998+00
87	22	FTP	f	2025-09-23 06:50:33.001+00	2025-09-23 06:50:33.001+00
88	22	SMTP	f	2025-09-23 06:50:33.003+00	2025-09-23 06:50:33.003+00
89	23	Better security	f	2025-09-23 06:50:33.008+00	2025-09-23 06:50:33.008+00
90	23	In-memory processing	t	2025-09-23 06:50:33.011+00	2025-09-23 06:50:33.011+00
91	23	Smaller file size	f	2025-09-23 06:50:33.014+00	2025-09-23 06:50:33.014+00
92	23	Easier installation	f	2025-09-23 06:50:33.016+00	2025-09-23 06:50:33.016+00
93	24	Resilient Distributed Dataset	t	2025-09-23 06:50:33.021+00	2025-09-23 06:50:33.021+00
94	24	Rapid Data Distribution	f	2025-09-23 06:50:33.024+00	2025-09-23 06:50:33.024+00
95	24	Real-time Data Delivery	f	2025-09-23 06:50:33.026+00	2025-09-23 06:50:33.026+00
96	24	Relational Database Driver	f	2025-09-23 06:50:33.028+00	2025-09-23 06:50:33.028+00
\.


--
-- TOC entry 3586 (class 0 OID 17819)
-- Dependencies: 215
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.questions (id, quiz_id, question_text, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3590 (class 0 OID 17851)
-- Dependencies: 219
-- Data for Name: quiz_answers; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.quiz_answers (id, attempt_id, question_id, selected_options, is_correct, time_spent, answered_at) FROM stdin;
\.


--
-- TOC entry 3606 (class 0 OID 86581)
-- Dependencies: 235
-- Data for Name: quiz_attempt_answers; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.quiz_attempt_answers (id, "attemptId", "questionId", "selectedOptions", "isCorrect", "timeSpent", "createdAt", "updatedAt") FROM stdin;
1	52	9	[36]	f	15	2025-09-23 07:02:14.534+00	2025-09-23 07:02:26.187+00
2	52	10	[40]	f	4	2025-09-23 07:02:19.403+00	2025-09-23 07:02:26.2+00
3	52	11	[44]	f	3	2025-09-23 07:02:23.524+00	2025-09-23 07:02:26.207+00
\.


--
-- TOC entry 3604 (class 0 OID 86560)
-- Dependencies: 233
-- Data for Name: quiz_attempts; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.quiz_attempts (id, "userId", "quizId", status, score, "totalQuestions", "correctAnswers", "timeSpent", "startedAt", "completedAt", "createdAt", "updatedAt") FROM stdin;
1	18	6	COMPLETED	91	10	6	371	2025-09-20 07:26:22.272+00	2025-09-23 06:50:33.087+00	2025-09-23 06:50:33.087+00	2025-09-23 06:50:33.087+00
2	14	10	COMPLETED	66	10	10	617	2025-09-18 14:23:14.569+00	2025-09-23 06:50:33.091+00	2025-09-23 06:50:33.091+00	2025-09-23 06:50:33.091+00
3	1	4	COMPLETED	34	10	9	642	2025-09-19 08:59:35.721+00	2025-09-23 06:50:33.096+00	2025-09-23 06:50:33.096+00	2025-09-23 06:50:33.096+00
4	4	6	COMPLETED	29	10	10	377	2025-09-20 13:26:10.62+00	2025-09-23 06:50:33.1+00	2025-09-23 06:50:33.1+00	2025-09-23 06:50:33.1+00
5	2	8	COMPLETED	38	10	10	256	2025-09-22 06:26:33.167+00	2025-09-23 06:50:33.102+00	2025-09-23 06:50:33.102+00	2025-09-23 06:50:33.102+00
6	18	10	COMPLETED	19	10	10	377	2025-09-19 17:21:00.817+00	2025-09-23 06:50:33.105+00	2025-09-23 06:50:33.105+00	2025-09-23 06:50:33.105+00
7	6	6	COMPLETED	38	10	4	491	2025-09-20 12:09:41.701+00	2025-09-23 06:50:33.109+00	2025-09-23 06:50:33.109+00	2025-09-23 06:50:33.109+00
8	11	8	COMPLETED	30	10	3	447	2025-09-22 05:18:13.096+00	2025-09-23 06:50:33.112+00	2025-09-23 06:50:33.112+00	2025-09-23 06:50:33.112+00
9	25	11	COMPLETED	8	10	6	642	2025-09-17 11:04:34.057+00	2025-09-23 06:50:33.114+00	2025-09-23 06:50:33.115+00	2025-09-23 06:50:33.115+00
10	18	8	COMPLETED	8	10	1	423	2025-09-21 23:06:09.419+00	2025-09-23 06:50:33.117+00	2025-09-23 06:50:33.117+00	2025-09-23 06:50:33.117+00
11	21	1	COMPLETED	83	10	3	329	2025-09-21 03:00:26.807+00	2025-09-23 06:50:33.119+00	2025-09-23 06:50:33.119+00	2025-09-23 06:50:33.119+00
12	20	1	COMPLETED	56	10	5	527	2025-09-19 14:20:07.427+00	2025-09-23 06:50:33.122+00	2025-09-23 06:50:33.122+00	2025-09-23 06:50:33.122+00
13	1	7	COMPLETED	34	10	5	61	2025-09-19 07:58:44.556+00	2025-09-23 06:50:33.125+00	2025-09-23 06:50:33.125+00	2025-09-23 06:50:33.125+00
14	10	1	COMPLETED	29	10	9	398	2025-09-21 20:51:26.695+00	2025-09-23 06:50:33.128+00	2025-09-23 06:50:33.128+00	2025-09-23 06:50:33.128+00
15	2	9	COMPLETED	19	10	6	588	2025-09-18 13:02:02.519+00	2025-09-23 06:50:33.131+00	2025-09-23 06:50:33.131+00	2025-09-23 06:50:33.131+00
16	18	1	COMPLETED	52	10	7	337	2025-09-16 19:03:32.547+00	2025-09-23 06:50:33.134+00	2025-09-23 06:50:33.134+00	2025-09-23 06:50:33.134+00
17	13	1	COMPLETED	17	10	0	576	2025-09-17 15:34:12.219+00	2025-09-23 06:50:33.138+00	2025-09-23 06:50:33.138+00	2025-09-23 06:50:33.138+00
18	17	13	COMPLETED	24	10	7	72	2025-09-19 23:57:17.624+00	2025-09-23 06:50:33.142+00	2025-09-23 06:50:33.142+00	2025-09-23 06:50:33.142+00
19	11	8	COMPLETED	90	10	0	282	2025-09-18 21:15:39.214+00	2025-09-23 06:50:33.144+00	2025-09-23 06:50:33.144+00	2025-09-23 06:50:33.144+00
20	15	13	COMPLETED	83	10	7	581	2025-09-17 08:50:49.615+00	2025-09-23 06:50:33.147+00	2025-09-23 06:50:33.147+00	2025-09-23 06:50:33.147+00
21	19	3	COMPLETED	88	10	5	114	2025-09-19 18:42:47.839+00	2025-09-23 06:50:33.15+00	2025-09-23 06:50:33.15+00	2025-09-23 06:50:33.15+00
22	7	10	COMPLETED	14	10	0	192	2025-09-20 19:44:56.801+00	2025-09-23 06:50:33.152+00	2025-09-23 06:50:33.152+00	2025-09-23 06:50:33.152+00
23	18	7	COMPLETED	36	10	1	627	2025-09-19 07:21:18.495+00	2025-09-23 06:50:33.155+00	2025-09-23 06:50:33.155+00	2025-09-23 06:50:33.155+00
24	4	4	COMPLETED	59	10	10	165	2025-09-19 20:09:35.844+00	2025-09-23 06:50:33.158+00	2025-09-23 06:50:33.158+00	2025-09-23 06:50:33.158+00
25	21	12	COMPLETED	41	10	5	81	2025-09-17 05:53:59.671+00	2025-09-23 06:50:33.163+00	2025-09-23 06:50:33.164+00	2025-09-23 06:50:33.164+00
26	11	11	COMPLETED	54	10	6	590	2025-09-20 21:00:39.939+00	2025-09-23 06:50:33.168+00	2025-09-23 06:50:33.168+00	2025-09-23 06:50:33.168+00
27	5	5	COMPLETED	17	10	6	549	2025-09-16 08:01:06.205+00	2025-09-23 06:50:33.174+00	2025-09-23 06:50:33.174+00	2025-09-23 06:50:33.174+00
28	11	11	COMPLETED	70	10	0	535	2025-09-18 01:24:40.65+00	2025-09-23 06:50:33.177+00	2025-09-23 06:50:33.177+00	2025-09-23 06:50:33.177+00
29	22	3	COMPLETED	14	10	7	243	2025-09-19 19:11:46.511+00	2025-09-23 06:50:33.18+00	2025-09-23 06:50:33.18+00	2025-09-23 06:50:33.18+00
30	22	7	COMPLETED	0	10	10	572	2025-09-20 22:05:45.83+00	2025-09-23 06:50:33.182+00	2025-09-23 06:50:33.183+00	2025-09-23 06:50:33.183+00
31	3	2	COMPLETED	31	10	4	344	2025-09-16 18:13:15.112+00	2025-09-23 06:50:33.186+00	2025-09-23 06:50:33.186+00	2025-09-23 06:50:33.186+00
32	19	8	COMPLETED	26	10	10	384	2025-09-19 22:38:19.248+00	2025-09-23 06:50:33.189+00	2025-09-23 06:50:33.189+00	2025-09-23 06:50:33.189+00
33	10	8	COMPLETED	33	10	5	527	2025-09-23 02:22:23.221+00	2025-09-23 06:50:33.192+00	2025-09-23 06:50:33.192+00	2025-09-23 06:50:33.192+00
34	8	14	COMPLETED	59	10	9	282	2025-09-22 10:19:14.631+00	2025-09-23 06:50:33.195+00	2025-09-23 06:50:33.195+00	2025-09-23 06:50:33.195+00
35	3	9	COMPLETED	73	10	8	551	2025-09-20 14:08:49.15+00	2025-09-23 06:50:33.2+00	2025-09-23 06:50:33.2+00	2025-09-23 06:50:33.2+00
36	16	11	COMPLETED	83	10	8	106	2025-09-22 05:14:31.265+00	2025-09-23 06:50:33.203+00	2025-09-23 06:50:33.203+00	2025-09-23 06:50:33.203+00
37	21	7	COMPLETED	90	10	1	314	2025-09-18 16:21:35.363+00	2025-09-23 06:50:33.206+00	2025-09-23 06:50:33.206+00	2025-09-23 06:50:33.206+00
38	10	11	COMPLETED	10	10	0	151	2025-09-18 20:16:49.111+00	2025-09-23 06:50:33.209+00	2025-09-23 06:50:33.21+00	2025-09-23 06:50:33.21+00
39	1	13	COMPLETED	10	10	6	591	2025-09-22 09:41:44.35+00	2025-09-23 06:50:33.213+00	2025-09-23 06:50:33.213+00	2025-09-23 06:50:33.213+00
40	2	12	COMPLETED	12	10	2	338	2025-09-18 10:39:24.519+00	2025-09-23 06:50:33.217+00	2025-09-23 06:50:33.217+00	2025-09-23 06:50:33.217+00
41	16	2	COMPLETED	5	10	3	405	2025-09-18 13:20:02.877+00	2025-09-23 06:50:33.22+00	2025-09-23 06:50:33.22+00	2025-09-23 06:50:33.22+00
42	8	1	COMPLETED	94	10	9	530	2025-09-23 06:19:54.647+00	2025-09-23 06:50:33.222+00	2025-09-23 06:50:33.223+00	2025-09-23 06:50:33.223+00
43	1	10	COMPLETED	11	10	6	529	2025-09-20 19:53:35.643+00	2025-09-23 06:50:33.227+00	2025-09-23 06:50:33.227+00	2025-09-23 06:50:33.227+00
44	3	5	COMPLETED	83	10	6	133	2025-09-21 17:15:36.576+00	2025-09-23 06:50:33.23+00	2025-09-23 06:50:33.23+00	2025-09-23 06:50:33.23+00
45	10	2	COMPLETED	10	10	2	186	2025-09-21 09:30:05.576+00	2025-09-23 06:50:33.234+00	2025-09-23 06:50:33.234+00	2025-09-23 06:50:33.234+00
46	17	12	COMPLETED	27	10	4	164	2025-09-22 14:34:01.221+00	2025-09-23 06:50:33.238+00	2025-09-23 06:50:33.238+00	2025-09-23 06:50:33.238+00
47	1	13	COMPLETED	17	10	2	264	2025-09-21 01:10:52.786+00	2025-09-23 06:50:33.243+00	2025-09-23 06:50:33.243+00	2025-09-23 06:50:33.243+00
48	2	9	COMPLETED	4	10	8	128	2025-09-18 17:35:44.09+00	2025-09-23 06:50:33.25+00	2025-09-23 06:50:33.25+00	2025-09-23 06:50:33.25+00
49	6	1	COMPLETED	36	10	1	136	2025-09-22 04:12:34.948+00	2025-09-23 06:50:33.253+00	2025-09-23 06:50:33.253+00	2025-09-23 06:50:33.253+00
50	7	9	COMPLETED	1	10	3	257	2025-09-21 05:04:34.148+00	2025-09-23 06:50:33.257+00	2025-09-23 06:50:33.257+00	2025-09-23 06:50:33.257+00
51	1	6	IN_PROGRESS	0	0	0	\N	2025-09-23 07:01:58.928+00	\N	2025-09-23 07:01:58.929+00	2025-09-23 07:01:58.929+00
52	1	6	COMPLETED	0	3	0	22	2025-09-23 07:01:58.932+00	2025-09-23 07:02:26.211+00	2025-09-23 07:01:58.932+00	2025-09-23 07:02:26.211+00
53	1	6	IN_PROGRESS	0	0	0	\N	2025-09-23 07:10:33.617+00	\N	2025-09-23 07:10:33.617+00	2025-09-23 07:10:33.617+00
54	1	6	IN_PROGRESS	0	0	0	\N	2025-09-23 07:10:33.621+00	\N	2025-09-23 07:10:33.621+00	2025-09-23 07:10:33.621+00
\.


--
-- TOC entry 3602 (class 0 OID 86536)
-- Dependencies: 231
-- Data for Name: quiz_questions; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.quiz_questions (id, "quizId", "questionId", "order", "createdAt", "updatedAt") FROM stdin;
1	1	1	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
2	1	2	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
3	1	3	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
4	1	4	4	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
5	2	1	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
6	2	2	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
7	2	3	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
8	2	4	4	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
9	3	5	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
10	3	6	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
11	3	7	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
12	3	8	4	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
13	4	5	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
14	4	6	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
15	4	7	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
16	4	8	4	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
17	5	9	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
18	5	10	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
19	5	11	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
20	6	9	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
21	6	10	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
22	6	11	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
23	7	12	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
24	7	13	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
25	7	14	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
26	8	12	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
27	8	13	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
28	8	14	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
29	9	15	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
30	9	16	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
31	9	17	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
32	10	15	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
33	10	16	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
34	10	17	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
35	11	18	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
36	11	19	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
37	11	20	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
38	12	18	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
39	12	19	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
40	12	20	3	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
41	13	21	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
42	13	22	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
43	14	23	1	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
44	14	24	2	2025-09-23 06:50:33.076+00	2025-09-23 06:50:33.076+00
\.


--
-- TOC entry 3600 (class 0 OID 86514)
-- Dependencies: 229
-- Data for Name: quizzes; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.quizzes (id, title, description, difficulty, "timeLimit", "maxQuestions", "categoryId", "createdById", "isActive", popularity, "createdAt", "updatedAt") FROM stdin;
1	C Programming Fundamentals	Comprehensive C Programming Fundamentals quiz covering key concepts and practical applications	EASY	30	10	3	17	t	0	2025-09-23 06:50:33.034+00	2025-09-23 06:50:33.034+00
2	Advanced C Programming	Comprehensive Advanced C Programming quiz covering key concepts and practical applications	MEDIUM	30	10	3	19	t	0	2025-09-23 06:50:33.038+00	2025-09-23 06:50:33.038+00
3	Java OOP Concepts	Comprehensive Java OOP Concepts quiz covering key concepts and practical applications	MEDIUM	30	10	5	10	t	0	2025-09-23 06:50:33.04+00	2025-09-23 06:50:33.04+00
4	Java Advanced Topics	Comprehensive Java Advanced Topics quiz covering key concepts and practical applications	HARD	30	10	5	19	t	0	2025-09-23 06:50:33.043+00	2025-09-23 06:50:33.043+00
5	Data Structures Basics	Comprehensive Data Structures Basics quiz covering key concepts and practical applications	EASY	30	10	10	18	t	0	2025-09-23 06:50:33.046+00	2025-09-23 06:50:33.046+00
6	Algorithm Analysis	Comprehensive Algorithm Analysis quiz covering key concepts and practical applications	HARD	30	10	10	5	t	0	2025-09-23 06:50:33.049+00	2025-09-23 06:50:33.049+00
7	SQL Query Writing	Comprehensive SQL Query Writing quiz covering key concepts and practical applications	MEDIUM	30	10	17	4	t	0	2025-09-23 06:50:33.052+00	2025-09-23 06:50:33.052+00
8	Database Design Principles	Comprehensive Database Design Principles quiz covering key concepts and practical applications	HARD	30	10	17	11	t	0	2025-09-23 06:50:33.055+00	2025-09-23 06:50:33.055+00
9	Machine Learning Basics	Comprehensive Machine Learning Basics quiz covering key concepts and practical applications	MEDIUM	30	10	30	12	t	0	2025-09-23 06:50:33.058+00	2025-09-23 06:50:33.058+00
10	ML Model Evaluation	Comprehensive ML Model Evaluation quiz covering key concepts and practical applications	HARD	30	10	30	11	t	0	2025-09-23 06:50:33.061+00	2025-09-23 06:50:33.061+00
11	React Development	Comprehensive React Development quiz covering key concepts and practical applications	MEDIUM	30	10	24	9	t	0	2025-09-23 06:50:33.065+00	2025-09-23 06:50:33.065+00
12	React Advanced Patterns	Comprehensive React Advanced Patterns quiz covering key concepts and practical applications	HARD	30	10	24	21	t	0	2025-09-23 06:50:33.068+00	2025-09-23 06:50:33.068+00
13	Network Security Fundamentals	Comprehensive Network Security Fundamentals quiz covering key concepts and practical applications	MEDIUM	30	10	45	5	t	0	2025-09-23 06:50:33.071+00	2025-09-23 06:50:33.071+00
14	Big Data Processing	Comprehensive Big Data Processing quiz covering key concepts and practical applications	HARD	30	10	55	10	t	0	2025-09-23 06:50:33.073+00	2025-09-23 06:50:33.073+00
\.


--
-- TOC entry 3592 (class 0 OID 86428)
-- Dependencies: 221
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: quiz_user
--

COPY public.users (id, username, email, "passwordHash", role, "firstName", "lastName", avatar, "eloRating", "totalMatches", wins, losses, "isActive", "lastLoginAt", "createdAt", "updatedAt") FROM stdin;
1	admin1	admin1@engineering.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Admin	User 1	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
2	admin2	admin2@engineering.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Admin	User 2	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
3	admin3	admin3@engineering.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Admin	User 3	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
4	admin4	admin4@engineering.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Admin	User 4	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
5	admin5	admin5@engineering.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Admin	User 5	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
6	student1	arjun.sharma@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Arjun	Sharma	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
7	student2	priya.patel@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Priya	Patel	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
8	student3	rahul.kumar@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Rahul	Kumar	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
9	student4	sneha.singh@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Sneha	Singh	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
10	student5	vikram.reddy@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Vikram	Reddy	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
11	student6	ananya.gupta@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Ananya	Gupta	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
12	student7	karthik.nair@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Karthik	Nair	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
13	student8	divya.iyer@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Divya	Iyer	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
14	student9	rohit.agarwal@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Rohit	Agarwal	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
15	student10	meera.joshi@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Meera	Joshi	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
16	student11	siddharth.roy@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Siddharth	Roy	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
17	student12	kavya.menon@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Kavya	Menon	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
18	student13	aditya.verma@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Aditya	Verma	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
19	student14	riya.bansal@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Riya	Bansal	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
20	student15	harsh.malhotra@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Harsh	Malhotra	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
21	student16	pooja.sinha@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Pooja	Sinha	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
22	student17	nikhil.pandey@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Nikhil	Pandey	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
23	student18	shreya.kapoor@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Shreya	Kapoor	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
24	student19	varun.saxena@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Varun	Saxena	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
25	student20	isha.tiwari@student.edu	$2b$10$yr6vpmHjp/xlr90ij/PG2.bVz0PdxRcor10VSh121IyOQ3GlzarY2	ADMIN	Isha	Tiwari	\N	1200	0	0	0	t	\N	2025-09-23 06:50:32.434+00	2025-09-23 06:50:32.434+00
26	aryanmahida2	aryanmahida2@gmail.com	$2a$12$dvlVx41jKdxIEx0HxgTJD.ykb0.7/Cup0E49Nfy/Ij6HfEqP1pFym	ADMIN	Aryan	mahida	\N	1200	0	0	0	t	\N	2025-09-23 06:50:43.036+00	2025-09-23 06:50:43.036+00
27	SpecterDonna	SpecterDonna@Gmail.Com	$2a$12$nlkXiLRXBeOCCgF4JHvW6OmUBpcjuWSEzGLLtXqlfRS38WKYgiSZq	ADMIN	Harvey 	Specter	\N	1200	0	0	0	t	\N	2025-09-23 06:53:14.582+00	2025-09-23 06:53:14.582+00
31	kirtanmakwana2stud	kirtanmakwana2stud@gmail.com	$2a$12$mxXGsYHSGkPPv82OZ3xul.fmALkIQqhiRnpyeHAZgIFTimDINXPIK	ADMIN	Kirtan	Makwana	\N	1200	0	0	0	t	\N	2025-09-23 06:54:15.491+00	2025-09-23 06:54:15.491+00
32	litt	litt@sheila.com	$2a$12$cX4naE6LcDovPBB3wwtFS.Uu3qUCY2mWq/6N.hBc6i2p54JRtY.xu	ADMIN	Louis 	Litt	\N	1200	0	0	0	t	\N	2025-09-23 06:57:40.406+00	2025-09-23 06:57:40.406+00
28	krishmamtora26	krishmamtora26@gmail.com	$2a$12$YukHZ4.xuMZxnwTiYZvMVuaMk96IBsqzgs.8MwdNCxQ/DlQK8py0.	ADMIN	Krish	Mamtora	\N	1200	0	0	0	t	2025-09-23 07:01:20.717+00	2025-09-23 06:53:21.806+00	2025-09-23 07:01:20.718+00
29	aryanlanghanoja233	aryanlanghanoja233@gmail.com	$2a$12$FaQuOhVGzXvo0K/wWjN9c.KqoKiXbZK1gB0ufMW9OKJgMjgcT34by	ADMIN	Aryan	Langhanoja	\N	1200	0	0	0	t	2025-09-23 07:01:33.69+00	2025-09-23 06:53:27.638+00	2025-09-23 07:01:33.69+00
30	abcd123	abcd123@gmail.com	$2a$12$54p8gQ1HsmpieXd4dbr.aehXr.kNkDaqLfAtnxXG3FbFounS9DZh.	ADMIN	Fenil	Vadher	\N	1200	0	0	0	t	2025-09-23 07:01:51.416+00	2025-09-23 06:53:37.579+00	2025-09-23 07:01:51.417+00
33	yeaboi	yeaboi@gmail.com	$2a$12$Dm3L3J53haGVnIsVcnpZKeB4ykxRpeRo5U6UVlu9ZFe6CVrkwkdTq	ADMIN	Yea	Boi	\N	1200	0	0	0	t	\N	2025-09-23 07:04:54.666+00	2025-09-23 07:04:54.666+00
34	nandini	nandini@gmail.com	$2a$12$9/fjKAaflCRVbs1IIyn5b.jHDYiP0onEhnDpY0LdEK4NU3ztiyvTi	ADMIN	Nandini 	paper	\N	1200	0	0	0	t	\N	2025-09-23 07:05:21.035+00	2025-09-23 07:05:21.035+00
35	shyama	shyama@gmail.com	$2a$12$x5bldf1CS1IdF.L9AtgF0.0idNw6VCjiIeb0qJvahSbJd6Op/OinK	ADMIN	shyama	vagadia	\N	1200	0	0	0	t	\N	2025-09-23 07:05:21.981+00	2025-09-23 07:05:21.981+00
36	bksony	bksony@gmail.com	$2a$12$4qwMc2LfZtswyVR/34Jwy.ZHKwNDn1rfcTz/3wp0C3MO1sQy22ssW	ADMIN	john 	Deo	\N	1200	0	0	0	t	\N	2025-09-23 07:08:14.117+00	2025-09-23 07:08:14.117+00
\.


--
-- TOC entry 3630 (class 0 OID 0)
-- Dependencies: 222
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.categories_id_seq', 60, true);


--
-- TOC entry 3631 (class 0 OID 0)
-- Dependencies: 238
-- Name: match_players_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.match_players_id_seq', 1, false);


--
-- TOC entry 3632 (class 0 OID 0)
-- Dependencies: 236
-- Name: matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.matches_id_seq', 1, false);


--
-- TOC entry 3633 (class 0 OID 0)
-- Dependencies: 216
-- Name: options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.options_id_seq', 1, false);


--
-- TOC entry 3634 (class 0 OID 0)
-- Dependencies: 224
-- Name: question_bank_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.question_bank_items_id_seq', 24, true);


--
-- TOC entry 3635 (class 0 OID 0)
-- Dependencies: 226
-- Name: question_bank_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.question_bank_options_id_seq', 96, true);


--
-- TOC entry 3636 (class 0 OID 0)
-- Dependencies: 214
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.questions_id_seq', 1, false);


--
-- TOC entry 3637 (class 0 OID 0)
-- Dependencies: 218
-- Name: quiz_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.quiz_answers_id_seq', 1, false);


--
-- TOC entry 3638 (class 0 OID 0)
-- Dependencies: 234
-- Name: quiz_attempt_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.quiz_attempt_answers_id_seq', 3, true);


--
-- TOC entry 3639 (class 0 OID 0)
-- Dependencies: 232
-- Name: quiz_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.quiz_attempts_id_seq', 54, true);


--
-- TOC entry 3640 (class 0 OID 0)
-- Dependencies: 230
-- Name: quiz_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.quiz_questions_id_seq', 44, true);


--
-- TOC entry 3641 (class 0 OID 0)
-- Dependencies: 228
-- Name: quizzes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.quizzes_id_seq', 14, true);


--
-- TOC entry 3642 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quiz_user
--

SELECT pg_catalog.setval('public.users_id_seq', 36, true);


--
-- TOC entry 3410 (class 2606 OID 86455)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 3426 (class 2606 OID 86654)
-- Name: match_players match_players_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_pkey PRIMARY KEY (id);


--
-- TOC entry 3424 (class 2606 OID 86626)
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- TOC entry 3400 (class 2606 OID 17838)
-- Name: options options_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.options
    ADD CONSTRAINT options_pkey PRIMARY KEY (id);


--
-- TOC entry 3412 (class 2606 OID 86479)
-- Name: question_bank_items question_bank_items_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.question_bank_items
    ADD CONSTRAINT question_bank_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3414 (class 2606 OID 86499)
-- Name: question_bank_options question_bank_options_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.question_bank_options
    ADD CONSTRAINT question_bank_options_pkey PRIMARY KEY (id);


--
-- TOC entry 3398 (class 2606 OID 17827)
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- TOC entry 3402 (class 2606 OID 17859)
-- Name: quiz_answers quiz_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_pkey PRIMARY KEY (id);


--
-- TOC entry 3422 (class 2606 OID 86589)
-- Name: quiz_attempt_answers quiz_attempt_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_attempt_answers
    ADD CONSTRAINT quiz_attempt_answers_pkey PRIMARY KEY (id);


--
-- TOC entry 3420 (class 2606 OID 86569)
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- TOC entry 3418 (class 2606 OID 86541)
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- TOC entry 3416 (class 2606 OID 86524)
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- TOC entry 3404 (class 2606 OID 86445)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3406 (class 2606 OID 86441)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3408 (class 2606 OID 86443)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3428 (class 2606 OID 86456)
-- Name: categories categories_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.categories(id) ON UPDATE CASCADE;


--
-- TOC entry 3441 (class 2606 OID 86655)
-- Name: match_players match_players_matchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT "match_players_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3442 (class 2606 OID 86660)
-- Name: match_players match_players_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT "match_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3440 (class 2606 OID 86627)
-- Name: matches matches_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzes(id) ON UPDATE CASCADE;


--
-- TOC entry 3427 (class 2606 OID 17931)
-- Name: options options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.options
    ADD CONSTRAINT options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3429 (class 2606 OID 86480)
-- Name: question_bank_items question_bank_items_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.question_bank_items
    ADD CONSTRAINT "question_bank_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3430 (class 2606 OID 86485)
-- Name: question_bank_items question_bank_items_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.question_bank_items
    ADD CONSTRAINT "question_bank_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3431 (class 2606 OID 86500)
-- Name: question_bank_options question_bank_options_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.question_bank_options
    ADD CONSTRAINT "question_bank_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public.question_bank_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3438 (class 2606 OID 86590)
-- Name: quiz_attempt_answers quiz_attempt_answers_attemptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_attempt_answers
    ADD CONSTRAINT "quiz_attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES public.quiz_attempts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3439 (class 2606 OID 86595)
-- Name: quiz_attempt_answers quiz_attempt_answers_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_attempt_answers
    ADD CONSTRAINT "quiz_attempt_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public.question_bank_items(id) ON UPDATE CASCADE;


--
-- TOC entry 3436 (class 2606 OID 86575)
-- Name: quiz_attempts quiz_attempts_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzes(id) ON UPDATE CASCADE;


--
-- TOC entry 3437 (class 2606 OID 86570)
-- Name: quiz_attempts quiz_attempts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3434 (class 2606 OID 86547)
-- Name: quiz_questions quiz_questions_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT "quiz_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public.question_bank_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3435 (class 2606 OID 86542)
-- Name: quiz_questions quiz_questions_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzes(id) ON UPDATE CASCADE;


--
-- TOC entry 3432 (class 2606 OID 86525)
-- Name: quizzes quizzes_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT "quizzes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3433 (class 2606 OID 86530)
-- Name: quizzes quizzes_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: quiz_user
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT "quizzes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3616 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: quiz_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


-- Completed on 2025-09-23 12:46:42

--
-- PostgreSQL database dump complete
--

\unrestrict AMpHNQRV07C6ZZhfojQZ48PgHkl68FT8Y2Ab8Npr5myDc1AlztC0VRs5Q8H6T8b

