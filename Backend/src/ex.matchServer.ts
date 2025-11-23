// import express from 'express';
// import { createServer } from 'http';
// import helmet from 'helmet';
// import compression from 'compression';
// // import cors from 'cors'; // DISABLED - Nginx handles CORS
// import { Server as SocketIOServer } from 'socket.io';
// import { createClient } from 'redis';
// // import { MatchService } from './services/ex.matchService';
// import { logInfo, logError } from './utils/logger';

// // Load environment variables
// const app = express();
// const server = createServer(app);
// // WebSocket CORS - Simplified - Nginx handles actual CORS headers
// console.log('🔌 WebSocket CORS: Simplified - Nginx handles CORS');

// const io = new SocketIOServer(server, {
//   cors: {
//     origin: true, // Simple reflect-back origin
//     credentials: true,
//     methods: ["GET", "POST"]
//   }
// });
// const port = process.env.MATCH_SERVICE_PORT || 3001;

// // Initialize Redis
// const redis = createClient({ url: process.env.REDIS_URL });
// redis.connect().catch(console.error);
// // Middleware
// app.use(helmet());
// app.use(compression());
// // CORS COMPLETELY DISABLED - Nginx handles all CORS
// // app.use(cors()) - COMMENTED OUT
// app.use(express.json());

// // Initialize Match Service
// // const matchService = new MatchService(io);

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({
//     status: 'healthy',
//     service: 'Quiz Match Service',
//     version: '1.0.0',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime()
//   });
// });

// // Match server statistics endpoint for monitoring
// app.get('/stats', (req, res) => {
//   const stats = {
//     service: 'Quiz Match Service',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     activeMatches: matchService.getActiveMatchCount(),
//     totalPlayers: matchService.getTotalPlayerCount(),
//     serverStats: {
//       memoryUsage: process.memoryUsage(),
//       cpuUsage: process.cpuUsage(),
//       version: process.version,
//       platform: process.platform
//     }
//   };
  
//   res.json(stats);
// });

// // Get active matches (for monitoring/admin)
// app.get('/matches', (req, res) => {
//   try {
//     const matches = matchService.getActiveMatches();
//     res.json({
//       success: true,
//       data: { matches },
//       count: matches.length
//     });
//   } catch (error) {
//     logError('Failed to get active matches', error as Error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to get active matches'
//     });
//   }
// });

// // Create friend match (1v1 with join code)
// app.post('/matches/friend', (req, res) => {
//   try {
//     const { quizId, userId, username } = req.body;
    
//     if (!quizId || !userId || !username) {
//       res.status(400).json({
//         success: false,
//         error: 'quizId, userId, and username are required'
//       });
//       return;
//     }

//     // Generate a 6-character join code
//     const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
//     // Create match with friend mode
//     const matchId = matchService.createMatch(parseInt(quizId), 2, 'friend' as any); // maxPlayers = 2 for friend matches
    
//     logInfo('Friend match created', { 
//       matchId, 
//       quizId, 
//       userId, 
//       username, 
//       joinCode 
//     });

//     res.json({
//       success: true,
//       data: {
//         matchId,
//         joinCode,
//         message: `Share this code with your friend: ${joinCode}`,
//         websocketUrl: `ws://localhost:3001`
//       }
//     });
//   } catch (error) {
//     logError('Failed to create friend match', error as Error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to create friend match'
//     });
//   }
// });

// // Find match by join code
// app.get('/matches/code/:joinCode', (req, res) => {
//   try {
//     const { joinCode } = req.params;
    
//     if (!joinCode || joinCode.length !== 6) {
//       res.status(400).json({
//         success: false,
//         error: 'Valid 6-character join code is required'
//       });
//       return;
//     }

//     // For now, return a simple response - in a real implementation,
//     // you'd store join codes in Redis and look them up
//     res.json({
//       success: true,
//       data: {
//         match: {
//           joinCode,
//           status: 'waiting',
//           message: 'Match found, ready to join'
//         }
//       }
//     });
//   } catch (error) {
//     logError('Failed to find match by code', error as Error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to find match by code'
//     });
//   }
// });

// // Get specific match details
// app.get('/matches/:matchId', (req, res) => {
//   try {
//     const match = matchService.getMatchById(req.params.matchId);
//     if (!match) {
//       res.status(404).json({
//         success: false,
//         error: 'Match not found'
//       });
//       return;
//     }

//     res.json({
//       success: true,
//       data: {
//         match: {
//           id: match.id,
//           quizId: match.quizId,
//           quiz: match.quiz,
//           playerCount: match.players.size,
//           maxPlayers: match.maxPlayers,
//           status: match.status,
//           currentQuestionIndex: match.currentQuestionIndex,
//           totalQuestions: match.questions.length,
//           createdAt: match.createdAt
//         }
//       }
//     });
//   } catch (error) {
//     logError('Failed to get match details', error as Error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to get match details'
//     });
//   }
// });

// // 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     error: 'Route not found',
//     message: `Cannot ${req.method} ${req.originalUrl}`
//   });
// });

// // Error handler
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   logError('Unhandled error in match service', err);
//   res.status(500).json({
//     success: false,
//     error: 'Internal server error',
//     message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
//   });
// });

// // Graceful shutdown
// process.on('SIGTERM', async () => {
//   logInfo('SIGTERM received, shutting down gracefully');
//   server.close(() => {
//     redis.disconnect();
//     process.exit(0);
//   });
// });

// process.on('SIGINT', async () => {
//   logInfo('SIGINT received, shutting down gracefully');
//   server.close(() => {
//     redis.disconnect();
//     process.exit(0);
//   });
// });

// // Start server
// server.listen(port, () => {
//   logInfo(`Match service started on port ${port}`, {
//     port,
//     environment: process.env.NODE_ENV || 'development',
//     timestamp: new Date().toISOString()
//   });
// });

// export { matchService };
