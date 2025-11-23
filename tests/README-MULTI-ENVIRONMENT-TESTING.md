# Multi-Environment Match Service Testing Suite

This comprehensive testing suite allows you to test the QuizUP match service across different deployment environments (localhost, network, and hosted) with detailed resource monitoring and performance analysis.

## 🎯 Overview

The testing suite includes:
- **Multi-environment stress testing** - Test match service on localhost, network IP, and hosted domains
- **Resource monitoring** - Track Docker containers, system resources, and match server statistics
- **Comprehensive analysis** - Combine stress testing with resource monitoring for complete insights
- **Master-Worker configuration testing** - Verify the new match server architecture works across all environments

## 🚀 Quick Start

### Prerequisites
```bash
cd tests
npm install  # Install dependencies (playwright, axios, etc.)
```

### Basic Usage

1. **Test localhost environment:**
```bash
npm run run:localhost
# or
node run-stress-tests.js localhost --matches=5 --visible
```

2. **Test network environment:**
```bash
# Set your network IP first
export NETWORK_IP=192.168.1.100  # Replace with your actual IP
npm run run:network
# or
node run-stress-tests.js network --network-ip=192.168.1.100 --matches=5
```

3. **Test hosted environment:**
```bash
npm run run:hosted
# or
node run-stress-tests.js hosted --matches=10
```

4. **Test all environments:**
```bash
npm run run:all
# or
node run-stress-tests.js all --matches=5
```

## 📊 Comprehensive Testing with Resource Monitoring

### Full Comprehensive Test Suite
```bash
# Test all environments with resource monitoring
npm run comprehensive

# Quick test (fewer matches, shorter monitoring)
npm run comprehensive:quick

# Custom configuration
node comprehensive-test-suite.js --matches=10 --monitor-duration=1200 --monitor-interval=10
```

### Individual Resource Monitoring
```bash
# Monitor localhost for 10 minutes
npm run monitor:enhanced -- --env=localhost --duration=600

# Monitor network environment
node resource-monitor-enhanced.js --env=network --duration=300 --interval=5

# Monitor hosted environment
node resource-monitor-enhanced.js --env=hosted --duration=1800 --interval=10
```

## 🔧 Configuration Options

### Environment Variables
- `DEPLOYMENT_MODE` - Environment to test (localhost|network|hosted)
- `NETWORK_IP` - IP address for network testing (e.g., 192.168.1.100)
- `NUM_MATCHES` - Number of matches to run (default: 3)
- `HEADLESS` - Run browser in headless mode (true|false)

### Command Line Options

#### Stress Test Runner (`run-stress-tests.js`)
```bash
node run-stress-tests.js [environment] [options]

Options:
  --matches=N         Number of matches to run (default: 3)
  --headless          Run in headless mode (default: true)
  --visible           Run with visible browser
  --network-ip=IP     Set network IP address for network mode

Examples:
  node run-stress-tests.js localhost --matches=5
  node run-stress-tests.js network --network-ip=192.168.1.50 --visible
  node run-stress-tests.js hosted --matches=10
  node run-stress-tests.js all --matches=3
```

#### Resource Monitor (`resource-monitor-enhanced.js`)
```bash
node resource-monitor-enhanced.js [options]

Options:
  --env=ENV           Environment (localhost|network|hosted) [default: localhost]
  --interval=SEC      Monitoring interval in seconds [default: 5]
  --duration=SEC      Total monitoring duration in seconds [default: 300]
  --output=FILE       Output file name [default: resource-monitor-results.json]

Examples:
  node resource-monitor-enhanced.js --env=localhost --duration=600
  node resource-monitor-enhanced.js --env=network --interval=10
  node resource-monitor-enhanced.js --env=hosted --duration=1800
```

#### Comprehensive Test Suite (`comprehensive-test-suite.js`)
```bash
node comprehensive-test-suite.js [options]

Options:
  --env=ENV              Environment (localhost|network|hosted|all) [default: all]
  --matches=N            Number of matches per environment [default: 5]
  --monitor-duration=SEC Resource monitoring duration [default: 600]
  --monitor-interval=SEC Resource monitoring interval [default: 5]
  --visible              Run with visible browser [default: headless]
  --network-ip=IP        Network IP for network environment

Examples:
  node comprehensive-test-suite.js --matches=10 --monitor-duration=1200
  node comprehensive-test-suite.js --env=localhost --visible
  node comprehensive-test-suite.js --env=network --network-ip=192.168.1.50
```

## 📈 What Gets Tested

### Match Service Functionality
- ✅ User authentication across environments
- ✅ Match creation and joining
- ✅ Real-time match gameplay
- ✅ Question answering and submission
- ✅ Match completion and results
- ✅ WebSocket connectivity
- ✅ API endpoint responsiveness

