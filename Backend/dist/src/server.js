"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./tracing");
const express_1 = require("express");
const cors_1 = require("cors");
const helmet_1 = require("helmet");
const compression_1 = require("compression");
const dotenv_1 = require("dotenv");
const express_prom_bundle_1 = require("express-prom-bundle");
const models_1 = require("./models");
const swagger_ui_express_1 = require("swagger-ui-express");
const fs = require("fs");
const path = require("path");
const yaml = require("yaml");
const categoryRoutes_1 = require("./routes/categoryRoutes");
const quizRoutes_1 = require("./routes/quizRoutes");
const questionRoutes_1 = require("./routes/questionRoutes");
const authRoutes_1 = require("./routes/authRoutes");
const questionBankRoutes_1 = require("./routes/questionBankRoutes");
const quizAttemptRoutes_1 = require("./routes/quizAttemptRoutes");
const adminRoutes_1 = require("./routes/adminRoutes");
const matchRoutes_1 = require("./routes/matchRoutes");
const friendMatchRoutes_1 = require("./routes/friendMatchRoutes");
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const IP_ADD = process.env.NETWORK_IP || "0.0.0.0";
const metricsMiddleware = (0, express_prom_bundle_1.default)({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    includeUp: true,
    customLabels: { project_name: "quiz-app-backend" },
    promClient: {
        collectDefaultMetrics: {},
    },
});
app.use((0, helmet_1.default)());
const allowedOrigins = [
    `http://${IP_ADD}:5173`,
    `http://${IP_ADD}:5174`,
    `http://${IP_ADD}:3001`,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3001",
    "http://10.80.5.18",
];
const openApiPath = path.join(__dirname, "../../docs/openapi.yaml");
let openApiDocument = {};
try {
    const yamlFile = fs.readFileSync(openApiPath, "utf8");
    openApiDocument = yaml.parse(yamlFile);
}
catch (error) {
    console.warn("Could not load OpenAPI document:", error);
    openApiDocument = { openapi: "3.0.0", info: { title: "Quiz API", version: "1.0.0" }, paths: {} };
}
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openApiDocument));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        else {
            return callback(new Error(`CORS blocked for origin: ${origin}`), false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use((0, compression_1.default)());
app.use(metricsMiddleware);
app.use(requestLogger_1.requestLogger);
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Quiz Management System Backend",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
    });
});
app.get("/debug/routes", (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods),
            });
        }
        else if (middleware.name === "router") {
            middleware.handle.stack.forEach((handler) => {
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
app.use("/api/auth", authRoutes_1.default);
app.use("/api/categories", categoryRoutes_1.default);
app.use("/api/quizzes", quizRoutes_1.default);
app.use("/api/questions", questionRoutes_1.default);
app.use("/api/question-bank", questionBankRoutes_1.default);
app.use("/api/quiz-attempts", quizAttemptRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/matches", matchRoutes_1.default);
app.use("/api/friend-matches", friendMatchRoutes_1.default);
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
        message: `Cannot ${req.method} ${req.originalUrl}`,
    });
});
app.use(errorHandler_1.errorHandler);
process.on("SIGINT", async () => {
    (0, logger_1.logInfo)("Received SIGINT, shutting down gracefully...");
    process.exit(0);
});
process.on("SIGTERM", async () => {
    (0, logger_1.logInfo)("Received SIGTERM, shutting down gracefully...");
    process.exit(0);
});
async function startServer() {
    try {
        await (0, models_1.connectDatabase)();
        (0, logger_1.logInfo)("Connected to PostgreSQL database");
        app.listen(Number(PORT), "0.0.0.0", () => {
            const networkIP = process.env.NETWORK_IP || "localhost";
            (0, logger_1.logInfo)("Server started successfully", {
                port: PORT,
                host: "0.0.0.0",
                environment: process.env.NODE_ENV || "development",
                healthCheck: `http://${networkIP}:${PORT}/health`,
                metrics: `http://${networkIP}:${PORT}/metrics`,
                networkAccess: `http://${networkIP}:${PORT}`,
            });
        });
    }
    catch (error) {
        (0, logger_1.logError)("Failed to start server", error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map