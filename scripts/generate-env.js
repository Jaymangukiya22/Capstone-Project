#!/usr/bin/env node

/**
 * QuizUP Unified Environment Generator
 * Generates environment files based on deployment mode
 * Supports: localhost, network, production
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get deployment mode from command line or environment
const deploymentMode = process.argv[2] || process.env.DEPLOYMENT_MODE || 'localhost';
const networkIP = process.argv[3] || process.env.NETWORK_IP || 'auto';

console.log(`🚀 Generating environment for: ${deploymentMode.toUpperCase()}`);

// Auto-detect network IP if needed
function getNetworkIP() {
  if (networkIP !== 'auto') return networkIP;
  
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || 
            iface.address.startsWith('10.') || 
            iface.address.startsWith('172.')) {
          return iface.address;
        }
      }
    }
  }
  return '192.168.1.100'; // fallback
}

const detectedIP = getNetworkIP();
console.log(`🌐 Network IP: ${detectedIP}`);

// Configuration templates based on deployment mode
const configs = {
  localhost: {
    NODE_ENV: 'development',
    DEPLOYMENT_MODE: 'localhost',
    
    // URLs
    API_BASE_URL: 'http://localhost:8090',
    WEBSOCKET_URL: 'ws://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
    
    // Comprehensive CORS settings for localhost
    CORS_ORIGIN: 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:8090',
    
    // Resource limits
    BACKEND_CPU_LIMIT: '0.5',
    MATCHSERVER_CPU_LIMIT: '0.5',
    BACKEND_MEMORY_LIMIT: '512M',
    MATCHSERVER_MEMORY_LIMIT: '512M',
    
    // Performance (lightweight)
    MIN_WORKERS: '1',
    MAX_WORKERS: '2',
    DB_POOL_MAX: '10',
    REDIS_POOL_MAX: '10',
    RATE_LIMIT_MAX_REQUESTS: '500',
    LOG_LEVEL: 'debug',
    
    // Development flags
    ENABLE_DEBUG_ROUTES: 'true',
    ENABLE_SWAGGER: 'true',
    SEED_DATABASE: 'true',
    
    // Frontend
    VITE_API_BASE_URL: 'http://localhost:8090',
    VITE_WEBSOCKET_URL: 'ws://localhost:3001',
    VITE_CLOUDFLARE_HOSTED: 'false',
    VITE_NETWORK_MODE: 'false',
  },
  
  network: {
    NODE_ENV: 'development',
    DEPLOYMENT_MODE: 'network',
    NETWORK_IP: detectedIP,
    
    // URLs
    API_BASE_URL: `http://${detectedIP}:8090`,
    WEBSOCKET_URL: `ws://${detectedIP}:3001`,
    FRONTEND_URL: `http://${detectedIP}:5173`,
    
    // Comprehensive CORS settings for network IP
    CORS_ORIGIN: `http://localhost:5173,http://localhost:5174,http://${detectedIP}:5173,http://${detectedIP}:5174,http://localhost:8090,http://${detectedIP}:8090`,
    
    // Resource limits (a bit higher than localhost)
    BACKEND_CPU_LIMIT: '1.0',
    MATCHSERVER_CPU_LIMIT: '1.0',
    BACKEND_MEMORY_LIMIT: '1G',
    MATCHSERVER_MEMORY_LIMIT: '1G',
    
    // Performance (medium scale)
    MIN_WORKERS: '2',
    MAX_WORKERS: '4',
    DB_POOL_MAX: '20',
    REDIS_POOL_MAX: '20',
    RATE_LIMIT_MAX_REQUESTS: '1000',
    LOG_LEVEL: 'info',
    
    // Development flags
    ENABLE_DEBUG_ROUTES: 'true',
    ENABLE_SWAGGER: 'true',
    SEED_DATABASE: 'false',
    
    // Frontend
    VITE_API_BASE_URL: `http://${detectedIP}:8090`,
    VITE_WEBSOCKET_URL: `ws://${detectedIP}:3001`,
    VITE_CLOUDFLARE_HOSTED: 'false',
    VITE_NETWORK_MODE: 'true',
    VITE_NETWORK_IP: detectedIP,
  },
  
  production: {
    NODE_ENV: 'production',
    DEPLOYMENT_MODE: 'production',
    
    // URLs
    API_BASE_URL: 'https://api.quizdash.dpdns.org',
    WEBSOCKET_URL: 'wss://match.quizdash.dpdns.org',
    FRONTEND_URL: 'https://quizdash.dpdns.org',
    
    // Comprehensive CORS settings for production domain
    CORS_ORIGIN: 'https://quizdash.dpdns.org,https://www.quizdash.dpdns.org,https://api.quizdash.dpdns.org,https://match.quizdash.dpdns.org',
    
    // Production resource limits
    BACKEND_CPU_LIMIT: '2.0',
    MATCHSERVER_CPU_LIMIT: '2.0',
    BACKEND_MEMORY_LIMIT: '2G',
    MATCHSERVER_MEMORY_LIMIT: '2G',
    
    // Performance (high scale)
    MIN_WORKERS: '4',
    MAX_WORKERS: '8',
    DB_POOL_MAX: '50',
    REDIS_POOL_MAX: '30',
    RATE_LIMIT_MAX_REQUESTS: '2000',
    LOG_LEVEL: 'warn',
    
    // Production flags
    ENABLE_DEBUG_ROUTES: 'false',
    ENABLE_SWAGGER: 'false',
    SEED_DATABASE: 'false',
    
    // Frontend
    VITE_API_BASE_URL: 'https://api.quizdash.dpdns.org',
    VITE_WEBSOCKET_URL: 'wss://match.quizdash.dpdns.org',
    VITE_CLOUDFLARE_HOSTED: 'true',
    VITE_NETWORK_MODE: 'false',
    
    // Docker Swarm
    BACKEND_REPLICAS: '4',
    MATCHSERVER_REPLICAS: '3',
    FRONTEND_REPLICAS: '2',
  }
};

// Load base configuration
const baseConfig = fs.readFileSync(path.join(__dirname, '../.env.unified'), 'utf8');
const selectedConfig = configs[deploymentMode];

if (!selectedConfig) {
  console.error(`❌ Invalid deployment mode: ${deploymentMode}`);
  console.error('Valid modes: localhost, network, production');
  process.exit(1);
}

// Generate main .env file
let envContent = baseConfig;

// Replace dynamic values
Object.entries(selectedConfig).forEach(([key, value]) => {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (envContent.match(regex)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }
});

// Add deployment-specific comments
envContent += `\n\n# =============================================================================`;
envContent += `\n# AUTO-GENERATED FOR: ${deploymentMode.toUpperCase()}`;
envContent += `\n# Generated at: ${new Date().toISOString()}`;
if (deploymentMode === 'network') {
  envContent += `\n# Network IP: ${detectedIP}`;
}
envContent += `\n# =============================================================================`;

// Write main .env file
fs.writeFileSync(path.join(__dirname, '../.env'), envContent);
console.log('✅ Generated: .env');

// Generate frontend .env file
const frontendEnvContent = [
  `# Frontend Environment - ${deploymentMode.toUpperCase()}`,
  `# Generated at: ${new Date().toISOString()}`,
  '',
  `VITE_NODE_ENV=${selectedConfig.NODE_ENV}`,
  `VITE_API_BASE_URL=${selectedConfig.VITE_API_BASE_URL}`,
  `VITE_WEBSOCKET_URL=${selectedConfig.VITE_WEBSOCKET_URL}`,
  `VITE_APP_NAME=QuizUP`,
  `VITE_APP_VERSION=1.0.0`,
  `VITE_CLOUDFLARE_HOSTED=${selectedConfig.VITE_CLOUDFLARE_HOSTED}`,
  `VITE_NETWORK_MODE=${selectedConfig.VITE_NETWORK_MODE}`,
];

if (selectedConfig.VITE_NETWORK_IP) {
  frontendEnvContent.push(`VITE_NETWORK_IP=${selectedConfig.VITE_NETWORK_IP}`);
}

fs.writeFileSync(path.join(__dirname, '../Frontend-admin/.env'), frontendEnvContent.join('\n'));
console.log('✅ Generated: Frontend-admin/.env');

// Generate backend .env file
const backendEnvContent = [
  `# Backend Environment - ${deploymentMode.toUpperCase()}`,
  `# Generated at: ${new Date().toISOString()}`,
  '',
  `NODE_ENV=${selectedConfig.NODE_ENV}`,
  `BACKEND_PORT=3000`,
  `MATCH_SERVICE_PORT=3001`,
  '',
  `# Database`,
  `POSTGRES_DB=quizup_db`,
  `POSTGRES_USER=quizup_user`,
  `POSTGRES_PASSWORD=quizup_password`,
  `DATABASE_URL=postgresql://quizup_user:quizup_password@postgres:5432/quizup_db`,
  '',
  `# Redis`,
  `REDIS_URL=redis://redis:6379`,
  '',
  `# Security`,
  `JWT_SECRET=7a0b42e9df5856f7cfe0094361f65630`,
  `JWT_REFRESH_SECRET=cc904107600ce1cc0631f254302ebf11`,
  '',
  `# Performance`,
  `MIN_WORKERS=${selectedConfig.MIN_WORKERS}`,
  `MAX_WORKERS=${selectedConfig.MAX_WORKERS}`,
  `DB_POOL_MAX=${selectedConfig.DB_POOL_MAX}`,
  `LOG_LEVEL=${selectedConfig.LOG_LEVEL}`,
  '',
  `# CORS`,
  `CORS_ORIGIN=${selectedConfig.CORS_ORIGIN}`,
];

fs.writeFileSync(path.join(__dirname, '../backend/.env'), backendEnvContent.join('\n'));
console.log('✅ Generated: backend/.env');

// Display access information
console.log('\n🌐 Access Information:');
console.log('================================');
if (deploymentMode === 'localhost') {
  console.log('📱 Frontend: http://localhost:5173');
  console.log('🔌 API: http://localhost:8090');
  console.log('⚡ WebSocket: ws://localhost:3001');
} else if (deploymentMode === 'network') {
  console.log('📱 Frontend (local): http://localhost:5173');
  console.log(`📱 Frontend (network): http://${detectedIP}:5173`);
  console.log(`🔌 API: http://${detectedIP}:8090`);
  console.log(`⚡ WebSocket: ws://${detectedIP}:3001`);
} else {
  console.log('📱 Frontend: https://quizdash.dpdns.org');
  console.log('🔌 API: https://api.quizdash.dpdns.org');
  console.log('⚡ WebSocket: wss://match.quizdash.dpdns.org');
}

console.log('\n🚀 Next Steps:');
if (deploymentMode === 'production') {
  console.log('1. docker stack deploy -c docker-stack.yml quizup');
} else {
  console.log('1. docker-compose up -d');
}
console.log('2. Test the application');
console.log('3. Monitor performance');

console.log(`\n✅ Environment configured for ${deploymentMode.toUpperCase()} mode!`);
