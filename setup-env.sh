#!/bin/bash

# QuizUP Environment Setup Script
# This script helps set up the proper environment for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 QuizUP Environment Setup${NC}"
echo "============================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    
    # Create basic .env file with development defaults
    cat > .env << 'EOF'
# QuizUP Development Environment Configuration
NODE_ENV=development

# Database Configuration
POSTGRES_DB=quizup_db
POSTGRES_USER=quizup_user
POSTGRES_PASSWORD=quizup_password
POSTGRES_PORT=5432

# Redis Configuration  
REDIS_PORT=6379

# Server Ports
BACKEND_PORT=3000
MATCH_SERVICE_PORT=3001
FRONTEND_PORT=5173

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=info
ENABLE_SWAGGER=true

# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:3000
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_APP_NAME=QuizUP
VITE_APP_VERSION=1.0.0

# Development Tools
ADMINER_PORT=8080
REDIS_COMMANDER_PORT=8081
REDIS_COMMANDER_USER=admin
REDIS_COMMANDER_PASSWORD=admin

# Development Flags
SEED_DATABASE=true
ENABLE_DEBUG_ROUTES=true
EOF

    echo -e "${GREEN}✅ .env file created with development defaults${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed. Please install docker-compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and docker-compose are available${NC}"

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js is not installed. Docker will handle this, but local development may require Node.js${NC}"
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js ${NODE_VERSION} is available${NC}"
fi

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
            echo -e "${YELLOW}⚠️  Port $port is already in use (needed for $service)${NC}"
            return 1
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep ":$port " >/dev/null; then
            echo -e "${YELLOW}⚠️  Port $port is already in use (needed for $service)${NC}"
            return 1
        fi
    fi
    
    echo -e "${GREEN}✅ Port $port is available for $service${NC}"
    return 0
}

# Check required ports
echo ""
echo -e "${BLUE}📡 Checking required ports...${NC}"
check_port 3000 "Backend API"
check_port 3001 "Match Service"  
check_port 5173 "Frontend"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"

# Display next steps
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "============================================"
echo -e "${GREEN}1. Build and start services:${NC}"
echo "   docker-compose up --build"
echo ""
echo -e "${GREEN}2. For development with hot reload:${NC}"
echo "   cd backend && npm run dev:all"
echo "   cd Frontend-admin && npm run dev"
echo ""
echo -e "${GREEN}3. Access the application:${NC}"
echo "   📱 Frontend: http://localhost:5173"
echo "   🔧 Backend API: http://localhost:3000"
echo "   🎮 Match Service: http://localhost:3001"
echo "   🗃️  Database Admin: http://localhost:8080"
echo "   📊 Redis Commander: http://localhost:8081"
echo ""
echo -e "${GREEN}4. API Documentation:${NC}"
echo "   📚 Swagger UI: http://localhost:3000/api-docs"
echo ""
echo -e "${BLUE}🔧 Troubleshooting:${NC}"
echo "============================================"
echo "• If ports are in use, stop other services or change ports in .env"
echo "• For permission issues, try: sudo docker-compose up --build"
echo "• Check logs: docker-compose logs -f [service-name]"
echo "• Rebuild containers: docker-compose down && docker-compose up --build"
echo ""
echo -e "${GREEN}✨ Environment setup complete! Happy coding! ✨${NC}"
