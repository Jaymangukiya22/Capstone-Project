# 🎯 Master Stress Test Documentation

> **Complete guide for testing 2000 concurrent matches (4000 players) with QuizDash**

---

## 📚 Documentation Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[Quick Start](#-quick-start-3-steps)** | Get up and running | Start here! |
| **[README.md](./README.md)** | Detailed testing guide | Full documentation |
| **[../STRESS-TEST-GUIDE.md](../STRESS-TEST-GUIDE.md)** | Complete walkthrough | Comprehensive guide |
| **[../STRESS-TEST-SUMMARY.md](../STRESS-TEST-SUMMARY.md)** | What you have | Overview |
| **[../STRESS-TEST-CHECKLIST.md](../STRESS-TEST-CHECKLIST.md)** | Step-by-step | Before/during test |
| **[../STRESS-TEST-ARCHITECTURE.md](../STRESS-TEST-ARCHITECTURE.md)** | System design | Understanding internals |
| **[../STRESS-TEST-COMMANDS.md](../STRESS-TEST-COMMANDS.md)** | Command reference | Quick lookup |

---

## ⚡ Quick Start (3 Steps)

### 1️⃣ Setup (One Time)

```bash
cd tests
setup-stress-test.bat
```

**What this does:**
- ✅ Installs npm packages
- ✅ Installs Playwright browsers
- ✅ Seeds 2000 users to database

**Time:** ~5 minutes

### 2️⃣ Run Test

```bash
npm run stress:small
```

**What this does:**
- ✅ Tests 10 matches (20 players)
- ✅ Collects performance metrics
- ✅ Identifies bottlenecks

**Time:** ~5 minutes

### 3️⃣ Monitor (Optional)

**Open second terminal:**
```bash
cd tests
npm run monitor
```

**What this shows:**
- ✅ Active matches count
- ✅ Connected players
- ✅ System resources
- ✅ Real-time updates

---

## 🎮 Test Scenarios

| Command | Matches | Players | Duration | Use Case |
|---------|---------|---------|----------|----------|
| `npm run stress:small` | 10 | 20 | 5 min | ✅ **Start here** |
| `npm run stress:medium` | 100 | 200 | 15 min | Development |
| `npm run stress:large` | 500 | 1,000 | 30 min | Pre-production |
| `npm run stress:full` | 2,000 | 4,000 | 90 min | Production test |

---

## 📊 What You Get

### Performance Report

```
🎯 API Endpoint Performance (Bottleneck Analysis):

┌────────────────────────────────────────────────────────┐
│ Endpoint                  │ Avg(ms) │ P95(ms) │ Status │
├────────────────────────────────────────────────────────┤
│ POST /api/auth/login      │  95.2   │  140.5  │ 🟢⚡    │
│ POST /api/friend-matches  │ 245.8   │  380.2  │ 🟡⚠️     │
│ GET  /friend-matches/join │ 125.4   │  195.8  │ 🟢⚡    │
└────────────────────────────────────────────────────────┘

⚠️  BOTTLENECKS DETECTED:
   🟡 POST /api/friend-matches: Approaching slow (245ms avg)

💡 Recommendations:
   ✅ Add database indexes on quizId, userId
   ✅ Implement Redis caching for quiz data
   ✅ Optimize connection pooling
```

### Match Statistics

```
📊 Match Statistics:
   ✅ Matches Created: 2000
   ✅ Matches Joined: 2000
   ✅ Matches Started: 1998
   ✅ Matches Completed: 1995
   ❌ Errors: 5 (0.25%)
```

### Real-Time Dashboard

```
╔═══════════════════════════════════════════════╗
║     QuizDash Real-Time Match Monitoring      ║
╚═══════════════════════════════════════════════╝

Active Matches:      1,234
Connected Players:   2,468
Server Uptime:       45.3 min
Memory Usage:        4.2 GB
Worker Utilization:  80%

Capacity: ████████████████░░░░░░ 61.7% (1234/2000)
```

---

## 🎯 Success Criteria

### ✅ Passing Test

- Match completion > 95%
- Error rate < 3%
- P95 latency < 500ms
- No server crashes
- Memory stable < 8GB

### ⚠️ Needs Optimization

- Match completion 85-95%
- Error rate 3-10%
- P95 latency 500-1000ms
- Memory growing slowly

### ❌ Failing

- Match completion < 85%
- Error rate > 10%
- P95 latency > 1000ms
- Server crashes
- Memory > 10GB

---

## 🔧 Common Issues & Fixes

### Issue: Test won't start

**Check:**
```bash
docker-compose ps          # All services running?
curl http://localhost:8090/health  # Backend OK?
curl http://localhost:3001/health  # Match server OK?
```

**Fix:**
```bash
docker-compose restart
cd tests && setup-stress-test.bat
```

### Issue: High error rate (> 10%)

**Check logs:**
```bash
docker logs --tail 100 quizup-backend
docker logs --tail 100 quizup-matchserver
```

**Common causes:**
- Database connection pool exhausted
- Rate limiting triggered
- Redis connection issues

**Fix:**
```env
# Edit .env
DB_POOL_MAX=150
REDIS_POOL_MAX=750
RATE_LIMIT_MAX_REQUESTS=10000
```

### Issue: Memory crash

