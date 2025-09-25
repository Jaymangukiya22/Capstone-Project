# 🌐 Netlify + Backend Hosting Guide

Netlify is great for **static sites and frontend hosting**, but you'll need separate backend hosting.

## 📋 Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
3. **Backend Hosting**: Choose Render/Railway for backend

## 🌐 Step 1: Frontend Deployment (Netlify)

### Connect to Netlify:
1. **Import Project**: Connect your GitHub repository
2. **Site Configuration**:
   - **Branch to deploy**: `main`
   - **Base directory**: `Frontend-admin`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

### Build Settings:
```bash
# Site Settings → Build & Deploy → Build settings
Build command: npm run build
Publish directory: dist
Node version: 18.17.0
```

### Environment Variables:
```bash
# API Configuration
VITE_API_BASE_URL=https://your-backend-host.com
VITE_WEBSOCKET_URL=wss://your-websocket-host.com

# App Configuration
VITE_APP_NAME=QuizUP
VITE_APP_VERSION=1.0.0

# Production Settings
NODE_ENV=production
```

## 🖥️ Step 2: Backend Deployment

### Option A: Render (Recommended)
Follow the **Render Deployment Guide** for backend deployment.

### Option B: Railway
Follow the **Railway Deployment Guide** for backend deployment.

### Option C: Heroku (Alternative)
```bash
# Heroku deployment
heroku create quizup-backend
heroku buildpacks:add heroku/nodejs
git push heroku main
```

## ⚙️ Step 3: Environment Configuration

### Frontend (Netlify):
```bash
# API Endpoints
VITE_API_BASE_URL=https://quizup-backend.onrender.com
VITE_WEBSOCKET_URL=wss://quizup-matchserver.onrender.com

# Netlify-specific variables
NODE_ENV=production
BUILD_ENV=production
```

### Backend (Render/Railway):
```bash
# Production Environment
NODE_ENV=production
SERVICE_TYPE=backend

# CORS Configuration
CORS_ORIGIN=https://quizup-frontend.netlify.app,https://yourdomain.com

# Database & Redis (provided by hosting platform)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## 🔄 Step 4: Database Setup

### PostgreSQL Options:
1. **Render PostgreSQL** (Recommended)
2. **Railway PostgreSQL**
3. **Supabase** (Free PostgreSQL)
4. **ElephantSQL** (Free PostgreSQL)

### Redis Options:
1. **Render Redis**
2. **Railway Redis**
3. **Upstash** (Serverless Redis)

## 📊 Step 5: WebSocket Configuration

### For Render + Netlify:
```bash
# Frontend Environment Variables
VITE_API_BASE_URL=https://quizup-backend.onrender.com
VITE_WEBSOCKET_URL=wss://quizup-matchserver.onrender.com

# Backend CORS
CORS_ORIGIN=https://quizup-frontend.netlify.app,https://yourdomain.com
```

## 🚀 Step 6: Deployment Process

### Frontend (Netlify):
Netlify auto-deploys when you push to GitHub:
```bash
git add .
git commit -m "Deploy frontend to Netlify"
git push origin main
```

### Backend (Render/Railway):
Deploy backend to your chosen platform:
```bash
git add .
git commit -m "Deploy backend to Render"
git push origin main
```

## 🔧 Step 7: Netlify-Specific Features

### Form Handling:
Netlify provides built-in form handling:
```html
<!-- Netlify forms work out of the box -->
<form name="contact" method="POST" data-netlify="true">
  <input type="email" name="email" />
  <button type="submit">Submit</button>
</form>
```

### Redirects & Rewrites:
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/api/*"
  to = "https://quizup-backend.onrender.com/:splat"
  status = 200

[[redirects]]
  from = "/ws"
  to = "wss://quizup-matchserver.onrender.com"
  status = 200
```

## 📱 Step 8: PWA & Performance

### PWA Support:
1. **Add manifest.json** to public folder
2. **Service Worker** for offline functionality
3. **Netlify PWA Plugin** for optimization

### Performance Optimization:
```toml
# netlify.toml performance settings
[build.processing]
  skip_processing = false
[build.processing.css]
  bundle = true
  minify = true
[build.processing.js]
  bundle = true
  minify = true
[build.processing.html]
  pretty_urls = true
```

## ✅ Expected Results

### Netlify + Render Setup:
- **Frontend**: https://quizup-frontend.netlify.app
- **Backend API**: https://quizup-backend.onrender.com
- **WebSocket**: wss://quizup-matchserver.onrender.com
- **Database**: Render PostgreSQL

### Netlify + Railway Setup:
- **Frontend**: https://quizup-frontend.netlify.app
- **Backend API**: https://quizup-backend.railway.app
- **WebSocket**: wss://quizup-matchserver.railway.app
- **Database**: Railway PostgreSQL

## 🔄 Step 9: CI/CD Integration

### Netlify Build Hooks:
```bash
# Netlify will POST to this URL after build
https://api.netlify.com/hooks/YOUR_BUILD_HOOK_ID
```

### GitHub Actions:
```yaml
# .github/workflows/netlify.yml
name: Deploy to Netlify
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: jsmrcaga/action-netlify-deploy@v1.7.1
        with:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          build_directory: dist
```

## 🎯 **NEXT: Cost Comparison & Recommendations**
