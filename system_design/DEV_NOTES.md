# QuizUP Development Notes

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ LTS
- Docker & Docker Compose
- PostgreSQL 15+ (if running locally)
- Redis 7+ (if running locally)

### Local Development Setup

#### 1. Clone and Setup Environment
```bash
git clone https://github.com/your-org/quizup.git
cd quizup

# Copy environment configuration
cp .env.example .env

# Edit .env with your local settings
nano .env
```

#### 2. Start with Docker Compose (Recommended)
```bash
# Start all services (database, cache, backend, frontend)
docker-compose up --build

# Or start specific profiles
docker-compose --profile development up --build
docker-compose --profile monitoring up --build
```

#### 3. Manual Setup (Alternative)
```bash
# Backend setup
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev

# In another terminal - Match server
cd backend
npm run dev:match

# In another terminal - Frontend
cd Frontend-admin
npm install  
npm run dev
```

### 🌐 Service URLs (Development)
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Match Server**: http://localhost:3001
- **Database Admin**: http://localhost:8080 (Adminer)
- **Redis Admin**: http://localhost:8081 (Redis Commander)
- **API Documentation**: http://localhost:3000/api-docs

### 🗄️ Database Operations

#### Migrations & Seeding
```bash
cd backend

# Run database migrations
npm run db:migrate

# Seed with sample data
npm run db:seed

# Quick seed for development
npm run seed:quick

# Massive seed for load testing
npm run seed:massive
```

#### Database Access
```bash
# Via Docker
docker exec -it quizup_postgres psql -U quizup_user -d quizup_db

# Via local installation
psql -h localhost -U quizup_user -d quizup_db
```

### 🧪 Testing Guide

#### Running Tests
```bash
# Backend tests
cd backend
npm run test                # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage     # With coverage report

# Frontend tests
cd Frontend-admin
npm run test              # Unit tests
npm run test:e2e         # End-to-end tests
```

#### Test Match Scenarios

##### 1. Friend Match Flow
```bash
# User 1 (Creator)
1. Navigate to http://localhost:5173
2. Login with test credentials
3. Select a quiz
4. Choose "Play with Friend" 
5. Note the join code (e.g., ABC123)

# User 2 (Joiner) - Different browser/incognito
1. Navigate to http://localhost:5173  
2. Login with different test credentials
3. Click "Join Friend Match"
4. Enter join code ABC123
5. Both players should see each other in lobby
6. Click "I'm Ready!" on both sides
7. Match should start automatically
```

##### 2. AI Opponent Match
```bash
1. Navigate to http://localhost:5173
2. Login with test credentials  
3. Select a quiz
4. Choose "Solo vs AI"
5. Select AI difficulty (Rookie/Smart/Genius)
6. Match should start with AI opponent
```

##### 3. Multiplayer Match
```bash
1. Create match with max 4 players
2. Share join code with 3 friends
3. All players join and ready up
4. Match starts when all ready
```

### 🔧 Development Tools

#### Redis Operations
```bash
# Connect to Redis CLI
docker exec -it quizup_redis redis-cli

# View match data
KEYS match:*
GET match:match_123456789_abc123

# View user sessions
KEYS user:session:*
```

#### Database Queries
```sql
-- View active matches
SELECT * FROM matches WHERE status IN ('WAITING', 'IN_PROGRESS');

-- View match players
SELECT m.id, m.status, u.username, mp.score 
FROM matches m 
JOIN match_players mp ON m.id = mp.match_id 
JOIN users u ON mp.user_id = u.id;

-- View quiz statistics
SELECT * FROM quiz_statistics ORDER BY total_attempts DESC;
```

#### WebSocket Testing
```bash
# Install wscat for WebSocket testing
npm install -g wscat

# Connect to match server
wscat -c ws://localhost:3001

# Send authentication
{"type": "authenticate", "userId": 1, "username": "testuser"}

# Create friend match
{"type": "create_friend_match", "quizId": 1}
```

### 📊 Monitoring & Debugging

#### Log Locations
```bash
# Backend logs
tail -f backend/logs/app.log
tail -f backend/logs/error.log

# Docker logs
docker-compose logs -f backend
docker-compose logs -f matchserver
docker-compose logs -f frontend
```

#### Performance Monitoring
```bash
# Start monitoring stack
docker-compose --profile monitoring up -d

# Access dashboards 
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3003 (admin/admin)
```

#### Health Checks
```bash
# Backend health
curl http://localhost:3000/health

# Match server health  
curl http://localhost:3001/health

# Frontend health
curl http://localhost:5173/health
```

### 🐛 Common Issues & Solutions

#### 1. "Cannot connect to database"
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

#### 2. "Redis connection failed"
```bash
# Check Redis status
docker-compose ps redis

# Test Redis connection
docker exec -it quizup_redis redis-cli ping

# Should return "PONG"
```

#### 3. "WebSocket connection failed"
```bash
# Check match server logs
docker-compose logs matchserver

# Verify port is not blocked
netstat -tulpn | grep 3001

# Test WebSocket connection
wscat -c ws://localhost:3001
```

