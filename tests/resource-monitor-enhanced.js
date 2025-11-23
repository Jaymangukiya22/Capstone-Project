#!/usr/bin/env node

/**
 * Enhanced Resource Monitor for Match Service Testing
 * Monitors Docker containers, system resources, and match statistics
 */

const { spawn, exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ResourceMonitor {
  constructor(config = {}) {
    this.config = {
      interval: config.interval || 5000, // 5 seconds
      duration: config.duration || 300000, // 5 minutes
      outputFile: config.outputFile || 'resource-monitor-results.json',
      environment: config.environment || 'localhost',
      ...config
    };
    
    this.data = {
      startTime: new Date().toISOString(),
      environment: this.config.environment,
      samples: [],
      summary: {}
    };
    
    this.isRunning = false;
    this.intervalId = null;
  }
  
  // Get Docker container statistics
  async getDockerStats() {
    return new Promise((resolve) => {
      exec('docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}\\t{{.BlockIO}}"', 
        (error, stdout, stderr) => {
          if (error) {
            console.warn('⚠️ Could not get Docker stats:', error.message);
            resolve([]);
            return;
          }
          
          const lines = stdout.trim().split('\n').slice(1); // Skip header
          const stats = lines.map(line => {
            const parts = line.split('\t');
            if (parts.length >= 5) {
              return {
                container: parts[0],
                cpu: parts[1],
                memory: parts[2],
                network: parts[3],
                disk: parts[4]
              };
            }
            return null;
          }).filter(Boolean);
          
          resolve(stats);
        }
      );
    });
  }
  
  // Get match server statistics from API
  async getMatchServerStats(apiUrl) {
    try {
      const response = await axios.get(`${apiUrl}/workers/stats`, {
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          activeMatches: 'unknown',
          totalPlayers: 'unknown',
          workerStats: 'unavailable'
        }
      };
    }
  }
  
  // Get system resources
  getSystemResources() {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        total: Math.round(totalMem / 1024 / 1024), // MB
        used: Math.round(usedMem / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024), // MB
        usage: Math.round((usedMem / totalMem) * 100) // %
      },
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
  }
  
  // Collect all metrics
  async collectMetrics() {
    const timestamp = new Date().toISOString();
    
    console.log(`📊 Collecting metrics at ${timestamp}...`);
    
    const [dockerStats, systemResources] = await Promise.all([
      this.getDockerStats(),
      Promise.resolve(this.getSystemResources())
    ]);
    
    // Get match server stats based on environment
    const apiUrls = {
      localhost: 'http://localhost:8090/api',
      network: `http://${process.env.NETWORK_IP || '192.168.1.100'}:8090/api`,
      hosted: 'https://api.quizdash.dpdns.org/api'
    };
    
    const matchServerStats = await this.getMatchServerStats(
      apiUrls[this.config.environment] || apiUrls.localhost
    );
    
    const sample = {
      timestamp,
      system: systemResources,
      docker: dockerStats,
      matchServer: matchServerStats,
      environment: this.config.environment
    };
    
    this.data.samples.push(sample);
    
    // Display current stats
    this.displayCurrentStats(sample);
    
    return sample;
  }
  
  // Display current statistics
  displayCurrentStats(sample) {
    console.clear();
    console.log('🔍 RESOURCE MONITOR - LIVE STATS');
    console.log('='.repeat(50));
    console.log(`🌐 Environment: ${this.config.environment.toUpperCase()}`);
    console.log(`⏰ Time: ${new Date(sample.timestamp).toLocaleTimeString()}`);
    console.log(`📈 Samples Collected: ${this.data.samples.length}`);
    console.log();
    
    // System Resources
    console.log('💻 SYSTEM RESOURCES:');
    console.log(`   CPU Load: ${sample.system.cpu.loadAverage[0].toFixed(2)} (${sample.system.cpu.cores} cores)`);
    console.log(`   Memory: ${sample.system.memory.used}MB / ${sample.system.memory.total}MB (${sample.system.memory.usage}%)`);
    console.log(`   Uptime: ${Math.round(sample.system.uptime / 3600)}h ${Math.round((sample.system.uptime % 3600) / 60)}m`);
    console.log();
    
    // Docker Stats
    if (sample.docker.length > 0) {
      console.log('🐳 DOCKER CONTAINERS:');
      sample.docker.forEach(container => {
        console.log(`   ${container.container}:`);
        console.log(`     CPU: ${container.cpu}, Memory: ${container.memory}`);
        console.log(`     Network: ${container.network}, Disk: ${container.disk}`);
      });
      console.log();
    }
    
    // Match Server Stats
    console.log('🎯 MATCH SERVER:');
    if (sample.matchServer.success) {
      const data = sample.matchServer.data;
      console.log(`   Status: ✅ Online`);
      console.log(`   Active Matches: ${data.activeMatches || 0}`);
      console.log(`   Total Players: ${data.totalPlayers || 0}`);
      
      if (data.workerStats && Array.isArray(data.workerStats)) {
        console.log(`   Workers: ${data.workerStats.length} active`);
        data.workerStats.forEach((worker, index) => {
          console.log(`     Worker ${index + 1}: ${worker.matches || 0} matches, ${worker.players || 0} players`);
        });
      }
    } else {
      console.log(`   Status: ❌ Offline (${sample.matchServer.error})`);
    }
    
    console.log();
    console.log('Press Ctrl+C to stop monitoring...');
  }
  
  // Generate summary statistics
  generateSummary() {
    if (this.data.samples.length === 0) {
      return { error: 'No samples collected' };
    }
    
    const samples = this.data.samples;
    const duration = new Date(samples[samples.length - 1].timestamp) - new Date(samples[0].timestamp);
    
    // System resource trends
    const memoryUsages = samples.map(s => s.system.memory.usage);
    const cpuLoads = samples.map(s => s.system.cpu.loadAverage[0]);
    
    // Match server trends
    const matchCounts = samples
      .filter(s => s.matchServer.success && s.matchServer.data.activeMatches !== 'unknown')
      .map(s => parseInt(s.matchServer.data.activeMatches) || 0);
    
    const playerCounts = samples
      .filter(s => s.matchServer.success && s.matchServer.data.totalPlayers !== 'unknown')
      .map(s => parseInt(s.matchServer.data.totalPlayers) || 0);
    
    return {
      duration: Math.round(duration / 1000), // seconds
      totalSamples: samples.length,
      
      system: {
        memory: {
          min: Math.min(...memoryUsages),
          max: Math.max(...memoryUsages),
          avg: Math.round(memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length)
        },
        cpu: {
          min: Math.min(...cpuLoads).toFixed(2),
          max: Math.max(...cpuLoads).toFixed(2),
          avg: (cpuLoads.reduce((a, b) => a + b, 0) / cpuLoads.length).toFixed(2)
        }
      },
      
      matchServer: {
        availability: Math.round((samples.filter(s => s.matchServer.success).length / samples.length) * 100),
        matches: matchCounts.length > 0 ? {
          min: Math.min(...matchCounts),
          max: Math.max(...matchCounts),
          avg: Math.round(matchCounts.reduce((a, b) => a + b, 0) / matchCounts.length)
        } : 'no data',
        players: playerCounts.length > 0 ? {
          min: Math.min(...playerCounts),
          max: Math.max(...playerCounts),
          avg: Math.round(playerCounts.reduce((a, b) => a + b, 0) / playerCounts.length)
        } : 'no data'
      }
    };
  }
  
  // Start monitoring
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Monitor is already running');
      return;
    }
    
    console.log('🚀 Starting resource monitor...');
    console.log(`📊 Environment: ${this.config.environment}`);
    console.log(`⏱️ Interval: ${this.config.interval / 1000}s`);
    console.log(`⏰ Duration: ${this.config.duration / 1000}s`);
    console.log();
    
    this.isRunning = true;
    
    // Collect initial sample
    await this.collectMetrics();
    
    // Set up interval
    this.intervalId = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('❌ Error collecting metrics:', error.message);
      }
    }, this.config.interval);
    
    // Auto-stop after duration
    setTimeout(() => {
      this.stop();
    }, this.config.duration);
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping monitor...');
      this.stop();
    });
  }
  
  // Stop monitoring
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Generate summary
    this.data.summary = this.generateSummary();
    this.data.endTime = new Date().toISOString();
    
    // Save results
    this.saveResults();
    
    // Display final summary
    this.displaySummary();
    
    process.exit(0);
  }
  
  // Save results to file
  saveResults() {
    try {
      const outputPath = path.join(__dirname, this.config.outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(this.data, null, 2));
      console.log(`\n💾 Results saved to: ${outputPath}`);
    } catch (error) {
      console.error('❌ Failed to save results:', error.message);
    }
  }
  
  // Display final summary
  displaySummary() {
    console.clear();
    console.log('📊 RESOURCE MONITORING SUMMARY');
    console.log('='.repeat(50));
    console.log(`🌐 Environment: ${this.data.environment.toUpperCase()}`);
    console.log(`⏱️ Duration: ${this.data.summary.duration}s`);
    console.log(`📈 Samples: ${this.data.summary.totalSamples}`);
    console.log();
    
    if (this.data.summary.system) {
      console.log('💻 SYSTEM RESOURCES:');
      console.log(`   Memory Usage: ${this.data.summary.system.memory.min}% - ${this.data.summary.system.memory.max}% (avg: ${this.data.summary.system.memory.avg}%)`);
      console.log(`   CPU Load: ${this.data.summary.system.cpu.min} - ${this.data.summary.system.cpu.max} (avg: ${this.data.summary.system.cpu.avg})`);
      console.log();
    }
    
    if (this.data.summary.matchServer) {
      console.log('🎯 MATCH SERVER:');
      console.log(`   Availability: ${this.data.summary.matchServer.availability}%`);
      
      if (this.data.summary.matchServer.matches !== 'no data') {
        const matches = this.data.summary.matchServer.matches;
        console.log(`   Active Matches: ${matches.min} - ${matches.max} (avg: ${matches.avg})`);
      }
      
      if (this.data.summary.matchServer.players !== 'no data') {
        const players = this.data.summary.matchServer.players;
        console.log(`   Total Players: ${players.min} - ${players.max} (avg: ${players.avg})`);
      }
    }
    
    console.log('\n✅ Monitoring completed successfully!');
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    environment: 'localhost',
    interval: 5000,
    duration: 300000
  };
  
  args.forEach(arg => {
    if (arg.startsWith('--env=')) {
      config.environment = arg.split('=')[1];
    } else if (arg.startsWith('--interval=')) {
      config.interval = parseInt(arg.split('=')[1]) * 1000;
    } else if (arg.startsWith('--duration=')) {
      config.duration = parseInt(arg.split('=')[1]) * 1000;
    } else if (arg.startsWith('--output=')) {
      config.outputFile = arg.split('=')[1];
    }
  });
  
  return config;
}

function printUsage() {
  console.log('📊 Resource Monitor for Match Service Testing');
  console.log('===========================================\n');
  console.log('Usage: node resource-monitor-enhanced.js [options]\n');
  console.log('Options:');
  console.log('  --env=ENV        Environment (localhost|network|hosted) [default: localhost]');
  console.log('  --interval=SEC   Monitoring interval in seconds [default: 5]');
  console.log('  --duration=SEC   Total monitoring duration in seconds [default: 300]');
  console.log('  --output=FILE    Output file name [default: resource-monitor-results.json]');
  console.log('\nExamples:');
  console.log('  node resource-monitor-enhanced.js --env=localhost --duration=600');
  console.log('  node resource-monitor-enhanced.js --env=network --interval=10');
  console.log('  node resource-monitor-enhanced.js --env=hosted --duration=1800');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  const config = parseArgs();
  const monitor = new ResourceMonitor(config);
  
  monitor.start().catch(console.error);
}

module.exports = ResourceMonitor;
