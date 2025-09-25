# ⚡ Vercel + Backend Hosting Guide

Vercel is **excellent for frontend hosting** but you'll need a separate backend solution.

## 📋 Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Backend Hosting**: Choose Render/Railway for backend

## 🌐 Step 1: Frontend Deployment (Vercel)

### Connect to Vercel:
1. **Import Project**: Connect your GitHub repository
2. **Configure Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./Frontend-admin`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Environment Variables:
```bash
# Production API URLs
VITE_API_BASE_URL=https://your-backend-host.com
VITE_WEBSOCKET_URL=wss://your-websocket-host.com

# App Configuration
VITE_APP_NAME=QuizUP
VITE_APP_VERSION=1.0.0
```

### Custom Domains:
1. **Vercel Dashboard** → **Settings** → **Domains**
2. **Add Domain**: `yourdomain.com`
3. **Configure DNS**: Point to Vercel's nameservers

## 🖥️ Step 2: Backend Deployment Options

### Option A: Render (Recommended)
Follow the **Render Deployment Guide** above for backend.

### Option B: Railway
Follow the **Railway Deployment Guide** above for backend.

### Option C: Heroku (Alternative)
```bash
# Heroku CLI deployment
heroku create quizup-backend
heroku buildpacks:add heroku/nodejs
git push heroku main
```

## ⚙️ Step 3: Environment Configuration

### Frontend (Vercel):
```bash
# API Endpoints
VITE_API_BASE_URL=https://quizup-backend.onrender.com
VITE_WEBSOCKET_URL=wss://quizup-matchserver.onrender.com

# Production Settings
NODE_ENV=production
```

### Backend (Render/Railway):
```bash
# Production Environment
NODE_ENV=production
SERVICE_TYPE=backend

# CORS Configuration
CORS_ORIGIN=https://quizup-frontend.vercel.app,https://yourdomain.com

# Database & Redis (provided by hosting platform)
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## 🔄 Step 4: Database Setup

### PostgreSQL Options:
1. **Render PostgreSQL** (Recommended)
2. **Railway PostgreSQL**
3. **Supabase** (Free tier available)
4. **PlanetScale** (MySQL alternative)

### Redis Options:
1. **Render Redis**
2. **Railway Redis**
3. **Upstash** (Serverless Redis)
4. **Redis Labs**

## 📊 Step 5: WebSocket Configuration

### For Render + Vercel:
```bash
# Frontend Environment Variables
VITE_API_BASE_URL=https://quizup-backend.onrender.com
VITE_WEBSOCKET_URL=wss://quizup-matchserver.onrender.com

# Backend CORS
CORS_ORIGIN=https://quizup-frontend.vercel.app,https://yourdomain.com
```

## 🚀 Step 6: Deployment Commands

### Frontend (Vercel):
```bash
# Vercel auto-deploys from GitHub
git add .
git commit -m "Deploy frontend to Vercel"
git push origin main
```

### Backend (Render/Railway):
```bash
# Deploy backend to chosen platform
git add .
git commit -m "Deploy backend to Render"
git push origin main
```

## 🔧 Step 7: API Integration

### Update API Client:
Your frontend should use the production URLs:

```javascript
// In your API client
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';
```

## 📱 Step 8: Mobile & PWA Support

Vercel provides excellent PWA support:

### PWA Configuration:
1. **Add manifest.json** to your public folder
2. **Service Worker** for offline support
3. **Vercel PWA Plugin** for optimization

## ✅ Expected Results

### Vercel + Render Setup:
- **Frontend**: https://quizup-frontend.vercel.app
- **Backend API**: https://quizup-backend.onrender.com
- **WebSocket**: wss://quizup-matchserver.onrender.com
- **Database**: Render PostgreSQL

### Vercel + Railway Setup:
- **Frontend**: https://quizup-frontend.vercel.app
- **Backend API**: https://quizup-backend.railway.app
- **WebSocket**: wss://quizup-matchserver.railway.app
- **Database**: Railway PostgreSQL

## 🔄 Step 9: CI/CD Integration

### GitHub Actions for Vercel:
```yaml
# .github/workflows/vercel.yml
name: Deploy to Vercel
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 🎯 **NEXT: Netlify Deployment Guide**
