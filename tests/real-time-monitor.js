/**
 * Real-Time Match Monitoring Dashboard
 * Shows live statistics of ongoing matches
 */

const axios = require('axios');
const Table = require('cli-table3');
const chalk = require('chalk');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const REFRESH_INTERVAL = 2000; // 2 seconds

let previousMetrics = null;

async function fetchMetrics() {
  try {
    const response = await axios.get(`${API_URL}/metrics`, {
      headers: { 'Accept': 'text/plain' }
    });
    return parsePrometheusMetrics(response.data);
  } catch (error) {
    return null;
  }
}

function parsePrometheusMetrics(metricsText) {
  const lines = metricsText.split('\n');
  const metrics = {};
  
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    
    const match = line.match(/^(\w+)(?:{[^}]*})?\s+([\d.]+)/);
    if (match) {
      const [, name, value] = match;
      metrics[name] = parseFloat(value);
    }
  }
  
  return metrics;
}

function calculateRate(current, previous, key) {
  if (!previous || !previous[key]) return 0;
  return Math.max(0, current[key] - previous[key]);
}

async function displayDashboard() {
  console.clear();
  
  const metrics = await fetchMetrics();
  
  if (!metrics) {
    console.log(chalk.red('❌ Unable to fetch metrics. Is the server running?'));
    console.log(chalk.yellow(`   Trying to connect to: ${API_URL}/metrics\n`));
    return;
  }
  
  const timestamp = new Date().toLocaleTimeString();
  
  // Header
  console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║           QuizDash Real-Time Match Monitoring                    ║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════════╝\n'));
  console.log(chalk.gray(`Last updated: ${timestamp}\n`));
  
  // Match Statistics
  const activeMatches = metrics.matchserver_active_matches_total || 0;
  const connectedPlayers = metrics.matchserver_connected_players_total || 0;
  const matchesCreated = metrics.matchserver_matches_created_total || 0;
  const uptime = metrics.matchserver_uptime_seconds || 0;
  
  // Calculate rates
  const matchCreationRate = previousMetrics ? 
    calculateRate(metrics, previousMetrics, 'matchserver_matches_created_total') : 0;
  
  const matchTable = new Table({
    head: [
      chalk.bold('Metric'),
      chalk.bold('Current'),
      chalk.bold('Status')
    ],
    colWidths: [30, 15, 30]
  });
  
  // Color coding based on thresholds
  const activeMatchesColor = activeMatches > 1500 ? chalk.red : 
                            activeMatches > 1000 ? chalk.yellow : chalk.green;
  
  const playersColor = connectedPlayers > 3000 ? chalk.red :
                      connectedPlayers > 2000 ? chalk.yellow : chalk.green;
  
  matchTable.push(
    ['Active Matches', activeMatchesColor(activeMatches.toString()), 
     activeMatches > 1800 ? chalk.red('⚠️  Near Capacity') : chalk.green('✅ Normal')],
    ['Connected Players', playersColor(connectedPlayers.toString()),
     connectedPlayers > 3500 ? chalk.red('⚠️  High Load') : chalk.green('✅ Healthy')],
    ['Total Matches Created', matchesCreated.toString(), 
     `${matchCreationRate.toFixed(1)}/s creation rate`],
    ['Server Uptime', `${(uptime / 60).toFixed(1)} min`, 
     uptime > 600 ? chalk.green('✅ Stable') : chalk.yellow('⚡ Starting')]
  );
  
  console.log(matchTable.toString() + '\n');
  
  // Worker Statistics
  const totalWorkers = metrics.matchserver_total_workers || 0;
  const activeWorkers = metrics.matchserver_active_workers || 0;
  const idleWorkers = metrics.matchserver_idle_workers || 0;
  
  if (totalWorkers > 0) {
    const workerTable = new Table({
      head: [chalk.bold('Worker Stats'), chalk.bold('Count'), chalk.bold('Percentage')],
      colWidths: [25, 15, 20]
    });
    
    const workerUtilization = totalWorkers > 0 ? 
      ((activeWorkers / totalWorkers) * 100).toFixed(1) : 0;
    
    const utilizationColor = workerUtilization > 80 ? chalk.red :
                            workerUtilization > 60 ? chalk.yellow : chalk.green;
    
    workerTable.push(
      ['Total Workers', totalWorkers.toString(), '100%'],
      ['Active Workers', chalk.green(activeWorkers.toString()), `${workerUtilization}%`],
      ['Idle Workers', chalk.gray(idleWorkers.toString()), 
       `${(100 - workerUtilization).toFixed(1)}%`]
    );
    
    console.log(workerTable.toString() + '\n');
    console.log(`Worker Utilization: ${utilizationColor(workerUtilization + '%')}\n`);
  }
  
  // System Resources
  const memoryUsage = metrics.matchserver_memory_usage_bytes || 0;
  const memoryMB = (memoryUsage / 1024 / 1024).toFixed(1);
  
  const systemTable = new Table({
    head: [chalk.bold('System Resource'), chalk.bold('Value'), chalk.bold('Status')],
    colWidths: [25, 20, 25]
  });
  
  const memoryColor = memoryMB > 4096 ? chalk.red :
                     memoryMB > 2048 ? chalk.yellow : chalk.green;
  
  systemTable.push(
    ['Memory Usage', memoryColor(`${memoryMB} MB`),
     memoryMB > 6000 ? chalk.red('⚠️  High') : chalk.green('✅ Normal')],
    ['Store Type', metrics.matchserver_store_type === 1 ? 'Redis' : 'In-Memory',
     metrics.matchserver_store_type === 1 ? chalk.green('✅ Persistent') : chalk.yellow('⚠️  Volatile')],
    ['Server Status', metrics.matchserver_status === 1 ? chalk.green('RUNNING') : chalk.red('STOPPED'),
     metrics.matchserver_status === 1 ? chalk.green('✅ Operational') : chalk.red('❌ Down')]
  );
  
  console.log(systemTable.toString() + '\n');
  
  // Capacity Analysis
  const capacityPercent = (activeMatches / 2000 * 100).toFixed(1);
  const remainingCapacity = Math.max(0, 2000 - activeMatches);
  
  console.log(chalk.bold('📊 Capacity Analysis:\n'));
  console.log(`   Current Load: ${capacityPercent}% of target (2000 matches)`);
  console.log(`   Remaining Capacity: ${remainingCapacity} matches`);
  
  const progressBar = generateProgressBar(capacityPercent);
  console.log(`   ${progressBar}\n`);
  
  // Warnings
  if (activeMatches > 1800) {
    console.log(chalk.red.bold('⚠️  WARNING: Approaching maximum capacity!'));
    console.log(chalk.yellow('   Consider scaling up or load balancing\n'));
  }
  
  if (memoryMB > 6000) {
    console.log(chalk.red.bold('⚠️  WARNING: High memory usage detected!'));
    console.log(chalk.yellow('   Monitor for memory leaks or increase server resources\n'));
  }
  
  // Performance Tips
  console.log(chalk.gray('───────────────────────────────────────────────────────────────────\n'));
  console.log(chalk.dim('Press Ctrl+C to exit'));
  console.log(chalk.dim(`Monitoring: ${API_URL}/metrics (updates every ${REFRESH_INTERVAL / 1000}s)`));
  
  previousMetrics = metrics;
}

function generateProgressBar(percent) {
  const width = 50;
  const filled = Math.round(width * percent / 100);
  const empty = width - filled;
  
  let color = chalk.green;
  if (percent > 90) color = chalk.red;
  else if (percent > 70) color = chalk.yellow;
  
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty)) + ` ${percent}%`;
}

// Start monitoring
console.log(chalk.bold.cyan('\n🚀 Starting Real-Time Match Monitor...\n'));
console.log(chalk.gray(`Connecting to: ${API_URL}`));

displayDashboard();
const interval = setInterval(displayDashboard, REFRESH_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log(chalk.yellow('\n\n👋 Monitoring stopped. Goodbye!\n'));
  process.exit(0);
});
