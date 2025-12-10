#!/bin/bash

# Quick Fix for 403 Forbidden Error
# This script fixes the frontend production build issue

echo "🔧 QuizUP Frontend 403 Fix"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Determine deployment mode
if [ -z "$1" ]; then
    echo "Usage: ./QUICK_FIX.sh [localhost|network|self-hosted]"
    echo ""
    echo "Examples:"
    echo "  ./QUICK_FIX.sh localhost    # Development mode"
    echo "  ./QUICK_FIX.sh network      # Production mode (network)"
    echo "  ./QUICK_FIX.sh self-hosted  # Production mode (Cloudflare)"
    exit 1
fi

MODE=$1

echo "📋 Mode: $MODE"
echo ""

# Load environment
if [ ! -f ".env.$MODE" ]; then
    echo "❌ Error: .env.$MODE not found"
    exit 1
fi

echo "✅ Loading .env.$MODE"
source ".env.$MODE"

# Stop current services
echo ""
echo "🛑 Stopping current services..."
docker compose down

# Rebuild frontend
echo ""
echo "🔨 Rebuilding frontend (target: $FRONTEND_TARGET)..."
docker compose build frontend

# Start services
echo ""
echo "🚀 Starting services..."
docker compose up -d

# Wait for services
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Verify frontend
echo ""
echo "✅ Verifying frontend..."
if docker ps | grep -q quizup_frontend; then
    echo "✅ Frontend container running"
else
    echo "❌ Frontend container not running"
    exit 1
fi

# Check health
echo ""
echo "🏥 Checking health..."
if [ "$MODE" = "localhost" ]; then
    curl -s http://localhost:5173/health || echo "⚠️  Frontend not responding yet"
else
    curl -s http://localhost:5173/health || echo "⚠️  Frontend not responding yet"
fi

echo ""
echo "=================================="
echo "✅ Fix Complete!"
echo ""

if [ "$MODE" = "localhost" ]; then
    echo "Access at: http://localhost:5173"
elif [ "$MODE" = "network" ]; then
    echo "Access at: http://$NETWORK_IP:5173"
else
    echo "Access at: https://quizdash.dpdns.org"
fi

echo ""
echo "If you still see 403 errors:"
echo "1. Clear browser cache (Ctrl+Shift+Delete)"
echo "2. Check: docker logs quizup_frontend"
echo "3. Verify: docker exec quizup_frontend ps aux | grep nginx"
