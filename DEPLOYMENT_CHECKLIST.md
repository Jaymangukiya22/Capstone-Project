# 🚀 QuizUP Production Deployment Checklist

Complete step-by-step guide to deploy and test your QuizUP application across all environments.

---

## 📋 Pre-Deployment Checklist

### 1. Environment Setup

- [ ] **Docker & Docker Swarm Installed**

  ```bash
  docker --version
  docker swarm init  # If not already initialized
  ```

- [ ] **Node.js & NPM Installed** (v18+ recommended)

  ```bash
  node --version
  npm --version
  ```

- [ ] **Cloudflared Installed** (for hosted environment)

  ```bash
  cloudflared --version
  ```

- [ ] **Environment Variables Configured**
  - Check `.env` files in backend and frontend
  - Verify JWT_SECRET is set
  - Confirm database credentials

### 2. Infrastructure Updated for High Performance

- [x] **nginx.conf** - Rate limits increased (50K→10K r/s, burst 100→1000)
- [x] **docker-compose.yml** - Resource limits via environment variables
- [x] **backend/Dockerfile** - System limits configured (65536 FDs, 32768 procs)
- [x] **Environment files** - Scaling configs for 150-3K+ users
- [x] **Rate limits** - 50K (localhost), 75K (network), 500K (production)

### 3. Code Fixes Applied

- [x] **WebSocket Event Handling Fixed** (MatchLobby.tsx)
- [x] **Player Data Structure Standardized** (FriendMatchInterface.tsx)
- [x] **Ready State Management Fixed** (matchServer-enhanced.ts)
- [x] **Match Connection & State Restoration Fixed**

---

## 🏠 Environment 1: Localhost Deployment

### Step 1: Build Docker Images

```bash
# Navigate to project root
cd /path/to/Capstone-Project

# Build all images
docker-compose build

# Verify images are created
docker images | grep quizup
```

### Step 2: Start Services (Localhost)

```bash
# Option A: Using docker-compose (recommended for localhost)
docker-compose up -d

# Option B: Using deployment script
node deploy.js localhost up

# Verify services are running
docker-compose ps
```

### Step 3: Verify Localhost Deployment

```bash
# Check backend health
curl http://localhost:3000/api/health

# Check match server health
curl http://localhost:3001/health

# Check frontend
curl http://localhost:5173

# View logs
docker-compose logs -f backend
docker-compose logs -f matchserver
```

### Step 4: Test Localhost Match Creation

```bash
# Run stress tests
cd tests
npm install
node run-stress-tests.js localhost --matches=5 --visible

# Or use npm script
npm run run:localhost
```

**Expected Results:**

- ✅ All services running
- ✅ Backend accessible at `http://localhost:3000`
- ✅ Match server at `http://localhost:3001`
- ✅ Frontend at `http://localhost:5173`
- ✅ Friend matches working end-to-end

---

## 🌐 Environment 2: Network Deployment (LAN Access)

### Step 1: Get Your Network IP

```bash
# Windows
ipconfig | findstr IPv4

# Linux/Mac
ifconfig | grep "inet "
# or
ip addr show

# Example: 192.168.1.100
```

### Step 2: Update Environment Variables

```bash
# Set network IP
export NETWORK_IP=192.168.1.100  # Replace with your actual IP

# Or update .env.network file
echo "NETWORK_IP=192.168.1.100" > .env.network
```

### Step 3: Deploy to Network

```bash
# Option A: Using deployment script
node deploy.js network up

# Option B: Using docker-compose with network profile
docker-compose -f docker-compose.yml -f docker-compose.network.yml up -d

# Verify services
docker-compose ps
```

### Step 4: Configure CORS for Network Access

Update `backend/.env`:

```env
CORS_ORIGIN=http://192.168.1.100:5173,http://192.168.1.100:3000
NETWORK_IP=192.168.1.100
```

Update `backend/src/matchServer-enhanced.ts` CORS settings to allow network IP.

### Step 5: Test Network Deployment

```bash
# From another device on the same network
curl http://192.168.1.100:3000/api/health
curl http://192.168.1.100:3001/health

# Run stress tests
cd tests
node run-stress-tests.js network --network-ip=192.168.1.100 --matches=5
```

**Expected Results:**

- ✅ Services accessible from other devices on LAN
- ✅ Frontend at `http://YOUR_IP:5173`
- ✅ Backend at `http://YOUR_IP:3000`
- ✅ Match server at `http://YOUR_IP:3001`
- ✅ Cross-device friend matches working

---

## ☁️ Environment 3: Production (Cloudflare Tunnel)

### Step 1: Initialize Docker Swarm

```bash
# Initialize swarm (if not already done)
docker swarm init

# Verify swarm status
docker node ls
```

### Step 2: Create Required Secrets

