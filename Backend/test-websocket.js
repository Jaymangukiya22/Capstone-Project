const io = require('socket.io-client');

console.log('🧪 Testing WebSocket connection and ready functionality...');

// Test connection
const socket = io('http://192.168.1.8:3001', {
  transports: ['websocket', 'polling'],
  timeout: 10000,
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Test authentication
  socket.emit('authenticate', {
    userId: 999,
    username: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  });
});

socket.on('authenticated', (data) => {
  console.log('✅ Authentication successful:', data);
  
  // Test creating a friend match
  socket.emit('create_friend_match', { quizId: 1 });
});

socket.on('friend_match_created', (data) => {
  console.log('✅ Friend match created:', data);
  
  // Test setting ready status
  console.log('🔄 Testing ready status...');
  socket.emit('player_ready', { ready: true });
});

socket.on('player_ready', (data) => {
  console.log('✅ Player ready event received:', data);
});

socket.on('player_list_updated', (data) => {
  console.log('✅ Player list updated:', data);
});

socket.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from WebSocket server');
});

// Cleanup after 10 seconds
setTimeout(() => {
  console.log('🧹 Cleaning up test...');
  socket.disconnect();
  process.exit(0);
}, 10000);
