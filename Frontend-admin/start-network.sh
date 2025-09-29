#!/bin/bash

# Get the network IP automatically
NETWORK_IP=$(hostname -I 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d: -f2)

if [ -z "$NETWORK_IP" ]; then
    echo "❌ Could not determine network IP. Using localhost as fallback."
    NETWORK_IP="localhost"
else
    echo "🌐 Network IP detected: $NETWORK_IP"
fi

echo "🚀 Starting QuizMaster Frontend with network access..."
echo "🌍 Frontend will be accessible at: http://$NETWORK_IP:5173"
echo "📡 Backend API: http://$NETWORK_IP:3000"
echo "🔌 WebSocket: ws://$NETWORK_IP:3001"
echo ""
echo "Share this URL with your friend: http://$NETWORK_IP:5173"
echo ""

# Start the frontend development server
npm run dev -- --host 0.0.0.0
