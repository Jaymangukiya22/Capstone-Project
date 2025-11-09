# 🚀 QuizDash Stress Testing Suite

Comprehensive stress testing tools for simulating **2000 concurrent matches (4000 players)**.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Testing Scenarios](#testing-scenarios)
- [Monitoring](#monitoring)
- [Interpreting Results](#interpreting-results)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### 1. Install Dependencies

```bash
cd tests
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Verify Database Connection

Ensure PostgreSQL is running and accessible:

```bash
# Test connection
psql -d quizdb -c "SELECT COUNT(*) FROM users;"
```

## 🚀 Quick Start

### Step 1: Seed Test Users

Create 2000 test users in the database:

**Option A: Using SQL (Faster)**
```bash
# From project root
docker exec -i quizup-postgres psql -U postgres -d quizdb < tests/seed-2000-users.sql
```

**Option B: Using Node.js**
```bash
cd tests
npm run seed
```

### Step 2: Start the Application

Ensure all services are running:

```bash
# From project root
docker-compose up -d
```

Verify services:
- Backend: http://localhost:8090/health
- Match Server: http://localhost:3001/health
- Frontend: http://localhost:5173

### Step 3: Run Stress Test

Choose a test scenario:

```bash
cd tests

# Small test (10 matches = 20 players)
npm run stress:small

# Medium test (100 matches = 200 players)
npm run stress:medium

# Large test (500 matches = 1000 players)
npm run stress:large

# FULL test (2000 matches = 4000 players)
npm run stress:full
```

### Step 4: Monitor in Real-Time

Open a separate terminal for live monitoring:

```bash
cd tests
npm run monitor
```

## 🎯 Testing Scenarios

### 1. Small Test (Warmup)

```bash
npm run stress:small
```

- **Matches:** 10
- **Players:** 20
- **Duration:** ~5 minutes
- **Purpose:** Verify setup and identify immediate issues

### 2. Medium Test (Development)

```bash
npm run stress:medium
```

- **Matches:** 100
- **Players:** 200
- **Duration:** ~15 minutes
- **Purpose:** Test system under moderate load

### 3. Large Test (Staging)

```bash
npm run stress:large
```

- **Matches:** 500
- **Players:** 1000
- **Duration:** ~30 minutes
- **Purpose:** Approach production load

### 4. Full Test (Production Simulation)

```bash
npm run stress:full
```

- **Matches:** 2000
- **Players:** 4000
- **Duration:** ~60-90 minutes
- **Purpose:** Full production capacity test

## 📊 Monitoring

### Real-Time Dashboard

```bash
npm run monitor
```

Displays:
- **Active Matches:** Current concurrent matches
- **Connected Players:** Total players in matches
- **Worker Stats:** Worker pool utilization
- **System Resources:** Memory usage, uptime
- **Capacity Analysis:** Load percentage, remaining capacity

### Prometheus Metrics

Access raw metrics: http://localhost:3001/metrics

Key metrics:
- `matchserver_active_matches_total` - Active matches
- `matchserver_connected_players_total` - Connected players
- `matchserver_matches_created_total` - Total matches created
- `matchserver_memory_usage_bytes` - Memory consumption
- `http_request_duration_ms` - API latency

### Grafana Dashboard

If Grafana is configured: http://localhost:3000

## 📈 Interpreting Results

### Stress Test Output

```
📊 FINAL STRESS TEST RESULTS
════════════════════════════════════════

⏱️  Total Duration: 3600.5s

📊 Match Statistics:
   ✅ Matches Created: 2000
   ✅ Matches Joined: 2000
   ✅ Matches Started: 1998
   ✅ Matches Completed: 1995
   ❌ Errors: 5

🎯 API Endpoint Performance (Bottleneck Analysis):

┌──────────────────────────────────────────────────────────────────────────────┐
│ Endpoint                            │  Calls │  Avg(ms) │  P95(ms) │ Errors │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🔴🐌 POST /api/friend-matches        │   2000 │   850.25 │  1200.50 │     12 │
│ 🟡⚠️  GET /api/friend-matches/join   │   2000 │   320.15 │   450.20 │      3 │
│ 🟢⚡ POST /api/auth/login            │   4000 │   120.45 │   180.30 │      0 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Status Indicators

**Performance:**
- 🟢⚡ **Excellent** - < 200ms average
- 🟡⚠️  **Warning** - 200-500ms average
- 🔴🐌 **Slow** - > 500ms average

**Errors:**
- 🟢 **Healthy** - < 1% error rate
- 🟡 **Warning** - 1-5% error rate
- 🔴 **Critical** - > 5% error rate

### Bottleneck Analysis

#### 1. High Latency Endpoints

```
🐌 POST /api/friend-matches: High latency (850ms avg, 1200ms p95)
```

**Possible Causes:**
- Database queries not optimized
- No connection pooling
- Synchronous operations blocking
- Missing indexes

**Solutions:**
- Add database indexes on frequently queried columns
- Implement connection pooling
- Use async/await properly
- Cache frequently accessed data

#### 2. High Error Rate

```
🔴 GET /api/friend-matches/join/:code: High error rate (8.5%)
```

**Possible Causes:**
- Race conditions in match joining
- Insufficient error handling
- Database deadlocks
- Redis connection issues

**Solutions:**
- Add proper transaction handling
- Implement retry logic
- Use distributed locks (Redis)
- Increase connection pool size

### Success Criteria

✅ **Passed if:**
- < 3% error rate across all endpoints
- P95 latency < 500ms for critical paths
- All 2000 matches complete
- Memory usage stable (< 8GB)
- No server crashes

⚠️ **Needs Optimization if:**
- 3-10% error rate
- P95 latency 500-1000ms
- Some matches timeout
- Memory usage growing

❌ **Failed if:**
- > 10% error rate
- P95 latency > 1000ms
- Majority of matches fail
- Server crashes

## 🔍 Troubleshooting

### Issue: "Unable to fetch metrics"

**Solution:**
```bash
# Verify match server is running
curl http://localhost:3001/health

# Check Docker logs
docker logs quizup-matchserver
```

### Issue: "Database connection failed"

**Solution:**
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d quizdb -c "SELECT 1;"

# Check connection string in .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/quizdb
```

### Issue: "Too many open files"

**Solution (Linux/Mac):**
```bash
# Increase file descriptor limit
ulimit -n 10000
```

**Solution (Windows):**
```bash
# Run with fewer concurrent matches
node stress-test-matches.js 500
```

### Issue: "Playwright browser crashes"

**Solution:**
```bash
# Reinstall browsers
npx playwright install --force chromium

# Increase system resources for Docker
# Docker Desktop → Settings → Resources → Memory: 8GB+
```

### Issue: "High memory usage"

**Symptoms:**
- Memory > 8GB
- Slow performance
- Browser crashes

**Solutions:**
1. Reduce batch size in stress test
2. Increase Docker memory allocation
3. Add garbage collection flags:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" node stress-test-matches.js 1000
   ```

### Issue: "Rate limiting errors"

**Solution:**
Update `.env`:
```bash
RATE_LIMIT_MAX_REQUESTS=5000
RATE_LIMIT_WINDOW_MS=60000
```

## 📝 Test User Credentials

All 2000 test users have:

- **Username:** `stresstest_user_1` to `stresstest_user_2000`
- **Email:** `stresstest_1@test.com` to `stresstest_2000@test.com`
- **Password:** `password123`

## 🎮 Quiz IDs for Testing

Use these quiz IDs (102-151):

```javascript
[102, 103, 104, 105, 106, 107, 108, 109, 110, 111,
 112, 113, 114, 115, 116, 117, 118, 119, 120, 121,
 122, 123, 124, 125, 126, 127, 128, 129, 130, 131,
 132, 133, 134, 135, 136, 137, 138, 139, 140, 141,
 142, 143, 144, 145, 146, 147, 148, 149, 150, 151]
```

## 🔧 Advanced Configuration

### Environment Variables

```bash
# Test configuration
BASE_URL=http://localhost:5173
API_URL=http://localhost:8090
WS_URL=ws://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/quizdb

# Batch size (matches created simultaneously)
BATCH_SIZE=50

# Think time (ms between actions)
MIN_THINK_TIME=2000
MAX_THINK_TIME=8000
```

### Custom Test

```javascript
const { runStressTest } = require('./stress-test-matches');

// Custom configuration
process.env.BASE_URL = 'https://quizdash.dpdns.org';
process.env.API_URL = 'https://api.quizdash.dpdns.org';

// Run 1000 matches
runStressTest(1000);
```

## 📚 Additional Tools

### Cleanup Script

Remove all test matches and users:

```bash
# Remove test users
psql -d quizdb -c "DELETE FROM users WHERE username LIKE 'stresstest_user_%';"

# Clear Redis cache
docker exec quizup-redis redis-cli FLUSHALL
```

### Export Metrics

```bash
# Save metrics to file
curl http://localhost:3001/metrics > metrics-$(date +%Y%m%d-%H%M%S).txt
```

## 🎯 Performance Targets

For 2000 concurrent matches:

| Metric | Target | Maximum |
|--------|--------|---------|
| Match Creation | < 300ms | 500ms |
| Match Join | < 200ms | 400ms |
| Question Load | < 150ms | 300ms |
| Answer Submit | < 100ms | 250ms |
| Error Rate | < 1% | 3% |
| Memory Usage | < 6GB | 8GB |
| CPU Usage | < 70% | 85% |

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs: `docker-compose logs -f`
3. Check metrics dashboard: http://localhost:3001/metrics
4. Monitor resource usage: `docker stats`

## 🚀 Next Steps

After successful stress test:

1. ✅ Optimize identified bottlenecks
2. ✅ Add autoscaling based on load
3. ✅ Implement caching strategies
4. ✅ Set up production monitoring
5. ✅ Configure alerts for high load

---

**Happy Stress Testing! 🎯**
