#!/bin/bash

echo "🧪 Quiz App Backend Test Suite"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if containers are running
print_status "Checking Docker containers..."

if docker ps --filter "name=quiz-postgres" --format "{{.Status}}" | grep -q "Up"; then
    print_success "PostgreSQL container is running"
else
    print_error "PostgreSQL container is not running"
    echo "Please run: docker compose up -d"
    exit 1
fi

if docker ps --filter "name=quiz-redis" --format "{{.Status}}" | grep -q "Up"; then
    print_success "Redis container is running"
else
    print_error "Redis container is not running"
    echo "Please run: docker compose up -d"
    exit 1
fi

if docker ps --filter "name=backend-backend-1" --format "{{.Status}}" | grep -q "Up"; then
    print_success "Backend container is running"
else
    print_warning "Backend container may not be running"
fi

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 3

# Check database connectivity
print_status "Testing database connectivity..."
if docker exec quiz-postgres pg_isready -U quiz_user -d quiz_db > /dev/null 2>&1; then
    print_success "PostgreSQL is accepting connections"
else
    print_error "Cannot connect to PostgreSQL"
    exit 1
fi

# Check Redis connectivity
print_status "Testing Redis connectivity..."
if docker exec quiz-redis redis-cli ping | grep -q "PONG"; then
    print_success "Redis is responding"
else
    print_error "Cannot connect to Redis"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

echo "[INFO] Running database migrations..."
npx prisma db push --force-reset

# Run different test suites
echo ""
echo "🏃 Running Test Suites"
echo "======================"

# 1. Health and Basic Tests
print_status "Running health and database tests..."
npm run test -- --testPathPattern="(health|database)\.test\.ts" --verbose

# 2. Authentication Tests
print_status "Running authentication tests..."
npm run test -- --testPathPattern="auth\.test\.ts" --verbose

# 3. Validation Tests
print_status "Running validation tests..."
npm run test -- --testPathPattern="validation\.test\.ts" --verbose

# 4. API Unit Tests
print_status "Running API unit tests..."
npm run test -- --testPathPattern="(categories|quizzes|questions)\.test\.ts" --verbose

# 5. Integration Tests
print_status "Running integration tests..."
npm run test -- --testPathPattern="integration\.test\.ts" --verbose

# 6. Docker Environment Tests (if containers are accessible)
print_status "Running Docker environment tests..."
npm run test -- --testPathPattern="docker\.test\.ts" --verbose

# Generate coverage report
print_status "Generating test coverage report..."
npm run test:coverage

echo ""
echo "✅ Test Suite Complete!"
echo "======================="
print_success "All tests have been executed"
print_status "Coverage report available in ./coverage/lcov-report/index.html"
print_status "To run tests in watch mode: npm run test:watch"
print_status "To run specific test suites: npm run test:unit or npm run test:integration"
