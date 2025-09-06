#!/bin/sh
echo "🚀 Starting Quiz App Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until pg_isready -h postgres -p 5432 -U quiz_user; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run Prisma migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || echo "⚠️  Migration failed, trying db push..."
npx prisma db push || echo "⚠️  Database push failed"

# Seed database if needed
echo "🌱 Seeding database..."
npm run db:seed || echo "⚠️  Seeding failed or already done"

# Start the application
echo "🎯 Starting application..."
exec npm start
