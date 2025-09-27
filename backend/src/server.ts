import "./tracing";
import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import promBundle from "express-prom-bundle";
import { connectDatabase } from "./models";
import swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import categoryRoutes from "./routes/categoryRoutes";
import quizRoutes from "./routes/quizRoutes";
import questionRoutes from "./routes/questionRoutes";
import authRoutes from "./routes/authRoutes";
import questionBankRoutes from "./routes/questionBankRoutes";
import quizAttemptRoutes from "./routes/quizAttemptRoutes";
import adminRoutes from "./routes/adminRoutes";
import matchRoutes from "./routes/matchRoutes";
import friendMatchRoutes from "./routes/friendMatchRoutes";
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
app.use(helmet());
// CORS Configuration
const allowedOrigins = [
  `http://${IP_ADD}:5173`,
  `http://${IP_ADD}:5174`,
  `http://${IP_ADD}:3001`,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3001",
  "http://localhost:8090",
  "http://10.80.5.18",
  "https://jv7ot4-ip-157-32-46-222.tunnelmole.net"
];

// Add environment-based origins
const envOrigins = process.env.CORS_ORIGIN?.split(',') || [];
allowedOrigins.push(...envOrigins);

// Function to check if origin matches wildcard patterns
const isOriginAllowed = (origin: string): boolean => {
  // Check exact matches first
  if (allowedOrigins.includes(origin)) return true;
  
  // Check wildcard patterns
  for (const allowedOrigin of allowedOrigins) {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) return true;
    }
  }
  
  return false;
};
// Load OpenAPI document
const openApiPath = path.join(__dirname, "../../docs/openapi.yaml");
let openApiDocument: any = {};
try {
  const yamlFile = fs.readFileSync(openApiPath, "utf8");
  openApiDocument = yaml.parse(yamlFile);
} catch (error) {
  console.warn("Could not load OpenAPI document:", error);
  // Create a basic OpenAPI document as fallback
  openApiDocument = { 
    openapi: "3.0.0", 
    info: { 
      title: "QuizUP API", 
      version: "1.0.0",
      description: "QuizUP Backend API"
    }, 
    paths: {
    } 
  };
}

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use(
  cors({
    origin: true, // Allow all origins for testing
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(compression());
app.use(metricsMiddleware);
app.use(requestLogger);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Quiz Management System Backend",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
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
app.get('/metrics-custom', metricsEndpoint);

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
    // Connect to database
    await connectDatabase();
    logInfo("Connected to PostgreSQL database");

    // Initialize custom metrics
    initMetrics();

    app.listen(Number(PORT), "0.0.0.0", () => {
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
    process.exit(1);
  }
}

startServer();
