#!/bin/bash

# =============================================================================
# QuizUP Complete Deployment Script
# Deploys and tests all three environments: localhost, network, and production
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Docker
    if command -v docker &> /dev/null; then
        print_success "Docker installed: $(docker --version)"
    else
        print_error "Docker not installed"
        exit 1
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js installed: $(node --version)"
    else
        print_error "Node.js not installed"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        print_success "npm installed: $(npm --version)"
    else
        print_error "npm not installed"
        exit 1
    fi
    
    # Check if Docker Swarm is initialized
    if docker info 2>/dev/null | grep -q "Swarm: active"; then
        print_success "Docker Swarm is active"
    else
        print_warning "Docker Swarm not initialized"
        print_info "Initializing Docker Swarm..."
        docker swarm init
        print_success "Docker Swarm initialized"
    fi
}

# Deploy localhost environment
deploy_localhost() {
    print_header "Deploying Localhost Environment"
    
    print_info "Building Docker images..."
    docker-compose build
    
    print_info "Starting services..."
    docker-compose up -d
    
    print_info "Waiting for services to be ready..."
    sleep 10
    
    print_info "Checking service health..."
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
    fi
    
    if curl -f http://localhost:3001/health &> /dev/null; then
        print_success "Match server is healthy"
    else
        print_error "Match server health check failed"
    fi
    
    print_success "Localhost deployment complete!"
    print_info "Frontend: http://localhost:5173"
    print_info "Backend: http://localhost:3000"
    print_info "Match Server: http://localhost:3001"
}

# Deploy network environment
deploy_network() {
    print_header "Deploying Network Environment"
    
    # Get network IP
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        NETWORK_IP=$(hostname -I | awk '{print $1}')
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        NETWORK_IP=$(ipconfig getifaddr en0)
    else
        print_warning "Could not auto-detect network IP"
        read -p "Enter your network IP address: " NETWORK_IP
    fi
    
    print_info "Using network IP: $NETWORK_IP"
    export NETWORK_IP
    
    print_info "Updating environment variables..."
    echo "NETWORK_IP=$NETWORK_IP" > .env.network
    
    print_info "Starting services with network configuration..."
    docker-compose -f docker-compose.yml -f docker-compose.network.yml up -d
    
    print_info "Waiting for services to be ready..."
    sleep 10
    
    print_success "Network deployment complete!"
    print_info "Frontend: http://$NETWORK_IP:5173"
    print_info "Backend: http://$NETWORK_IP:3000"
    print_info "Match Server: http://$NETWORK_IP:3001"
}

# Deploy production environment
deploy_production() {
    print_header "Deploying Production Environment (Docker Swarm)"
    
    print_info "Creating Docker secrets..."
    echo "7a0b42e9df5856f7cfe0094361f65630" | docker secret create quizup_jwt_secret - 2>/dev/null || print_warning "Secret quizup_jwt_secret already exists"
    echo "quizup_password" | docker secret create quizup_db_password - 2>/dev/null || print_warning "Secret quizup_db_password already exists"
    
    print_info "Creating Prometheus config..."
    cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
  
  - job_name: 'matchserver'
    static_configs:
      - targets: ['matchserver:3001']
EOF
    
    docker config create quizup_prometheus_config prometheus.yml 2>/dev/null || print_warning "Config quizup_prometheus_config already exists"
    
    print_info "Building production images..."
    docker build -t quizup-backend:latest ./backend
    docker build -t quizup-matchserver:latest ./backend
    docker build -t quizup-frontend:latest ./Frontend-admin
    
    print_info "Deploying stack..."
    docker stack deploy -c docker-stack.yml quizup
    
    print_info "Waiting for services to be ready..."
    sleep 20
    
    print_info "Checking service status..."
    docker stack services quizup
    
    print_success "Production deployment complete!"
    print_info "Services are starting up. Check status with: docker stack services quizup"
    print_info "View logs with: docker service logs quizup_backend"
}

