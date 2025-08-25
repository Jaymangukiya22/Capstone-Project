# Multi-stage build for match service
FROM node:18-bullseye AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev) for build
RUN npm ci && npm cache clean --force

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Prune to production dependencies only
RUN npm prune --omit=dev

# Production stage
FROM node:18-bullseye-slim AS production

# Install dumb-init for proper signal handling
RUN apt-get update \
  && apt-get install -y dumb-init \
  && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -g 1001 nodejs \
  && useradd -m -u 1001 -g nodejs matchservice

# Set working directory
WORKDIR /app

# Copy package files (for reference)
COPY package*.json ./

# Copy production node_modules and built app from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Change ownership of the app directory
RUN chown -R matchservice:nodejs /app
USER matchservice

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
