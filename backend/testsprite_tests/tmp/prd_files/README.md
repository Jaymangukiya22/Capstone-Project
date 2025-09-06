# Quiz App Backend - Module 1

A scalable backend application for a real-time quiz platform built with Node.js, Express, PostgreSQL, Prisma, and Redis.

## 🚀 Features

- **Hierarchical Categories**: Self-join category system supporting unlimited nesting
- **Quiz Management**: Create and manage quizzes with metadata (title, description, difficulty, time limits)
- **Question System**: Support for 2-4 option questions with single or multiple correct answers
- **Redis Caching**: High-performance caching for quiz data and categories
- **Basic Authentication**: Development-ready auth system (aryan:admin)
- **Docker Ready**: Complete containerization with docker-compose
- **TypeScript**: Full type safety throughout the application
- **Prisma ORM**: Type-safe database operations with automatic migrations

## 🏗 Architecture

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── routes/          # API route definitions
├── middleware/      # Custom middleware (auth, error handling)
├── utils/           # Utilities (Redis, validation)
└── server.ts        # Application entry point
```

## 📊 Database Schema

- **Categories**: Hierarchical structure with self-join relationships
- **Quizzes**: Belong to categories with difficulty and time limit metadata
- **Questions**: Multiple questions per quiz
- **Options**: 2-4 options per question with correct answer flags

## 🔌 API Endpoints

### Categories
- `POST /api/categories` - Create category (with optional parent)
- `GET /api/categories` - List all categories with hierarchy
- `GET /api/categories/:id` - Get category details
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Quizzes
- `POST /api/quizzes` - Create quiz under a category
- `GET /api/quizzes` - List all quizzes (optional categoryId filter)
- `GET /api/quizzes/:id` - Get quiz with questions and answers
- `PUT /api/quizzes/:id` - Update quiz
- `DELETE /api/quizzes/:id` - Delete quiz
- `GET /api/quizzes/:id/stats` - Get quiz statistics

### Questions
- `POST /api/questions` - Create standalone question
- `POST /api/questions/quiz/:quizId` - Add question to specific quiz
- `GET /api/questions/:quizId` - Get all questions for a quiz
- `GET /api/questions/single/:id` - Get question by ID
- `PUT /api/questions/single/:id` - Update question
- `DELETE /api/questions/single/:id` - Delete question
- `GET /api/questions/:quizId/stats` - Get question statistics

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
