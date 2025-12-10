# 🚀 Production Deployment: 2000 Concurrent Matches

Guide to actually deploy and run 2000 concurrent matches (4000 players) in production.

---

## 🎯 Two Deployment Options

### Option A: Single Powerful Server (Simpler)
- **1 server** with 400 workers
- **Capacity:** 2000 matches (4000 players)
- **Cost:** Higher per server, but simpler setup
- **Best for:** Quick deployment, lower complexity

### Option B: Multi-Server Cluster (Recommended)
- **10 servers** with 40 workers each
- **Capacity:** 2000 matches (4000 players)
- **Cost:** Lower per server, horizontal scaling
- **Best for:** Production reliability, fault tolerance

---

## 📋 Option A: Single Server Setup

### Step 1: Server Requirements

**Hardware:**
- CPU: 32 cores (64 vCPUs)
- RAM: 32GB
- Disk: 100GB NVMe SSD
- Network: 10 Gbps
- OS: Ubuntu 22.04 LTS

**Example Cloud Instances:**
- AWS: `c6i.16xlarge` (64 vCPUs, 128GB RAM)
- Azure: `F64s_v2` (64 vCPUs, 128GB RAM)
- GCP: `n2-highcpu-64` (64 vCPUs, 64GB RAM)

### Step 2: System Configuration

```bash
# 1. Increase system limits
sudo nano /etc/security/limits.conf
```

Add:
```
* soft nofile 100000
* hard nofile 100000
* soft nproc 100000
* hard nproc 100000
```

```bash
# 2. Increase network limits
sudo nano /etc/sysctl.conf
```

Add:
```
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
fs.file-max = 2097152
```

Apply:
```bash
sudo sysctl -p
```

### Step 3: PostgreSQL Configuration

```bash
sudo nano /var/lib/postgresql/data/postgresql.conf
```

```conf
# Connection Settings
max_connections = 500
superuser_reserved_connections = 10

# Memory Settings
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 32MB
maintenance_work_mem = 2GB

# Checkpoint Settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 4GB

# Query Planning
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200

# Write Performance
synchronous_commit = off  # For better write performance (slightly less safe)
```

Restart PostgreSQL:
```bash
docker-compose restart postgres
```

### Step 4: Redis Configuration

```bash
sudo nano /etc/redis/redis.conf
```

```conf
# Memory
maxmemory 8gb
maxmemory-policy allkeys-lru

# Network
maxclients 10000
timeout 300
tcp-backlog 511

# Performance
tcp-keepalive 300
```

Restart Redis:
```bash
docker-compose restart redis
```

### Step 5: Deploy Application

```bash
# 1. Copy production config
cp .env.production.full .env

# 2. Edit with your values
nano .env

# Set:
MAX_WORKERS=400
MIN_WORKERS=100
DB_POOL_MAX=200
REDIS_POOL_MAX=1000
NODE_OPTIONS=--max-old-space-size=8192

# 3. Build and deploy
docker-compose build
docker-compose up -d

# 4. Verify
docker-compose ps
docker logs -f quizup-matchserver
```

### Step 6: Monitor

```bash
# Watch system resources
htop

# Monitor Docker stats
docker stats

# Check match server metrics
curl http://localhost:3001/metrics | grep matchserver_active_matches

# Real-time dashboard
cd tests && npm run monitor
```

---

## 📋 Option B: Multi-Server Cluster (10 Servers)

### Architecture

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (nginx/HAProxy)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐         ┌────▼────┐
   │Server 1 │          │Server 2 │   ...   │Server 10│
   │40 workers│         │40 workers│         │40 workers│
   │200 matches│        │200 matches│        │200 matches│
   └────┬────┘          └────┬────┘         └────┬────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Shared Services│
                    │  - PostgreSQL   │
                    │  - Redis        │
                    └─────────────────┘
```

### Step 1: Load Balancer Setup

**nginx configuration:**

```nginx
upstream matchserver_backend {
    # IP hash for sticky sessions (WebSocket requirement)
    ip_hash;
    
    server 10.0.1.10:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.13:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.14:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.15:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.16:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.17:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.18:3001 max_fails=3 fail_timeout=30s;
    server 10.0.1.19:3001 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name ws.quizdash.dpdns.org;
    
    location / {
        proxy_pass http://matchserver_backend;
        proxy_http_version 1.1;
        
        # WebSocket upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 600s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://matchserver_backend/health;
        access_log off;
    }
}
```

### Step 2: Database Setup (Shared)

**Single PostgreSQL server** (high-spec):
- CPU: 16 cores
- RAM: 64GB
- Disk: 500GB SSD
- Configure as shown in Option A

**Or use managed database:**
- AWS RDS: `db.r6g.4xlarge`
- Azure Database: `GP_Gen5_16`
- Google Cloud SQL: `db-highmem-16`

### Step 3: Redis Setup (Shared)

**Single Redis server** (high-spec):
- CPU: 8 cores
- RAM: 32GB
- Configure as shown in Option A

**Or use managed Redis:**
- AWS ElastiCache: `cache.r6g.2xlarge`
- Azure Cache: `P3`
- Google Cloud Memorystore: `M5`

### Step 4: Deploy Each Match Server

**Per Server (10 instances):**

```bash
# 1. Set server-specific config
cp .env.production.full .env
nano .env

