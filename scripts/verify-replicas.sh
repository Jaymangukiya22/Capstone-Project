#!/bin/bash

# =============================================================================
# QuizUP Replica Verification Script
# Comprehensive testing of Docker Swarm replicas and load balancing
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔍 QuizUP Replica Verification & Testing${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# =============================================================================
# 1. CHECK DOCKER SWARM STATUS
# =============================================================================
echo -e "\n${YELLOW}1️⃣  Checking Docker Swarm Status...${NC}"

if ! docker info | grep -q "Swarm: active"; then
  echo -e "${RED}❌ Docker Swarm not active!${NC}"
  echo "Initialize with: docker swarm init"
  exit 1
fi

SWARM_STATUS=$(docker info | grep "Swarm:" | awk '{print $2}')
echo -e "${GREEN}✅ Docker Swarm Status: $SWARM_STATUS${NC}"

# =============================================================================
# 2. CHECK STACK DEPLOYMENT
# =============================================================================
echo -e "\n${YELLOW}2️⃣  Checking Stack Deployment...${NC}"

if ! docker stack ls | grep -q "quizup"; then
  echo -e "${RED}❌ Stack 'quizup' not deployed!${NC}"
  echo "Deploy with: docker stack deploy -c docker-stack.yml quizup"
  exit 1
fi

echo -e "${GREEN}✅ Stack 'quizup' deployed${NC}"

# =============================================================================
# 3. CHECK SERVICE REPLICAS
# =============================================================================
echo -e "\n${YELLOW}3️⃣  Checking Service Replicas...${NC}"

echo -e "\n${BLUE}Backend Service:${NC}"
BACKEND_REPLICAS=$(docker service ls --filter "name=quizup_backend" --format "{{.Replicas}}")
echo "Replicas: $BACKEND_REPLICAS"
docker service ps quizup_backend --no-trunc

echo -e "\n${BLUE}Match Server Service:${NC}"
MATCHSERVER_REPLICAS=$(docker service ls --filter "name=quizup_matchserver" --format "{{.Replicas}}")
echo "Replicas: $MATCHSERVER_REPLICAS"
docker service ps quizup_matchserver --no-trunc

echo -e "\n${BLUE}Nginx Service:${NC}"
NGINX_REPLICAS=$(docker service ls --filter "name=quizup_nginx" --format "{{.Replicas}}")
echo "Replicas: $NGINX_REPLICAS"
docker service ps quizup_nginx --no-trunc

echo -e "\n${BLUE}Frontend Service:${NC}"
FRONTEND_REPLICAS=$(docker service ls --filter "name=quizup_frontend" --format "{{.Replicas}}")
echo "Replicas: $FRONTEND_REPLICAS"
docker service ps quizup_frontend --no-trunc

# =============================================================================
# 4. TEST LOAD BALANCING
# =============================================================================
echo -e "\n${YELLOW}4️⃣  Testing Load Balancing...${NC}"

echo -e "\n${BLUE}Backend Load Balancing (5 requests):${NC}"
HOSTNAMES=()
for i in {1..5}; do
  RESPONSE=$(curl -s http://localhost:8090/api/health 2>/dev/null || echo '{}')
  HOSTNAME=$(echo $RESPONSE | jq -r '.hostname // "unknown"' 2>/dev/null || echo "error")
  HOSTNAMES+=("$HOSTNAME")
  echo "  Request $i: $HOSTNAME"
done

# Check if we got different hostnames
UNIQUE_HOSTNAMES=$(printf '%s\n' "${HOSTNAMES[@]}" | sort -u | wc -l)
if [ $UNIQUE_HOSTNAMES -gt 1 ]; then
  echo -e "${GREEN}✅ Load balancing working (${UNIQUE_HOSTNAMES} different replicas)${NC}"
else
  echo -e "${YELLOW}⚠️  Load balancing may not be working (only 1 unique replica)${NC}"
fi

# =============================================================================
# 5. TEST MATCH SERVER CONNECTIVITY
# =============================================================================
echo -e "\n${YELLOW}5️⃣  Testing Match Server Connectivity...${NC}"

HEALTH_RESPONSE=$(curl -s http://localhost:3001/health 2>/dev/null || echo '{}')
if echo $HEALTH_RESPONSE | jq . > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Match Server responding${NC}"
  echo $HEALTH_RESPONSE | jq .
else
  echo -e "${YELLOW}⚠️  Match Server not responding${NC}"
fi

# =============================================================================
# 6. CHECK RESOURCE USAGE
# =============================================================================
echo -e "\n${YELLOW}6️⃣  Checking Resource Usage...${NC}"

echo -e "\n${BLUE}Docker Stats:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep quizup || echo "No containers running"

# =============================================================================
# 7. CHECK FOR ERRORS IN LOGS
# =============================================================================
echo -e "\n${YELLOW}7️⃣  Checking for Errors in Logs...${NC}"

echo -e "\n${BLUE}Backend Errors (last 20 lines):${NC}"
BACKEND_ERRORS=$(docker service logs quizup_backend --tail 20 2>/dev/null | grep -i error | wc -l)
if [ $BACKEND_ERRORS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $BACKEND_ERRORS errors${NC}"
  docker service logs quizup_backend --tail 20 | grep -i error || true
else
  echo -e "${GREEN}✅ No errors found${NC}"
fi

echo -e "\n${BLUE}Match Server Errors (last 20 lines):${NC}"
MATCHSERVER_ERRORS=$(docker service logs quizup_matchserver --tail 20 2>/dev/null | grep -i error | wc -l)
if [ $MATCHSERVER_ERRORS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $MATCHSERVER_ERRORS errors${NC}"
  docker service logs quizup_matchserver --tail 20 | grep -i error || true
else
  echo -e "${GREEN}✅ No errors found${NC}"
fi

# =============================================================================
# 8. CHECK NETWORK CONNECTIVITY
# =============================================================================
echo -e "\n${YELLOW}8️⃣  Checking Network Connectivity...${NC}"

NETWORK_ID=$(docker network ls --filter "name=quizup_quizup_network" --format "{{.ID}}")
if [ -z "$NETWORK_ID" ]; then
  echo -e "${RED}❌ Network 'quizup_quizup_network' not found${NC}"
else
  echo -e "${GREEN}✅ Network 'quizup_quizup_network' exists${NC}"
  echo "Network ID: $NETWORK_ID"
fi

# =============================================================================
# 9. VERIFY METRICS ENDPOINT
# =============================================================================
echo -e "\n${YELLOW}9️⃣  Verifying Metrics Endpoint...${NC}"

METRICS=$(curl -s http://localhost:3001/metrics 2>/dev/null | head -5)
if [ -z "$METRICS" ]; then
  echo -e "${YELLOW}⚠️  Metrics endpoint not responding${NC}"
else
  echo -e "${GREEN}✅ Metrics endpoint responding${NC}"
  echo "$METRICS"
fi

# =============================================================================
# 10. FINAL SUMMARY
# =============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 VERIFICATION SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

echo -e "\n${GREEN}✅ Deployment Status:${NC}"
echo "  • Docker Swarm: $SWARM_STATUS"
echo "  • Backend Replicas: $BACKEND_REPLICAS"
echo "  • Match Server Replicas: $MATCHSERVER_REPLICAS"
echo "  • Nginx Replicas: $NGINX_REPLICAS"
echo "  • Frontend Replicas: $FRONTEND_REPLICAS"

echo -e "\n${GREEN}✅ Load Balancing:${NC}"
echo "  • Unique Backend Replicas: $UNIQUE_HOSTNAMES"
echo "  • Load Distribution: $([ $UNIQUE_HOSTNAMES -gt 1 ] && echo 'Working' || echo 'Check configuration')"

echo -e "\n${GREEN}✅ Health Status:${NC}"
echo "  • Backend Errors: $BACKEND_ERRORS"
echo "  • Match Server Errors: $MATCHSERVER_ERRORS"

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Verification Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Monitor replicas: watch -n 2 'docker service ps quizup_backend'"
echo "2. View logs: docker service logs quizup_backend --follow"
echo "3. Check metrics: curl http://localhost:3001/metrics"
echo "4. Access Prometheus: http://localhost:9090"
echo "5. Access Grafana: http://localhost:3000"

exit 0
