#!/bin/bash

# Script to switch between development and production environments
# Usage: ./switch-env.sh [dev|prod]

MODE=${1:-dev}

if [ "$MODE" = "prod" ] || [ "$MODE" = "production" ]; then
    echo "🚀 Switching to PRODUCTION mode..."
    
    # Copy production environment files
    cp .env.production .env
    cp Frontend-admin/.env.production Frontend-admin/.env
    
    echo "✅ Production environment activated!"
    echo "📋 Configuration:"
    echo "   - API: https://api.quizdash.dpdns.org"
    echo "   - WebSocket: wss://match.quizdash.dpdns.org"
    echo "   - HMR: wss://quizdash.dpdns.org (for Cloudflare tunnel)"
    echo ""
    echo "🔄 Restart services: docker-compose restart frontend"
    
elif [ "$MODE" = "dev" ] || [ "$MODE" = "development" ]; then
    echo "🔧 Switching to DEVELOPMENT mode..."
    
    # Restore development environment files
    git checkout .env Frontend-admin/.env 2>/dev/null || echo "Using current development .env files"
    
    echo "✅ Development environment activated!"
    echo "📋 Configuration:"
    echo "   - API: http://localhost:8090"
    echo "   - WebSocket: ws://localhost:3001"
    echo "   - HMR: ws://localhost:5173 (for local development)"
    echo ""
    echo "🔄 Restart services: docker-compose restart frontend"
    
else
    echo "❌ Invalid mode: $MODE"
    echo "Usage: $0 [dev|prod]"
    echo "  dev  - Development mode (localhost)"
    echo "  prod - Production mode (Cloudflare tunnel)"
    exit 1
fi
