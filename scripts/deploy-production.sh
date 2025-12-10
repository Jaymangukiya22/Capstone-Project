#!/bin/bash

echo "============================================"
echo "     QuizUP Production Deployment"
echo "============================================"
echo

# Set production environment variables
export NODE_ENV=production
export VITE_API_BASE_URL=https://api.quizdash.dpdns.org
export VITE_WEBSOCKET_URL=wss://match.quizdash.dpdns.org
export VITE_APP_NAME=QuizUP
export VITE_APP_VERSION=1.0.0

echo "✅ Environment set to PRODUCTION"
echo "   - Frontend: https://quizdash.dpdns.org"
echo "   - API: https://api.quizdash.dpdns.org"
echo "   - WebSocket: wss://match.quizdash.dpdns.org"
echo

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose down

# Build and start production services
echo "🔨 Building production containers..."
docker-compose build frontend-prod

echo "🚀 Starting production services..."
docker-compose up -d

echo
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

echo
echo "============================================"
echo "     Production Services Status"
echo "============================================"
docker-compose ps

echo
echo "============================================"
echo "     Starting Cloudflare Tunnel"
echo "============================================"
echo
echo "Services will be available at:"
echo "  - https://quizdash.dpdns.org (Frontend)"
echo "  - https://api.quizdash.dpdns.org (Backend API)"
echo "  - https://match.quizdash.dpdns.org (Match Server)"
echo "  - https://grafana.quizdash.dpdns.org (Grafana)"
echo "  - https://adminer.quizdash.dpdns.org (Database)"
echo "  - https://prometheus.quizdash.dpdns.org (Monitoring)"
echo "  - https://redis.quizdash.dpdns.org (Redis)"
echo
echo "Press Ctrl+C to stop the tunnel"
echo

# Start Cloudflare tunnel with explicit config path (works from any CWD)
# Resolve script directory and project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLOUDFLARE_CONFIG="$PROJECT_ROOT/cloudflare-tunnel.yml"

if [ ! -f "$CLOUDFLARE_CONFIG" ]; then
  echo "ERROR: Cloudflare config not found at $CLOUDFLARE_CONFIG"
  exit 1
fi

# Convert config path for Windows cloudflared if cygpath is available
WIN_CONFIG="$CLOUDFLARE_CONFIG"
if command -v cygpath >/dev/null 2>&1; then
  WIN_CONFIG="$(cygpath -w "$CLOUDFLARE_CONFIG")"
fi

cloudflared tunnel --config "$WIN_CONFIG" run
