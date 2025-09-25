# Docker Troubleshooting Guide

## 🔧 Fixed Issues Summary

The following Docker and TypeScript build issues have been resolved:

### ✅ Issues Fixed:

1. **Missing TypeScript Build Files**
   - **Problem**: Containers expected compiled JavaScript files in `/app/dist/` but TypeScript wasn't compiling properly
   - **Solution**: Fixed Dockerfile build process, added multi-stage builds, proper dependency installation

2. **Missing Startup Scripts**
   - **Problem**: Docker expected `start.sh` and `start-server.js` but they didn't exist or weren't executable
   - **Solution**: Created comprehensive startup scripts with service detection, database waiting, and proper error handling

3. **Docker Configuration Issues**
   - **Problem**: Incorrect entrypoints, wrong service commands, missing environment variables
   - **Solution**: Updated docker-compose.yml with proper service configuration, environment variables, and startup commands

### 🛠️ Files Created/Modified:

#### New Files:
- `backend/start.sh` - Bash startup script with database/Redis waiting and service detection
- `backend/start-server.js` - Node.js startup script as fallback for non-bash environments
- `backend/pre-build.js` - Verification script to ensure all files exist before Docker build
- `setup-env.sh` - Environment setup script for initial configuration

#### Modified Files:
- `backend/Dockerfile` - Complete rewrite with multi-stage builds (development/production)
- `docker-compose.yml` - Updated backend and matchserver configurations
- `backend/package.json` - Added pre-build verification scripts

## 🚀 How to Use

### Option 1: Quick Start
```bash
# Navigate to project root
cd /d/Projects/Capstone-Project

# Run the setup script (optional)
bash setup-env.sh

# Build and start all services
docker-compose up --build
```

### Option 2: Step-by-Step
```bash
# 1. Verify environment
cd backend
npm run verify

# 2. Build containers
docker-compose build

# 3. Start services
docker-compose up
```

### Option 3: Development Mode
```bash
# Backend (without Docker)
cd backend
npm install
npm run build
npm run dev:all

# Frontend (without Docker) 
cd Frontend-admin
npm install
npm run dev
```

## 📊 Service Architecture

### Backend Service (Port 3000)
- **Purpose**: Main API server for authentication, CRUD operations, quiz management
- **Startup Script**: `start.sh` (detects `SERVICE_TYPE=backend`)
- **Health Check**: `http://localhost:3000/health`
- **Dependencies**: PostgreSQL, Redis

### Match Server (Port 3001) 
- **Purpose**: WebSocket server for real-time multiplayer matches
- **Startup Script**: `start.sh` (detects `SERVICE_TYPE=matchserver` or `MATCH_SERVICE_PORT`)
- **Health Check**: `http://localhost:3001/health`
- **Dependencies**: PostgreSQL, Redis, Backend

### Startup Logic:
```bash
# The start.sh script automatically detects which service to run:
if [ "$SERVICE_TYPE" = "matchserver" ] || [ "$MATCH_SERVICE_PORT" ]; then
  # Start Match Server
  exec node dist/matchServer-enhanced.js
else
  # Start Backend API Server  
  exec node dist/server.js
fi
```

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find module '/app/dist/server.js'"
**Root Cause**: TypeScript not compiled or build failed
**Solutions**:
```bash
# Check if TypeScript files exist
ls backend/src/

# Manually build locally to test
cd backend
npm run build
ls dist/

# Check Docker build logs
docker-compose logs backend
```

### Issue 2: "start.sh: not found" or "Permission denied"
**Root Cause**: Script not executable or missing
**Solutions**:
```bash
# Make scripts executable (Linux/Mac)
chmod +x backend/start.sh
chmod +x backend/start-server.js

# On Windows, use Node.js fallback
# Docker will automatically use start-server.js if start.sh fails
```

### Issue 3: Database Connection Errors
**Root Cause**: Database not ready when services start
**Solutions**:
```bash
# Check database status
docker-compose logs postgres

# Wait for services to be healthy
docker-compose ps

# Manual database connection test
docker-compose exec backend pg_isready -h postgres -U quizup_user
```

### Issue 4: Port Already in Use
**Root Cause**: Other services using required ports
**Solutions**:
```bash
# Check what's using the ports
lsof -i :3000  # Backend
lsof -i :3001  # Match Server  
lsof -i :5173  # Frontend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Stop other services or change ports in .env file
```

### Issue 5: Redis Connection Errors
**Root Cause**: Redis not accessible or configured incorrectly
**Solutions**:
```bash
# Check Redis status
docker-compose logs redis

# Test Redis connection
docker-compose exec backend redis-cli -h redis -p 6379 ping

# Should return "PONG"
```

## 🔍 Debugging Commands

### Check Service Status:
```bash
# All services
docker-compose ps

# Specific service logs
docker-compose logs -f backend
docker-compose logs -f matchserver
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Verify Build Process:
```bash
# Run pre-build verification
cd backend
npm run verify

# Manual TypeScript build test
npm run build

# Check generated files
ls -la dist/
```

### Network Testing:
```bash
# Test service connectivity
curl http://localhost:3000/health  # Backend
curl http://localhost:3001/health  # Match Server

# Test from inside containers
docker-compose exec backend curl http://localhost:3000/health
```

### Database Operations:
```bash
# Connect to database
docker-compose exec postgres psql -U quizup_user -d quizup_db

# Check tables
\dt

# Exit psql
\q
```

## 🚦 Health Checks

All services include health checks that verify:

- **Backend**: API endpoint accessibility (`/health`)
- **Match Server**: WebSocket server health (`/health`) 
- **PostgreSQL**: Database connection (`pg_isready`)
- **Redis**: Cache availability (`redis-cli ping`)

### Check Health Status:
```bash
# Docker health check status
docker-compose ps

# Manual health checks
curl -f http://localhost:3000/health
curl -f http://localhost:3001/health
```

## 📱 Access URLs

Once running successfully:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000  
- **Match Service**: http://localhost:3001
- **API Documentation**: http://localhost:3000/api-docs
- **Database Admin**: http://localhost:8080 (Adminer)
- **Redis Commander**: http://localhost:8081

## 🔄 Reset & Rebuild

If you encounter persistent issues:

```bash
# Complete reset
docker-compose down -v  # Remove containers and volumes
docker system prune     # Clean up unused resources

# Rebuild from scratch
docker-compose up --build --force-recreate

# Or rebuild specific service
docker-compose up --build backend
```

## 📞 Support

If issues persist:

1. **Check Logs**: `docker-compose logs -f [service-name]`
2. **Verify Files**: `npm run verify` in backend directory
3. **Manual Build**: Try building TypeScript locally first
4. **Environment**: Ensure `.env` file has correct values
5. **Ports**: Verify no conflicts with other services

The system is now configured to handle all the previous Docker and build issues automatically! 🎉
