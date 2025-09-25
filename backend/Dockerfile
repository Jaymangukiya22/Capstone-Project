# Multi-stage Dockerfile for Quiz App Backend
FROM node:18-slim AS base

# Set working directory
WORKDIR /app

# Install system dependencies required for building and runtime
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    curl \
    bash \
    openssl \
    ca-certificates \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user early
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Development stage
FROM base AS development

# Copy package files for dependency installation
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs tsconfig.json ./

# Configure npm for better network handling
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set cache /tmp/.npm && \
    npm config set update-notifier false

# Install ALL dependencies (including devDependencies for hot-reloading)
RUN npm ci --verbose

# Copy source code and configuration files
COPY --chown=nextjs:nodejs ./src ./src
COPY --chown=nextjs:nodejs ./scripts ./scripts
COPY --chown=nextjs:nodejs ./start.sh ./start-server.js ./

# Create necessary directories with proper permissions
RUN mkdir -p logs uploads /tmp/.npm && \
    chown -R nextjs:nodejs /app /tmp/.npm

USER nextjs

# Expose ports (3000 for API, 3001 for WebSocket)
EXPOSE 3000 3001

# Health check for API server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Default command - will be overridden by docker-compose for hot-reloading
CMD ["./start.sh"]

# Production stage
FROM base AS production

# Copy package files
COPY --chown=nextjs:nodejs package*.json ./

# Install only production dependencies
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set cache /tmp/.npm && \
    npm ci --only=production --verbose && \
    npm cache clean --force

# Copy built application from development stage
COPY --from=development --chown=nextjs:nodejs /app/dist ./dist
COPY --from=development --chown=nextjs:nodejs /app/start.sh ./start-server.js ./

# Copy necessary runtime files
COPY --chown=nextjs:nodejs ./scripts ./scripts

# Make startup scripts executable
RUN chmod +x start.sh start-server.js

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R nextjs:nodejs /app

USER nextjs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Production command
CMD ["node", "start-server.js"]
