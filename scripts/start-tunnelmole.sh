#!/bin/bash

# QuizUP Tunnelmole Deployment Script
# Fast, reliable tunneling without domains or registration

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting QuizUP with Tunnelmole...${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Check if Tunnelmole is installed
if ! command -v tmole &> /dev/null; then
    echo -e "${YELLOW}❌ Tunnelmole is not installed${NC}"
    echo -e "${BLUE}Installing Tunnelmole globally...${NC}"
    npm install -g tunnelmole
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Tunnelmole${NC}"
        echo -e "${YELLOW}Please install Node.js first: https://nodejs.org${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Tunnelmole is available${NC}"

# Step 1: Start Docker stack
echo -e "${BLUE}🐳 Starting Docker stack...${NC}"
docker compose up -d 

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 30

# Check if services are healthy
echo -e "${BLUE}🔍 Checking service health...${NC}"
docker compose ps

# Step 2: Start Tunnelmole
echo ""
echo -e "${BLUE}🌐 Starting Tunnelmole on port 8090...${NC}"
echo ""

# Start Tunnelmole (it will show the URL automatically)
echo -e "${GREEN}Starting Tunnelmole tunnel...${NC}"
echo -e "${YELLOW}📋 Your tunnel URL will appear below:${NC}"
echo ""

# Start Tunnelmole - it runs in foreground and shows the URL
tmole 8090

echo ""
echo -e "${GREEN}✅ Docker stack is running!${NC}"
echo -e "${BLUE}📊 Access points:${NC}"
echo -e "  • Local: http://localhost:8090"
echo -e "  • Grafana: http://localhost:3003"
echo -e "  • Adminer: http://localhost:8080"
echo ""
echo -e "${GREEN}🎉 Your QuizUP app is now accessible via Tunnelmole!${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "  • Tunnelmole is much faster than LocalTunnel"
echo -e "  • No registration or authentication required"
echo -e "  • Perfect for development, testing, and demos"
echo -e "  • Press Ctrl+C to stop the tunnel"
echo ""