#### 4. "Frontend can't reach backend"
```bash
# Check CORS configuration in .env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Verify API base URL
grep VITE_API_BASE_URL Frontend-admin/.env
```

#### 5. "Match data not syncing between players"
```bash
# Check Redis for match data
docker exec -it quizup_redis redis-cli
KEYS match:*

# Verify both players are in same room
# Check backend logs for room join events
docker-compose logs backend | grep "joined room"
```

### 🔀 Git Workflow

#### Branch Strategy
```bash
# Feature development
git checkout -b feature/match-reconnection
git push -u origin feature/match-reconnection

# Bug fixes  
git checkout -b bugfix/websocket-timeout
git push -u origin bugfix/websocket-timeout

# Hotfixes
git checkout -b hotfix/security-patch
git push -u origin hotfix/security-patch
```

#### Commit Convention
```bash
# Feature
git commit -m "feat(match): add reconnection capability"

# Bug fix
git commit -m "fix(websocket): resolve timeout issues"

# Documentation
git commit -m "docs(api): update WebSocket event specs"

# Refactor
git commit -m "refactor(auth): improve JWT token handling"
```

### 📦 Build & Deployment

#### Production Build
```bash
# Build all services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Environment Variables
```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_SWAGGER=true

# Production  
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_SWAGGER=false
```

### 🧪 Testing Checklist

#### Manual Testing Scenarios

##### Authentication Flow
- [ ] User can register with valid data
- [ ] User can login with correct credentials  
- [ ] Invalid credentials show error message
- [ ] JWT token expires correctly
- [ ] Refresh token renews access

##### Quiz Management
- [ ] Admin can create new quiz
- [ ] Categories display hierarchically
- [ ] Questions can be added/edited/deleted
- [ ] Bulk import works with CSV/Excel
- [ ] Quiz can be published/unpublished

##### Friend Match Flow
- [ ] Player 1 creates match successfully
- [ ] Join code generated and displayed
- [ ] Player 2 can join with valid code
- [ ] Invalid join codes show error
- [ ] Both players see each other's names
- [ ] Ready system works correctly
- [ ] Match starts when both ready
- [ ] Questions display correctly
- [ ] Answers sync between players
- [ ] Timer works consistently
- [ ] Final results show for both players
- [ ] Match ID displays correctly (not "unknown")
- [ ] Winner announced correctly

##### AI Opponent Flow
- [ ] AI opponents load correctly
- [ ] Different AI difficulties work
- [ ] AI responds with realistic timing
- [ ] AI accuracy matches difficulty setting
- [ ] Match completion works with AI

##### WebSocket Stability
- [ ] Connection establishes successfully
- [ ] Reconnection works after disconnect
- [ ] Multiple tabs handle correctly
- [ ] Network issues handled gracefully
- [ ] Events broadcast to correct players

### 🚀 Performance Testing

#### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Test API endpoints
artillery run backend/tests/load/api-load-test.yml

# Test WebSocket connections
artillery run backend/tests/load/websocket-load-test.yml
```

#### Memory & CPU Monitoring
```bash
# Monitor Docker resource usage
docker stats

# Monitor Node.js processes
top -p `pgrep node`

# Check memory leaks
node --inspect backend/dist/server.js
```

### 📋 Sample Data

#### Test Users
```json
{
  "admin": { "username": "admin", "password": "admin123", "role": "ADMIN" },
  "teacher1": { "username": "teacher1", "password": "teacher123", "role": "FACULTY" },
  "student1": { "username": "student1", "password": "student123", "role": "STUDENT" },
  "student2": { "username": "student2", "password": "student123", "role": "STUDENT" }
}
```

#### Sample Join Codes
```
ABC123 - Basic Math Quiz
XYZ789 - Science Quiz  
DEF456 - History Quiz
```

### 🔧 Troubleshooting Commands

#### Reset Everything
```bash
# Stop all services
docker-compose down -v

# Remove all containers and volumes
docker-compose down -v --remove-orphans

# Rebuild and restart
docker-compose up --build
```

#### Clear Redis Cache
```bash
docker exec -it quizup_redis redis-cli FLUSHALL
```

#### Reset Database
```bash
# Drop and recreate database
docker-compose exec postgres psql -U quizup_user -c "DROP DATABASE IF EXISTS quizup_db;"
docker-compose exec postgres psql -U quizup_user -c "CREATE DATABASE quizup_db;"

# Re-run migrations and seeds
cd backend && npm run db:migrate && npm run db:seed
```

### 📞 Support & Contact

For issues and questions:
1. Check this DEV_NOTES.md file
2. Review logs in respective service directories
3. Check GitHub Issues for known problems
4. Create new issue with detailed error logs

### 🎯 Next Steps

After successful setup:
1. Review system architecture in `docs/SYSTEM_DESIGN.md`
2. Explore API documentation at `docs/openapi.yaml`
3. Understand WebSocket events in `docs/socket_spec.md`  
4. Run test scenarios to verify functionality
5. Review monitoring setup for production readiness
