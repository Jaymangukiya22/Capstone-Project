import "./tracing";
import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
// import cors from "cors"; // DISABLED - Nginx handles CORS
import helmet from "helmet";
import compression from "compression";
import promBundle from "express-prom-bundle";
import { connectDatabase } from "./models";
import swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { initializeRedis } from "./config/redis";
import categoryRoutes from "./routes/categoryRoutes";
import quizRoutes from "./routes/quizRoutes";
import questionRoutes from "./routes/questionRoutes";
import authRoutes from "./routes/authRoutes";
import questionBankRoutes from "./routes/questionBankRoutes";
import quizAttemptRoutes from "./routes/quizAttemptRoutes";
import adminRoutes from "./routes/adminRoutes";
import matchRoutes from "./routes/matchRoutes";
import friendMatchRoutes from "./routes/friendMatchRoutes";
import performanceRoutes from "./routes/performanceRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { logInfo, logError } from "./utils/logger";
import { metricsEndpoint, initMetrics } from "./utils/metrics";

const app = express();
const PORT = process.env.PORT || 3000;
const IP_ADD = process.env.NETWORK_IP || "0.0.0.0";
// Prometheus metrics middleware
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project_name: "quiz-app-backend" },
  promClient: {
    collectDefaultMetrics: {},
  },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://static.cloudflareinsights.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
// CORS Configuration - DISABLED: Nginx handles CORS
// Simple pass-through allowOrigin function for when behind Nginx
const isOriginAllowed = (origin: string): boolean => true;
// Load OpenAPI document
const openApiPath = path.join(__dirname, "../docs/openapi.yaml");
let openApiDocument: any = {
  openapi: "3.0.0",
  info: {
    title: "QuizUP API",
    version: "1.0.0",
    description: "QuizUP Backend API",
  },
  paths: {},
};
try {
  if (fs.existsSync(openApiPath)) {
    const yamlFile = fs.readFileSync(openApiPath, "utf8");
    openApiDocument = yaml.parse(yamlFile);
  }
} catch (error) {
  // Silently use fallback if file doesn't exist or can't be parsed
}

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

// CORS COMPLETELY DISABLED - Nginx handles all CORS
// app.use(cors()) - COMMENTED OUT

// Log CORS configuration on startup
console.log('🌐 CORS Configuration:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   CORS_ORIGIN env:', process.env.CORS_ORIGIN);
console.log('   CORS handled by Nginx');

app.use(compression());
app.use(metricsMiddleware);
app.use(requestLogger);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Quiz Management System Backend",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// Workers/Match server statistics endpoint for monitoring
app.get("/api/workers/stats", (req, res) => {
  try {
    // This endpoint provides aggregated stats from match server
    const stats = {
      service: "Quiz Management System - Match Workers",
      timestamp: new Date().toISOString(),
      activeMatches: 0, // Will be updated by match server
      totalPlayers: 0,  // Will be updated by match server
      workerStats: [
        {
          workerId: "match-server-1",
          status: "active",
          matches: 0,
          players: 0,
          uptime: process.uptime(),
        },
      ],
      systemStats: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform,
      },
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get worker statistics",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Debug endpoint to check routes
app.get("/debug/routes", (req, res) => {
  const routes: any[] = [];

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });

  res.json({
    success: true,
    data: routes,
    message: "Available routes",
  });
});

// Metrics endpoint (exposed by express-prom-bundle)
// Available at /metrics

// Custom metrics endpoint with our business metrics
app.get("/metrics-custom", metricsEndpoint);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/question-bank", questionBankRoutes);
app.use("/api/quiz-attempts", quizAttemptRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/friend-matches", friendMatchRoutes);
app.use("/api/performance", performanceRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on("SIGINT", async () => {
  logInfo("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logInfo("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    console.log("🚀 Starting server initialization...");
    // Initialize Redis first
    console.log(" Initializing Redis...");
    await initializeRedis();
    console.log("✅ Redis initialization successful!");
    
    // Connect to database
    console.log("📡 Attempting to connect to database...");
    await connectDatabase();
    console.log("✅ Database connection successful!");
    logInfo("Connected to PostgreSQL database");

    // Initialize custom metrics
    initMetrics();

    app.listen(Number(PORT), "0.0.0.0", 2048, () => {
      const networkIP = process.env.NETWORK_IP || "localhost";
      logInfo("Server started successfully", {
        port: PORT,
        host: "0.0.0.0",
        environment: process.env.NODE_ENV || "development",
        healthCheck: `http://${networkIP}:${PORT}/health`,
        metrics: `http://${networkIP}:${PORT}/metrics`,
        customMetrics: `http://${networkIP}:${PORT}/metrics-custom`,
        networkAccess: `http://${networkIP}:${PORT}`,
      });
    });
  } catch (error) {
    logError("Failed to start server", error as Error);
    console.error("FATAL ERROR:", error);
    process.exit(1);
  }
}

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logError('Unhandled Promise Rejection', new Error(String(reason)));
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logError('Uncaught Exception', error);
  process.exit(1);
});

startServer();