# Edit:
MAX_WORKERS=40
MIN_WORKERS=10
SERVER_ID=server-1  # Change for each server: server-1 to server-10
DATABASE_URL=postgresql://user:pass@shared-db-server:5432/quizdb
REDIS_URL=redis://shared-redis-server:6379

# 2. Deploy
docker-compose up -d

# 3. Verify
docker-compose ps
curl http://localhost:3001/health
```

### Step 5: Test Load Balancing

```bash
# From load balancer
for i in {1..10}; do
  curl http://10.0.1.1$i:3001/health
done

# Should see all servers responding
```

---

## 🔍 Pre-Production Checklist

### Database Optimization

```sql
-- 1. Create indexes for performance
CREATE INDEX CONCURRENTLY idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_quizzes_active ON quizzes("isActive");
CREATE INDEX CONCURRENTLY idx_quiz_questions_quiz ON quiz_questions("quizId");
CREATE INDEX CONCURRENTLY idx_matches_status ON matches(status);
CREATE INDEX CONCURRENTLY idx_matches_created ON matches("createdAt");

-- 2. Analyze tables
ANALYZE users;
ANALYZE quizzes;
ANALYZE quiz_questions;
ANALYZE matches;

-- 3. Vacuum
VACUUM ANALYZE;
```

### Redis Optimization

```bash
# 1. Warm up cache with frequently used data
node scripts/warm-cache.js

# 2. Test Redis connection
redis-cli ping

# 3. Check memory
redis-cli INFO memory
```

### Application Optimization

```bash
# 1. Build production Docker images
docker-compose build --no-cache

# 2. Test with small load first
cd tests
npm run stress:small

# 3. Gradually increase
npm run stress:medium
npm run stress:large
```

---

## 📊 Monitoring Setup

### 1. Prometheus & Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### 2. Alerts Configuration

```yaml
# prometheus-alerts.yml
groups:
  - name: matchserver
    interval: 30s
    rules:
      - alert: HighActiveMatches
        expr: matchserver_active_matches_total > 1800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High number of active matches"
      
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
      
      - alert: HighMemoryUsage
        expr: matchserver_memory_usage_bytes > 7000000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
```

---

## 🚀 Deployment Day

### Pre-Launch (T-1 hour)

```bash
# 1. Verify all services healthy
docker-compose ps

# 2. Check database connections
docker exec quizup-postgres psql -U postgres -d quizdb -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 3. Check Redis
docker exec quizup-redis redis-cli INFO | grep connected_clients

# 4. Verify metrics endpoint
curl http://localhost:3001/metrics

# 5. Run small test
cd tests && npm run stress:small
```

### Launch (T-0)

```bash
# 1. Start monitoring
cd tests && npm run monitor

# 2. Announce system ready
echo "System ready for 2000 matches!"

# 3. Monitor logs
docker logs -f quizup-matchserver
```

### Post-Launch Monitoring

```bash
# Watch active matches
watch -n 5 'curl -s http://localhost:3001/metrics | grep matchserver_active_matches'

# Watch memory
watch -n 5 'docker stats --no-stream quizup-matchserver'

# Watch error rate
watch -n 10 'docker logs --tail 50 quizup-matchserver | grep -i error | wc -l'
```

---

## ⚠️ Troubleshooting Production Issues

### Issue: Matches not starting

```bash
# Check worker count
curl -s http://localhost:3001/metrics | grep matchserver_active_workers

# Check Redis
redis-cli DBSIZE
redis-cli KEYS "match:*" | wc -l

# Restart if needed
docker-compose restart matchserver
```

### Issue: High memory usage

```bash
# Check memory
docker stats --no-stream quizup-matchserver

# Check for memory leaks
docker exec quizup-matchserver node --expose-gc -e "gc(); console.log(process.memoryUsage())"

# Restart workers (graceful)
docker-compose restart matchserver
```

### Issue: Database connection pool exhausted

```sql
-- Check active connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < NOW() - INTERVAL '10 minutes';
```

### Issue: Redis connection issues

```bash
# Check connections
redis-cli INFO clients

# Check slow queries
redis-cli SLOWLOG GET 10

# Restart if needed
docker-compose restart redis
```

---

## 📈 Scaling Beyond 2000 Matches

### To 5000 Matches (10,000 Players):

**Option A: Vertical Scaling**
- Upgrade to 64-core server
- 1000 workers × 5 matches = 5000 matches
- 128GB RAM

**Option B: Horizontal Scaling (Recommended)**
- Deploy 25 servers (40 workers each)
- Each handles 200 matches
- Total: 5000 matches

### To 10,000 Matches (20,000 Players):

**Horizontal Scaling Only:**
- Deploy 50 servers
- Use Kubernetes for orchestration
- Auto-scaling based on load
- Multi-region deployment

---

## ✅ Success Metrics

### Target Performance:
- **Match Creation:** < 300ms (P95)
- **Match Join:** < 200ms (P95)
- **Answer Submit:** < 100ms (P95)
- **Error Rate:** < 1%
- **Uptime:** > 99.9%

### Capacity Targets:
- **Active Matches:** 2000 concurrent
- **Connected Players:** 4000 concurrent
- **Match Creation Rate:** > 50/second
- **Memory Usage:** < 70% of available
- **CPU Usage:** < 80% average

---

## 🎉 You're Production Ready!

Follow this guide to deploy your system capable of handling **2000 concurrent matches** with **4000 players**!

**Remember:**
- Start with stress testing
- Monitor everything
- Scale gradually
- Have rollback plan ready

Good luck with your production deployment! 🚀