```bash
# Create JWT secret
echo "7a0b42e9df5856f7cfe0094361f65630" | docker secret create quizup_jwt_secret -

# Create DB password secret
echo "quizup_password" | docker secret create quizup_db_password -
```

### Step 3: Create Prometheus Config

```bash
# Create prometheus config
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']

  - job_name: 'matchserver'
    static_configs:
      - targets: ['matchserver:3001']
EOF

# Create config in Docker
docker config create quizup_prometheus_config prometheus.yml
```

### Step 4: Create nginx.conf

```bash
# Create nginx configuration
cat > nginx.conf << 'EOF'
events {
    worker_connections 4096;
}

http {
    upstream backend {
        least_conn;
        server backend:3000 max_fails=3 fail_timeout=30s;
    }

    upstream matchserver {
        least_conn;
        server matchserver:3001 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 80;
        server_name _;

        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /socket.io/ {
            proxy_pass http://matchserver;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
        }

        location /health {
            proxy_pass http://matchserver/health;
        }

        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
EOF
```

### Step 5: Build Production Images

```bash
# Build images with production tags
docker build -t quizup-backend:latest ./backend
docker build -t quizup-matchserver:latest ./backend
docker build -t quizup-frontend:latest ./Frontend-admin

# Verify images
docker images | grep quizup
```

### Step 6: Deploy Stack

```bash
# Deploy the stack
docker stack deploy -c docker-stack.yml quizup

# Verify deployment
docker stack services quizup
docker stack ps quizup

# Check service logs
docker service logs quizup_backend
docker service logs quizup_matchserver
docker service logs quizup_postgres
docker service logs quizup_redis
```

### Step 7: Setup Cloudflare Tunnel

```bash
# Authenticate with Cloudflare
cloudflared tunnel login

# Create tunnel (if not exists)
cloudflared tunnel create quizup

# Configure tunnel
cat > cloudflare-tunnel.yml << 'EOF'
tunnel: 260b3937-da0e-4802-bd8b-219e47806139
credentials-file: /path/to/260b3937-da0e-4802-bd8b-219e47806139.json

ingress:
  # Frontend
  - hostname: quizdash.dpdns.org
    service: http://localhost:5173

  # Backend API
  - hostname: api.quizdash.dpdns.org
    service: http://localhost:8090

  # Match Server WebSocket
  - hostname: match.quizdash.dpdns.org
    service: http://localhost:8090

  # Catch-all
  - service: http_status:404
EOF

# Start tunnel
cloudflared tunnel run quizup

# Or install as service (Linux)
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Step 8: Configure DNS

In Cloudflare Dashboard:

1. Add CNAME record: `quizdash.dpdns.org` → `260b3937-da0e-4802-bd8b-219e47806139.cfargotunnel.com`
2. Add CNAME record: `api.quizdash.dpdns.org` → `260b3937-da0e-4802-bd8b-219e47806139.cfargotunnel.com`
3. Add CNAME record: `match.quizdash.dpdns.org` → `260b3937-da0e-4802-bd8b-219e47806139.cfargotunnel.com`

### Step 9: Verify Production Deployment

```bash
# Check tunnel status
cloudflared tunnel list
cloudflared tunnel info quizup

# Test endpoints
curl https://quizdash.dpdns.org
curl https://api.quizdash.dpdns.org/api/health
curl https://match.quizdash.dpdns.org/health

# Run stress tests
cd tests
node run-stress-tests.js hosted --matches=10
```

**Expected Results:**

- ✅ All services running in Docker Swarm
- ✅ Cloudflare Tunnel active
- ✅ Frontend at `https://quizdash.dpdns.org`
- ✅ Backend at `https://api.quizdash.dpdns.org`
- ✅ Match server at `https://match.quizdash.dpdns.org`
- ✅ SSL certificates working
- ✅ Friend matches working across internet

---

## 🧪 Testing & Validation

### 1. Run Comprehensive Tests

```bash
cd tests

# Test all environments
npm run run:all

# Test with resource monitoring
npm run comprehensive

# Test specific environment with custom matches
node run-stress-tests.js localhost --matches=10 --visible
node run-stress-tests.js network --network-ip=192.168.1.100 --matches=10
node run-stress-tests.js hosted --matches=20
```

### 2. Load Testing (2000 Concurrent Matches)

```bash
# Gradual load increase
node run-stress-tests.js hosted --matches=100
node run-stress-tests.js hosted --matches=500
node run-stress-tests.js hosted --matches=1000
node run-stress-tests.js hosted --matches=2000

# Monitor resources during tests
docker stats
docker service ls
```

### 3. Monitor Services

```bash
# View service logs
docker service logs -f quizup_backend
docker service logs -f quizup_matchserver

# Check service health
docker service ps quizup_backend
docker service ps quizup_matchserver

# Access monitoring dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

---

## 🔧 Troubleshooting

### Issue: Services Not Starting

```bash
# Check service status
docker stack services quizup

