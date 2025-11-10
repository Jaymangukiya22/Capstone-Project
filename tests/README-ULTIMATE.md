# 🚀 QuizDash Ultimate Stress Testing System

## 📦 What You Got

### 1. **stress-test-ultimate.js** - Main Testing Engine
- Supports 10, 15, 20, 30, 50, 100, 200, 500, 1000, 2000 matches
- Uses 2000 pre-seeded users (`stresstest_1@test.com` to `stresstest_2000@test.com`)
- Password: `password123` for all users
- Real UI flow (modal, code generation, join process)
- Build-safe selectors (won't break after npm run build)
- Smart batching for system stability
- Automatic bottleneck detection
- Metrics export for Grafana

### 2. **resource-monitor.js** - Real-Time Monitoring
Tracks everything:
- ✅ **System**: CPU, RAM, Network I/O, Load Average
- ✅ **Node.js**: Heap usage, RSS, External memory
- ✅ **Docker**: All containers (CPU, Memory, Network, Block I/O)
  - Backend
  - MatchServer  
  - PostgreSQL
  - Redis
- ✅ **Redis**: Memory, Clients, Commands, Connections
- ✅ **PostgreSQL**: Database size, Active connections, Table stats
- ✅ **Network**: Connections, Packets
- ✅ **Application**: Health status

### 3. **grafana-dashboard.json** - Visualization Dashboard
12 panels showing:
- Match statistics (created, started, completed)
- Success rate gauge
- System CPU usage timeline
- Memory usage (system + Node heap)
- Docker container CPU
- Response times by phase
- Redis metrics
- PostgreSQL connections
- Error rate timeline
- Errors by phase (pie chart)
- Network I/O
- Match throughput

### 4. **Documentation**
- `QUICK-START.md` - Get started in 2 minutes
- `STRESS-TEST-GUIDE.md` - Complete reference (80+ lines)
- This file - Overview and architecture

### 5. **Helper Scripts**
- `run-stress-test.bat` - Windows launcher
- `package.json` - NPM scripts for all test sizes

## 🎯 Supported Test Scales

| Scale | Matches | Users | Batch | Time | NPM Script | Use Case |
|-------|---------|-------|-------|------|------------|----------|
| Tiny | 10 | 20 | 5 | 2-3m | `npm run test:10` | Validation |
| Small | 15 | 30 | 5 | 3-4m | `npm run test:15` | Quick test |
| Small+ | 20 | 40 | 10 | 4-5m | `npm run test:20` | Medium load |
| **Standard** | **30** | **60** | **10** | **6-8m** | **`npm run test:30`** | **Recommended** |
| Medium | 50 | 100 | 10 | 10-12m | `npm run test:50` | High load |
| Large | 100 | 200 | 20 | 20-25m | `npm run test:100` | Stress test |
| XL | 200 | 400 | 25 | 40-50m | `npm run test:200` | Heavy stress |
| XXL | 500 | 1000 | 50 | 90-120m | `npm run test:500` | Extreme load |
| Max | 1000 | 2000 | 100 | 3-4h | `npm run test:1000` | Maximum capacity |
| Ultra | 2000 | 4000 | 200 | 6-8h | `npm run test:2000` | ⚠️ **Needs 4000 users** |

## 🏗️ Architecture

```
stress-test-ultimate.js
├─ Browser Management (Playwright)
│  ├─ Context per player pair
│  ├─ Parallel execution (batched)
│  └─ Graceful cleanup
│
├─ UI Flow Automation
│  ├─ Login (stresstest_N@test.com)
│  ├─ Quiz selection
│  ├─ Game mode dropdown
│  ├─ Modal interaction
│  ├─ Code generation (Player 1)
│  ├─ Code entry (Player 2)
│  ├─ Auto-start (no Ready button)
│  ├─ 10 questions gameplay
│  └─ Match completion
│
├─ Metrics Collection
│  ├─ Timing per phase
│  │  ├─ Login
│  │  ├─ Match creation
│  │  ├─ Match join
│  │  ├─ Quiz start
│  │  └─ Question answers
│  ├─ Resource snapshots
│  ├─ Error tracking by phase
│  └─ Success/failure counts
│
├─ Bottleneck Analysis
│  ├─ Slow phases (>3s avg)
│  ├─ High error rates (>10%)
│  ├─ Resource constraints
│  └─ Recommendations
│
└─ Export
   ├─ JSON metrics file
   ├─ Grafana-compatible format
   └─ Database verification

resource-monitor.js
├─ System Metrics
│  ├─ CPU per core
│  ├─ Memory (total/used/free)
│  ├─ Network I/O
│  └─ Load average
│
├─ Docker Metrics
│  ├─ Per-container CPU
│  ├─ Per-container Memory
│  ├─ Network In/Out
│  └─ Block I/O
│
├─ Application Metrics
│  ├─ Redis (memory, clients, commands)
│  ├─ PostgreSQL (size, connections, tables)
│  └─ Health checks
│
└─ Export
   └─ JSONL time-series (resource-metrics.jsonl)
```

## 📊 Data Flow

```
Test Start
    ↓
[User Pool] → Select 2 users per match
    ↓
[Batch N] → Launch M matches concurrently
    ↓
[Match Process]
    ├─ Login both players
    ├─ Navigate to quiz
    ├─ Open modal
    ├─ Generate code
    ├─ Join match
    ├─ Answer 10 questions
    └─ Complete
    ↓
[Metrics Collection]
    ├─ Timing per phase
    ├─ Resource snapshot
    └─ Error tracking
    ↓
[Batch Complete] → Wait delay → Next batch
    ↓
[All Batches Done]
    ↓
[Analysis]
    ├─ Calculate statistics
    ├─ Detect bottlenecks
    ├─ Analyze errors
    └─ Resource trends
    ↓
[Export]
    ├─ stress-test-metrics-*.json
    └─ Console summary
    ↓
[Database Verification]
    └─ Check persistence rate
```

## 🔬 What Gets Measured

### Timing Metrics (per phase)
```javascript
{
  login: { avg, min, max, p50, p95, p99 },
  matchCreate: { ... },
  matchJoin: { ... },
  quizStart: { ... },
  questionAnswer: { ... },
  matchComplete: { ... }
}
```

### Resource Metrics (every 5s during test)
```javascript
{
  timestamp: 1705317000000,
  system: {
    cpu: { usage: "45.2%", cores: 8, loadAvg: [2.1, 2.3, 2.5] },
    memory: { totalMB: 16384, usedMB: 12000, usagePercent: "73.24" }
  },
  node: {
    heapUsedMB: 245, heapTotalMB: 512, rssMB: 512
  },
  docker: {
    quizup_backend: { cpu: 35.2, memoryUsed: "450MiB", ... },
    quizup_matchserver: { cpu: 68.5, memoryUsed: "680MiB", ... },
    quizup_postgres: { cpu: 12.3, memoryUsed: "230MiB", ... },
    quizup_redis: { cpu: 8.5, memoryUsed: "120MiB", ... }
  },
  redis: {
    memoryUsed: "118MB",
    connectedClients: 45,
    total_commands_processed: 125000
  },
  postgres: {
    databaseSize: "256MB",
    activeConnections: 12,
    topTables: [...]
  }
}
```

### Error Tracking
```javascript
{
  matchNum: 15,
  gameCode: "ABC123",
  error: "Quiz did not start",
  phase: "QUIZ_START",
  timestamp: 1705317123456
}
```

### Bottleneck Detection
```javascript
{
  phase: "matchCreate",
  severity: "HIGH",
  avgTime: "5200ms",
  maxTime: "7800ms",
  recommendation: "matchCreate is taking 5.2s on average. Consider optimizing."
}
```

## 🎯 Test Scenarios

### Scenario 1: Quick Validation (10 matches)
```bash
npm run test:10
```
**Purpose**: Verify system works
**Time**: 2-3 minutes
**Resource**: Light
**Use When**: After code changes, quick sanity check

### Scenario 2: Standard Load (30 matches)
```bash
npm run test:30
```
**Purpose**: Standard performance baseline
**Time**: 6-8 minutes  
**Resource**: Moderate
**Use When**: Regular testing, before deployment

### Scenario 3: Stress Test (100 matches)
```bash
npm run test:100
```
**Purpose**: Identify performance issues
**Time**: 20-25 minutes
**Resource**: Heavy
**Use When**: Performance tuning, finding limits

### Scenario 4: Maximum Capacity (1000 matches)
```bash
npm run test:1000
```
**Purpose**: Test absolute limits
**Time**: 3-4 hours
**Resource**: Maximum
**Use When**: Capacity planning, before major launch

## 🔍 Bottleneck Analysis

The system automatically detects:

### Performance Bottlenecks
- Any phase averaging >3s (MEDIUM) or >5s (HIGH)
- P95 >8s (CRITICAL)
- Max >10s (CRITICAL)

### Error Bottlenecks
- Error rate >10% in any phase (CRITICAL)
- Error rate >5% (HIGH)
- Repeated errors in same phase (PATTERN)

### Resource Bottlenecks
- Memory >90% (CRITICAL)
- Memory >80% (HIGH)
- CPU >90% (CRITICAL)
- CPU >70% (HIGH)

### Recommendations Provided
- Increase batch delay
- Reduce batch size
- Optimize specific phase
- Scale resources
- Investigate specific error pattern

## 📈 Grafana Integration

### Setup Prometheus Exporter
Add to your application (optional):
```javascript
// Export metrics in Prometheus format
app.get('/metrics', (req, res) => {
  const metrics = /* collect from stress test */;
  res.set('Content-Type', 'text/plain');
  res.send(formatPrometheusMetrics(metrics));
});
```

### Import Dashboard
1. Open Grafana → Dashboards → Import
2. Upload `grafana-dashboard.json`
3. Select Prometheus data source
4. View real-time metrics

### Panels Available
- **Match Stats** - Created, Started, Completed counts
- **Success Rate** - Gauge (0-100%)
- **CPU Usage** - Timeline per container
- **Memory Usage** - System + Node heap
- **Response Times** - Line chart per phase
- **Redis Metrics** - Current stats
- **PostgreSQL** - Connection gauge
- **Error Rate** - Timeline
- **Errors by Phase** - Pie chart
- **Network I/O** - In/Out bandwidth
- **Throughput** - Matches/minute

## 🔧 Configuration

### Adjust Batch Sizes
Edit `TEST_CONFIGS` in `stress-test-ultimate.js`:
```javascript
const TEST_CONFIGS = {
  30: { 
    batch: 10,    // Concurrent matches per batch
    delay: 1500   // Wait time between batches (ms)
  }
};
```

**For slower systems**:
```javascript
30: { batch: 5, delay: 3000 }  // More conservative
```

**For faster systems**:
```javascript
30: { batch: 15, delay: 1000 } // More aggressive
```

### Adjust Monitoring Interval
Edit `resource-monitor.js`:
```javascript
const MONITOR_INTERVAL = 2000; // Change to 1000 for 1s updates
```

## 🚨 Interpreting Results

### Excellent ⭐
```
Success Rate: 98-100%
Avg Response: <2s all phases
Memory Peak: <70%
CPU Peak: <60%
Bottlenecks: None
Database Persistence: >98%
```

### Good ✅
```
Success Rate: 90-97%
Avg Response: 2-4s most phases
Memory Peak: 70-80%
CPU Peak: 60-75%
Bottlenecks: Minor (1-2)
Database Persistence: 90-98%
```

### Acceptable ⚠️
```
Success Rate: 80-89%
Avg Response: 4-6s some phases
Memory Peak: 80-90%
CPU Peak: 75-85%
Bottlenecks: Moderate (3-5)
Database Persistence: 80-90%
```

### Poor 🔴
```
Success Rate: <80%
Avg Response: >6s multiple phases
Memory Peak: >90%
CPU Peak: >85%
Bottlenecks: Severe (5+)
Database Persistence: <80%
```

## 💡 Best Practices

1. **Always start small** - 10 → 30 → 50 → 100
2. **Monitor resources** - Run resource-monitor.js
3. **Check logs** - Docker logs for all services
4. **Verify database** - Run check-db after test
5. **Tune configuration** - Adjust batch size based on results
6. **Document results** - Save metrics files
7. **Compare over time** - Track improvements
8. **Test realistic scenarios** - Match production patterns

## 🎓 Understanding the UI Flow

The test replicates EXACT production user behavior:

1. **Login** → Dashboard (real form submission)
2. **Select Quiz** → Click quiz card
3. **Game Mode** → Open "Choose how you want to play" dropdown
4. **Select** → Click "Play with Friend" option
5. **PLAY** → Click PLAY button → Modal opens
6. **Generate** → Click "Generate Game Code" button
7. **Wait** → API creates match, returns code
8. **Start** → Click "Start Game & Wait for Friend"
9. **Player 2** → Same flow until modal
10. **Tab Switch** → Click "Enter Code" tab
11. **Enter Code** → Type 6-character code
12. **Join** → Click "Join Game" button
13. **Auto-Start** → Match starts automatically (NO Ready button!)
14. **Answer Q1-Q9** → Click option → Click "Next Question"
15. **Answer Q10** → Click option → Click "Submit Quiz"
16. **Complete** → Results saved to database

## 📞 Support & Debugging

### Check Logs
```bash
docker logs quizup_backend --tail 50
docker logs quizup_matchserver --tail 50
docker logs quizup_postgres --tail 50
docker logs quizup_redis --tail 50
```

### Check Database
```bash
npm run check-db
```

### Debug UI
```bash
npm run debug
```

### Common Issues
See `STRESS-TEST-GUIDE.md` Troubleshooting section

## 📦 File Structure

```
tests/
├── stress-test-ultimate.js      ← Main test engine
├── resource-monitor.js           ← Live monitoring
├── stress-test-sequential.js     ← Fallback (slower but reliable)
├── grafana-dashboard.json        ← Visualization config
├── run-stress-test.bat           ← Windows launcher
├── package.json                  ← NPM scripts
├── QUICK-START.md                ← 2-minute guide
├── STRESS-TEST-GUIDE.md          ← Complete reference
├── README-ULTIMATE.md            ← This file
├── seed-2000-users.sql           ← User seeder
└── [Generated during tests]
    ├── stress-test-metrics-*.json
    ├── resource-metrics.jsonl
    └── match*-p*-q*.png (screenshots)
```

## 🎉 Ready to Test!

### Quick Start
```bash
cd tests
npm run test:30    # Terminal 1
npm run monitor    # Terminal 2
```

### View Results
1. Check console output
2. Open `stress-test-metrics-*.json`
3. Review `resource-metrics.jsonl`
4. Import to Grafana (optional)

---

**Built with ❤️ for comprehensive QuizDash performance testing**
