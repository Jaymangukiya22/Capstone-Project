# 🚂 Railway Deployment Guide

Railway is an excellent alternative to Render with **superior Docker support** and a great developer experience.

## 📋 Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Railway Account**: Sign up at [railway.app](https://railway.app)

## 🏗️ Step 1: Project Setup

1. **Connect GitHub**: Link your QuizUP repository to Railway
2. **Create Project**: Railway will auto-detect your services

## 🗄️ Step 2: Database Setup

### PostgreSQL Database
1. **New** → **Database** → **PostgreSQL**
2. **Name**: `quizup-postgres`
3. **Railway auto-generates connection details**

### Redis Database
1. **New** → **Database** → **Redis**
2. **Name**: `quizup-redis`

## 🖥️ Step 3: Backend Deployment

Railway excels at Docker deployments:

### Option A: Docker Deployment (Recommended)
1. **New** → **Service** → **Deploy from GitHub**
2. **Repository**: Your QuizUP repo
3. **Root Directory**: `./backend`
4. **Build Command**: `npm run build`
5. **Start Command**: `./start.sh`

### Environment Variables:
```bash
NODE_ENV=production
SERVICE_TYPE=backend
# Railway auto-injects DATABASE_URL and REDIS_URL
```

### Option B: Buildpack Deployment
1. **New** → **Service** → **Deploy from GitHub**
2. **Repository**: Your QuizUP repo
3. **Root Directory**: `./backend`
4. **Runtime**: `Node.js`
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm run start`

## 🔌 Step 4: WebSocket Server

1. **New** → **Service** → **Deploy from GitHub**
2. **Repository**: Your QuizUP repo
3. **Root Directory**: `./backend`
4. **Build Command**: `npm run build`
5. **Start Command**: `./start.sh`

### Environment Variables:
```bash
NODE_ENV=production
SERVICE_TYPE=matchserver
MATCH_SERVICE_PORT=3001
```

## 🌐 Step 5: Frontend Deployment

### Option A: Static Site (Recommended)
1. **New** → **Service** → **Deploy from GitHub**
2. **Repository**: Your QuizUP repo
3. **Root Directory**: `./Frontend-admin`
4. **Build Command**: `npm run build`
5. **Start Command**: `npm run preview`

### Option B: Node.js Deployment
1. **New** → **Service** → **Deploy from GitHub**
2. **Repository**: Your QuizUP repo
3. **Root Directory**: `./Frontend-admin`
4. **Runtime**: `Node.js`
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm run preview`

## ⚙️ Step 6: Environment Configuration

Railway automatically provides environment variables:

### Backend Variables:
```bash
NODE_ENV=production
SERVICE_TYPE=backend
# Railway provides:
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CORS_ORIGIN=https://your-frontend.railway.app
```

### Match Server Variables:
```bash
NODE_ENV=production
SERVICE_TYPE=matchserver
MATCH_SERVICE_PORT=3001
# Same DATABASE_URL and REDIS_URL as backend
```

### Frontend Variables:
```bash
VITE_API_BASE_URL=https://your-backend.railway.app
VITE_WEBSOCKET_URL=wss://your-matchserver.railway.app
```

## 🔄 Step 7: Database Migration

Railway supports automatic migrations:

### Option A: Via Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Connect to your project
railway login
railway link

# SSH into backend service
railway run npm run db:setup
```

### Option B: Manual Migration
1. **Railway Dashboard** → **Your Backend Service** → **Variables**
2. **Add Variable**:
   - Key: `RUN_MIGRATIONS`
   - Value: `true`

3. **Redeploy** the backend service

## 📊 Step 8: Custom Domains

Railway makes custom domains easy:

1. **Railway Dashboard** → **Settings** → **Custom Domains**
2. **Add Domain**: `yourdomain.com`
3. **Configure DNS**: Point to Railway's provided IP

### Environment Variables for Custom Domains:
```bash
# Frontend
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WEBSOCKET_URL=wss://ws.yourdomain.com

# Backend CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

## 🚀 Railway-Specific Features

### Auto-Deployments
Railway automatically deploys when you push to GitHub:
```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
```

### Service Networking
Railway services communicate via internal domains:
- Backend: `your-backend.railway.internal`
- Frontend: `your-frontend.railway.internal`

### Database Backups
Railway automatically backs up your databases:
- **Dashboard** → **Database** → **Backups**
- **Automated daily backups**
- **One-click restore**

## 🔧 Troubleshooting

### Railway CLI Commands:
```bash
# View logs
railway logs

# SSH into service
railway run

# View service variables
railway variables

# Restart service
railway up
```

### Common Issues:

1. **Build Failures**
   - Check Railway build logs
   - Ensure Dockerfile is in correct directory
   - Verify package.json scripts

2. **Database Connection**
   - Railway provides DATABASE_URL automatically
   - Check service variables in dashboard
   - Ensure database service is running

3. **Service Communication**
   - Use internal domains for service-to-service
   - External domains for public access

### Railway Logs:
```bash
# View all service logs
railway logs --all

# Follow logs for specific service
railway logs --follow backend
```

## ✅ Expected Results

Railway will provide:
- **Frontend**: https://your-frontend.railway.app
- **Backend API**: https://your-backend.railway.app
- **WebSocket**: wss://your-matchserver.railway.app
- **Database**: Connected via internal network

## 🎯 **NEXT: Vercel + Backend Hosting**
