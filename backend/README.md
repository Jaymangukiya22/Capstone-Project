# Quiz Management System Backend

A production-ready backend for a comprehensive Quiz Management System built with Node.js, Express.js, Prisma ORM, PostgreSQL, and Docker. Features advanced logging, observability, and comprehensive API testing.

## 🚀 Features

- **Hierarchical Categories**: Self-referencing category system with unlimited nesting levels
- **Advanced Quiz Management**: Support for multiple game types (STANDARD, TIMED, MULTIPLAYER, TOURNAMENT)
- **Flexible Question System**: MCQ (2-4 options) and Boolean questions with multiple correct answers
- **Observability**: Winston logging, OpenTelemetry tracing, Prometheus metrics
- **Production Middleware**: Request logging, error handling, CORS, compression, security headers
- **Basic Authentication**: Development-ready auth system (aryan:admin)
- **Docker Ready**: Multi-stage builds with auto-migrations and health checks
- **TypeScript**: Full type safety throughout the application
- **Prisma ORM**: Type-safe database operations with automatic migrations
- **API Testing**: Comprehensive Postman collection with automated tests

## 🏗 Architecture

```
src/
├── controllers/     # HTTP request handlers with validation
├── services/        # Business logic layer with logging
├── routes/          # API route definitions
├── middleware/      # Request logging, error handling, auth
├── utils/           # Validation schemas, Winston logger
├── tracing.ts       # OpenTelemetry configuration
└── server.ts        # Application entry point with metrics
```

## 📊 Database Schema

### Core Models
- **Quiz**: Game metadata (name, type, timing, bonuses, tags)
- **Question**: Text content with MCQ/Boolean flag
- **Option**: Answer choices with correctness flag
- **Category**: Hierarchical structure with self-referencing parentId

### Key Features
- **Game Types**: STANDARD, TIMED, MULTIPLAYER, TOURNAMENT
- **Question Types**: MCQ (2-4 options) and Boolean (2 options)
- **Hierarchical Categories**: Unlimited nesting with level tracking
- **Flexible Options**: Multiple correct answers supported

## 🔌 API Endpoints

### Categories
- `POST /api/categories` - Create category (with optional parent)
- `GET /api/categories` - List all categories with hierarchy
- `GET /api/categories/:id` - Get category details
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Quizzes
- `POST /api/quizzes` - Create quiz with game type and settings
- `GET /api/quizzes` - List quizzes with filters (gameType, tags, pagination)
- `GET /api/quizzes/:id` - Get quiz with questions and options
- `PUT /api/quizzes/:id` - Update quiz metadata
- `DELETE /api/quizzes/:id` - Delete quiz and cascade questions
- `GET /api/quizzes/:id/stats` - Get comprehensive quiz statistics

### Questions
- `POST /api/questions` - Create standalone question
- `POST /api/questions/quiz/:quizId` - Add MCQ/Boolean question to quiz
- `GET /api/questions/:quizId` - Get all questions for a quiz
- `GET /api/questions/single/:id` - Get question by ID with options
- `PUT /api/questions/single/:id` - Update question and options
- `DELETE /api/questions/single/:id` - Delete question and options
- `GET /api/questions/:quizId/stats` - Get question statistics

### Observability
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics endpoint

## 🐳 Docker Setup

### Quick Start
```bash
# Clone and navigate to backend directory
cd Backend

# Start all services (PostgreSQL + Redis + Backend)
docker-compose up --build

# The backend will be available at http://localhost:3000
```

### Services
- **Backend**: Node.js Express app (Port 3000)
- **PostgreSQL**: Database (Port 5432)
- **Redis**: Cache and pub/sub (Port 6379)

### Environment Variables
Copy `.env.example` to `.env` and configure:
```bash
DATABASE_URL="postgresql://quiz_user:quiz_password@localhost:5432/quiz_db?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=3000
BASIC_AUTH_USERNAME=aryan
BASIC_AUTH_PASSWORD=admin
```

## 🧪 Testing

The application includes comprehensive test coverage using TestSprite MCP server:

- Category creation and hierarchy validation
- Quiz creation and association tests
- Question and answer validation (2-4 options, at least one correct)
- Authentication tests
- API schema and response format validation

## 🔐 Authentication

Basic Authentication for development:
- Username: `aryan`
- Password: `admin`

Include in requests:
```bash
curl -H "Authorization: Basic YXJ5YW46YWRtaW4=" http://localhost:3000/api/categories
```

## 📈 Performance Features

- **Redis Caching**: Quiz details cached for 5 minutes, categories for 10 minutes
- **Database Indexing**: Optimized queries on category_id, quiz_id
- **Connection Pooling**: Efficient database connection management
- **Compression**: Gzip compression for API responses
- **Health Checks**: Built-in health monitoring

## 🔄 Database Operations

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

## 🚦 Health Check

```bash
curl http://localhost:3000/health
```

## 📝 Sample Data

The seed script creates:
- Hierarchical categories (Science → Physics → Quantum Mechanics)
- Sample quizzes with questions and multiple-choice answers
- Demonstrates both single and multiple correct answer formats

## 🔮 Future Modules

This backend is designed to support:
- Module 2: Real-time matchmaking (1v1, 1vN)
- Module 3: Live quiz gameplay with WebSocket
- Module 4: Leaderboards and scoring systems
- Module 5: User management and JWT authentication

## 🛠 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
