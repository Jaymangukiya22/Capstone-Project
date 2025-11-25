# 100-Match Concurrent Stress Test

This stress test simulates 100 concurrent friend matches with real-time telemetry monitoring and system resource tracking.

## Overview

- **Test Type**: Concurrent (10 batches of 10 matches)
- **Total Matches**: 100
- **Total Players**: 200 (2 per match)
- **Questions per Match**: 10
- **Test Users**: `stresstest_user_999` to `stresstest_user_800`
- **Password**: `1234567890` (for all test users)

## Prerequisites

1. **Backend Services Running**:
   ```bash
   docker compose up -d backend matchserver postgres redis
   ```

2. **Test Users Created**: The stress test uses users `stresstest_user_999` through `stresstest_user_800`. These should already exist in your database from the seeding process.

3. **Node.js Dependencies**:
   ```bash
   npm install playwright axios
   ```

## Running the Stress Test

### Option 1: Automated (Recommended)

**Linux/Mac**:
```bash
bash tests/run-stress-test-100.sh
```

**Windows**:
```bash
tests\run-stress-test-100.bat
```

This will:
- Check that services are running
- Start resource monitoring
- Run the 100-match stress test
- Display real-time telemetry
- Generate a final report

### Option 2: Manual

**Terminal 1 - Resource Monitor**:
```bash
node tests/monitor-resources.js
```

**Terminal 2 - Stress Test**:
```bash
node tests/stress-test-100-concurrent.js
```

## What Gets Tested

### Match Lifecycle
✅ User authentication (login)
✅ Quiz selection
✅ Match creation with join code
✅ Match joining with code
✅ Match auto-start when 2 players present
✅ Question display and progression
✅ Answer submission
✅ Score calculation
✅ Match completion

### Concurrent Operations
✅ 100 matches running in 10 batches
✅ Each batch has 10 concurrent matches
✅ Real-time telemetry collection
✅ System resource monitoring

## Telemetry Metrics

The test collects and reports:

### Match Statistics
- **Matches Created**: Total matches successfully created
- **Matches Joined**: Total matches successfully joined
- **Matches Started**: Total matches that started
- **Matches Completed**: Total matches that finished
- **Success Rate**: % of created matches that completed

### Performance Metrics
- **Avg Login Time**: Average time to authenticate
- **Avg Match Creation**: Average time to create a match
- **Avg Match Join**: Average time to join a match
- **Avg Answer Submission**: Average time to submit an answer
- **Avg Match Completion**: Average time to complete a match

### System Resources
- **CPU Usage**: System CPU percentage
- **Memory Usage**: System memory in GB and percentage
- **Docker Stats**: Per-container CPU and memory usage

### Error Tracking
- **Total Errors**: Number of errors encountered
- **Error Details**: Last 5 errors with context

## Expected Results

For a healthy system with 100 concurrent matches:

| Metric | Expected Value |
|--------|-----------------|
| Success Rate | 95%+ |
| Avg Login Time | < 2000ms |
| Avg Match Creation | < 1000ms |
| Avg Answer Submission | < 500ms |
| CPU Usage | 30-60% |
| Memory Usage | 50-70% |
| Total Duration | 10-15 minutes |

## Interpreting Results

### Good Results ✅
- Success rate > 95%
- All timing metrics < expected values
- CPU and memory usage stable
- Few or no errors

### Warning Signs ⚠️
- Success rate 80-95%
- Timing metrics increasing over time
- CPU or memory usage > 80%
- Increasing error count

### Critical Issues ❌
- Success rate < 80%
- Timing metrics > 5000ms
- CPU or memory usage > 90%
- Frequent errors with same context

## Troubleshooting

### "Backend API is NOT running"
```bash
docker compose up -d backend matchserver
```

### "Test users not found"
Ensure database is seeded:
```bash
docker compose exec backend npm run seed:quick
```

### "Connection timeout"
Check that WebSocket is accessible:
```bash
# Should return 101 Switching Protocols
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:3001
```

### "Out of memory"
Reduce batch size in `stress-test-100-concurrent.js`:
```javascript
const batchSize = 5; // Changed from 10
```

## Performance Optimization Tips

1. **Increase Worker Processes**:
   ```bash
   # In docker-compose.yml, increase backend replicas
   deploy:
     replicas: 4
   ```

2. **Increase Match Server Capacity**:
   - Modify `MAX_MATCHES` in `matchServerWorker.ts`
   - Default is 50 per worker, can increase to 100

3. **Database Optimization**:
   - Ensure indexes are created
   - Check PostgreSQL connection pool size

4. **Network Optimization**:
   - Use local testing (not over network)
   - Check bandwidth availability

## Test Data

### Test User Credentials

All test users have the same password: `1234567890`

Email format: `stresstest_user_NNN@test.com` where NNN is 999 down to 800

Example:
- `stresstest_user_999@test.com`
- `stresstest_user_998@test.com`
- `stresstest_user_997@test.com`
- ... and so on

### Quiz Data

The test automatically selects the first available quiz. Ensure your database has at least one quiz with 10+ questions.

## Monitoring During Test

### Real-time Metrics (Every 10 seconds)
The test prints live metrics showing:
- Elapsed time
- Matches created/joined/started/completed
- Questions answered
- Average timings
- Current error count

### Resource Monitor (Every 5 seconds)
Shows:
- System CPU usage
- System memory usage
- Per-container Docker stats

## Generating Custom Reports

After the test completes, you can analyze the results:

```javascript
// In stress-test-100-concurrent.js
// Results are logged to console and can be captured:
node tests/stress-test-100-concurrent.js > results.log 2>&1
```

Then analyze the log file for patterns and issues.

## Scaling to 1000+ Matches

To test with more matches:

1. Create more test users in the database
2. Modify `stress-test-100-concurrent.js`:
   ```javascript
   // Change from 100 to 1000
   for (let i = 0; i < 1000; i++) {
   ```
3. Adjust batch size if needed:
   ```javascript
   const batchSize = 5; // Smaller batches for more matches
   ```
4. Increase Docker resource limits
5. Monitor system resources carefully

## Cleanup After Test

The test creates browser contexts and pages that are cleaned up automatically. However, if the test crashes:

```bash
# Kill any remaining Playwright processes
pkill -f playwright
# or on Windows
taskkill /F /IM chrome.exe
```

## Support

For issues or questions:
1. Check the error logs in the console output
2. Review the "Troubleshooting" section above
3. Check Docker logs: `docker compose logs backend matchserver`
4. Verify database connectivity: `docker compose exec postgres psql -U quizup_user -d quizup_db`

---

**Last Updated**: November 2025
**Test Framework**: Playwright + Node.js
**Target System**: QuizUP Friend Match System
