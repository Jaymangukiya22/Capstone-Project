# 📖 QuizUP Multi-Host Setup Guide

## Prerequisites

### System Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.0+
- **Node.js**: 18+ (for testing)
- **RAM**: 2GB minimum (4GB+ recommended)
- **Disk Space**: 5GB minimum

### Installation

#### Windows
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [Git for Windows](https://git-scm.com/download/win)
3. Clone repository: `git clone <repo-url>`
4. Open PowerShell and navigate to project

#### Linux/Mac
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone <repo-url>
cd Capstone-Project
```

---

## 🎯 Deployment Modes

### Mode 1: LOCALHOST (Development)

**Best for**: Single machine development and testing

#### Quick Start
```bash
# Windows
deploy.bat localhost

# Linux/Mac
./deploy.sh localhost
```

#### What It Does
1. Copies `.env.localhost` to `.env`
2. Builds Docker images
3. Starts all services on localhost
4. Seeds database automatically

#### Access
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **WebSocket**: ws://localhost:3001
- **Database Admin**: http://localhost:8080

#### Configuration
- **Workers**: 1-2
- **Database Pool**: 5-20
- **CPU Limit**: 0.5 cores
- **Memory Limit**: 512MB

---

### Mode 2: NETWORK (LAN Testing)

**Best for**: Testing across multiple devices on same network

#### Quick Start
```bash
# Windows
deploy.bat network

# Linux/Mac
./deploy.sh network
```

#### What It Does
1. Auto-detects your network IP
2. Copies `.env.network` to `.env`
3. Updates all services to use network IP
4. Builds Docker images
5. Starts all services

#### Access
- **Frontend**: http://{NETWORK_IP}:5173
- **API**: http://{NETWORK_IP}:3000
- **WebSocket**: ws://{NETWORK_IP}:3001
- **Database Admin**: http://{NETWORK_IP}:8080

#### Configuration
- **Workers**: 2-4
- **Database Pool**: 10-50
- **CPU Limit**: 1.0 cores
- **Memory Limit**: 1GB

#### Example
```
Detected Network IP: 192.168.1.100

Share this URL with friends:
http://192.168.1.100:5173
```

---

### Mode 3: SELF-HOSTED (Production with Cloudflare Tunnel)

**Best for**: Public hosting with automatic SSL and domain

#### Prerequisites
1. Cloudflare account
2. Domain configured in Cloudflare
3. Cloudflare tunnel created
4. `cloudflared` CLI installed

#### Quick Start
```bash
# Windows
deploy.bat self-hosted

# Linux/Mac
./deploy.sh self-hosted
```

#### What It Does
1. Copies `.env.self-hosted` to `.env`
2. Initializes Docker Swarm
3. Builds production images
4. Deploys stack with replicas
5. Sets up health checks

#### Start Tunnel
```bash
cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139
```

#### Access
- **Frontend**: https://quizdash.dpdns.org
- **API**: https://api.quizdash.dpdns.org
- **WebSocket**: wss://match.quizdash.dpdns.org
- **Database Admin**: https://adminer.quizdash.dpdns.org

#### Configuration
- **Workers**: 20-1000
- **Database Pool**: 20-2000
- **CPU Limit**: 4.0 cores
- **Memory Limit**: 4GB
- **Replicas**: 2-4 per service

---

## 📁 Environment Files

### File Structure
```
.env.localhost              # Main env for localhost
.env.network               # Main env for network
.env.self-hosted           # Main env for self-hosted
backend/.env.localhost     # Backend env for localhost
backend/.env.network       # Backend env for network
backend/.env.self-hosted   # Backend env for self-hosted
Frontend-admin/.env.localhost     # Frontend env for localhost
Frontend-admin/.env.network       # Frontend env for network
Frontend-admin/.env.self-hosted   # Frontend env for self-hosted
```

### Key Variables

#### DEPLOYMENT_MODE
```
localhost    - Single machine development
network      - Multiple machines on LAN
self-hosted  - Production with Cloudflare
```

#### Database Configuration
```
POSTGRES_DB=quizup_db
POSTGRES_USER=quizup_user
POSTGRES_PASSWORD=quizup_password
DATABASE_URL=postgresql://quizup_user:quizup_password@postgres:5432/quizup_db
```

#### Worker Pool
```
MIN_WORKERS=1              # Localhost: 1, Network: 2, Self-hosted: 20
MAX_WORKERS=2              # Localhost: 2, Network: 4, Self-hosted: 1000
MAX_MATCHES_PER_WORKER=3   # Localhost: 3, Network: 5, Self-hosted: 10
```

#### API URLs
```
# Localhost
VITE_API_BASE_URL=http://localhost:8090
VITE_WEBSOCKET_URL=ws://localhost:3001

# Network (auto-detected)
VITE_API_BASE_URL=http://{NETWORK_IP}:8090
VITE_WEBSOCKET_URL=ws://{NETWORK_IP}:3001

# Self-hosted
VITE_API_BASE_URL=https://api.quizdash.dpdns.org
VITE_WEBSOCKET_URL=wss://match.quizdash.dpdns.org
```

---

## 🐳 Docker Services

### Services Deployed

#### PostgreSQL
- **Port**: 5432
- **Database**: quizup_db
- **User**: quizup_user
- **Purpose**: Main database

#### Redis
- **Port**: 6379
- **Purpose**: Caching and session storage

#### Backend API
- **Port**: 3000
- **Purpose**: REST API server
- **Scaling**: 1-1000 workers (mode dependent)

#### Match Server
- **Port**: 3001
- **Purpose**: WebSocket server for real-time matches
- **Scaling**: 1-1000 workers (mode dependent)

#### Frontend
- **Port**: 5173 (dev) / 80 (prod)
- **Purpose**: React application
- **Modes**: Development or Production build

#### Nginx
- **Port**: 8090
- **Purpose**: Reverse proxy and load balancer

#### Adminer
- **Port**: 8080
- **Purpose**: Database management UI

---

## 🚀 Deployment Steps

### Step 1: Clone Repository
```bash
git clone <repo-url>
cd Capstone-Project
```

### Step 2: Choose Mode
- **Localhost**: Single machine development
- **Network**: Multiple machines on LAN
- **Self-hosted**: Production with Cloudflare

### Step 3: Run Deployment
```bash
# Windows
deploy.bat {mode}

# Linux/Mac
./deploy.sh {mode}
```

### Step 4: Wait for Services
- Localhost: ~10 seconds
- Network: ~10 seconds
- Self-hosted: ~15 seconds

### Step 5: Verify Deployment
```bash
# Check services
docker ps

# Health check
curl http://localhost:3000/health

# View logs
docker-compose logs -f backend
```

### Step 6: Access Application
- Open browser to the provided URL
- Create account or login
- Start playing!

---

## 🧪 Testing

### Stress Test
```bash
# Test with 10 matches
node tests/stress-test-bots-small.js 10

# Test with 50 matches
node tests/stress-test-bots-small.js 50

# Test with 100 matches
node tests/stress-test-bots-small.js 100
```

### Health Checks
```bash
# Backend
curl http://localhost:3000/health

# Match Server
curl http://localhost:3001/health

# Database
psql -h localhost -U quizup_user -d quizup_db -c "SELECT 1"

# Redis
redis-cli ping
```

---

## 📊 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f matchserver
docker-compose logs -f frontend

# Self-hosted
docker service logs -f quizup_backend
```

### Check Resource Usage
```bash
# Docker stats
docker stats

# Specific container
docker stats quizup_backend
```

### Database Queries
```bash
# Connect to database
psql -h localhost -U quizup_user -d quizup_db

# List tables
\dt

# Check users
SELECT * FROM users LIMIT 5;

# Check matches
SELECT * FROM matches LIMIT 5;
```

---

## 🔄 Switching Modes

### From Localhost to Network
```bash
# Stop localhost
docker-compose down

# Deploy network
./deploy.sh network
```

### From Network to Self-Hosted
```bash
# Stop network
docker-compose down

# Deploy self-hosted
./deploy.sh self-hosted

# Start tunnel
cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139
```

---

## 🆘 Troubleshooting

### Services Won't Start
```bash
# Check Docker daemon
docker ps

# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache

# Restart services
docker-compose restart
```

### Network Mode Not Working
```bash
# Check network IP
ipconfig (Windows) or ifconfig (Linux/Mac)

# Verify connectivity
ping {NETWORK_IP}

# Check firewall
# Ensure ports 3000, 3001, 5173, 8090 are open
```

### Database Connection Error
```bash
# Check database
docker exec quizup_postgres psql -U quizup_user -d quizup_db -c "SELECT 1"

# Check connection string
echo $DATABASE_URL

# Restart database
docker-compose restart postgres
```

### Self-Hosted Issues
```bash
# Check tunnel
cloudflared tunnel list

# Check tunnel status
cloudflared tunnel info 260b3937-da0e-4802-bd8b-219e47806139

# View tunnel logs
cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139

# Check stack
docker stack services quizup
```

---

## 📞 Support

### Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Change port in `.env` or stop conflicting service |
| Database won't connect | Check DATABASE_URL, restart postgres |
| Frontend can't reach API | Check CORS_ORIGIN, verify API is running |
| WebSocket connection fails | Check VITE_WEBSOCKET_URL, verify matchserver is running |
| Network mode auto-detect fails | Manually set NETWORK_IP in `.env.network` |

### Useful Commands

```bash
# Stop all services
docker-compose down

# Remove all data
docker-compose down -v

# Rebuild everything
docker-compose build --no-cache

# View specific logs
docker-compose logs -f backend

# Execute command in container
docker exec quizup_backend npm run seed

# Access database
docker exec -it quizup_postgres psql -U quizup_user -d quizup_db
```

---

## 🎓 Learning Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Guide](https://docs.docker.com/compose/)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

---

## ✅ Deployment Checklist

### Before Deployment
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] Git repository cloned
- [ ] Sufficient disk space (5GB+)
- [ ] Sufficient RAM (2GB+ minimum)

### Localhost Deployment
- [ ] Run `deploy.bat localhost` (Windows) or `./deploy.sh localhost` (Linux/Mac)
- [ ] Wait for services to start
- [ ] Access http://localhost:5173
- [ ] Create account and test

### Network Deployment
- [ ] Run `deploy.bat network` or `./deploy.sh network`
- [ ] Note the network IP
- [ ] Share URL with friends
- [ ] Test from multiple devices

### Self-Hosted Deployment
- [ ] Cloudflare account setup
- [ ] Domain configured in Cloudflare
- [ ] Tunnel created
- [ ] `cloudflared` CLI installed
- [ ] Run `deploy.bat self-hosted` or `./deploy.sh self-hosted`
- [ ] Start tunnel: `cloudflared tunnel run <tunnel-id>`
- [ ] Access https://quizdash.dpdns.org

---

**You're all set! Happy deploying! 🚀**
