# Quiz Management System - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### 1. Start with Docker (Recommended)

```bash
# Navigate to backend directory
cd backend

# Start all services
docker-compose up --build

# The backend will be available at:
# - API: http://localhost:3000
# - Health: http://localhost:3000/health
# - Metrics: http://localhost:3000/metrics
```

### 2. Local Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

## 🔧 Environment Configuration

Create `.env` file with:

```env
# Database
DATABASE_URL="postgresql://quiz_user:quiz_password@localhost:5432/quiz_db?schema=public"

# Server
PORT=3000
NODE_ENV=development

# Authentication
BASIC_AUTH_USERNAME=aryan
BASIC_AUTH_PASSWORD=admin

# Observability
LOG_LEVEL=info
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

## 🧪 Testing the API

### Import Postman Collection

1. Open Postman
2. Import `postman/Quiz-Management-System-API.postman_collection.json`
3. Set collection variables:
   - `baseUrl`: http://localhost:3000
4. Run the collection to test all endpoints

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# Create a category (with auth)
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YXJ5YW46YWRtaW4=" \
  -d '{"name": "Technology", "description": "Tech quizzes"}'

# Create a quiz
curl -X POST http://localhost:3000/api/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YXJ5YW46YWRtaW4=" \
  -d '{
    "quizName": "JavaScript Basics",
    "gameType": "STANDARD",
    "timePerQuestion": 30,
    "tags": ["javascript", "programming"]
  }'
```

## 📊 Monitoring & Observability

### Logs
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`

### Metrics
- Prometheus metrics: http://localhost:3000/metrics
- Includes HTTP request metrics, response times, and system metrics

### Tracing
- OpenTelemetry traces sent to Jaeger (if configured)
- Set `JAEGER_ENDPOINT` in environment variables

## 🗄️ Database Operations

```bash
# View database schema
npx prisma studio

# Reset database
npx prisma migrate reset

# Deploy migrations
npx prisma migrate deploy

# Generate client after schema changes
npx prisma generate
```

## 🔐 Authentication

All API endpoints require Basic Authentication:
- Username: `aryan`
- Password: `admin`

Base64 encoded: `YXJ5YW46YWRtaW4=`

## 📈 Performance Features

- **Structured Logging**: Winston with JSON format
- **Request Tracing**: OpenTelemetry integration
- **Metrics Collection**: Prometheus metrics
- **Error Handling**: Comprehensive error middleware
- **Validation**: Joi schema validation
- **Security**: Helmet, CORS, compression

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in docker-compose.yml or .env
   PORT=3001
   ```

2. **Database connection failed**
   ```bash
   # Check PostgreSQL is running
   docker-compose ps
   
   # View logs
   docker-compose logs postgres
   ```

3. **Prisma client not generated**
   ```bash
   npx prisma generate
   ```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# View all logs
docker-compose logs -f backend
```

## 🚦 Health Checks

The system includes comprehensive health checks:

- **Application**: `/health` endpoint
- **Database**: Prisma connection test
- **Docker**: Container health checks

## 📝 API Documentation

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Key Endpoints

- **Categories**: `/api/categories` - Hierarchical category management
- **Quizzes**: `/api/quizzes` - Quiz CRUD with game types
- **Questions**: `/api/questions` - MCQ and Boolean questions
- **Health**: `/health` - System health status
- **Metrics**: `/metrics` - Prometheus metrics

## 🔄 Development Workflow

1. Make code changes
2. Tests run automatically (if configured)
3. Docker rebuilds on file changes
4. Logs available in real-time
5. Database schema changes via Prisma migrations

## 📦 Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use proper database credentials
3. Configure external monitoring
4. Set up log aggregation
5. Enable HTTPS
6. Configure proper CORS origins

## 🎯 Next Steps

The backend is ready for:
- Frontend integration
- Real-time features (WebSocket)
- User authentication (JWT)
- Advanced analytics
- Caching strategies
- Load balancing
