const express = require('express');
const questionRoutes = require('./dist/routes/questionRoutes').default;

const app = express();
app.use(express.json());

// Test route registration
app.use('/api/questions', questionRoutes);

// List all registered routes
function listRoutes() {
  console.log('📋 Registered Question Routes:');
  
  const routes = [];
  app._router.stack.forEach(function(middleware) {
    if (middleware.route) {
      routes.push({
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
        path: middleware.route.path
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(function(handler) {
        if (handler.route) {
          const method = Object.keys(handler.route.methods)[0].toUpperCase();
          const path = '/api/questions' + handler.route.path;
          routes.push({ method, path });
        }
      });
    }
  });

  routes.forEach(route => {
    console.log(`${route.method.padEnd(6)} ${route.path}`);
  });

  console.log(`\n✅ Total routes registered: ${routes.length}`);
}

// Test the routes
console.log('🧪 Testing Question Route Registration...\n');

try {
  listRoutes();
  
  console.log('\n🎯 Expected Routes:');
  console.log('POST   /api/questions');
  console.log('POST   /api/questions/quiz/:quizId');
  console.log('GET    /api/questions/quiz/:quizId');
  console.log('GET    /api/questions/quiz/:quizId/stats');
  console.log('GET    /api/questions/:id');
  console.log('PUT    /api/questions/:id');
  console.log('DELETE /api/questions/:id');
  
} catch (error) {
  console.error('❌ Route registration failed:', error.message);
  console.error('Stack:', error.stack);
}
