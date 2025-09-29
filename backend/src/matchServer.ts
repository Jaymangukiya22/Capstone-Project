import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createClient } from 'redis';
import { MatchService } from './services/matchService';
import { logInfo, logError } from './utils/logger';

// Load environment variables
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const port = process.env.MATCH_SERVICE_PORT || 3001;

// Initialize Redis
const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(console.error);
// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Initialize Match Service
const matchService = new MatchService(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Quiz Match Service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get active matches (for monitoring/admin)
app.get('/matches', (req, res) => {
  try {
    const matches = matchService.getActiveMatches();
    res.json({
      success: true,
      data: { matches },
      count: matches.length
    });
  } catch (error) {
    logError('Failed to get active matches', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active matches'
    });
  }
});

// Get specific match details
app.get('/matches/:matchId', (req, res) => {
  try {
    const match = matchService.getMatchById(req.params.matchId);
    if (!match) {
      res.status(404).json({
        success: false,
        error: 'Match not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        match: {
          id: match.id,
          quizId: match.quizId,
          quiz: match.quiz,
          playerCount: match.players.size,
          maxPlayers: match.maxPlayers,
          status: match.status,
          currentQuestionIndex: match.currentQuestionIndex,
          totalQuestions: match.questions.length,
          createdAt: match.createdAt
        }
      }
    });
  } catch (error) {
    logError('Failed to get match details', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get match details'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Unhandled error in match service', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('SIGTERM received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logInfo('SIGINT received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});

// Start server
server.listen(port, () => {
  logInfo(`Match service started on port ${port}`, {
    port,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

export { matchService };
