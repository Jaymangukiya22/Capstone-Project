#!/bin/bash

# Test Worker Pool Architecture
# This script helps verify the worker pool is functioning correctly

echo "========================================"
echo "  Match Server Worker Pool Test"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Check if server is running
echo -e "${YELLOW}[Test 1]${NC} Checking if Match Server is running..."
HEALTH=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Server is running"
    echo "$HEALTH" | jq '.'
else
    echo -e "${RED}✗${NC} Server is not running"
    echo "Start it with: npm run dev:match:pool"
    exit 1
fi
echo ""

# Test 2: Check worker pool stats
echo -e "${YELLOW}[Test 2]${NC} Getting worker pool statistics..."
STATS=$(curl -s http://localhost:3001/workers/stats)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Worker pool responding"
    echo "$STATS" | jq '.'
    
    TOTAL_WORKERS=$(echo "$STATS" | jq -r '.totalWorkers')
    ACTIVE_WORKERS=$(echo "$STATS" | jq -r '.activeWorkers')
    TOTAL_MATCHES=$(echo "$STATS" | jq -r '.totalMatches')
    
    echo ""
    echo "Summary:"
    echo "  Total Workers: $TOTAL_WORKERS"
    echo "  Active Workers: $ACTIVE_WORKERS"
    echo "  Active Matches: $TOTAL_MATCHES"
else
    echo -e "${RED}✗${NC} Could not get worker stats"
    exit 1
fi
echo ""

# Test 3: Check Prometheus metrics
echo -e "${YELLOW}[Test 3]${NC} Checking Prometheus metrics..."
METRICS=$(curl -s http://localhost:3001/metrics | grep -E "matchserver_(active_workers|total_workers|active_matches)")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Metrics available"
    echo "$METRICS"
else
    echo -e "${RED}✗${NC} Metrics not available"
fi
echo ""

# Test 4: Check match creation endpoint
echo -e "${YELLOW}[Test 4]${NC} Testing match by code endpoint..."
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/matches/code/TEST123)
if [ "$TEST_RESPONSE" == "404" ]; then
    echo -e "${GREEN}✓${NC} Endpoint responding correctly (404 expected for invalid code)"
else
    echo -e "${YELLOW}⚠${NC} Unexpected response: $TEST_RESPONSE"
fi
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}✓ Worker Pool Tests Complete${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Start your frontend application"
echo "2. Create multiple matches (4-6)"
echo "3. Watch workers scale: curl http://localhost:3001/workers/stats | jq"
echo "4. Monitor performance with multiple concurrent matches"
echo ""
echo "For continuous monitoring, run:"
echo "  watch -n 2 'curl -s http://localhost:3001/workers/stats | jq'"
echo ""
