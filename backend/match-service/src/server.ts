import 'module-alias/register';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { MatchService } from '@/services/match.service';
import { WebSocketService } from '@/services/websocket.service';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize services
const matchService = new MatchService();
const wsService = new WebSocketService(server, matchService);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Compression middleware
app.use(compression());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'QuizSpark Match Service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    websocket: {
      path: '/ws',
      status: 'active'
    }
  });
});

// Match management endpoints
app.post('/api/v1/matches', async (req, res) => {
  try {
    const { quiz, player1Id, player2Id } = req.body;
    
    if (!quiz || !player1Id || !player2Id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: quiz, player1Id, player2Id'
      });
    }

    const matchId = await matchService.createMatch(quiz, player1Id, player2Id);
    
    return res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: { matchId }
    });
  } catch (error) {
    console.error('Error creating match:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create match'
    });
  }
});

app.get('/api/v1/matches/:matchId', (req, res) => {
  try {
    const { matchId } = req.params;
    const match = matchService.getMatch(matchId);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Convert Map to Object for JSON serialization
    const matchData = {
      id: match.id,
      quizId: match.quizId,
      status: match.status,
      currentQuestionIndex: match.currentQuestionIndex,
      startedAt: match.startedAt,
      completedAt: match.completedAt,
      createdAt: match.createdAt,
      players: Array.from(match.players.values()).map(player => ({
        id: player.id,
        username: player.username,
        rating: player.rating,
        isReady: player.isReady,
        isConnected: player.isConnected,
        score: player.score
      })),
      connectedClients: wsService.getMatchClientsCount(matchId)
    };

    return res.status(200).json({
      success: true,
      message: 'Match retrieved successfully',
      data: matchData
    });
  } catch (error) {
    console.error('Error retrieving match:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve match'
    });
  }
});

app.get('/api/v1/matches/:matchId/results', (req, res) => {
  try {
    const { matchId } = req.params;
    const results = matchService.getMatchResults(matchId);
    
    if (!results) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or not completed'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Match results retrieved successfully',
      data: results
    });
  } catch (error) {
    console.error('Error retrieving match results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve match results'
    });
  }
});

// WebSocket connection info endpoint
app.get('/api/v1/ws/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WebSocket connection information',
    data: {
      endpoint: `ws://localhost:${PORT}/ws`,
      protocol: 'ws',
      path: '/ws',
      authentication: 'JWT token required in JOIN_MATCH message',
      messageTypes: [
        'JOIN_MATCH - Join a match room',
        'PLAYER_READY - Set player ready status',
        'SUBMIT_ANSWER - Submit answer for current question'
      ]
    }
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Forcing shutdown...');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, () => {
  console.log(`🚀 QuizSpark Match Service running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 WebSocket endpoint: ws://localhost:${PORT}/ws`);
});

export default app;
