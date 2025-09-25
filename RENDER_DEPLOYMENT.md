# 🚀 Render Deployment Guide (RECOMMENDED)

Render is the **best choice** for your QuizUP application because it supports:
- ✅ Full-stack deployment (frontend + backend)
- ✅ PostgreSQL database
- ✅ Redis caching
- ✅ WebSocket support
- ✅ Docker containers
- ✅ Automatic deployments from GitHub

## 📋 Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com)

## 🏗️ Step 1: Database Setup

### PostgreSQL Database
1. Go to Render Dashboard → **New** → **PostgreSQL**
2. **Name**: `quizup-postgres`
3. **Database**: `quizup_db`
4. **User**: `quizup_user`
5. **Region**: Choose closest to your users
6. **PostgreSQL Version**: 15
7. Click **Create Database**

### Redis Database
1. Go to Render Dashboard → **New** → **Redis**
2. **Name**: `quizup-redis`
3. **Region**: Same as PostgreSQL
4. Click **Create Database**

## 🖥️ Step 2: Backend Deployment

### Option A: Docker Deployment (Recommended)
1. **New** → **Web Service**
2. **Name**: `quizup-backend`
3. **Environment**: `Docker`
4. **Build Command**: `./backend/start.sh`
5. **Start Command**: `./backend/start.sh`
6. **Dockerfile Path**: `./backend/Dockerfile`

### Environment Variables:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://quizup_user:[PASSWORD]@dpg-[...].a.timescale.cloud:5432/quizup_db
REDIS_URL=rediss://:[PASSWORD]@redis-[...].upstash.io:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SERVICE_TYPE=backend
```

### Option B: Git-based Deployment
1. **New** → **Web Service**
2. **Name**: `quizup-backend`
3. **Runtime**: `Node`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm run start`

## 🔌 Step 3: WebSocket Server

1. **New** → **Web Service**
2. **Name**: `quizup-matchserver`
3. **Environment**: `Docker`
4. **Build Command**: `./backend/start.sh`
5. **Start Command**: `./backend/start.sh`

### Environment Variables:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://quizup_user:[PASSWORD]@dpg-[...].a.timescale.cloud:5432/quizup_db
REDIS_URL=rediss://:[PASSWORD]@redis-[...].upstash.io:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SERVICE_TYPE=matchserver
MATCH_SERVICE_PORT=3001
```

## 🌐 Step 4: Frontend Deployment

1. **New** → **Static Site**
2. **Name**: `quizup-frontend`
3. **Build Command**: `npm run build`
4. **Publish Directory**: `dist`
5. **Node Version**: 18

### Environment Variables:
```bash
VITE_API_BASE_URL=https://quizup-backend.onrender.com
VITE_WEBSOCKET_URL=wss://quizup-matchserver.onrender.com
```

## ⚙️ Step 5: Configuration

### Backend Configuration
Update your environment variables in Render:

```bash
# Production Environment
NODE_ENV=production
PORT=10000  # Render assigns this automatically

# Database (from Step 1)
DATABASE_URL=postgresql://quizup_user:[PASSWORD]@dpg-[...].a.timescale.cloud:5432/quizup_db

# Redis (from Step 1)
REDIS_URL=rediss://:[PASSWORD]@redis-[...].upstash.io:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
BCRYPT_ROUNDS=12

# CORS (update with your frontend URL)
CORS_ORIGIN=https://quizup-frontend.onrender.com

# Service Configuration
SERVICE_TYPE=backend
LOG_LEVEL=info
ENABLE_SWAGGER=true
```

### WebSocket Configuration
```bash
NODE_ENV=production
PORT=10001
SERVICE_TYPE=matchserver
MATCH_SERVICE_PORT=10001
# Same DATABASE_URL and REDIS_URL as backend
```

## 🔄 Step 6: Database Migration

Since you're using Sequelize, you need to run migrations:

1. **SSH into your backend service** after deployment
2. **Run database sync**:
   ```bash
   cd /app
   npm run db:setup
   ```

## 📊 Step 7: Monitoring

### Add Custom Domains (Optional)
1. **Buy a domain** from Namecheap, GoDaddy, etc.
2. **Add to Render**:
   - Backend: `api.yourdomain.com`
   - Frontend: `yourdomain.com` or `app.yourdomain.com`
   - Match Server: `ws.yourdomain.com`

### Environment Variables for Custom Domains:
```bash
# Frontend
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WEBSOCKET_URL=wss://ws.yourdomain.com

# Backend CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

## 🚀 Deployment Commands

```bash
# After pushing to GitHub, Render will auto-deploy
git add .
git commit -m "Deploy to Render"
git push origin main
```

## ✅ Expected Results

- **Frontend**: https://quizup-frontend.onrender.com
- **Backend API**: https://quizup-backend.onrender.com
- **WebSocket**: wss://quizup-matchserver.onrender.com
- **Database**: Connected via Render's internal network

## 🔧 Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Ensure database is created and running

2. **Redis Connection Failed**
   - Verify REDIS_URL format
   - Check Redis service status

3. **CORS Errors**
   - Update CORS_ORIGIN with correct frontend URL
   - Add all possible domains

4. **WebSocket Connection Failed**
   - Ensure match server is running
   - Check WebSocket URL format

### Render Logs:
```bash
# View logs in Render Dashboard
# Or SSH into service:
# Render Dashboard → Service → Shell
```

---

## 🎯 **NEXT: Railway Deployment Guide**
