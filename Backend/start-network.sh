#!/bin/bash

# Get the network IP automatically
NETWORK_IP=$(hostname -I 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d: -f2)

if [ -z "$NETWORK_IP" ]; then
    echo "❌ Could not determine network IP. Using localhost as fallback."
    NETWORK_IP="localhost"
else
    echo "🌐 Network IP detected: $NETWORK_IP"
fi

# Export the network IP for the servers to use
export NETWORK_IP=$NETWORK_IP

echo "🚀 Starting QuizMaster servers with network access..."
echo "📡 Main API Server: http://$NETWORK_IP:3000"
echo "🔌 WebSocket Server: ws://$NETWORK_IP:3001"
echo "🌍 Frontend should be accessible at: http://$NETWORK_IP:5173"
echo ""
echo "Share this IP with your friend: $NETWORK_IP"
echo ""

# Start both servers concurrently
npm run dev:all
