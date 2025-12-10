# Hyper-optimized Multi-stage Dockerfile for QuizUP Frontend
FROM node:20-alpine AS base
RUN apk add --no-cache curl && addgroup -g 1001 -S nodejs && adduser -u 1001 -S nodejs -G nodejs
WORKDIR /app

# Development stage
FROM base AS development
COPY package*.json ./
RUN npm ci --silent --no-audit --no-fund --prefer-offline
COPY . .
RUN chmod -R 777 /app
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=2 \
  CMD curl -f http://localhost:5173 || exit 1
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS build
COPY package*.json ./
RUN npm ci --silent --no-audit --no-fund --prefer-offline
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_WEBSOCKET_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_VERSION=$VITE_APP_VERSION
RUN npm run build

# Production stage - minimal nginx with distroless-style optimization
FROM nginx:alpine AS production
RUN apk add --no-cache curl && \
    echo 'server { listen 80; root /usr/share/nginx/html; index index.html; gzip on; gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript; location /health { access_log off; return 200 "healthy\\n"; add_header Content-Type text/plain; } location / { try_files $uri $uri/ /index.html; add_header Cache-Control "no-cache, no-store, must-revalidate"; } location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ { expires 1y; add_header Cache-Control "public, immutable"; } }' > /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=2 \
  CMD curl -f http://localhost:80/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
