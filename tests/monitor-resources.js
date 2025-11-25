/**
 * System Resource Monitor
 * Tracks CPU, Memory, and Docker container stats during stress testing
 */

const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ResourceMonitor {
  constructor() {
    this.samples = [];
    this.startTime = Date.now();
  }

  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    return usage;
  }

  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return {
      total: (totalMem / 1024 / 1024 / 1024).toFixed(2),
      used: (usedMem / 1024 / 1024 / 1024).toFixed(2),
      free: (freeMem / 1024 / 1024 / 1024).toFixed(2),
      percent: ((usedMem / totalMem) * 100).toFixed(2)
    };
  }

  async getDockerStats() {
    try {
      const { stdout } = await execAsync(
        'docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"'
      );
      return stdout;
    } catch (error) {
      return 'Docker stats unavailable';
    }
  }

  async collectSample() {
    const sample = {
      timestamp: new Date().toISOString(),
      elapsed: ((Date.now() - this.startTime) / 1000).toFixed(1),
      cpu: this.getCPUUsage(),
      memory: this.getMemoryUsage(),
      docker: await this.getDockerStats()
    };
    this.samples.push(sample);
    return sample;
  }

  async startMonitoring(interval = 5000) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 RESOURCE MONITOR STARTED`);
    console.log(`${'='.repeat(80)}\n`);

    this.monitorInterval = setInterval(async () => {
      const sample = await this.collectSample();
      this.printSample(sample);
    }, interval);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }

  printSample(sample) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 RESOURCE SNAPSHOT - ${sample.timestamp}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`⏱️  Elapsed: ${sample.elapsed}s`);
    console.log(`\n💻 SYSTEM RESOURCES:`);
    console.log(`   CPU Usage: ${sample.cpu}%`);
    console.log(`   Memory Total: ${sample.memory.total}GB`);
    console.log(`   Memory Used: ${sample.memory.used}GB`);
    console.log(`   Memory Free: ${sample.memory.free}GB`);
    console.log(`   Memory %: ${sample.memory.percent}%`);
    console.log(`\n🐳 DOCKER CONTAINERS:`);
    console.log(sample.docker);
    console.log(`${'='.repeat(80)}\n`);
  }

  printFinalReport() {
    if (this.samples.length === 0) {
      console.log('No samples collected');
      return;
    }

    const cpuValues = this.samples.map(s => s.cpu);
    const memValues = this.samples.map(s => parseFloat(s.memory.percent));

    const avgCPU = (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(2);
    const maxCPU = Math.max(...cpuValues);
    const minCPU = Math.min(...cpuValues);

    const avgMem = (memValues.reduce((a, b) => a + b, 0) / memValues.length).toFixed(2);
    const maxMem = Math.max(...memValues).toFixed(2);
    const minMem = Math.min(...memValues).toFixed(2);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 RESOURCE MONITORING FINAL REPORT`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n💻 CPU STATISTICS:`);
    console.log(`   Average: ${avgCPU}%`);
    console.log(`   Maximum: ${maxCPU}%`);
    console.log(`   Minimum: ${minCPU}%`);
    console.log(`   Samples: ${cpuValues.length}`);
    console.log(`\n🧠 MEMORY STATISTICS:`);
    console.log(`   Average: ${avgMem}%`);
    console.log(`   Maximum: ${maxMem}%`);
    console.log(`   Minimum: ${minMem}%`);
    console.log(`   Samples: ${memValues.length}`);
    console.log(`${'='.repeat(80)}\n`);
  }
}

// Export for use in other scripts
module.exports = ResourceMonitor;

// If run directly, start monitoring
if (require.main === module) {
  const monitor = new ResourceMonitor();
  monitor.startMonitoring(5000);

  // Stop on CTRL+C
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping monitor...');
    monitor.stopMonitoring();
    monitor.printFinalReport();
    process.exit(0);
  });
}