# Check service logs
docker service logs quizup_backend --tail 100
docker service logs quizup_matchserver --tail 100

# Check for errors
docker service ps quizup_backend --no-trunc
```

### Issue: Database Connection Failed

```bash
# Check postgres service
docker service logs quizup_postgres

# Verify database is accessible
docker exec -it $(docker ps -q -f name=quizup_postgres) psql -U quizup_user -d quizup_db

# Check connection from backend
docker exec -it $(docker ps -q -f name=quizup_backend) sh
nc -zv postgres 5432
```

### Issue: Redis Connection Failed

```bash
# Check redis service
docker service logs quizup_redis

# Test redis connection
docker exec -it $(docker ps -q -f name=quizup_redis) redis-cli ping
```

### Issue: WebSocket Connection Failed

```bash
# Check match server logs
docker service logs quizup_matchserver --tail 100

# Verify CORS settings
# Check backend/src/matchServer-enhanced.ts corsOptions

# Test WebSocket connection
wscat -c ws://localhost:3001
```

### Issue: Cloudflare Tunnel Not Working

```bash
# Check tunnel status
cloudflared tunnel list
cloudflared tunnel info quizup

# Restart tunnel
sudo systemctl restart cloudflared

# Check tunnel logs
sudo journalctl -u cloudflared -f

# Verify DNS records in Cloudflare Dashboard
```

---

## 📊 Performance Optimization

### 1. Scale Services

```bash
# Scale backend
docker service scale quizup_backend=4

# Scale match server
docker service scale quizup_matchserver=6

# Scale nginx
docker service scale quizup_nginx=3

# Verify scaling
docker service ls
```

### 2. Monitor Resource Usage

```bash
# Real-time stats
docker stats

# Service resource usage
docker service ps quizup_backend
docker service ps quizup_matchserver

# Check node resources
docker node ls
```

### 3. Optimize Database

```bash
# Connect to postgres
docker exec -it $(docker ps -q -f name=quizup_postgres) psql -U quizup_user -d quizup_db

# Check connections
SELECT count(*) FROM pg_stat_activity;

# Optimize queries
ANALYZE;
VACUUM;
```

---

## ✅ Final Verification Checklist

### Localhost Environment

- [ ] Backend health check passes
- [ ] Match server health check passes
- [ ] Frontend loads correctly
- [ ] Can create friend match
- [ ] Can join friend match with code
- [ ] Both players see each other
- [ ] Ready state synchronizes
- [ ] Match starts when both ready
- [ ] Questions load correctly
- [ ] Answers submit successfully

### Network Environment

- [ ] Services accessible from other devices
- [ ] CORS configured correctly
- [ ] Friend matches work cross-device
- [ ] WebSocket connections stable
- [ ] No connection timeouts

### Production Environment

- [ ] Docker Swarm running
- [ ] All services deployed
- [ ] Cloudflare Tunnel active
- [ ] DNS records configured
- [ ] SSL certificates working
- [ ] All endpoints accessible via HTTPS
- [ ] Friend matches work over internet
- [ ] Load testing passes (2000 matches)
- [ ] Monitoring dashboards accessible
- [ ] Logs are being collected

---

## 🎯 Quick Commands Reference

```bash
# Start localhost
docker-compose up -d

# Start network
node deploy.js network up

# Deploy production
docker stack deploy -c docker-stack.yml quizup

# Start Cloudflare Tunnel
cloudflared tunnel run quizup

# Run tests
cd tests && npm run run:all

# View logs
docker-compose logs -f  # localhost
docker service logs -f quizup_backend  # production

# Stop services
docker-compose down  # localhost
docker stack rm quizup  # production

# Scale services
docker service scale quizup_matchserver=6

# Monitor
docker stats
docker service ls
```

---

## 📞 Support & Resources

- **Documentation**: See `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Cloudflare Setup**: See `CLOUDFLARE_TUNNEL_SETUP.md`
- **Load Testing**: See `PRODUCTION-2000-MATCHES-GUIDE.md`
- **Multi-Environment Testing**: See `README-MULTI-ENVIRONMENT-TESTING.md`

---

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ All three environments (localhost, network, production) are working
2. ✅ Friend matches work end-to-end in all environments
3. ✅ WebSocket connections are stable
4. ✅ Player synchronization works correctly
5. ✅ Load tests pass for 2000 concurrent matches
6. ✅ Monitoring shows healthy metrics
7. ✅ No connection timeouts or errors
8. ✅ SSL certificates valid (production)
9. ✅ Services auto-recover from failures
10. ✅ Performance meets requirements (<100ms response time)

**Congratulations! Your QuizUP application is production-ready! 🚀**
