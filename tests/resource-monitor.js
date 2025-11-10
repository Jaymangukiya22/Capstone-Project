/**
 * COMPREHENSIVE RESOURCE MONITOR
 * Tracks CPU, RAM, Network I/O, Redis, PostgreSQL, Docker containers
 * Exports metrics in Grafana-compatible format
 */

const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');

const execAsync = promisify(exec);

const API_URL = process.env.API_URL || 'https://api.quizdash.dpdns.org';
const MONITOR_INTERVAL = 2000; // 2 seconds
const METRICS_FILE = 'resource-metrics.jsonl'; // JSON Lines format for time-series

class ResourceMonitor {
  constructor() {
    this.metrics = [];
    this.isRunning = false;
    this.interval = null;
  }
  
  async start() {
    console.log('🚀 Starting Resource Monitor...\n');
    this.isRunning = true;
    
    // Clear previous metrics file
    if (fs.existsSync(METRICS_FILE)) {
      fs.unlinkSync(METRICS_FILE);
    }
    
    await this.collect();
    this.interval = setInterval(() => this.collect(), MONITOR_INTERVAL);
    
    // Display header
    this.displayHeader();
  }
  
  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    console.log('\n✅ Monitor stopped. Metrics saved to:', METRICS_FILE);
  }
  
  displayHeader() {
    console.clear();
    console.log('═'.repeat(100));
    console.log(' QUIZDASH RESOURCE MONITOR'.padStart(60));
    console.log('═'.repeat(100));
    console.log();
  }
  
  async collect() {
    const timestamp = Date.now();
    const metric = {
      timestamp,
      datetime: new Date(timestamp).toISOString()
    };
    
    try {
      // System resources
      metric.system = await this.getSystemMetrics();
      
      // Node.js process
      metric.node = this.getNodeMetrics();
      
      // Docker containers
      metric.docker = await this.getDockerMetrics();
      
      // Redis metrics
      metric.redis = await this.getRedisMetrics();
      
      // PostgreSQL metrics
      metric.postgres = await this.getPostgresMetrics();
      
      // Network I/O
      metric.network = await this.getNetworkMetrics();
      
      // Application metrics
      metric.app = await this.getAppMetrics();
      
      // Save to file (JSON Lines format)
      fs.appendFileSync(METRICS_FILE, JSON.stringify(metric) + '\n');
      
      // Display current stats
      this.displayMetrics(metric);
      
    } catch (error) {
      console.error('❌ Error collecting metrics:', error.message);
    }
  }
  
  getSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total * 100);
    }, 0) / cpus.length;
    
    return {
      cpu: {
        cores: cpus.length,
        model: cpus[0].model,
        usage: cpuUsage.toFixed(2),
        loadAvg: os.loadavg()
      },
      memory: {
        totalMB: Math.round(totalMem / 1024 / 1024),
        usedMB: Math.round(usedMem / 1024 / 1024),
        freeMB: Math.round(freeMem / 1024 / 1024),
        usagePercent: ((usedMem / totalMem) * 100).toFixed(2)
      },
      uptime: os.uptime()
    };
  }
  
  getNodeMetrics() {
    const mem = process.memoryUsage();
    return {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      pid: process.pid,
      uptime: process.uptime()
    };
  }
  
  async getDockerMetrics() {
    try {
      const { stdout } = await execAsync('docker stats --no-stream --format "{{.Container}}|{{.CPUPerc}}|{{.MemUsage}}|{{.NetIO}}|{{.BlockIO}}"');
      
      const containers = {};
      stdout.trim().split('\n').forEach(line => {
        const [name, cpu, mem, net, block] = line.split('|');
        
        // Extract numeric values
        const cpuPercent = parseFloat(cpu.replace('%', ''));
        const memMatch = mem.match(/([\d.]+)([KMG]iB)\s*\/\s*([\d.]+)([KMG]iB)/);
        const netMatch = net.match(/([\d.]+)([KMG]B)\s*\/\s*([\d.]+)([KMG]B)/);
        
        containers[name] = {
          cpu: cpuPercent || 0,
          memoryUsed: memMatch ? memMatch[1] + memMatch[2] : '0',
          memoryTotal: memMatch ? memMatch[3] + memMatch[4] : '0',
          networkIn: netMatch ? netMatch[1] + netMatch[2] : '0',
          networkOut: netMatch ? netMatch[3] + netMatch[4] : '0',
          blockIO: block || '0'
        };
      });
      
      return containers;
    } catch (error) {
      return { error: 'Docker not available or no containers running' };
    }
  }
  
  async getRedisMetrics() {
    try {
      const { stdout } = await execAsync('docker exec quizup_redis redis-cli INFO stats');
      
      const metrics = {};
      stdout.split('\r\n').forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          if (key.startsWith('total_')) {
            metrics[key] = parseInt(value) || 0;
          }
        }
      });
      
      // Get memory info
      const memInfo = await execAsync('docker exec quizup_redis redis-cli INFO memory');
      memInfo.stdout.split('\r\n').forEach(line => {
        if (line.includes('used_memory_human:')) {
          metrics.memoryUsed = line.split(':')[1].trim();
        }
      });
      
      // Get connected clients
      const clients = await execAsync('docker exec quizup_redis redis-cli CLIENT LIST');
      metrics.connectedClients = clients.stdout.split('\n').length - 1;
      
      return metrics;
    } catch (error) {
      return { error: 'Redis metrics unavailable' };
    }
  }
  
  async getPostgresMetrics() {
    try {
      // Get database size
      const { stdout: dbSize } = await execAsync(
        'docker exec quizup_postgres psql -U quizup_user -d quizup_db -t -c "SELECT pg_size_pretty(pg_database_size(\'quizup_db\'));"'
      );
      
      // Get active connections
      const { stdout: connections } = await execAsync(
        'docker exec quizup_postgres psql -U quizup_user -d quizup_db -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = \'active\';"'
      );
      
      // Get table stats
      const { stdout: tableStats } = await execAsync(
        'docker exec quizup_postgres psql -U quizup_user -d quizup_db -t -c "SELECT schemaname,relname,n_live_tup FROM pg_stat_user_tables WHERE schemaname = \'public\' ORDER BY n_live_tup DESC LIMIT 5;"'
      );
      
      return {
        databaseSize: dbSize.trim(),
        activeConnections: parseInt(connections.trim()) || 0,
        topTables: tableStats.trim().split('\n').map(line => {
          const parts = line.trim().split('|').map(p => p.trim());
          return {
            table: parts[1],
            rows: parseInt(parts[2]) || 0
          };
        })
      };
    } catch (error) {
      return { error: 'PostgreSQL metrics unavailable' };
    }
  }
  
  async getNetworkMetrics() {
    try {
      const { stdout } = await execAsync('netstat -s 2>&1');
      
      // Parse key network statistics (this is OS-specific)
      const metrics = {
        connections: 0,
        packetsReceived: 0,
        packetsSent: 0
      };
      
      // Try to extract some basic stats
      const lines = stdout.split('\n');
      lines.forEach(line => {
        if (line.includes('connections established')) {
          metrics.connections = parseInt(line.match(/\d+/)?.[0]) || 0;
        }
      });
      
      return metrics;
    } catch (error) {
      return { error: 'Network metrics unavailable on Windows' };
    }
  }
  
  async getAppMetrics() {
    try {
      // Try to get matchserver metrics
      const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
      
      return {
        status: 'HEALTHY',
        ...response.data
      };
    } catch (error) {
      return {
        status: 'UNREACHABLE',
        error: error.message
      };
    }
  }
  
  displayMetrics(metric) {
    console.clear();
    this.displayHeader();
    
    const timestamp = new Date(metric.timestamp).toLocaleTimeString();
    console.log(`📊 Last Update: ${timestamp}\n`);
    
    // System Resources
    console.log('🖥️  SYSTEM RESOURCES');
    console.log('─'.repeat(100));
    if (metric.system) {
      const cpu = metric.system.cpu;
      const mem = metric.system.memory;
      
      console.log(`CPU: ${cpu.usage}% (${cpu.cores} cores) - Load: ${cpu.loadAvg.map(l => l.toFixed(2)).join(', ')}`);
      console.log(`RAM: ${mem.usedMB}MB / ${mem.totalMB}MB (${mem.usagePercent}%) - Free: ${mem.freeMB}MB`);
      console.log(`System Uptime: ${(metric.system.uptime / 3600).toFixed(1)}h`);
    }
    console.log();
    
    // Node.js Process
    console.log('🟢 NODE.JS PROCESS');
    console.log('─'.repeat(100));
    if (metric.node) {
      console.log(`Heap: ${metric.node.heapUsedMB}MB / ${metric.node.heapTotalMB}MB`);
      console.log(`RSS: ${metric.node.rssMB}MB | External: ${metric.node.externalMB}MB | PID: ${metric.node.pid}`);
      console.log(`Process Uptime: ${(metric.node.uptime / 60).toFixed(1)}m`);
    }
    console.log();
    
    // Docker Containers
    console.log('🐳 DOCKER CONTAINERS');
    console.log('─'.repeat(100));
    if (metric.docker && !metric.docker.error) {
      Object.entries(metric.docker).forEach(([name, stats]) => {
        const cpuColor = stats.cpu > 80 ? '🔴' : stats.cpu > 50 ? '🟡' : '🟢';
        console.log(`${cpuColor} ${name}:`);
        console.log(`   CPU: ${stats.cpu}% | Memory: ${stats.memoryUsed} / ${stats.memoryTotal}`);
        console.log(`   Network: ↓ ${stats.networkIn} / ↑ ${stats.networkOut} | I/O: ${stats.blockIO}`);
      });
    } else {
      console.log('⚠️  Docker metrics unavailable');
    }
    console.log();
    
    // Redis
    console.log('💾 REDIS');
    console.log('─'.repeat(100));
    if (metric.redis && !metric.redis.error) {
      console.log(`Memory: ${metric.redis.memoryUsed || 'N/A'}`);
      console.log(`Clients: ${metric.redis.connectedClients || 0}`);
      console.log(`Commands: ${metric.redis.total_commands_processed || 0} processed`);
      console.log(`Connections: ${metric.redis.total_connections_received || 0} received`);
    } else {
      console.log('⚠️  Redis metrics unavailable');
    }
    console.log();
    
    // PostgreSQL
    console.log('🐘 POSTGRESQL');
    console.log('─'.repeat(100));
    if (metric.postgres && !metric.postgres.error) {
      console.log(`Database Size: ${metric.postgres.databaseSize}`);
      console.log(`Active Connections: ${metric.postgres.activeConnections}`);
      if (metric.postgres.topTables) {
        console.log(`Top Tables:`);
        metric.postgres.topTables.slice(0, 3).forEach(t => {
          if (t.table) console.log(`   - ${t.table}: ${t.rows} rows`);
        });
      }
    } else {
      console.log('⚠️  PostgreSQL metrics unavailable');
    }
    console.log();
    
    // Application
    console.log('🚀 APPLICATION');
    console.log('─'.repeat(100));
    if (metric.app) {
      const statusIcon = metric.app.status === 'HEALTHY' ? '✅' : '❌';
      console.log(`${statusIcon} Status: ${metric.app.status}`);
      if (metric.app.activeMatches !== undefined) {
        console.log(`Active Matches: ${metric.app.activeMatches}`);
      }
    }
    console.log();
    
    console.log('─'.repeat(100));
    console.log('📄 Metrics saved to:', METRICS_FILE);
    console.log('⏸️  Press Ctrl+C to stop monitoring');
  }
}

// Run monitor
if (require.main === module) {
  const monitor = new ResourceMonitor();
  
  monitor.start().catch(error => {
    console.error('Failed to start monitor:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    monitor.stop();
    console.log('\n👋 Goodbye!\n');
    process.exit(0);
  });
}

module.exports = ResourceMonitor;
