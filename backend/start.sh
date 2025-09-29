#!/bin/bash

# Backend server startup script for Docker

set -e

echo "Starting Quiz App Backend Server..."
echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo "Service Type: $SERVICE_TYPE"

# Wait for database to be ready
echo "Waiting for database connection..."
until pg_isready -h postgres -p 5432 -U ${POSTGRES_USER:-quizup_user} -d ${POSTGRES_DB:-quizup_db}; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "Database is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis connection..."
until redis-cli -h redis -p 6379 ping | grep -q "PONG"; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "Redis is ready!"

# Check if TypeScript build exists
if [ ! -d "dist" ]; then
  echo "Building TypeScript..."
  npm run build
fi

# Check if we need to seed database (only for backend service)
if [ "$SERVICE_TYPE" = "backend" ]; then
  echo "Setting up database..."
  # Run database setup if needed
  node dist/scripts/setupDatabase.js || echo "Database setup completed or already exists"
  
  # Quick seed for development
  if [ "$NODE_ENV" = "development" ]; then
    echo "Running development seed..."
    npm run seed:quick || echo "Seeding completed or skipped"
  fi
fi

# Start the appropriate server based on SERVICE_TYPE
if [ "$SERVICE_TYPE" = "matchserver" ] || [ "$MATCH_SERVICE_PORT" ]; then
  echo "Starting Match Server on port ${MATCH_SERVICE_PORT:-3001}..."
  exec node dist/matchServer-enhanced.js
else
  echo "Starting Backend API Server on port ${PORT:-3000}..."
  exec node dist/server.js
fi