### Resource Monitoring
- 🖥️ **System Resources**: CPU load, memory usage, uptime
- 🐳 **Docker Containers**: CPU%, memory usage, network I/O, disk I/O
- 🎯 **Match Server Stats**: Active matches, total players, worker statistics
- 📊 **Performance Metrics**: Response times, throughput, success rates

### Master-Worker Architecture
- ⚙️ **Worker Pool Management**: Verify workers are created and managed properly
- 🔄 **Load Distribution**: Check if matches are distributed across workers
- 📈 **Scalability**: Test how the system handles multiple concurrent matches
- 🛡️ **Fault Tolerance**: Monitor system stability under load

## 📋 Test Results and Reports

### Output Files
- `resource-monitor-results.json` - Resource monitoring data
- `comprehensive-test-results-[timestamp].json` - Full test suite results
- Console output with real-time statistics and final summaries

### Key Metrics Tracked
- **Success Rate**: Percentage of successful matches
- **Average Match Duration**: Time taken per match
- **Resource Usage**: Peak and average CPU/memory consumption
- **Match Server Availability**: Uptime and responsiveness
- **Throughput**: Matches completed per minute
- **Error Analysis**: Detailed error tracking and categorization

## 🌍 Environment-Specific Testing

### Localhost Testing
- Tests Docker Compose deployment
- Uses `http://localhost:5173` for frontend
- Uses `http://localhost:8090/api` for API
- Uses `ws://localhost:3001` for WebSocket

### Network Testing
- Tests LAN deployment with network IP
- Requires setting `NETWORK_IP` environment variable
- Tests accessibility from other devices on the network
- Verifies network-based WebSocket connections

### Hosted Testing
- Tests production deployment with domains
- Uses `https://quizdash.dpdns.org` for frontend
- Uses `https://api.quizdash.dpdns.org/api` for API
- Uses `wss://match.quizdash.dpdns.org` for WebSocket
- Tests Cloudflare tunnel configuration

## 🔍 Troubleshooting

### Common Issues

1. **Network IP not accessible**
   ```bash
   # Make sure your network IP is correct
   ip addr show  # Linux
   ipconfig      # Windows
   ```

2. **Docker containers not running**
   ```bash
   docker-compose ps
   docker-compose up -d
   ```

3. **WebSocket connection failures**
   - Check if matchserver is running on correct port
   - Verify firewall settings for network testing
   - Ensure Cloudflare tunnel is active for hosted testing

4. **Authentication failures**
   - Verify test users exist in database
   - Check API endpoints are accessible
   - Confirm CORS settings are correct

### Debug Mode
Run tests with visible browser to see what's happening:
```bash
node run-stress-tests.js localhost --visible
```

### Resource Monitoring Only
If you just want to monitor resources without running stress tests:
```bash
node resource-monitor-enhanced.js --env=localhost --duration=300
```

## 📊 Understanding Results

### Success Metrics
- **Success Rate > 90%**: Excellent performance
- **Success Rate 70-90%**: Good performance, minor issues
- **Success Rate < 70%**: Poor performance, needs investigation

### Resource Usage Guidelines
- **Memory Usage < 80%**: Healthy
- **Memory Usage 80-95%**: Monitor closely
- **Memory Usage > 95%**: Critical, may cause issues

- **CPU Load < 2.0**: Normal for multi-core systems
- **CPU Load 2.0-4.0**: High load, acceptable under stress
- **CPU Load > 4.0**: Very high load, may impact performance

### Match Server Health
- **Availability > 95%**: Excellent
- **Availability 90-95%**: Good
- **Availability < 90%**: Poor, investigate connectivity issues

## 🎯 Best Practices

1. **Run baseline tests** before making changes
2. **Test all environments** to ensure consistency
3. **Monitor resources** during peak usage
4. **Compare results** across different configurations
5. **Document any issues** found during testing
6. **Run tests regularly** to catch regressions early

## 🚀 Advanced Usage

### Custom Test Scenarios
You can modify the test scripts to:
- Test specific quiz categories
- Use different user accounts
- Test with varying match sizes
- Simulate network latency
- Test error recovery scenarios

### Integration with CI/CD
Add these tests to your deployment pipeline:
```bash
# Quick smoke test
npm run comprehensive:quick

# Full regression test
npm run comprehensive
```

### Performance Benchmarking
Use the comprehensive test suite to establish performance baselines and track improvements over time.

---

## 📞 Support

If you encounter issues with the testing suite:
1. Check the console output for detailed error messages
2. Verify all prerequisites are installed
3. Ensure the QuizUP application is running in the target environment
4. Check network connectivity and firewall settings
5. Review the generated log files for additional details

Happy testing! 🎉
