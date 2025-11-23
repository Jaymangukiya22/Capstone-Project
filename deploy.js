#!/usr/bin/env node

/**
 * QuizUP Unified Deployment Script
 * Supports: localhost, network, production
 * Handles: Environment generation, Docker deployment, Docker Swarm
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const mode = process.argv[2] || 'localhost';
const action = process.argv[3] || 'up';
const networkIP = process.argv[4];

console.log(`🚀 QuizUP Deployment - Mode: ${mode.toUpperCase()}, Action: ${action.toUpperCase()}`);

// Validate mode
const validModes = ['localhost', 'network', 'production'];
if (!validModes.includes(mode)) {
  console.error(`❌ Invalid mode: ${mode}`);
  console.error(`Valid modes: ${validModes.join(', ')}`);
  process.exit(1);
}

// Validate action
const validActions = ['up', 'down', 'restart', 'logs', 'status'];
if (!validActions.includes(action)) {
  console.error(`❌ Invalid action: ${action}`);
  console.error(`Valid actions: ${validActions.join(', ')}`);
  process.exit(1);
}

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    const result = execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

function generateEnvironment() {
  console.log('📝 Generating environment configuration...');
  const envCommand = networkIP 
    ? `node scripts/generate-env.js ${mode} ${networkIP}`
    : `node scripts/generate-env.js ${mode}`;
  runCommand(envCommand, 'Environment generation');
}

function cleanupOldConfigs() {
  console.log('🧹 Cleaning up old configuration files...');
  
  // Remove old environment files
  const oldEnvFiles = [
    '.env.tunnel', '.env.ec2.example', '.env.production.full',
    'backend/.env.example', 'backend/.env.production', 'backend/.env.development',
    'Frontend-admin/.env.local'
  ];
  
  oldEnvFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`🗑️  Removed: ${file}`);
    }
  });
  
  // Remove old nginx configs
  const oldNginxFiles = [
    'nginx-scaling.conf', 'nginx/nginx.conf', 'Frontend-admin/nginx.conf'
  ];
  
  oldNginxFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`🗑️  Removed: ${file}`);
    }
  });
  
  console.log('✅ Cleanup completed');
}

function deployWithDockerCompose() {
  console.log('🐳 Deploying with Docker Compose...');
  
  switch (action) {
    case 'up':
      if (mode === 'production') {
        // Use scaling configuration for production
        runCommand('docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d', 'Starting services with scaling');
      } else {
        runCommand('docker-compose up -d', 'Starting services');
      }
      break;
      
    case 'down':
      runCommand('docker-compose down', 'Stopping services');
      break;
      
    case 'restart':
      runCommand('docker-compose restart', 'Restarting services');
      break;
      
    case 'logs':
      runCommand('docker-compose logs -f', 'Viewing logs');
      break;
      
    case 'status':
      runCommand('docker-compose ps', 'Checking service status');
      break;
  }
}

function deployWithDockerSwarm() {
  console.log('🐳 Deploying with Docker Swarm...');
  
  switch (action) {
    case 'up':
      // Initialize swarm if not already done
      try {
        execSync('docker info --format "{{.Swarm.LocalNodeState}}"', { stdio: 'pipe' });
      } catch {
        console.log('🔧 Initializing Docker Swarm...');
        runCommand('docker swarm init', 'Docker Swarm initialization');
      }
      
      // Create external configs
      console.log('📝 Creating Docker configs...');
      try {
        runCommand('docker config create quizup_nginx_config nginx.conf', 'Creating nginx config');
      } catch {
        console.log('⚠️  Nginx config already exists, updating...');
        runCommand('docker config rm quizup_nginx_config', 'Removing old nginx config');
        runCommand('docker config create quizup_nginx_config nginx.conf', 'Creating new nginx config');
      }
      
      // Deploy stack
      runCommand('docker stack deploy -c docker-stack.yml quizup', 'Deploying Docker stack');
      break;
      
    case 'down':
      runCommand('docker stack rm quizup', 'Removing Docker stack');
      break;
      
    case 'restart':
      runCommand('docker stack rm quizup', 'Removing Docker stack');
      setTimeout(() => {
        runCommand('docker stack deploy -c docker-stack.yml quizup', 'Redeploying Docker stack');
      }, 5000);
      break;
      
    case 'logs':
      runCommand('docker service logs -f quizup_backend', 'Viewing backend logs');
      break;
      
    case 'status':
      runCommand('docker stack services quizup', 'Checking stack services');
      runCommand('docker stack ps quizup', 'Checking stack tasks');
      break;
  }
}

function displayAccessInfo() {
  console.log('\n🌐 Access Information:');
  console.log('================================');
  
  if (mode === 'localhost') {
    console.log('📱 Frontend: http://localhost:5173');
    console.log('🔌 API: http://localhost:8090');
    console.log('⚡ WebSocket: ws://localhost:3001');
    console.log('🗄️  Database Admin: http://localhost:8080');
  } else if (mode === 'network') {
    const ip = networkIP || 'YOUR_NETWORK_IP';
    console.log('📱 Frontend (local): http://localhost:5173');
    console.log(`📱 Frontend (network): http://${ip}:5173`);
    console.log(`🔌 API: http://${ip}:8090`);
    console.log(`⚡ WebSocket: ws://${ip}:3001`);
    console.log(`🗄️  Database Admin: http://${ip}:8080`);
  } else {
    console.log('📱 Frontend: https://quizdash.dpdns.org');
    console.log('🔌 API: https://api.quizdash.dpdns.org');
    console.log('⚡ WebSocket: wss://match.quizdash.dpdns.org');
    console.log('🗄️  Database Admin: https://adminer.quizdash.dpdns.org');
  }
  
  console.log('\n📊 Monitoring:');
  if (mode === 'production') {
    console.log('• Docker Stack: docker stack services quizup');
    console.log('• Service Logs: docker service logs quizup_backend');
    console.log('• Worker Stats: curl https://api.quizdash.dpdns.org/workers/stats');
  } else {
    console.log('• Container Status: docker-compose ps');
    console.log('• Service Logs: docker-compose logs -f');
    console.log('• Worker Stats: curl http://localhost:8090/workers/stats');
  }
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check Docker
  try {
    execSync('docker --version', { stdio: 'pipe' });
    console.log('✅ Docker is installed');
  } catch {
    console.error('❌ Docker is not installed or not running');
    process.exit(1);
  }
  
  // Check Docker Compose (for non-production)
  if (mode !== 'production') {
    try {
      execSync('docker-compose --version', { stdio: 'pipe' });
      console.log('✅ Docker Compose is available');
    } catch {
      console.error('❌ Docker Compose is not installed');
      process.exit(1);
    }
  }
  
  // Check required files
  const requiredFiles = ['docker-compose.yml', 'scripts/generate-env.js', 'nginx.conf'];
  if (mode === 'production') {
    requiredFiles.push('docker-stack.yml');
  }
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      console.error(`❌ Required file missing: ${file}`);
      process.exit(1);
    }
  });
  
  console.log('✅ All prerequisites met');
}

// Main deployment flow
async function main() {
  try {
    checkPrerequisites();
    
    if (action === 'up') {
      cleanupOldConfigs();
      generateEnvironment();
    }
    
    if (mode === 'production') {
      deployWithDockerSwarm();
    } else {
      deployWithDockerCompose();
    }
    
    if (action === 'up') {
      displayAccessInfo();
      
      console.log('\n🎉 Deployment completed successfully!');
      console.log('\n💡 Useful commands:');
      console.log(`• Check status: node deploy.js ${mode} status`);
      console.log(`• View logs: node deploy.js ${mode} logs`);
      console.log(`• Restart: node deploy.js ${mode} restart`);
      console.log(`• Stop: node deploy.js ${mode} down`);
    }
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check Docker is running: docker ps');
    console.error('2. Check logs: docker-compose logs');
    console.error('3. Check ports: netstat -tulpn | grep :8090');
    process.exit(1);
  }
}

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 QuizUP Unified Deployment Script

Usage:
  node deploy.js <mode> <action> [network-ip]

Modes:
  localhost   - Local development (default)
  network     - Network access (LAN/WiFi)
  production  - Production with Docker Swarm

Actions:
  up         - Start services (default)
  down       - Stop services
  restart    - Restart services
  logs       - View logs
  status     - Check status

Examples:
  node deploy.js localhost up
  node deploy.js network up 192.168.1.100
  node deploy.js production up
  node deploy.js localhost logs
  node deploy.js production status

For 4000+ concurrent users, use production mode with Docker Swarm.
  `);
  process.exit(0);
}

main();
