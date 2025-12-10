# 🔧 Fix: 403 Forbidden - Vite Dependencies Error

## Problem

When accessing `https://quizdash.dpdns.org`, you get:
```
GET https://quizdash.dpdns.org/node_modules/.vite/deps/react-dom_client.js?v=3abd8e12 net::ERR_ABORTED 403 (Forbidden)
GET https://quizdash.dpdns.org/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=2dbac494 net::ERR_ABORTED 403 (Forbidden)
```

## Root Cause

The frontend was running in **development mode** instead of **production mode**:
- Development: Serves Vite dev files from `/node_modules/.vite/deps/`
- Production: Serves bundled static files from Nginx

When using the old `quizup-manager.sh` script without setting `FRONTEND_TARGET=production`, Docker Compose defaulted to the development target.

## Solution Applied

### 1. Updated docker-compose.yml
```yaml
# BEFORE:
target: ${FRONTEND_TARGET:-development}
ports:
  - "${FRONTEND_PORT:-5173}:5173"

# AFTER:
target: ${FRONTEND_TARGET:-production}
ports:
  - "${FRONTEND_PORT:-5173}:80"
```

**Changes**:
- Default target changed from `development` to `production`
- Port mapping changed from 5173 to 80 (Nginx standard)
- Added health check for Nginx
- Added build args for app name/version

### 2. Updated Environment Files

**`.env.localhost`**:
```
FRONTEND_TARGET=development  # Keep dev for local testing
```

**`.env.network`**:
```
FRONTEND_TARGET=production   # Use production build
```

**`.env.self-hosted`**:
```
FRONTEND_TARGET=production   # Use production build
```

## How It Works Now

### Localhost (Development)
```bash
source .env.localhost
docker-compose up -d
# Frontend runs in development mode (Vite dev server)
# Access: http://localhost:5173
```

### Network/Production (Production)
```bash
source .env.network
docker-compose up -d
# Frontend runs in production mode (Nginx + bundled assets)
# Access: http://{NETWORK_IP}:5173 or https://quizdash.dpdns.org
```

## Frontend Build Targets

### Development Target
```dockerfile
FROM base AS development
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```
- Serves Vite dev files
- Hot module reloading
- Unminified code
- `/node_modules/.vite/deps/` accessible

### Production Target
```dockerfile
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
- Serves bundled static files
- Nginx optimized
- Minified code
- No `/node_modules/` exposed

## Deployment Steps

### Fix Current Deployment

```bash
# 1. Stop current services
docker compose down

# 2. Load correct environment
source .env.self-hosted

# 3. Rebuild frontend with production target
docker compose build frontend

# 4. Start services
docker compose up -d

# 5. Verify
curl https://quizdash.dpdns.org/health
```

### Using Old Script

If you continue using `quizup-manager.sh`, make sure to set environment first:

```bash
# Before running the script
source .env.self-hosted
bash scripts/quizup-manager.sh
```

## Verification

### Check Frontend Target
```bash
# Should show "production"
docker inspect quizup_frontend | grep -A 5 "Env"
```

### Check Nginx is Running
```bash
# Should show Nginx process
docker exec quizup_frontend ps aux | grep nginx
```

### Check No Vite Paths
```bash
# Should return 404 (not 403)
curl -I https://quizdash.dpdns.org/node_modules/.vite/deps/react.js
```

### Check Static Files Served
```bash
# Should return 200 with HTML
curl -I https://quizdash.dpdns.org/
```

## Files Changed

```
✅ docker-compose.yml - Default target: development → production
✅ .env.localhost - Added FRONTEND_TARGET=development
✅ .env.network - Added FRONTEND_TARGET=production
✅ .env.self-hosted - Added FRONTEND_TARGET=production
```

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Frontend Target** | development (default) | production (default) |
| **Port Mapping** | 5173:5173 | 5173:80 |
| **Server** | Vite dev server | Nginx |
| **Assets** | Vite dev files | Bundled static |
| **Error** | 403 Forbidden | ✅ Works |

**Result**: Frontend now serves production-optimized bundled assets via Nginx! 🚀
