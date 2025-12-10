#!/bin/bash

# =============================================================================
# QuizUP Multi-Host Deployment Script
# Supports: localhost, network, self-hosted (Cloudflare Tunnel)
# Usage: ./deploy.sh [localhost|network|self-hosted]
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# FUNCTIONS
# =============================================================================

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

detect_network_ip() {
    # Try multiple methods to detect network IP
    local ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    
    if [ -z "$ip" ]; then
        ip=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d: -f2)
    fi
    
    if [ -z "$ip" ]; then
        ip=$(ip addr show 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d/ -f1)
    fi
    
    echo "$ip"
}

setup_localhost() {
    print_header "🚀 LOCALHOST DEPLOYMENT"
    
    print_info "Setting up localhost environment..."
    cp .env.localhost .env
    cp backend/.env.localhost backend/.env
    cp Frontend-admin/.env.localhost Frontend-admin/.env
    
    print_success "Environment files copied"
    
    print_info "Building Docker images..."
    docker-compose build --no-cache
    
    print_success "Docker images built"
    
    print_info "Starting services..."
    docker-compose up -d
    
    print_success "Services started"
    
    print_info "Waiting for services to be healthy..."
    sleep 10
    
    # Health checks
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
    fi
    
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Match server is healthy"
    else
        print_error "Match server health check failed"
    fi
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║ ✅ LOCALHOST DEPLOYMENT COMPLETE${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "📍 Access Points:"
    echo "   Frontend: http://localhost:5173"
    echo "   API: http://localhost:3000"
    echo "   Match Server: http://localhost:3001"
    echo "   Nginx Proxy: http://localhost:8090"
    echo ""
}

setup_network() {
    print_header "🌐 NETWORK DEPLOYMENT"
    
    print_info "Detecting network IP..."
    NETWORK_IP=$(detect_network_ip)
    
    if [ -z "$NETWORK_IP" ]; then
        print_error "Could not detect network IP. Please set it manually."
        read -p "Enter your network IP: " NETWORK_IP
    fi
    
    print_success "Network IP detected: $NETWORK_IP"
    
    print_info "Setting up network environment..."
    cp .env.network .env
    cp backend/.env.network backend/.env
    cp Frontend-admin/.env.network Frontend-admin/.env
    
    # Update .env files with detected network IP
    sed -i "s/NETWORK_IP=auto/NETWORK_IP=$NETWORK_IP/g" .env
    sed -i "s|http://localhost:8090|http://$NETWORK_IP:8090|g" .env
    sed -i "s|ws://localhost:3001|ws://$NETWORK_IP:3001|g" .env
    sed -i "s|http://localhost:5173|http://$NETWORK_IP:5173|g" .env
    
    sed -i "s|http://localhost:8090|http://$NETWORK_IP:8090|g" backend/.env
    sed -i "s|http://localhost:3000|http://$NETWORK_IP:3000|g" backend/.env
    
    sed -i "s|http://localhost:8090|http://$NETWORK_IP:8090|g" Frontend-admin/.env
    sed -i "s|ws://localhost:3001|ws://$NETWORK_IP:3001|g" Frontend-admin/.env
    
    print_success "Environment files configured"
    
    print_info "Building Docker images..."
    docker-compose build --no-cache
    
    print_success "Docker images built"
    
    print_info "Starting services..."
    docker-compose up -d
    
    print_success "Services started"
    
    print_info "Waiting for services to be healthy..."
    sleep 10
    
    # Health checks
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
    fi
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║ ✅ NETWORK DEPLOYMENT COMPLETE${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "📍 Access Points (from any device on network):"
    echo "   Frontend: http://$NETWORK_IP:5173"
    echo "   API: http://$NETWORK_IP:3000"
    echo "   Match Server: http://$NETWORK_IP:3001"
    echo "   Nginx Proxy: http://$NETWORK_IP:8090"
    echo ""
    echo "💡 Share this URL with your friends:"
    echo "   http://$NETWORK_IP:5173"
    echo ""
}

setup_self_hosted() {
    print_header "☁️  SELF-HOSTED DEPLOYMENT (Cloudflare Tunnel)"
    
    print_info "Setting up self-hosted environment..."
    cp .env.self-hosted .env
    cp backend/.env.self-hosted backend/.env
    cp Frontend-admin/.env.self-hosted Frontend-admin/.env
    
    print_success "Environment files copied"
    
    print_info "Initializing Docker Swarm..."
    docker swarm init 2>/dev/null || print_info "Docker Swarm already initialized"
    
    print_success "Docker Swarm ready"
    
    print_info "Building production images..."
    docker build -f backend/Dockerfile -t quizup-backend:latest ./backend
    docker build -f backend/Dockerfile --target matchserver-master -t quizup-matchserver:latest ./backend
    docker build -f Frontend-admin/Dockerfile --target production -t quizup-frontend:latest ./Frontend-admin
    
    print_success "Production images built"
    
    print_info "Deploying stack..."
    docker stack deploy -c docker-compose.yml quizup
    
    print_success "Stack deployed"
    
    print_info "Waiting for services to be ready..."
    sleep 15
    
    # Check service status
    docker stack services quizup
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║ ✅ SELF-HOSTED DEPLOYMENT COMPLETE${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "📍 Access Points (via Cloudflare Tunnel):"
    echo "   Frontend: https://quizdash.dpdns.org"
    echo "   API: https://api.quizdash.dpdns.org"
    echo "   Match Server: wss://match.quizdash.dpdns.org"
    echo ""
    echo "🔧 Next Steps:"
    echo "   1. Start Cloudflare tunnel: cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139"
    echo "   2. Monitor services: docker service logs -f quizup_backend"
    echo "   3. Check status: docker stack services quizup"
    echo ""
}

show_usage() {
    echo "Usage: $0 [localhost|network|self-hosted]"
    echo ""
    echo "Modes:"
    echo "  localhost    - Deploy on single machine (http://localhost:5173)"
    echo "  network      - Deploy on network (http://{NETWORK_IP}:5173)"
    echo "  self-hosted  - Deploy with Cloudflare Tunnel (https://quizdash.dpdns.org)"
    echo ""
    echo "Examples:"
    echo "  $0 localhost"
    echo "  $0 network"
    echo "  $0 self-hosted"
    echo ""
}

# =============================================================================
# MAIN
# =============================================================================

if [ $# -eq 0 ]; then
    print_error "No deployment mode specified"
    echo ""
    show_usage
    exit 1
fi

MODE=$1

case "$MODE" in
    localhost)
        setup_localhost
        ;;
    network)
        setup_network
        ;;
    self-hosted)
        setup_self_hosted
        ;;
    *)
        print_error "Unknown deployment mode: $MODE"
        echo ""
        show_usage
        exit 1
        ;;
esac
