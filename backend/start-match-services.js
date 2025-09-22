const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Quiz Match Services...\n');

// Start main backend service (port 3000)
const mainService = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Start enhanced match service (port 3001)
const matchService = spawn('npx', ['ts-node', 'src/matchServer-enhanced.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

console.log('📡 Main Backend Service: http://localhost:3000');
console.log('🎮 Enhanced Match Service: http://localhost:3001');
console.log('🔌 WebSocket URL: ws://localhost:3001\n');

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down services...');
  mainService.kill('SIGINT');
  matchService.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down services...');
  mainService.kill('SIGTERM');
  matchService.kill('SIGTERM');
  process.exit(0);
});

mainService.on('close', (code) => {
  console.log(`Main service exited with code ${code}`);
});

matchService.on('close', (code) => {
  console.log(`Match service exited with code ${code}`);
});
