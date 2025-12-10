-- Adminer 5.4.0 PostgreSQL 15.14 dump

DROP DATABASE IF EXISTS "quizup_db";
CREATE DATABASE "quizup_db";
\connect "quizup_db";

CREATE TYPE "enum_users_role" AS ENUM ('ADMIN', 'PLAYER');

CREATE TYPE "enum_question_bank_items_difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

CREATE TYPE "enum_quizzes_difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

CREATE TYPE "enum_quiz_attempts_status" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

CREATE TYPE "enum_matches_type" AS ENUM ('SOLO', 'MULTIPLAYER', 'TOURNAMENT');

CREATE TYPE "enum_matches_status" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TYPE "enum_match_players_status" AS ENUM ('JOINED', 'WAITING', 'READY', 'PLAYING', 'FINISHED', 'DISCONNECTED');

DROP TABLE IF EXISTS "categories";
DROP SEQUENCE IF EXISTS categories_id_seq;
CREATE SEQUENCE categories_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 61 CACHE 1;

CREATE TABLE "public"."categories" (
    "id" integer DEFAULT nextval('categories_id_seq') NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" text,
    "parentId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

TRUNCATE "categories";
INSERT INTO "categories" ("id", "name", "description", "parentId", "isActive", "createdAt", "updatedAt") VALUES
(1,	'Computer Science & Engineering',	'Core Computer Science and Engineering subjects',	NULL,	'1',	'2025-09-28 10:31:01.51+00',	'2025-09-28 10:31:01.51+00'),
(2,	'Programming Languages',	'Programming languages and syntax',	1,	'1',	'2025-09-28 10:31:01.52+00',	'2025-09-28 10:31:01.52+00'),
(3,	'C Programming',	'C language fundamentals and advanced concepts',	2,	'1',	'2025-09-28 10:31:01.528+00',	'2025-09-28 10:31:01.528+00'),
(4,	'C++ Programming',	'Object-oriented programming with C++',	2,	'1',	'2025-09-28 10:31:01.532+00',	'2025-09-28 10:31:01.532+00'),
(5,	'Java Programming',	'Java language and OOP concepts',	2,	'1',	'2025-09-28 10:31:01.535+00',	'2025-09-28 10:31:01.535+00'),
(6,	'Python Programming',	'Python programming and applications',	2,	'1',	'2025-09-28 10:31:01.538+00',	'2025-09-28 10:31:01.538+00'),
(7,	'JavaScript',	'JavaScript for web development',	2,	'1',	'2025-09-28 10:31:01.543+00',	'2025-09-28 10:31:01.543+00'),
(8,	'TypeScript',	'TypeScript for type-safe development',	2,	'1',	'2025-09-28 10:31:01.547+00',	'2025-09-28 10:31:01.547+00'),
(9,	'Data Structures & Algorithms',	'Core DSA concepts and problem solving',	1,	'1',	'2025-09-28 10:31:01.55+00',	'2025-09-28 10:31:01.55+00'),
(10,	'Arrays & Strings',	'Array and string manipulation',	9,	'1',	'2025-09-28 10:31:01.554+00',	'2025-09-28 10:31:01.554+00'),
(11,	'Linked Lists',	'Linear data structures',	9,	'1',	'2025-09-28 10:31:01.558+00',	'2025-09-28 10:31:01.558+00'),
(12,	'Stacks & Queues',	'LIFO and FIFO data structures',	9,	'1',	'2025-09-28 10:31:01.562+00',	'2025-09-28 10:31:01.562+00'),
(13,	'Trees & Graphs',	'Hierarchical and network data structures',	9,	'1',	'2025-09-28 10:31:01.564+00',	'2025-09-28 10:31:01.564+00'),
(14,	'Sorting Algorithms',	'Various sorting techniques',	9,	'1',	'2025-09-28 10:31:01.567+00',	'2025-09-28 10:31:01.567+00'),
(15,	'Searching Algorithms',	'Linear and binary search methods',	9,	'1',	'2025-09-28 10:31:01.57+00',	'2025-09-28 10:31:01.57+00'),
(16,	'Database Management',	'Database concepts and management systems',	1,	'1',	'2025-09-28 10:31:01.575+00',	'2025-09-28 10:31:01.575+00'),
(17,	'SQL Fundamentals',	'Structured Query Language basics',	16,	'1',	'2025-09-28 10:31:01.578+00',	'2025-09-28 10:31:01.578+00'),
(18,	'Database Design',	'ER diagrams and normalization',	16,	'1',	'2025-09-28 10:31:01.581+00',	'2025-09-28 10:31:01.581+00'),
(19,	'RDBMS Concepts',	'Relational database management',	16,	'1',	'2025-09-28 10:31:01.584+00',	'2025-09-28 10:31:01.584+00'),
(20,	'NoSQL Databases',	'MongoDB, Redis, and document stores',	16,	'1',	'2025-09-28 10:31:01.587+00',	'2025-09-28 10:31:01.587+00'),
(21,	'Database Optimization',	'Query optimization and indexing',	16,	'1',	'2025-09-28 10:31:01.59+00',	'2025-09-28 10:31:01.59+00'),
(22,	'Web Development',	'Frontend and backend web technologies',	1,	'1',	'2025-09-28 10:31:01.593+00',	'2025-09-28 10:31:01.593+00'),
(23,	'HTML & CSS',	'Web markup and styling',	22,	'1',	'2025-09-28 10:31:01.596+00',	'2025-09-28 10:31:01.596+00'),
(24,	'React.js',	'Frontend JavaScript library',	22,	'1',	'2025-09-28 10:31:01.599+00',	'2025-09-28 10:31:01.599+00'),
(25,	'Node.js',	'Server-side JavaScript runtime',	22,	'1',	'2025-09-28 10:31:01.602+00',	'2025-09-28 10:31:01.602+00'),
(26,	'Express.js',	'Web application framework',	22,	'1',	'2025-09-28 10:31:01.606+00',	'2025-09-28 10:31:01.606+00'),
(27,	'REST APIs',	'RESTful web services',	22,	'1',	'2025-09-28 10:31:01.61+00',	'2025-09-28 10:31:01.61+00'),
(28,	'Artificial Intelligence & Machine Learning',	'AI/ML concepts and applications',	NULL,	'1',	'2025-09-28 10:31:01.613+00',	'2025-09-28 10:31:01.613+00'),
(29,	'Machine Learning Fundamentals',	'Core ML concepts and algorithms',	28,	'1',	'2025-09-28 10:31:01.616+00',	'2025-09-28 10:31:01.616+00'),
(30,	'Supervised Learning',	'Classification and regression',	29,	'1',	'2025-09-28 10:31:01.619+00',	'2025-09-28 10:31:01.619+00'),
(31,	'Unsupervised Learning',	'Clustering and dimensionality reduction',	29,	'1',	'2025-09-28 10:31:01.623+00',	'2025-09-28 10:31:01.623+00'),
(32,	'Neural Networks',	'Perceptrons and deep learning basics',	29,	'1',	'2025-09-28 10:31:01.626+00',	'2025-09-28 10:31:01.626+00'),
(33,	'Model Evaluation',	'Metrics and validation techniques',	29,	'1',	'2025-09-28 10:31:01.629+00',	'2025-09-28 10:31:01.629+00'),
(34,	'Deep Learning',	'Advanced neural network architectures',	28,	'1',	'2025-09-28 10:31:01.632+00',	'2025-09-28 10:31:01.632+00'),
(35,	'CNN',	'Convolutional Neural Networks',	34,	'1',	'2025-09-28 10:31:01.636+00',	'2025-09-28 10:31:01.636+00'),
(36,	'RNN & LSTM',	'Recurrent Neural Networks',	34,	'1',	'2025-09-28 10:31:01.639+00',	'2025-09-28 10:31:01.639+00'),
(37,	'Transformers',	'Attention mechanisms and transformers',	34,	'1',	'2025-09-28 10:31:01.642+00',	'2025-09-28 10:31:01.642+00'),
(38,	'Computer Vision',	'Image processing and recognition',	34,	'1',	'2025-09-28 10:31:01.645+00',	'2025-09-28 10:31:01.645+00'),
(39,	'Natural Language Processing',	'Text processing and language understanding',	28,	'1',	'2025-09-28 10:31:01.648+00',	'2025-09-28 10:31:01.648+00'),
(40,	'Text Preprocessing',	'Tokenization and cleaning',	39,	'1',	'2025-09-28 10:31:01.652+00',	'2025-09-28 10:31:01.652+00'),
(41,	'Sentiment Analysis',	'Opinion mining and classification',	39,	'1',	'2025-09-28 10:31:01.655+00',	'2025-09-28 10:31:01.655+00'),
(42,	'Language Models',	'N-grams and transformer models',	39,	'1',	'2025-09-28 10:31:01.659+00',	'2025-09-28 10:31:01.659+00'),
(43,	'Information Technology',	'IT infrastructure and systems',	NULL,	'1',	'2025-09-28 10:31:01.661+00',	'2025-09-28 10:31:01.661+00'),
(44,	'Network Security',	'Cybersecurity and network protection',	43,	'1',	'2025-09-28 10:31:01.664+00',	'2025-09-28 10:31:01.664+00'),
(45,	'Cryptography',	'Encryption and security protocols',	44,	'1',	'2025-09-28 10:31:01.669+00',	'2025-09-28 10:31:01.669+00'),
(46,	'Network Protocols',	'TCP/IP, HTTP, and security protocols',	44,	'1',	'2025-09-28 10:31:01.673+00',	'2025-09-28 10:31:01.673+00'),
(47,	'Ethical Hacking',	'Penetration testing and security auditing',	44,	'1',	'2025-09-28 10:31:01.676+00',	'2025-09-28 10:31:01.676+00'),
(48,	'Cloud Computing',	'Cloud platforms and services',	43,	'1',	'2025-09-28 10:31:01.68+00',	'2025-09-28 10:31:01.68+00'),
(49,	'AWS Services',	'Amazon Web Services',	48,	'1',	'2025-09-28 10:31:01.684+00',	'2025-09-28 10:31:01.684+00'),
(50,	'Docker & Kubernetes',	'Containerization and orchestration',	48,	'1',	'2025-09-28 10:31:01.687+00',	'2025-09-28 10:31:01.687+00'),
(51,	'Microservices',	'Distributed system architecture',	48,	'1',	'2025-09-28 10:31:01.691+00',	'2025-09-28 10:31:01.691+00'),
(52,	'Big Data & Analytics',	'Big data processing and analytics',	NULL,	'1',	'2025-09-28 10:31:01.694+00',	'2025-09-28 10:31:01.694+00'),
(53,	'Big Data Technologies',	'Tools and frameworks for big data',	52,	'1',	'2025-09-28 10:31:01.697+00',	'2025-09-28 10:31:01.697+00'),
(54,	'Hadoop Ecosystem',	'HDFS, MapReduce, and Hive',	53,	'1',	'2025-09-28 10:31:01.701+00',	'2025-09-28 10:31:01.701+00'),
(55,	'Apache Spark',	'In-memory data processing',	53,	'1',	'2025-09-28 10:31:01.705+00',	'2025-09-28 10:31:01.705+00'),
(56,	'Apache Kafka',	'Stream processing and messaging',	53,	'1',	'2025-09-28 10:31:01.71+00',	'2025-09-28 10:31:01.71+00'),
(57,	'Data Analytics',	'Data analysis and visualization',	52,	'1',	'2025-09-28 10:31:01.714+00',	'2025-09-28 10:31:01.714+00'),
(58,	'Statistical Analysis',	'Descriptive and inferential statistics',	57,	'1',	'2025-09-28 10:31:01.718+00',	'2025-09-28 10:31:01.718+00'),
(59,	'Data Visualization',	'Charts, graphs, and dashboards',	57,	'1',	'2025-09-28 10:31:01.721+00',	'2025-09-28 10:31:01.721+00'),
(60,	'Business Intelligence',	'BI tools and reporting',	57,	'1',	'2025-09-28 10:31:01.724+00',	'2025-09-28 10:31:01.724+00');

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

TRUNCATE "match_players";

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

TRUNCATE "matches";

DROP TABLE IF EXISTS "question_bank_items";
DROP SEQUENCE IF EXISTS question_bank_items_id_seq;
CREATE SEQUENCE question_bank_items_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 26 CACHE 1;

CREATE TABLE "public"."question_bank_items" (
    "id" integer DEFAULT nextval('question_bank_items_id_seq') NOT NULL,
    "questionText" text NOT NULL,
    "categoryId" integer NOT NULL,
    "difficulty" enum_question_bank_items_difficulty DEFAULT 'MEDIUM',
    "createdById" integer NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "question_bank_items_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

TRUNCATE "question_bank_items";
INSERT INTO "question_bank_items" ("id", "questionText", "categoryId", "difficulty", "createdById", "isActive", "createdAt", "updatedAt") VALUES
(1,	'What is the correct syntax to declare a pointer in C?',	3,	'EASY',	1,	'1',	'2025-09-28 10:31:01.729+00',	'2025-09-28 10:31:01.729+00'),
(2,	'Which function is used to allocate memory dynamically in C?',	3,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:01.749+00',	'2025-09-28 10:31:01.749+00'),
(3,	'What does the ''sizeof'' operator return in C?',	3,	'EASY',	1,	'1',	'2025-09-28 10:31:01.765+00',	'2025-09-28 10:31:01.765+00'),
(4,	'Which of the following is NOT a valid C data type?',	3,	'EASY',	1,	'1',	'2025-09-28 10:31:01.782+00',	'2025-09-28 10:31:01.782+00'),
(5,	'Which principle of OOP is achieved by using access modifiers in Java?',	5,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:01.798+00',	'2025-09-28 10:31:01.798+00'),
(6,	'What is the default value of a boolean variable in Java?',	5,	'EASY',	1,	'1',	'2025-09-28 10:31:01.813+00',	'2025-09-28 10:31:01.813+00'),
(7,	'Which method is called when an object is created in Java?',	5,	'EASY',	1,	'1',	'2025-09-28 10:31:01.829+00',	'2025-09-28 10:31:01.829+00'),
(8,	'What does JVM stand for?',	5,	'EASY',	1,	'1',	'2025-09-28 10:31:01.846+00',	'2025-09-28 10:31:01.846+00'),
(9,	'What is the time complexity of accessing an element in an array by index?',	10,	'EASY',	1,	'1',	'2025-09-28 10:31:01.86+00',	'2025-09-28 10:31:01.86+00'),
(10,	'Which of the following is the best algorithm to sort an array of integers?',	10,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:01.875+00',	'2025-09-28 10:31:01.875+00'),
(11,	'What is the space complexity of merge sort?',	10,	'HARD',	1,	'1',	'2025-09-28 10:31:01.894+00',	'2025-09-28 10:31:01.894+00'),
(12,	'Which SQL command is used to retrieve data from a database?',	17,	'EASY',	1,	'1',	'2025-09-28 10:31:01.91+00',	'2025-09-28 10:31:01.91+00'),
(13,	'What does ACID stand for in database management?',	17,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:01.926+00',	'2025-09-28 10:31:01.926+00'),
(14,	'Which normal form eliminates partial dependencies?',	17,	'HARD',	1,	'1',	'2025-09-28 10:31:01.945+00',	'2025-09-28 10:31:01.945+00'),
(15,	'Which algorithm is commonly used for binary classification?',	30,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:01.96+00',	'2025-09-28 10:31:01.96+00'),
(16,	'What is overfitting in machine learning?',	30,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:01.975+00',	'2025-09-28 10:31:01.975+00'),
(17,	'Which metric is best for evaluating a classification model with imbalanced data?',	30,	'HARD',	1,	'1',	'2025-09-28 10:31:01.989+00',	'2025-09-28 10:31:01.989+00'),
(18,	'What is JSX in React?',	24,	'EASY',	1,	'1',	'2025-09-28 10:31:02.002+00',	'2025-09-28 10:31:02.002+00'),
(19,	'Which hook is used to manage state in functional components?',	24,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:02.017+00',	'2025-09-28 10:31:02.017+00'),
(20,	'What is the virtual DOM in React?',	24,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:02.033+00',	'2025-09-28 10:31:02.033+00'),
(21,	'What type of encryption uses the same key for encryption and decryption?',	45,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:02.047+00',	'2025-09-28 10:31:02.047+00'),
(22,	'Which protocol provides secure communication over the internet?',	45,	'EASY',	1,	'1',	'2025-09-28 10:31:02.063+00',	'2025-09-28 10:31:02.063+00'),
(23,	'What is the main advantage of Apache Spark over Hadoop MapReduce?',	55,	'MEDIUM',	1,	'1',	'2025-09-28 10:31:02.081+00',	'2025-09-28 10:31:02.081+00'),
(24,	'What is an RDD in Apache Spark?',	55,	'HARD',	1,	'1',	'2025-09-28 10:31:02.096+00',	'2025-09-28 10:31:02.096+00'),
(25,	'abcd',	35,	'EASY',	1,	'1',	'2025-09-28 10:45:33.955+00',	'2025-09-28 10:45:33.955+00');

DROP TABLE IF EXISTS "question_bank_options";
DROP SEQUENCE IF EXISTS question_bank_options_id_seq;
CREATE SEQUENCE question_bank_options_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 101 CACHE 1;

CREATE TABLE "public"."question_bank_options" (
    "id" integer DEFAULT nextval('question_bank_options_id_seq') NOT NULL,
    "questionId" integer NOT NULL,
    "optionText" text NOT NULL,
    "isCorrect" boolean DEFAULT false,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "question_bank_options_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

TRUNCATE "question_bank_options";
INSERT INTO "question_bank_options" ("id", "questionId", "optionText", "isCorrect", "createdAt", "updatedAt") VALUES
(1,	1,	'int *ptr;',	'1',	'2025-09-28 10:31:01.735+00',	'2025-09-28 10:31:01.735+00'),
(2,	1,	'int ptr*;',	'0',	'2025-09-28 10:31:01.739+00',	'2025-09-28 10:31:01.739+00'),
(3,	1,	'pointer int ptr;',	'0',	'2025-09-28 10:31:01.743+00',	'2025-09-28 10:31:01.743+00'),
(4,	1,	'*int ptr;',	'0',	'2025-09-28 10:31:01.746+00',	'2025-09-28 10:31:01.746+00'),
(5,	2,	'alloc()',	'0',	'2025-09-28 10:31:01.752+00',	'2025-09-28 10:31:01.752+00'),
(6,	2,	'malloc()',	'1',	'2025-09-28 10:31:01.755+00',	'2025-09-28 10:31:01.755+00'),
(7,	2,	'calloc()',	'0',	'2025-09-28 10:31:01.759+00',	'2025-09-28 10:31:01.759+00'),
(8,	2,	'Both malloc() and calloc()',	'0',	'2025-09-28 10:31:01.762+00',	'2025-09-28 10:31:01.762+00'),
(9,	3,	'Size of variable in bits',	'0',	'2025-09-28 10:31:01.769+00',	'2025-09-28 10:31:01.769+00'),
(10,	3,	'Size of variable in bytes',	'1',	'2025-09-28 10:31:01.772+00',	'2025-09-28 10:31:01.772+00'),
(11,	3,	'Address of variable',	'0',	'2025-09-28 10:31:01.775+00',	'2025-09-28 10:31:01.775+00'),
(12,	3,	'Value of variable',	'0',	'2025-09-28 10:31:01.779+00',	'2025-09-28 10:31:01.779+00'),
(13,	4,	'int',	'0',	'2025-09-28 10:31:01.785+00',	'2025-09-28 10:31:01.785+00'),
(14,	4,	'float',	'0',	'2025-09-28 10:31:01.788+00',	'2025-09-28 10:31:01.788+00'),
(15,	4,	'string',	'1',	'2025-09-28 10:31:01.792+00',	'2025-09-28 10:31:01.792+00'),
(16,	4,	'char',	'0',	'2025-09-28 10:31:01.795+00',	'2025-09-28 10:31:01.795+00'),
(17,	5,	'Inheritance',	'0',	'2025-09-28 10:31:01.801+00',	'2025-09-28 10:31:01.801+00'),
(18,	5,	'Polymorphism',	'0',	'2025-09-28 10:31:01.804+00',	'2025-09-28 10:31:01.804+00'),
(19,	5,	'Encapsulation',	'1',	'2025-09-28 10:31:01.807+00',	'2025-09-28 10:31:01.807+00'),
(20,	5,	'Abstraction',	'0',	'2025-09-28 10:31:01.81+00',	'2025-09-28 10:31:01.81+00'),
(21,	6,	'true',	'0',	'2025-09-28 10:31:01.817+00',	'2025-09-28 10:31:01.817+00'),
(22,	6,	'false',	'1',	'2025-09-28 10:31:01.82+00',	'2025-09-28 10:31:01.82+00'),
(23,	6,	'0',	'0',	'2025-09-28 10:31:01.823+00',	'2025-09-28 10:31:01.823+00'),
(24,	6,	'null',	'0',	'2025-09-28 10:31:01.826+00',	'2025-09-28 10:31:01.826+00'),
(25,	7,	'main()',	'0',	'2025-09-28 10:31:01.832+00',	'2025-09-28 10:31:01.832+00'),
(26,	7,	'constructor',	'1',	'2025-09-28 10:31:01.836+00',	'2025-09-28 10:31:01.836+00'),
(27,	7,	'init()',	'0',	'2025-09-28 10:31:01.838+00',	'2025-09-28 10:31:01.838+00'),
(28,	7,	'start()',	'0',	'2025-09-28 10:31:01.843+00',	'2025-09-28 10:31:01.843+00'),
(29,	8,	'Java Virtual Machine',	'1',	'2025-09-28 10:31:01.849+00',	'2025-09-28 10:31:01.849+00'),
(30,	8,	'Java Variable Method',	'0',	'2025-09-28 10:31:01.852+00',	'2025-09-28 10:31:01.852+00'),
(31,	8,	'Java Verified Module',	'0',	'2025-09-28 10:31:01.854+00',	'2025-09-28 10:31:01.854+00'),
(32,	8,	'Java Version Manager',	'0',	'2025-09-28 10:31:01.857+00',	'2025-09-28 10:31:01.857+00'),
(33,	9,	'O(1)',	'1',	'2025-09-28 10:31:01.864+00',	'2025-09-28 10:31:01.864+00'),
(34,	9,	'O(n)',	'0',	'2025-09-28 10:31:01.866+00',	'2025-09-28 10:31:01.866+00'),
(35,	9,	'O(log n)',	'0',	'2025-09-28 10:31:01.869+00',	'2025-09-28 10:31:01.869+00'),
(36,	9,	'O(n²)',	'0',	'2025-09-28 10:31:01.872+00',	'2025-09-28 10:31:01.872+00'),
(37,	10,	'Bubble Sort',	'0',	'2025-09-28 10:31:01.878+00',	'2025-09-28 10:31:01.878+00'),
(38,	10,	'Selection Sort',	'0',	'2025-09-28 10:31:01.882+00',	'2025-09-28 10:31:01.882+00'),
(39,	10,	'Quick Sort',	'1',	'2025-09-28 10:31:01.886+00',	'2025-09-28 10:31:01.886+00'),
(40,	10,	'Insertion Sort',	'0',	'2025-09-28 10:31:01.89+00',	'2025-09-28 10:31:01.89+00'),
(41,	11,	'O(1)',	'0',	'2025-09-28 10:31:01.897+00',	'2025-09-28 10:31:01.897+00'),
(42,	11,	'O(log n)',	'0',	'2025-09-28 10:31:01.9+00',	'2025-09-28 10:31:01.9+00'),
(43,	11,	'O(n)',	'1',	'2025-09-28 10:31:01.903+00',	'2025-09-28 10:31:01.903+00'),
(44,	11,	'O(n log n)',	'0',	'2025-09-28 10:31:01.906+00',	'2025-09-28 10:31:01.906+00'),
(45,	12,	'GET',	'0',	'2025-09-28 10:31:01.914+00',	'2025-09-28 10:31:01.914+00'),
(46,	12,	'SELECT',	'1',	'2025-09-28 10:31:01.918+00',	'2025-09-28 10:31:01.918+00'),
(47,	12,	'RETRIEVE',	'0',	'2025-09-28 10:31:01.92+00',	'2025-09-28 10:31:01.92+00'),
(48,	12,	'FETCH',	'0',	'2025-09-28 10:31:01.924+00',	'2025-09-28 10:31:01.924+00'),
(49,	13,	'Atomicity, Consistency, Isolation, Durability',	'1',	'2025-09-28 10:31:01.93+00',	'2025-09-28 10:31:01.93+00'),
(50,	13,	'Access, Control, Integration, Data',	'0',	'2025-09-28 10:31:01.933+00',	'2025-09-28 10:31:01.933+00'),
(51,	13,	'Automatic, Consistent, Independent, Durable',	'0',	'2025-09-28 10:31:01.938+00',	'2025-09-28 10:31:01.938+00'),
(52,	13,	'Atomic, Concurrent, Isolated, Distributed',	'0',	'2025-09-28 10:31:01.941+00',	'2025-09-28 10:31:01.941+00'),
(53,	14,	'1NF',	'0',	'2025-09-28 10:31:01.948+00',	'2025-09-28 10:31:01.948+00'),
(54,	14,	'2NF',	'1',	'2025-09-28 10:31:01.951+00',	'2025-09-28 10:31:01.951+00'),
(55,	14,	'3NF',	'0',	'2025-09-28 10:31:01.954+00',	'2025-09-28 10:31:01.954+00'),
(56,	14,	'BCNF',	'0',	'2025-09-28 10:31:01.957+00',	'2025-09-28 10:31:01.957+00'),
(57,	15,	'K-means',	'0',	'2025-09-28 10:31:01.963+00',	'2025-09-28 10:31:01.963+00'),
(58,	15,	'Logistic Regression',	'1',	'2025-09-28 10:31:01.966+00',	'2025-09-28 10:31:01.966+00'),
(59,	15,	'DBSCAN',	'0',	'2025-09-28 10:31:01.969+00',	'2025-09-28 10:31:01.969+00'),
(60,	15,	'PCA',	'0',	'2025-09-28 10:31:01.972+00',	'2025-09-28 10:31:01.972+00'),
(61,	16,	'Model performs well on training but poor on test data',	'1',	'2025-09-28 10:31:01.979+00',	'2025-09-28 10:31:01.979+00'),
(62,	16,	'Model performs poorly on both training and test data',	'0',	'2025-09-28 10:31:01.981+00',	'2025-09-28 10:31:01.981+00'),
(63,	16,	'Model takes too long to train',	'0',	'2025-09-28 10:31:01.984+00',	'2025-09-28 10:31:01.984+00'),
(64,	16,	'Model uses too much memory',	'0',	'2025-09-28 10:31:01.986+00',	'2025-09-28 10:31:01.986+00'),
(65,	17,	'Accuracy',	'0',	'2025-09-28 10:31:01.992+00',	'2025-09-28 10:31:01.992+00'),
(66,	17,	'Precision',	'0',	'2025-09-28 10:31:01.995+00',	'2025-09-28 10:31:01.995+00'),
(67,	17,	'F1-Score',	'1',	'2025-09-28 10:31:01.997+00',	'2025-09-28 10:31:01.997+00'),
(68,	17,	'Mean Squared Error',	'0',	'2025-09-28 10:31:02+00',	'2025-09-28 10:31:02+00'),
(69,	18,	'JavaScript XML',	'1',	'2025-09-28 10:31:02.004+00',	'2025-09-28 10:31:02.004+00'),
(70,	18,	'Java Syntax Extension',	'0',	'2025-09-28 10:31:02.008+00',	'2025-09-28 10:31:02.008+00'),
(71,	18,	'JSON Extended',	'0',	'2025-09-28 10:31:02.011+00',	'2025-09-28 10:31:02.011+00'),
(72,	18,	'JavaScript Extension',	'0',	'2025-09-28 10:31:02.014+00',	'2025-09-28 10:31:02.014+00'),
(73,	19,	'useEffect',	'0',	'2025-09-28 10:31:02.02+00',	'2025-09-28 10:31:02.02+00'),
(74,	19,	'useState',	'1',	'2025-09-28 10:31:02.024+00',	'2025-09-28 10:31:02.024+00'),
(75,	19,	'useContext',	'0',	'2025-09-28 10:31:02.027+00',	'2025-09-28 10:31:02.027+00'),
(76,	19,	'useReducer',	'0',	'2025-09-28 10:31:02.03+00',	'2025-09-28 10:31:02.03+00'),
(77,	20,	'A copy of the real DOM kept in memory',	'1',	'2025-09-28 10:31:02.036+00',	'2025-09-28 10:31:02.036+00'),
(78,	20,	'A new HTML standard',	'0',	'2025-09-28 10:31:02.039+00',	'2025-09-28 10:31:02.039+00'),
(79,	20,	'A CSS framework',	'0',	'2025-09-28 10:31:02.042+00',	'2025-09-28 10:31:02.042+00'),
(80,	20,	'A JavaScript library',	'0',	'2025-09-28 10:31:02.044+00',	'2025-09-28 10:31:02.044+00'),
(81,	21,	'Asymmetric encryption',	'0',	'2025-09-28 10:31:02.051+00',	'2025-09-28 10:31:02.051+00'),
(82,	21,	'Symmetric encryption',	'1',	'2025-09-28 10:31:02.055+00',	'2025-09-28 10:31:02.055+00'),
(83,	21,	'Hash encryption',	'0',	'2025-09-28 10:31:02.058+00',	'2025-09-28 10:31:02.058+00'),
(84,	21,	'Digital signature',	'0',	'2025-09-28 10:31:02.061+00',	'2025-09-28 10:31:02.061+00'),
(85,	22,	'HTTP',	'0',	'2025-09-28 10:31:02.066+00',	'2025-09-28 10:31:02.066+00'),
(86,	22,	'HTTPS',	'1',	'2025-09-28 10:31:02.07+00',	'2025-09-28 10:31:02.07+00'),
(87,	22,	'FTP',	'0',	'2025-09-28 10:31:02.074+00',	'2025-09-28 10:31:02.074+00'),
(88,	22,	'SMTP',	'0',	'2025-09-28 10:31:02.077+00',	'2025-09-28 10:31:02.077+00'),
(89,	23,	'Better security',	'0',	'2025-09-28 10:31:02.084+00',	'2025-09-28 10:31:02.084+00'),
(90,	23,	'In-memory processing',	'1',	'2025-09-28 10:31:02.088+00',	'2025-09-28 10:31:02.088+00'),
(91,	23,	'Smaller file size',	'0',	'2025-09-28 10:31:02.091+00',	'2025-09-28 10:31:02.091+00'),
(92,	23,	'Easier installation',	'0',	'2025-09-28 10:31:02.093+00',	'2025-09-28 10:31:02.093+00'),
(93,	24,	'Resilient Distributed Dataset',	'1',	'2025-09-28 10:31:02.098+00',	'2025-09-28 10:31:02.098+00'),
(94,	24,	'Rapid Data Distribution',	'0',	'2025-09-28 10:31:02.101+00',	'2025-09-28 10:31:02.101+00'),
(95,	24,	'Real-time Data Delivery',	'0',	'2025-09-28 10:31:02.104+00',	'2025-09-28 10:31:02.104+00'),
(96,	24,	'Relational Database Driver',	'0',	'2025-09-28 10:31:02.107+00',	'2025-09-28 10:31:02.107+00'),
(97,	25,	'a',	'0',	'2025-09-28 10:45:34.001+00',	'2025-09-28 10:45:34.001+00'),
(98,	25,	'b',	'1',	'2025-09-28 10:45:34.001+00',	'2025-09-28 10:45:34.001+00'),
(99,	25,	'c',	'0',	'2025-09-28 10:45:34.001+00',	'2025-09-28 10:45:34.001+00'),
(100,	25,	'd',	'0',	'2025-09-28 10:45:34.001+00',	'2025-09-28 10:45:34.001+00');

DROP TABLE IF EXISTS "quiz_attempt_answers";
DROP SEQUENCE IF EXISTS quiz_attempt_answers_id_seq;
CREATE SEQUENCE quiz_attempt_answers_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 2 CACHE 1;

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

TRUNCATE "quiz_attempt_answers";
INSERT INTO "quiz_attempt_answers" ("id", "attemptId", "questionId", "selectedOptions", "isCorrect", "timeSpent", "createdAt", "updatedAt") VALUES
(1,	51,	23,	'[90]',	'1',	8,	'2025-09-29 13:30:24.528+00',	'2025-09-29 13:31:45.103+00');

DROP TABLE IF EXISTS "quiz_attempts";
DROP SEQUENCE IF EXISTS quiz_attempts_id_seq;
CREATE SEQUENCE quiz_attempts_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 53 CACHE 1;

CREATE TABLE "public"."quiz_attempts" (
    "id" integer DEFAULT nextval('quiz_attempts_id_seq') NOT NULL,
    "userId" integer NOT NULL,
    "quizId" integer NOT NULL,
    "status" enum_quiz_attempts_status DEFAULT 'IN_PROGRESS',
    "score" integer DEFAULT '0',
    "totalQuestions" integer DEFAULT '0',
    "correctAnswers" integer DEFAULT '0',
    "timeSpent" integer,
    "startedAt" timestamptz,
    "completedAt" timestamptz,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

TRUNCATE "quiz_attempts";
INSERT INTO "quiz_attempts" ("id", "userId", "quizId", "status", "score", "totalQuestions", "correctAnswers", "timeSpent", "startedAt", "completedAt", "createdAt", "updatedAt") VALUES
(1,	15,	13,	'COMPLETED',	31,	10,	8,	651,	'2025-09-28 07:50:05.737+00',	'2025-09-28 10:31:02.169+00',	'2025-09-28 10:31:02.17+00',	'2025-09-28 10:31:02.17+00'),
(2,	3,	13,	'COMPLETED',	23,	10,	0,	576,	'2025-09-25 13:40:42.093+00',	'2025-09-28 10:31:02.174+00',	'2025-09-28 10:31:02.174+00',	'2025-09-28 10:31:02.174+00'),
(3,	18,	12,	'COMPLETED',	85,	10,	8,	265,	'2025-09-22 21:13:52.334+00',	'2025-09-28 10:31:02.178+00',	'2025-09-28 10:31:02.178+00',	'2025-09-28 10:31:02.178+00'),
(4,	24,	13,	'COMPLETED',	48,	10,	7,	123,	'2025-09-22 05:34:23.334+00',	'2025-09-28 10:31:02.181+00',	'2025-09-28 10:31:02.181+00',	'2025-09-28 10:31:02.181+00'),
(5,	5,	13,	'COMPLETED',	3,	10,	6,	427,	'2025-09-25 05:11:09.919+00',	'2025-09-28 10:31:02.185+00',	'2025-09-28 10:31:02.185+00',	'2025-09-28 10:31:02.185+00'),
(6,	9,	5,	'COMPLETED',	35,	10,	6,	221,	'2025-09-25 08:35:41.81+00',	'2025-09-28 10:31:02.189+00',	'2025-09-28 10:31:02.19+00',	'2025-09-28 10:31:02.19+00'),
(7,	18,	5,	'COMPLETED',	24,	10,	6,	405,	'2025-09-27 15:14:33.843+00',	'2025-09-28 10:31:02.194+00',	'2025-09-28 10:31:02.194+00',	'2025-09-28 10:31:02.194+00'),
(8,	24,	4,	'COMPLETED',	55,	10,	10,	417,	'2025-09-27 22:59:20.805+00',	'2025-09-28 10:31:02.196+00',	'2025-09-28 10:31:02.197+00',	'2025-09-28 10:31:02.197+00'),
(9,	24,	2,	'COMPLETED',	79,	10,	2,	411,	'2025-09-23 15:22:50.954+00',	'2025-09-28 10:31:02.199+00',	'2025-09-28 10:31:02.199+00',	'2025-09-28 10:31:02.199+00'),
(10,	7,	6,	'COMPLETED',	89,	10,	9,	119,	'2025-09-21 16:37:12.324+00',	'2025-09-28 10:31:02.202+00',	'2025-09-28 10:31:02.202+00',	'2025-09-28 10:31:02.202+00'),
(11,	4,	7,	'COMPLETED',	7,	10,	4,	421,	'2025-09-26 13:25:01.702+00',	'2025-09-28 10:31:02.204+00',	'2025-09-28 10:31:02.204+00',	'2025-09-28 10:31:02.204+00'),
(12,	21,	5,	'COMPLETED',	30,	10,	6,	314,	'2025-09-27 09:11:21.673+00',	'2025-09-28 10:31:02.207+00',	'2025-09-28 10:31:02.207+00',	'2025-09-28 10:31:02.207+00'),
(13,	7,	12,	'COMPLETED',	55,	10,	7,	522,	'2025-09-25 00:27:23.504+00',	'2025-09-28 10:31:02.21+00',	'2025-09-28 10:31:02.21+00',	'2025-09-28 10:31:02.21+00'),
(14,	1,	4,	'COMPLETED',	73,	10,	10,	413,	'2025-09-27 05:59:52.357+00',	'2025-09-28 10:31:02.213+00',	'2025-09-28 10:31:02.213+00',	'2025-09-28 10:31:02.213+00'),
(15,	17,	12,	'COMPLETED',	42,	10,	2,	659,	'2025-09-25 09:11:21.836+00',	'2025-09-28 10:31:02.216+00',	'2025-09-28 10:31:02.216+00',	'2025-09-28 10:31:02.216+00'),
(16,	18,	5,	'COMPLETED',	98,	10,	4,	480,	'2025-09-26 21:22:22.259+00',	'2025-09-28 10:31:02.219+00',	'2025-09-28 10:31:02.219+00',	'2025-09-28 10:31:02.219+00'),
(17,	5,	11,	'COMPLETED',	72,	10,	0,	97,	'2025-09-25 23:02:14.036+00',	'2025-09-28 10:31:02.221+00',	'2025-09-28 10:31:02.222+00',	'2025-09-28 10:31:02.222+00'),
(18,	4,	2,	'COMPLETED',	37,	10,	5,	490,	'2025-09-21 18:13:06.359+00',	'2025-09-28 10:31:02.225+00',	'2025-09-28 10:31:02.226+00',	'2025-09-28 10:31:02.226+00'),
(19,	9,	1,	'COMPLETED',	91,	10,	0,	254,	'2025-09-25 22:49:03.727+00',	'2025-09-28 10:31:02.23+00',	'2025-09-28 10:31:02.23+00',	'2025-09-28 10:31:02.23+00'),
(20,	23,	1,	'COMPLETED',	85,	10,	9,	183,	'2025-09-28 04:57:23.135+00',	'2025-09-28 10:31:02.233+00',	'2025-09-28 10:31:02.233+00',	'2025-09-28 10:31:02.233+00'),
(21,	19,	9,	'COMPLETED',	88,	10,	8,	606,	'2025-09-23 10:03:25.88+00',	'2025-09-28 10:31:02.236+00',	'2025-09-28 10:31:02.236+00',	'2025-09-28 10:31:02.236+00'),
(22,	3,	8,	'COMPLETED',	10,	10,	9,	230,	'2025-09-27 10:08:47.059+00',	'2025-09-28 10:31:02.238+00',	'2025-09-28 10:31:02.238+00',	'2025-09-28 10:31:02.238+00'),
(23,	25,	2,	'COMPLETED',	13,	10,	6,	292,	'2025-09-25 03:57:19.346+00',	'2025-09-28 10:31:02.243+00',	'2025-09-28 10:31:02.243+00',	'2025-09-28 10:31:02.243+00'),
(24,	8,	5,	'COMPLETED',	6,	10,	10,	376,	'2025-09-21 13:25:34.625+00',	'2025-09-28 10:31:02.246+00',	'2025-09-28 10:31:02.246+00',	'2025-09-28 10:31:02.246+00'),
(25,	1,	9,	'COMPLETED',	79,	10,	9,	233,	'2025-09-24 21:07:23.731+00',	'2025-09-28 10:31:02.249+00',	'2025-09-28 10:31:02.249+00',	'2025-09-28 10:31:02.249+00'),
(26,	19,	13,	'COMPLETED',	74,	10,	9,	211,	'2025-09-24 09:30:11.597+00',	'2025-09-28 10:31:02.252+00',	'2025-09-28 10:31:02.252+00',	'2025-09-28 10:31:02.252+00'),
(27,	22,	3,	'COMPLETED',	42,	10,	8,	297,	'2025-09-21 23:09:21.483+00',	'2025-09-28 10:31:02.255+00',	'2025-09-28 10:31:02.256+00',	'2025-09-28 10:31:02.256+00'),
(28,	23,	12,	'COMPLETED',	7,	10,	2,	113,	'2025-09-24 19:54:44.305+00',	'2025-09-28 10:31:02.26+00',	'2025-09-28 10:31:02.26+00',	'2025-09-28 10:31:02.26+00'),
(29,	2,	9,	'COMPLETED',	53,	10,	2,	488,	'2025-09-22 23:25:07.531+00',	'2025-09-28 10:31:02.263+00',	'2025-09-28 10:31:02.263+00',	'2025-09-28 10:31:02.263+00'),
(30,	13,	6,	'COMPLETED',	92,	10,	8,	238,	'2025-09-24 01:18:24.002+00',	'2025-09-28 10:31:02.266+00',	'2025-09-28 10:31:02.266+00',	'2025-09-28 10:31:02.266+00'),
(31,	8,	13,	'COMPLETED',	24,	10,	3,	531,	'2025-09-23 09:48:55.073+00',	'2025-09-28 10:31:02.269+00',	'2025-09-28 10:31:02.269+00',	'2025-09-28 10:31:02.269+00'),
(32,	10,	10,	'COMPLETED',	88,	10,	4,	245,	'2025-09-21 10:55:40.502+00',	'2025-09-28 10:31:02.272+00',	'2025-09-28 10:31:02.272+00',	'2025-09-28 10:31:02.272+00'),
(33,	9,	8,	'COMPLETED',	21,	10,	5,	548,	'2025-09-22 06:36:55.692+00',	'2025-09-28 10:31:02.275+00',	'2025-09-28 10:31:02.275+00',	'2025-09-28 10:31:02.275+00'),
(34,	16,	13,	'COMPLETED',	16,	10,	10,	626,	'2025-09-24 11:49:46.394+00',	'2025-09-28 10:31:02.278+00',	'2025-09-28 10:31:02.279+00',	'2025-09-28 10:31:02.279+00'),
(35,	17,	12,	'COMPLETED',	66,	10,	0,	607,	'2025-09-27 06:56:20.482+00',	'2025-09-28 10:31:02.281+00',	'2025-09-28 10:31:02.281+00',	'2025-09-28 10:31:02.281+00'),
(36,	18,	1,	'COMPLETED',	97,	10,	1,	151,	'2025-09-24 10:31:43.351+00',	'2025-09-28 10:31:02.284+00',	'2025-09-28 10:31:02.284+00',	'2025-09-28 10:31:02.284+00'),
(37,	16,	3,	'COMPLETED',	58,	10,	1,	127,	'2025-09-22 01:44:08.385+00',	'2025-09-28 10:31:02.287+00',	'2025-09-28 10:31:02.288+00',	'2025-09-28 10:31:02.288+00'),
(38,	18,	7,	'COMPLETED',	62,	10,	7,	140,	'2025-09-26 06:13:59.153+00',	'2025-09-28 10:31:02.29+00',	'2025-09-28 10:31:02.291+00',	'2025-09-28 10:31:02.291+00'),
(39,	7,	3,	'COMPLETED',	74,	10,	9,	540,	'2025-09-26 16:50:02.946+00',	'2025-09-28 10:31:02.294+00',	'2025-09-28 10:31:02.294+00',	'2025-09-28 10:31:02.294+00'),
(40,	9,	13,	'COMPLETED',	34,	10,	1,	455,	'2025-09-27 00:39:44.77+00',	'2025-09-28 10:31:02.297+00',	'2025-09-28 10:31:02.297+00',	'2025-09-28 10:31:02.297+00'),
(41,	17,	12,	'COMPLETED',	93,	10,	3,	447,	'2025-09-27 05:54:05.189+00',	'2025-09-28 10:31:02.3+00',	'2025-09-28 10:31:02.3+00',	'2025-09-28 10:31:02.3+00'),
(42,	1,	4,	'COMPLETED',	62,	10,	9,	385,	'2025-09-23 13:39:40.355+00',	'2025-09-28 10:31:02.303+00',	'2025-09-28 10:31:02.303+00',	'2025-09-28 10:31:02.303+00'),
(43,	6,	4,	'COMPLETED',	24,	10,	2,	638,	'2025-09-23 13:01:50.099+00',	'2025-09-28 10:31:02.305+00',	'2025-09-28 10:31:02.305+00',	'2025-09-28 10:31:02.305+00'),
(44,	4,	12,	'COMPLETED',	17,	10,	4,	535,	'2025-09-22 17:10:27.967+00',	'2025-09-28 10:31:02.308+00',	'2025-09-28 10:31:02.308+00',	'2025-09-28 10:31:02.308+00'),
(45,	17,	13,	'COMPLETED',	77,	10,	4,	347,	'2025-09-23 15:51:18.831+00',	'2025-09-28 10:31:02.311+00',	'2025-09-28 10:31:02.311+00',	'2025-09-28 10:31:02.311+00'),
(46,	22,	1,	'COMPLETED',	18,	10,	1,	411,	'2025-09-22 14:04:11.451+00',	'2025-09-28 10:31:02.314+00',	'2025-09-28 10:31:02.314+00',	'2025-09-28 10:31:02.314+00'),
(47,	2,	2,	'COMPLETED',	11,	10,	8,	309,	'2025-09-24 18:02:41.921+00',	'2025-09-28 10:31:02.317+00',	'2025-09-28 10:31:02.318+00',	'2025-09-28 10:31:02.318+00'),
(48,	17,	13,	'COMPLETED',	49,	10,	1,	506,	'2025-09-26 05:48:24.515+00',	'2025-09-28 10:31:02.32+00',	'2025-09-28 10:31:02.32+00',	'2025-09-28 10:31:02.32+00'),
(49,	16,	6,	'COMPLETED',	62,	10,	3,	631,	'2025-09-24 14:27:42.781+00',	'2025-09-28 10:31:02.324+00',	'2025-09-28 10:31:02.324+00',	'2025-09-28 10:31:02.324+00'),
(50,	16,	9,	'COMPLETED',	48,	10,	9,	653,	'2025-09-26 18:49:30.361+00',	'2025-09-28 10:31:02.327+00',	'2025-09-28 10:31:02.327+00',	'2025-09-28 10:31:02.327+00'),
(52,	1,	14,	'IN_PROGRESS',	0,	0,	0,	NULL,	'2025-09-29 13:30:12.803+00',	NULL,	'2025-09-29 13:30:12.803+00',	'2025-09-29 13:30:12.803+00'),
(51,	1,	14,	'COMPLETED',	100,	1,	1,	8,	'2025-09-29 13:30:12.792+00',	'2025-09-29 13:31:45.108+00',	'2025-09-29 13:30:12.795+00',	'2025-09-29 13:31:45.108+00');

DROP TABLE IF EXISTS "quiz_questions";
DROP SEQUENCE IF EXISTS quiz_questions_id_seq;
CREATE SEQUENCE quiz_questions_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 45 CACHE 1;

CREATE TABLE "public"."quiz_questions" (
    "id" integer DEFAULT nextval('quiz_questions_id_seq') NOT NULL,
    "quizId" integer NOT NULL,
    "questionId" integer NOT NULL,
    "order" integer,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

TRUNCATE "quiz_questions";
INSERT INTO "quiz_questions" ("id", "quizId", "questionId", "order", "createdAt", "updatedAt") VALUES
(1,	1,	1,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(2,	1,	2,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(3,	1,	3,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(4,	1,	4,	4,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(5,	2,	1,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(6,	2,	2,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(7,	2,	3,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(8,	2,	4,	4,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(9,	3,	5,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(10,	3,	6,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(11,	3,	7,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(12,	3,	8,	4,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(13,	4,	5,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(14,	4,	6,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(15,	4,	7,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(16,	4,	8,	4,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(17,	5,	9,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(18,	5,	10,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(19,	5,	11,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(20,	6,	9,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(21,	6,	10,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(22,	6,	11,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(23,	7,	12,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(24,	7,	13,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(25,	7,	14,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(26,	8,	12,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(27,	8,	13,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(28,	8,	14,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(29,	9,	15,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(30,	9,	16,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(31,	9,	17,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(32,	10,	15,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(33,	10,	16,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(34,	10,	17,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(35,	11,	18,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(36,	11,	19,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(37,	11,	20,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(38,	12,	18,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(39,	12,	19,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(40,	12,	20,	3,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(41,	13,	21,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(42,	13,	22,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(43,	14,	23,	1,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00'),
(44,	14,	24,	2,	'2025-09-28 10:31:02.158+00',	'2025-09-28 10:31:02.158+00');

DROP TABLE IF EXISTS "quizzes";
DROP SEQUENCE IF EXISTS quizzes_id_seq;
CREATE SEQUENCE quizzes_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 15 CACHE 1;

CREATE TABLE "public"."quizzes" (
    "id" integer DEFAULT nextval('quizzes_id_seq') NOT NULL,
    "title" character varying(200) NOT NULL,
    "description" text,
    "tags" json DEFAULT '[]' NOT NULL,
    "difficulty" enum_quizzes_difficulty DEFAULT 'MEDIUM',
    "timeLimit" integer,
    "maxQuestions" integer,
    "categoryId" integer NOT NULL,
    "createdById" integer NOT NULL,
    "isActive" boolean DEFAULT true,
    "popularity" integer DEFAULT '0',
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

COMMENT ON COLUMN "public"."quizzes"."tags" IS 'Array of tags for categorizing and searching quizzes';

TRUNCATE "quizzes";
INSERT INTO "quizzes" ("id", "title", "description", "tags", "difficulty", "timeLimit", "maxQuestions", "categoryId", "createdById", "isActive", "popularity", "createdAt", "updatedAt") VALUES
(1,	'C Programming Fundamentals',	'Comprehensive C Programming Fundamentals quiz covering key concepts and practical applications',	'[]',	'EASY',	30,	10,	3,	3,	'1',	0,	'2025-09-28 10:31:02.112+00',	'2025-09-28 10:31:02.112+00'),
(2,	'Advanced C Programming',	'Comprehensive Advanced C Programming quiz covering key concepts and practical applications',	'[]',	'MEDIUM',	30,	10,	3,	3,	'1',	0,	'2025-09-28 10:31:02.117+00',	'2025-09-28 10:31:02.117+00'),
(3,	'Java OOP Concepts',	'Comprehensive Java OOP Concepts quiz covering key concepts and practical applications',	'[]',	'MEDIUM',	30,	10,	5,	19,	'1',	0,	'2025-09-28 10:31:02.12+00',	'2025-09-28 10:31:02.12+00'),
(4,	'Java Advanced Topics',	'Comprehensive Java Advanced Topics quiz covering key concepts and practical applications',	'[]',	'HARD',	30,	10,	5,	15,	'1',	0,	'2025-09-28 10:31:02.123+00',	'2025-09-28 10:31:02.123+00'),
(5,	'Data Structures Basics',	'Comprehensive Data Structures Basics quiz covering key concepts and practical applications',	'[]',	'EASY',	30,	10,	10,	3,	'1',	0,	'2025-09-28 10:31:02.127+00',	'2025-09-28 10:31:02.127+00'),
(6,	'Algorithm Analysis',	'Comprehensive Algorithm Analysis quiz covering key concepts and practical applications',	'[]',	'HARD',	30,	10,	10,	15,	'1',	0,	'2025-09-28 10:31:02.13+00',	'2025-09-28 10:31:02.13+00'),
(7,	'SQL Query Writing',	'Comprehensive SQL Query Writing quiz covering key concepts and practical applications',	'[]',	'MEDIUM',	30,	10,	17,	16,	'1',	0,	'2025-09-28 10:31:02.134+00',	'2025-09-28 10:31:02.134+00'),
(8,	'Database Design Principles',	'Comprehensive Database Design Principles quiz covering key concepts and practical applications',	'[]',	'HARD',	30,	10,	17,	10,	'1',	0,	'2025-09-28 10:31:02.136+00',	'2025-09-28 10:31:02.136+00'),
(9,	'Machine Learning Basics',	'Comprehensive Machine Learning Basics quiz covering key concepts and practical applications',	'[]',	'MEDIUM',	30,	10,	30,	23,	'1',	0,	'2025-09-28 10:31:02.139+00',	'2025-09-28 10:31:02.139+00'),
(10,	'ML Model Evaluation',	'Comprehensive ML Model Evaluation quiz covering key concepts and practical applications',	'[]',	'HARD',	30,	10,	30,	7,	'1',	0,	'2025-09-28 10:31:02.142+00',	'2025-09-28 10:31:02.142+00'),
(11,	'React Development',	'Comprehensive React Development quiz covering key concepts and practical applications',	'[]',	'MEDIUM',	30,	10,	24,	16,	'1',	0,	'2025-09-28 10:31:02.145+00',	'2025-09-28 10:31:02.145+00'),
(12,	'React Advanced Patterns',	'Comprehensive React Advanced Patterns quiz covering key concepts and practical applications',	'[]',	'HARD',	30,	10,	24,	12,	'1',	0,	'2025-09-28 10:31:02.148+00',	'2025-09-28 10:31:02.148+00'),
(13,	'Network Security Fundamentals',	'Comprehensive Network Security Fundamentals quiz covering key concepts and practical applications',	'[]',	'MEDIUM',	30,	10,	45,	5,	'1',	0,	'2025-09-28 10:31:02.151+00',	'2025-09-28 10:31:02.151+00'),
(14,	'Big Data Processing',	'Comprehensive Big Data Processing quiz covering key concepts and practical applications',	'[]',	'HARD',	30,	10,	55,	14,	'1',	0,	'2025-09-28 10:31:02.154+00',	'2025-09-28 10:31:02.154+00');

DROP TABLE IF EXISTS "users";
DROP SEQUENCE IF EXISTS users_id_seq;
CREATE SEQUENCE users_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 29 CACHE 1;

CREATE TABLE "public"."users" (
    "id" integer DEFAULT nextval('users_id_seq') NOT NULL,
    "username" character varying(50) NOT NULL,
    "email" character varying(100) NOT NULL,
    "passwordHash" character varying(255) NOT NULL,
    "role" enum_users_role DEFAULT 'PLAYER',
    "firstName" character varying(50),
    "lastName" character varying(50),
    "avatar" character varying(255),
    "eloRating" integer DEFAULT '1200',
    "totalMatches" integer DEFAULT '0',
    "wins" integer DEFAULT '0',
    "losses" integer DEFAULT '0',
    "isActive" boolean DEFAULT true,
    "lastLoginAt" timestamptz,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX users_username_key15 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key12 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key11 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key9 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key7 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key4 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key3 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key1 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key2 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key5 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key6 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key8 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key10 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key13 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_key14 ON public.users USING btree (username);

CREATE UNIQUE INDEX users_email_key15 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key12 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key11 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key9 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key7 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key4 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key3 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key1 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key2 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key5 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key6 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key8 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key10 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key13 ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key14 ON public.users USING btree (email);

TRUNCATE "users";
INSERT INTO "users" ("id", "username", "email", "passwordHash", "role", "firstName", "lastName", "avatar", "eloRating", "totalMatches", "wins", "losses", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES
(1,	'admin1',	'admin1@engineering.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Admin',	'User 1',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(2,	'admin2',	'admin2@engineering.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Admin',	'User 2',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(3,	'admin3',	'admin3@engineering.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Admin',	'User 3',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(4,	'admin4',	'admin4@engineering.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Admin',	'User 4',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(5,	'admin5',	'admin5@engineering.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Admin',	'User 5',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(6,	'student1',	'arjun.sharma@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Arjun',	'Sharma',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(7,	'student2',	'priya.patel@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Priya',	'Patel',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(8,	'student3',	'rahul.kumar@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Rahul',	'Kumar',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(9,	'student4',	'sneha.singh@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Sneha',	'Singh',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(10,	'student5',	'vikram.reddy@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Vikram',	'Reddy',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(11,	'student6',	'ananya.gupta@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Ananya',	'Gupta',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(12,	'student7',	'karthik.nair@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Karthik',	'Nair',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(13,	'student8',	'divya.iyer@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Divya',	'Iyer',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(14,	'student9',	'rohit.agarwal@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Rohit',	'Agarwal',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(15,	'student10',	'meera.joshi@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Meera',	'Joshi',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(16,	'student11',	'siddharth.roy@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Siddharth',	'Roy',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(17,	'student12',	'kavya.menon@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Kavya',	'Menon',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(18,	'student13',	'aditya.verma@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Aditya',	'Verma',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(19,	'student14',	'riya.bansal@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Riya',	'Bansal',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(20,	'student15',	'harsh.malhotra@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Harsh',	'Malhotra',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(21,	'student16',	'pooja.sinha@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Pooja',	'Sinha',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(22,	'student17',	'nikhil.pandey@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Nikhil',	'Pandey',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(23,	'student18',	'shreya.kapoor@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Shreya',	'Kapoor',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(24,	'student19',	'varun.saxena@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Varun',	'Saxena',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(25,	'student20',	'isha.tiwari@student.edu',	'$2b$10$X9c8bVpYogqxJQ./sVbH3OL/Rhr0bPS14LyyGFER.fd0MyOToETZS',	'ADMIN',	'Isha',	'Tiwari',	NULL,	1200,	0,	0,	0,	'1',	NULL,	'2025-09-28 10:31:01.486+00',	'2025-09-28 10:31:01.486+00'),
(26,	'jay',	'jay@gmail.com',	'$2a$12$hR9mc5E6OLeo544bCfFbe.Cj0nJX8gTxLrrFzkIEhyag8pCQc8AJ6',	'ADMIN',	'jay',	'mangukiya',	NULL,	1200,	0,	0,	0,	'1',	'2025-09-28 10:42:55.229+00',	'2025-09-28 10:37:01.335+00',	'2025-09-28 10:42:55.23+00'),
(28,	'aryanmahida',	'aryanmahida@gmail.com',	'$2a$12$GVYi7DU611uIuV8b.JuTGO5akpt3vps3JwgibX65CudkUuqc3tnbW',	'ADMIN',	'aryana',	'Mahida',	NULL,	1200,	0,	0,	0,	'1',	'2025-09-28 18:28:57.057+00',	'2025-09-28 18:06:22.865+00',	'2025-09-28 18:28:57.058+00'),
(27,	'aryanmahida2',	'aryanmahida2@gmail.com',	'$2a$12$KIyQKZUlULZDhNnBZSzAIeFPg3mS9yIikOmbzHefQR3955kXt0ghe',	'ADMIN',	'Aryan',	'mahida',	NULL,	1200,	0,	0,	0,	'1',	'2025-10-01 04:28:39.922+00',	'2025-09-28 10:49:35.243+00',	'2025-10-01 04:28:39.923+00');

ALTER TABLE ONLY "public"."categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES categories(id) ON UPDATE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."match_players" ADD CONSTRAINT "match_players_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES matches(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."match_players" ADD CONSTRAINT "match_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."matches" ADD CONSTRAINT "matches_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES quizzes(id) ON UPDATE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."question_bank_items" ADD CONSTRAINT "question_bank_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES categories(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."question_bank_items" ADD CONSTRAINT "question_bank_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."question_bank_options" ADD CONSTRAINT "question_bank_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES question_bank_items(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES quiz_attempts(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES question_bank_items(id) ON UPDATE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES quizzes(id) ON UPDATE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES question_bank_items(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES quizzes(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."quizzes" ADD CONSTRAINT "quizzes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES categories(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."quizzes" ADD CONSTRAINT "quizzes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

-- 2025-10-01 04:45:37 UTC