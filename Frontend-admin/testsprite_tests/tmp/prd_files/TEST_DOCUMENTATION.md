# Quiz App Backend - Test Suite Documentation

## Overview
Comprehensive test suite for the Quiz App Backend covering all functionality including API endpoints, database operations, authentication, validation, and Docker environment.

## Test Structure

### 1. **Health Tests** (`tests/health.test.ts`)
- ✅ Health endpoint response validation
- ✅ Response time performance checks
- ✅ Service availability verification

### 2. **Database Tests** (`tests/database.test.ts`)
- ✅ PostgreSQL connection testing
- ✅ Raw query execution
- ✅ Schema validation (tables exist)
- ✅ Redis connection testing
- ✅ Redis operations (set, get, delete, expiration)

### 3. **Authentication Tests** (`tests/auth.test.ts`)
- ✅ Basic authentication with valid credentials
- ✅ Access denial with invalid credentials
- ✅ Access denial without credentials
- ✅ Malformed authorization header handling
- ✅ Public route access verification

### 4. **Validation Tests** (`tests/validation.test.ts`)
- ✅ Category validation (name length, parent relationships)
- ✅ Quiz validation (title, difficulty, time limits)
- ✅ Question validation (2-4 options, correct answers required)
- ✅ Edge case handling for all validation schemas

### 5. **Categories API Tests** (`tests/categories.test.ts`)
- ✅ Create categories (root and subcategories)
- ✅ Retrieve all categories with relationships
- ✅ Get category by ID
- ✅ Update category information
- ✅ Delete categories with cascade deletion
- ✅ Authorization requirement validation
- ✅ Input validation error handling

### 6. **Quizzes API Tests** (`tests/quizzes.test.ts`)
- ✅ Create quizzes with all metadata
- ✅ Create quizzes with minimal data
- ✅ Retrieve quizzes with category information
- ✅ Filter quizzes by category and difficulty
- ✅ Get quiz by ID with questions and options
- ✅ Update quiz information
- ✅ Delete quizzes with cascade to questions/options
- ✅ Quiz statistics endpoint
- ✅ Validation error handling

### 7. **Questions API Tests** (`tests/questions.test.ts`)
- ✅ Create questions with 2-4 options
- ✅ Support for multiple correct answers
- ✅ Validation of option count (2-4 required)
- ✅ Validation of correct answer requirement
- ✅ Retrieve questions with options and quiz info
- ✅ Filter questions by quiz
- ✅ Update questions and options
- ✅ Delete questions with cascade to options
- ✅ Non-existent quiz validation

### 8. **Integration Tests** (`tests/integration.test.ts`)
- ✅ Complete quiz creation flow (category → quiz → questions)
- ✅ Hierarchical category management
- ✅ Data integrity and referential constraints
- ✅ Error handling for malformed requests
- ✅ Concurrent request handling
- ✅ Performance validation

### 9. **Docker Environment Tests** (`tests/docker.test.ts`)
- ✅ Container health verification
- ✅ Database connectivity from containers
- ✅ Redis connectivity from containers
- ✅ API endpoint accessibility
- ✅ Environment variable validation

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Sequential execution to avoid DB conflicts
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/server.ts']
};
```

### Test Setup (`tests/setup.ts`)
- Database connection management
- Redis connection and cleanup
- Test data cleanup between tests
- Prisma client configuration

## Running Tests

### Quick Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
```

### Comprehensive Test Runner
```bash
# Run the complete test suite with environment checks
./run-tests.sh
```

The test runner script (`run-tests.sh`) includes:
- Docker container health checks
- Database and Redis connectivity verification
- Prisma client generation
- Sequential execution of all test suites
- Coverage report generation

## Test Results Summary

### ✅ All Tests Passing
- **9 Test Suites**: All test files execute successfully
- **100+ Test Cases**: Comprehensive coverage of all functionality
- **Database Operations**: Full CRUD operations tested
- **API Endpoints**: All endpoints with authentication tested
- **Error Handling**: Invalid inputs and edge cases covered
- **Integration**: End-to-end workflows validated

### Coverage Report
- **Controllers**: API endpoint logic
- **Services**: Business logic and database operations
- **Middleware**: Authentication and error handling
- **Utils**: Validation and Redis operations
- **Routes**: Endpoint routing and parameter handling

## Test Data Management

### Database Cleanup
- Each test suite cleans up test data before/after execution
- Cascade deletions properly tested
- Foreign key constraints validated

### Redis Cache Management
- Cache cleared between tests
- TTL and expiration functionality tested
- Pattern-based cache invalidation verified

## Authentication Testing
- Basic Auth with credentials: `aryan:admin`
- All protected endpoints require authentication
- Unauthorized access properly blocked
- Malformed headers handled gracefully

## Performance Considerations
- Health endpoint responds within 100ms
- Concurrent request handling validated
- Database connection pooling tested
- Redis caching effectiveness verified

## Environment Requirements
- Docker containers running (PostgreSQL, Redis, Backend)
- Node.js dependencies installed
- Prisma client generated
- Environment variables configured

## Troubleshooting

### Common Issues
1. **Container Not Running**: Ensure `docker compose up -d` is executed
2. **Database Connection**: Verify PostgreSQL container health
3. **Redis Connection**: Check Redis container accessibility
4. **Permission Issues**: Ensure test script is executable (`chmod +x run-tests.sh`)

### Debug Commands
```bash
# Check container status
docker ps

# Check database connectivity
docker exec quiz-postgres pg_isready -U quiz_user -d quiz_db

# Check Redis connectivity
docker exec quiz-redis redis-cli ping

# View container logs
docker logs quiz-backend
```

## Next Steps
- Tests can be integrated into CI/CD pipeline
- Coverage thresholds can be enforced
- Performance benchmarks can be added
- Load testing can be implemented
- API documentation can be generated from tests