# Run tests
run_tests() {
    print_header "Running Tests"
    
    if [ ! -d "tests/node_modules" ]; then
        print_info "Installing test dependencies..."
        cd tests
        npm install
        cd ..
    fi
    
    print_info "Running stress tests..."
    cd tests
    
    if [ "$1" == "all" ]; then
        npm run run:all
    elif [ "$1" == "localhost" ]; then
        npm run run:localhost
    elif [ "$1" == "network" ]; then
        npm run run:network
    elif [ "$1" == "hosted" ]; then
        npm run run:hosted
    else
        print_info "Running localhost tests..."
        npm run run:localhost
    fi
    
    cd ..
    print_success "Tests complete!"
}

# Show menu
show_menu() {
    echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   QuizUP Deployment Manager           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"
    echo "1. Deploy Localhost Environment"
    echo "2. Deploy Network Environment"
    echo "3. Deploy Production Environment"
    echo "4. Deploy All Environments"
    echo "5. Run Tests (Localhost)"
    echo "6. Run Tests (Network)"
    echo "7. Run Tests (Production/Hosted)"
    echo "8. Run Tests (All Environments)"
    echo "9. Check Service Status"
    echo "10. View Logs"
    echo "11. Stop All Services"
    echo "0. Exit"
    echo ""
}

# Check service status
check_status() {
    print_header "Service Status"
    
    print_info "Docker Compose Services:"
    docker-compose ps
    
    print_info "\nDocker Stack Services:"
    docker stack services quizup 2>/dev/null || print_warning "No stack deployed"
    
    print_info "\nDocker Stats:"
    docker stats --no-stream
}

# View logs
view_logs() {
    print_header "Service Logs"
    
    echo "1. Backend logs (docker-compose)"
    echo "2. Match server logs (docker-compose)"
    echo "3. Backend logs (swarm)"
    echo "4. Match server logs (swarm)"
    echo "5. All logs (docker-compose)"
    echo ""
    read -p "Select log to view: " log_choice
    
    case $log_choice in
        1) docker-compose logs -f backend ;;
        2) docker-compose logs -f matchserver ;;
        3) docker service logs -f quizup_backend ;;
        4) docker service logs -f quizup_matchserver ;;
        5) docker-compose logs -f ;;
        *) print_error "Invalid choice" ;;
    esac
}

# Stop all services
stop_all() {
    print_header "Stopping All Services"
    
    print_info "Stopping docker-compose services..."
    docker-compose down
    
    print_info "Removing Docker stack..."
    docker stack rm quizup 2>/dev/null || print_warning "No stack to remove"
    
    print_success "All services stopped"
}

# Main script
main() {
    clear
    print_header "QuizUP Complete Deployment Script"
    
    check_prerequisites
    
    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            read -p "Enter your choice: " choice
            
            case $choice in
                1) deploy_localhost ;;
                2) deploy_network ;;
                3) deploy_production ;;
                4) 
                    deploy_localhost
                    deploy_network
                    deploy_production
                    ;;
                5) run_tests "localhost" ;;
                6) run_tests "network" ;;
                7) run_tests "hosted" ;;
                8) run_tests "all" ;;
                9) check_status ;;
                10) view_logs ;;
                11) stop_all ;;
                0) 
                    print_info "Exiting..."
                    exit 0
                    ;;
                *) print_error "Invalid choice" ;;
            esac
            
            read -p "Press Enter to continue..."
        done
    else
        # Command line mode
        case $1 in
            localhost) deploy_localhost ;;
            network) deploy_network ;;
            production) deploy_production ;;
            all) 
                deploy_localhost
                deploy_network
                deploy_production
                ;;
            test) run_tests "$2" ;;
            status) check_status ;;
            logs) view_logs ;;
            stop) stop_all ;;
            *)
                echo "Usage: $0 {localhost|network|production|all|test|status|logs|stop}"
                echo ""
                echo "Examples:"
                echo "  $0 localhost          # Deploy localhost environment"
                echo "  $0 network            # Deploy network environment"
                echo "  $0 production         # Deploy production environment"
                echo "  $0 all                # Deploy all environments"
                echo "  $0 test localhost     # Run localhost tests"
                echo "  $0 test all           # Run all tests"
                echo "  $0 status             # Check service status"
                echo "  $0 stop               # Stop all services"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"
