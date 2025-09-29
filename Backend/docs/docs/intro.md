# Getting Started with QuizUP Backend API

Welcome to the QuizUP Backend API documentation! This guide will help you get started with the Node.js backend API for the QuizUP platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis server
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/quizup-backend.git
   cd quizup-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and Redis configuration
   ```

4. **Set up the database**
   ```bash
   # Install Sequelize CLI globally (if not already installed)
   npm install -g sequelize-cli

   # Run database migrations
   npm run db:migrate

   # Seed the database with sample data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Start the match service**
   ```bash
   npm run dev:match
   ```

## 🛠️ Development Setup

### Environment Configuration

Create a `.env` file based on `.env.example`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quizup
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-token-secret

# Server
PORT=3000
MATCH_SERVICE_PORT=3001
NODE_ENV=development

# OpenTelemetry (optional)
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

### Database Setup

The project uses **PostgreSQL** with **Sequelize ORM**. To set up the database:

1. **Install PostgreSQL** and create a database
2. **Update database credentials** in `.env`
3. **Run migrations** to create tables
4. **Seed the database** with initial data

### Redis Setup

Redis is used for:
- Session management
- Caching
- WebSocket adapter for scaling
- Match state persistence

Install Redis and update the `REDIS_URL` in your `.env` file.

## 📁 Project Structure

```
src/
├── controllers/        # Route handlers
├── services/          # Business logic
├── models/            # Sequelize models
├── routes/            # API route definitions
├── middleware/        # Express middleware
├── utils/             # Utility functions
├── types/             # TypeScript definitions
├── lib/               # Core libraries
└── config/            # Configuration files
```

## 🔧 Key Technologies

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Sequelize** - ORM for PostgreSQL
- **Redis** - Caching and session storage
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Joi** - Input validation
- **Winston** - Logging
- **Jest** - Testing framework
- **Docker** - Containerization

## 📚 API Documentation

### REST API Endpoints

The API provides comprehensive endpoints for:

- **Authentication** - JWT-based user authentication
- **Users** - User management and profiles
- **Categories** - Quiz categories and hierarchy
- **Quizzes** - Quiz creation and management
- **Questions** - Question bank management
- **Matches** - Real-time quiz matches
- **Analytics** - Usage statistics and reporting

### WebSocket Events

Real-time communication via Socket.io:

- **Match Events** - Live quiz gameplay
- **Player Events** - Player connections and status
- **Game Events** - Question responses and scoring

## 🧪 Testing

The project includes comprehensive testing:

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run with Docker Compose
npm run docker:up
```

### Production Considerations

- Environment variable configuration
- Database connection pooling
- Redis clustering for scalability
- Logging and monitoring setup
- Security headers and CORS
- Rate limiting configuration

## 🔒 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting
- Helmet security headers
- SQL injection protection via Sequelize

## 📊 Monitoring & Logging

- **Winston** for structured logging
- **OpenTelemetry** for distributed tracing
- **Health check endpoints**
- **Metrics collection** ready for Prometheus

## 🤝 Contributing

1. Follow TypeScript and ESLint standards
2. Write comprehensive JSDoc comments
3. Add unit and integration tests
4. Update API documentation
5. Run tests before submitting PRs

## 🔗 Links

- [API Documentation](http://localhost:3000/api-docs) - Swagger UI
- [Main API](http://localhost:3000) - Development server
- [Match Service](http://localhost:3001) - WebSocket server
- [Health Check](http://localhost:3000/health) - Service status
- [GitHub Repository](https://github.com/your-org/quizup-backend) - Source code