**Fix:**
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=8192" npm run stress:full

# Or run smaller test
npm run stress:large  # 500 instead of 2000
```

### Issue: Slow endpoints (> 500ms)

**Solutions:**
- Add database indexes
- Implement Redis caching
- Optimize queries
- Increase connection pools

See test output for specific recommendations.

---

## 📁 Files Overview

### Core Files

```
tests/
├── seed-2000-users.sql           # SQL to create users
├── seed-users.js                 # Node.js user seeder
├── stress-test-matches.js        # Main test (Playwright)
├── real-time-monitor.js          # Live dashboard
├── package.json                  # Dependencies & scripts
└── README.md                     # Detailed docs
```

### Scripts

```
tests/
├── setup-stress-test.bat         # One-time setup
├── quick-test.bat                # Fast 10-match test
└── run-stress-test.bat           # Main runner
```

### Documentation

```
Root/
├── STRESS-TEST-GUIDE.md          # Complete guide
├── STRESS-TEST-SUMMARY.md        # Overview
├── STRESS-TEST-CHECKLIST.md      # Step-by-step
├── STRESS-TEST-ARCHITECTURE.md   # System design
└── STRESS-TEST-COMMANDS.md       # Command reference
```

---

## 🚦 Workflow

### First Time Setup

```bash
1. cd tests
2. setup-stress-test.bat
3. npm run stress:small
4. Review results
```

### Regular Testing

```bash
# Terminal 1
cd tests
npm run stress:medium

# Terminal 2
cd tests
npm run monitor
```

### After Optimization

```bash
# Make changes to code
docker-compose restart backend matchserver

# Wait for restart
sleep 10

# Re-test
cd tests
npm run stress:medium

# Compare results
```

### Production Readiness

```bash
# Run full test
npm run stress:full

# Verify:
# - Completion rate > 85%
# - Error rate < 10%
# - P95 latency < 500ms
# - No crashes
# - Memory stable

# If passed → Deploy!
```

---

## 🎓 Learning Path

### Level 1: Beginner

1. Read [Quick Start](#-quick-start-3-steps)
2. Run `npm run stress:small`
3. View results
4. Read [STRESS-TEST-SUMMARY.md](../STRESS-TEST-SUMMARY.md)

### Level 2: Intermediate

1. Read [STRESS-TEST-GUIDE.md](../STRESS-TEST-GUIDE.md)
2. Run `npm run stress:medium` with monitoring
3. Identify bottlenecks
4. Review [STRESS-TEST-ARCHITECTURE.md](../STRESS-TEST-ARCHITECTURE.md)

### Level 3: Advanced

1. Read [STRESS-TEST-CHECKLIST.md](../STRESS-TEST-CHECKLIST.md)
2. Run `npm run stress:full`
3. Optimize based on results
4. Re-test and compare metrics
5. Use [STRESS-TEST-COMMANDS.md](../STRESS-TEST-COMMANDS.md) for troubleshooting

---

## 🔗 Quick Links

### Services
- Frontend: http://localhost:5173
- Backend: http://localhost:8090
- Match Server: http://localhost:3001
- Metrics: http://localhost:3001/metrics

### Health Checks
- Backend: http://localhost:8090/health
- Match Server: http://localhost:3001/health

### Monitoring
```bash
cd tests && npm run monitor
```

### Commands
```bash
# Run test
npm run stress:small|medium|large|full

# View logs
docker logs -f quizup-backend
docker logs -f quizup-matchserver

# Restart
docker-compose restart
```

---

## 📞 Getting Help

### Check Documentation

1. **Quick issue?** → [STRESS-TEST-COMMANDS.md](../STRESS-TEST-COMMANDS.md)
2. **Setup problem?** → [STRESS-TEST-CHECKLIST.md](../STRESS-TEST-CHECKLIST.md)
3. **Understanding system?** → [STRESS-TEST-ARCHITECTURE.md](../STRESS-TEST-ARCHITECTURE.md)
4. **Optimization?** → [STRESS-TEST-GUIDE.md](../STRESS-TEST-GUIDE.md)

### Debug Steps

```bash
# 1. Check services
docker-compose ps

# 2. Check health
curl http://localhost:8090/health
curl http://localhost:3001/health

# 3. Check logs
docker logs --tail 50 quizup-backend
docker logs --tail 50 quizup-matchserver

# 4. Check resources
docker stats --no-stream

# 5. Try restart
docker-compose restart
```

---

## 🎉 You're Ready!

### Next Steps

1. ✅ Read this document
2. ✅ Run `setup-stress-test.bat`
3. ✅ Run `npm run stress:small`
4. ✅ Monitor with `npm run monitor`
5. ✅ Scale up gradually
6. ✅ Optimize based on results

### Remember

- **Start small** (10 matches)
- **Monitor always** (second terminal)
- **Scale gradually** (10 → 100 → 500 → 2000)
- **Fix bottlenecks** (as identified)
- **Re-test** (after optimizations)

---

## 🚀 Let's Go!

```bash
cd tests
setup-stress-test.bat
npm run stress:small
```

**Good luck! 🎯**

---

*Need help? Check [STRESS-TEST-CHECKLIST.md](../STRESS-TEST-CHECKLIST.md) for troubleshooting.*
