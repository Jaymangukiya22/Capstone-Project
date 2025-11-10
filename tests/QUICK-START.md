# 🚀 QuizDash Stress Test - Quick Start

## ⚡ Run Tests (Choose One)

### Using NPM Scripts (Recommended)
```bash
cd tests

# Quick tests
npm run test:10    # 10 matches (2-3 min)
npm run test:30    # 30 matches (6-8 min) ⭐ RECOMMENDED FIRST
npm run test:50    # 50 matches (10-12 min)

# Heavy tests
npm run test:100   # 100 matches (20-25 min)
npm run test:200   # 200 matches (40-50 min)
npm run test:500   # 500 matches (90-120 min)

# Maximum capacity
npm run test:1000  # 1000 matches (3-4 hours)
npm run test:2000  # 2000 matches (6-8 hours) ⚠️ REQUIRES 4000 USERS
```

### Using Batch File (Windows)
```batch
run-stress-test.bat 30
```

### Using Node Directly
```bash
node stress-test-ultimate.js 30
```

## 📊 Real-Time Monitoring (Run in separate terminal)

```bash
cd tests
npm run monitor
```

This shows live stats for:
- CPU, RAM, Network I/O
- Docker containers (Backend, MatchServer, Redis, PostgreSQL)
- Redis metrics
- PostgreSQL connections
- Application health

## 📈 View Results

After test completes:

1. **Detailed Metrics**
   ```
   stress-test-metrics-<timestamp>.json
   ```

2. **Time-Series Data**
   ```
   resource-metrics.jsonl
   ```

3. **Import to Grafana**
   - Use `grafana-dashboard.json`
   - See full instructions in `STRESS-TEST-GUIDE.md`

## 🎯 What Gets Tested

✅ **Complete UI Flow**
- Login (2000 pre-seeded users: `stresstest_1@test.com` to `stresstest_2000@test.com`)
- Quiz selection
- Game mode dropdown
- Modal interaction
- Code generation
- Code entry & join
- Full 10-question gameplay
- Match completion
- Database persistence

✅ **Metrics Collected**
- Success rate
- Response times (login, create, join, start, answers)
- Resource usage (CPU, RAM, Network)
- Bottleneck analysis
- Error tracking by phase
- Database verification

✅ **Build-Safe Selectors**
- Won't break after `npm run build`
- Uses semantic HTML and text content
- Resilient to class name changes

## 🔍 Understanding Results

### Good Results ✅
```
✅ Success Rate: 95%+
✅ All phases < 5s average
✅ Memory usage < 80%
✅ Database persistence: 95%+
✅ No critical bottlenecks
```

### Warning Signs ⚠️
```
⚠️ Success Rate: 70-90%
⚠️ Some phases > 5s
⚠️ Memory usage 80-90%
⚠️ Medium bottlenecks detected
```

### Critical Issues 🔴
```
🔴 Success Rate: < 70%
🔴 Multiple phases > 8s
🔴 Memory usage > 90%
🔴 Critical bottlenecks
🔴 High error rate in specific phase
```

## 🐛 Quick Troubleshooting

### "Quiz did not start" errors
```bash
# Check matchserver
docker logs quizup_matchserver --tail 50

# Reduce batch size in stress-test-ultimate.js
# Change: { batch: 10 } → { batch: 5 }
```

### "Target page closed" errors
```bash
# System overload - reduce batch size
# Or: Increase memory for Docker
```

### High memory usage
```bash
# Monitor with:
npm run monitor

# In separate terminal during test
```

## 📁 All Available Commands

```bash
# Stress tests
npm run test:10      # 10 matches
npm run test:15      # 15 matches  
npm run test:20      # 20 matches
npm run test:30      # 30 matches ⭐
npm run test:50      # 50 matches
npm run test:100     # 100 matches
npm run test:200     # 200 matches
npm run test:500     # 500 matches
npm run test:1000    # 1000 matches
npm run test:2000    # 2000 matches (needs 4000 users)

# Sequential tests (slower but more reliable)
npm run seq:5        # 5 matches sequential
npm run seq:30       # 30 matches sequential

# Utilities
npm run monitor      # Resource monitoring
npm run check-db     # Verify database
npm run debug        # Debug UI selectors
```

## 🎓 Test Progression

Recommended order for first-time testing:

1. **Start with 10** → Verify system works
2. **Try 30** → Standard validation
3. **Scale to 50** → Confirm stability
4. **Go to 100** → Real stress test
5. **Beyond 200** → Only if previous succeeded

## 💡 Pro Tips

1. **Always monitor** - Run `npm run monitor` in second terminal
2. **Start small** - Don't jump to 500 matches immediately
3. **Check database** - Run `npm run check-db` after test
4. **Read the guide** - See `STRESS-TEST-GUIDE.md` for details
5. **Watch resources** - If memory > 80%, reduce batch size

## ⚡ Emergency Stop

Press `Ctrl+C` - Metrics will be saved automatically

## 📞 Need More Info?

- **Full Guide**: `STRESS-TEST-GUIDE.md`
- **Code Details**: `stress-test-ultimate.js`
- **Monitoring**: `resource-monitor.js`
- **Dashboard**: `grafana-dashboard.json`

---

**Ready? Start with:**
```bash
npm run test:30
```

**And in another terminal:**
```bash
npm run monitor
```

**🎉 Good luck!**
