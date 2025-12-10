# Hyper-optimized Multi-stage Dockerfile for QuizUP Backend
FROM node:20-alpine AS base
RUN apk add --no-cache curl bash && \
    addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nodejs -G nodejs
WORKDIR /app

# Development stage
FROM base AS development
COPY --chown=nodejs:nodejs package*.json tsconfig.json ./
RUN npm ci --silent --no-audit --no-fund --prefer-offline
COPY --chown=nodejs:nodejs ./src ./src
COPY --chown=nodejs:nodejs ./scripts ./scripts
COPY --chown=nodejs:nodejs ./docs ./docs
COPY --chown=nodejs:nodejs ./tests ./tests
COPY --chown=nodejs:nodejs ./start.sh ./start-server.js ./pre-build.js ./
RUN chmod +x start.sh start-server.js && \
    mkdir -p logs uploads && \
    chown -R nodejs:nodejs logs uploads
USER nodejs
EXPOSE 3000 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=2 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1
CMD ["npm", "run", "dev"]

# Build stage
FROM development AS build
USER root
# 1. Create dist folder
RUN mkdir -p /app/dist && chown -R nodejs:nodejs /app/dist
USER nodejs
# 2. Build
RUN npm run build
USER root
# 3. Prune dev dependencies. 
# REMOVED: "chown -R nodejs:nodejs" (This saves ~220s. We handle ownership during COPY in the next stage)
RUN npm prune --production 2>&1

# Production stage
FROM node:20-alpine AS production
# 1. Setup User
RUN apk add --no-cache curl bash && \
    addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nodejs -G nodejs
WORKDIR /app

# 2. OPTIMIZATION: Create directories BEFORE copying heavy node_modules
# This prevents the "layer initialization hang" you were experiencing.
RUN mkdir -p logs uploads && chown -R nodejs:nodejs logs uploads

# 3. Copy artifacts (Heavy lifting)
# The --chown flag here handles permissions efficiently during the copy
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=development --chown=nodejs:nodejs /app/docs ./docs
COPY --from=development --chown=nodejs:nodejs /app/start-server.js ./
COPY --from=development --chown=nodejs:nodejs /app/package.json ./
COPY --from=development --chown=nodejs:nodejs /app/tsconfig.json ./
COPY --chown=nodejs:nodejs .env ./

USER nodejs
EXPOSE 3000 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=2 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1
CMD [ "node", "dist/server.js" ]

# Master Server stage - lean production image for match server pool
FROM node:20-alpine AS matchserver-master
RUN apk add --no-cache curl bash && \
    addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nodejs -G nodejs
WORKDIR /app

# Copy only what is needed to run the compiled match server
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=development --chown=nodejs:nodejs /app/package.json ./

ENV SERVICE_TYPE=master
USER nodejs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1
CMD ["node", "dist/matchServerMaster.js"]