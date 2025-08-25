# QuizSpark Backend

A competitive academic platform backend built with Node.js, TypeScript, and PostgreSQL. Features a monolith + microservice architecture for optimal performance.

## Architecture

- **Main Service (Monolith)**: Handles user management, courses, quizzes, and ELO ratings
- **Match Service (Microservice)**: Real-time quiz battles with WebSocket support

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Real-time**: WebSockets
- **Authentication**: JWT

## Features

### 👑 Admin Features
- Universal data access and management
- Course creation and management
- User account management
- Platform-wide analytics

### 🎓 Faculty Features
- Quiz and content creation with multimedia support
- Student management per course
- Live quiz moderation and scheduling
- Performance analytics

### 🧑‍🎓 Student Features
- Real-time 1v1 quiz competitions
- ELO-based skill tracking
- Match history and analytics
- Course leaderboards

### ⚙️ Core Platform Features
- JWT-based authentication with role-based access
- Dynamic ELO rating system
- Low-latency real-time infrastructure
- Comprehensive API with validation

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Installation

1. **Clone and install dependencies**
```bash
cd backend
npm install
cd match-service
npm install
```

2. **Environment Setup**
```bash
# Copy environment files
cp .env.example .env
cp match-service/.env.example match-service/.env

# Update database URLs and secrets in .env files
```

3. **Database Setup**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

4. **Start Services**
```bash
# Terminal 1: Main service
npm run dev

# Terminal 2: Match service
cd match-service
npm run dev
```

## API Documentation

### Main Service (Port 3000)

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update profile

#### Courses
- `POST /api/v1/courses` - Create course (Faculty/Admin)
- `GET /api/v1/courses` - List courses
- `GET /api/v1/courses/:id` - Get course details
- `POST /api/v1/courses/:id/enroll` - Enroll in course

#### Quizzes
- `POST /api/v1/quizzes` - Create quiz (Faculty/Admin)
- `GET /api/v1/quizzes/:id` - Get quiz details
- `POST /api/v1/quizzes/:id/questions` - Add question
- `POST /api/v1/quizzes/:id/schedule` - Schedule quiz

#### Leaderboards
- `GET /api/v1/leaderboard/course/:id` - Course leaderboard
- `GET /api/v1/leaderboard/global` - Global leaderboard

### Match Service (Port 3001)

#### REST Endpoints
- `POST /api/v1/matches` - Create match
- `GET /api/v1/matches/:id` - Get match details
- `GET /api/v1/matches/:id/results` - Get match results

#### WebSocket (ws://localhost:3001/ws)
- `JOIN_MATCH` - Join match room
- `PLAYER_READY` - Set ready status
- `SUBMIT_ANSWER` - Submit answer

## Database Schema

### Core Entities
- **User**: Authentication and profile data
- **Course**: Course information and enrollment
- **Quiz**: Quiz metadata and questions
- **Question**: Quiz questions with options
- **Match**: Real-time match data
- **EloRating**: Skill ratings per course

### Key Relationships
- Users can create courses (Faculty/Admin)
- Users enroll in courses (Students)
- Courses contain multiple quizzes
- Quizzes have questions with options
- Matches track real-time gameplay
- ELO ratings track skill per course

## Development

### Scripts

**Main Service:**
```bash
npm run dev          # Development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run prisma:studio # Database GUI
```

**Match Service:**
```bash
npm run dev          # Development server
npm run build        # Build for production
npm run start        # Start production server
```

### Code Structure

```
backend/
├── src/
│   ├── config/          # Database and app configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions
├── prisma/
│   └── schema.prisma    # Database schema
└── match-service/
    └── src/
        ├── services/    # Match and WebSocket services
        ├── types/       # Match-specific types
        └── server.ts    # Match service entry point
```

### Environment Variables

**Main Service (.env):**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/quizspark"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
PORT=3000
NODE_ENV="development"
```

**Match Service (.env):**
```env
REDIS_URL="redis://localhost:6379"
JWT_SECRET="same-as-main-service"
PORT=3001
NODE_ENV="development"
```

## Deployment

### Production Setup

1. **Environment Configuration**
   - Set production database URLs
   - Configure Redis connection
   - Set secure JWT secrets
   - Enable CORS for frontend domain

2. **Database Migration**
   ```bash
   npm run prisma:migrate
   ```

3. **Build and Start**
   ```bash
   npm run build
   npm start
   ```

### Docker Support

```dockerfile
# Dockerfile example for main service
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-based Access Control**: Admin/Faculty/Student permissions
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API abuse protection
- **CORS Configuration**: Cross-origin request control
- **Helmet Security**: HTTP security headers

## Performance Optimizations

- **Redis Caching**: Fast data retrieval
- **Connection Pooling**: Efficient database connections
- **Compression**: Response compression
- **WebSocket Optimization**: Low-latency real-time communication
- **ELO Calculation**: Optimized rating algorithms

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the API documentation at `/api/v1`
- Review the health check at `/health`
