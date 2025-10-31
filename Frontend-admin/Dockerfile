# Multi-stage Dockerfile for QuizUP Frontend

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files first (better caching)
COPY package*.json ./

# Configure npm for better network handling
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Install dependencies with retry logic
RUN npm install --verbose || npm install --verbose || npm install --verbose

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -u 1001 -S nextjs -G nodejs

# Change ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5173

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5173 || exit 1

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Configure npm for better network handling
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Install dependencies with retry logic - production only
RUN npm ci --only=production --verbose || npm ci --only=production --verbose || npm ci --only=production --verbose

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_BASE_URL
ARG VITE_WEBSOCKET_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION

# Set environment variables for build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a custom main nginx.conf that works without root user
RUN echo 'pid /tmp/nginx.pid;' > /etc/nginx/nginx.conf && \
    echo 'error_log /dev/stderr info;' >> /etc/nginx/nginx.conf && \
    echo 'events { worker_connections 1024; }' >> /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '  include /etc/nginx/mime.types;' >> /etc/nginx/nginx.conf && \
    echo '  default_type application/octet-stream;' >> /etc/nginx/nginx.conf && \
    echo '  access_log /dev/stdout;' >> /etc/nginx/nginx.conf && \
    echo '  sendfile on;' >> /etc/nginx/nginx.conf && \
    echo '  keepalive_timeout 65;' >> /etc/nginx/nginx.conf && \
    echo '  server {' >> /etc/nginx/nginx.conf && \
    echo '    listen 80;' >> /etc/nginx/nginx.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/nginx.conf && \
    echo '    index index.html;' >> /etc/nginx/nginx.conf && \
    echo '    add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\''; style-src '\''self'\'' '\''unsafe-inline'\''; font-src '\''self'\'' data:; img-src '\''self'\'' data: https:; connect-src '\''self'\'' ws: wss: http://localhost:* http://127.0.0.1:* https://api.quizdash.dpdns.org;" always;' >> /etc/nginx/nginx.conf && \
    echo '    location /health { access_log off; return 200 "healthy\n"; add_header Content-Type text/plain; }' >> /etc/nginx/nginx.conf && \
    echo '    location / { try_files $uri $uri/ /index.html; }' >> /etc/nginx/nginx.conf && \
    echo '  }' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

# Create directories with proper permissions (no user creation, run as root)
RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/cache/nginx/proxy_temp && \
    mkdir -p /var/cache/nginx/fastcgi_temp && \
    mkdir -p /var/cache/nginx/uwsgi_temp && \
    mkdir -p /var/cache/nginx/scgi_temp && \
    mkdir -p /tmp && \
    chmod 777 /tmp && \
    chmod -R 777 /var/cache/nginx

# Expose port
EXPOSE 80

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
