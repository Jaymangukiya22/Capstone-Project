#!/usr/bin/env node

/**
 * Backend server startup script for Node.js
 * Alternative to shell script for environments that don't support bash
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  matchPort: process.env.MATCH_SERVICE_PORT || 3001,
  serviceType: process.env.SERVICE_TYPE || 'backend',
  postgresUser: process.env.POSTGRES_USER || 'quizup_user',
  postgresDb: process.env.POSTGRES_DB || 'quizup_db'
};

console.log('Starting Quiz App Backend Server...');
console.log('Configuration:', config);

// Utility function to run commands
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

// Wait for service to be ready
async function waitForService(command, args, message, retries = 30) {
  console.log(`Waiting for ${message}...`);
  
  for (let i = 0; i < retries; i++) {
    try {
      await runCommand(command, args, { stdio: 'pipe' });
      console.log(`${message} is ready!`);
      return;
    } catch (error) {
      console.log(`${message} is unavailable - sleeping`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error(`${message} failed to become ready after ${retries} attempts`);
}

// Main startup function
async function startup() {
  try {
    // Wait for database
    await waitForService(
      'pg_isready',
      ['-h', 'postgres', '-p', '5432', '-U', config.postgresUser, '-d', config.postgresDb],
      'Database'
    );

    // Wait for Redis
    await waitForService(
      'redis-cli',
      ['-h', 'redis', '-p', '6379', 'ping'],
      'Redis'
    );

    // Build TypeScript if needed
    const fs = require('fs');
    if (!fs.existsSync('dist')) {
      console.log('Building TypeScript...');
      await runCommand('npm', ['run', 'build']);
    }

    // Database setup for backend service
    if (config.serviceType === 'backend') {
      console.log('Setting up database...');
      try {
        await runCommand('node', ['dist/scripts/setupDatabase.js']);
      } catch (error) {
        console.log('Database setup completed or already exists');
      }

      // Development seed
      if (config.nodeEnv === 'development') {
        console.log('Running development seed...');
        try {
          await runCommand('npm', ['run', 'seed:quick']);
        } catch (error) {
          console.log('Seeding completed or skipped');
        }
      }
    }

    // Start appropriate server
    const isMatchServer = config.serviceType === 'matchserver' || process.env.MATCH_SERVICE_PORT;
    
    if (isMatchServer) {
      console.log(`Starting Match Server on port ${config.matchPort}...`);
      process.env.PORT = config.matchPort;
      require('./dist/matchServer-enhanced.js');
    } else {
      console.log(`Starting Backend API Server on port ${config.port}...`);
      process.env.PORT = config.port;
      require('./dist/server.js');
    }
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the application
startup().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
