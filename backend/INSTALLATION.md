# QuizSpark Backend - Installation & Usage Guide

This guide covers running the backend with Docker, seeding the database, and viewing data in pgAdmin.

## 1) Prerequisites
- Docker Desktop (with Docker Compose)
- Node.js 18+ and npm (for local Prisma/seed commands)
- pgAdmin (installed locally)

## 2) Clone and open the project
```bash
# Windows Git Bash / PowerShell
git clone <your-repo-url>
cd Capstone-Project/backend
```

## 3) Environment variables
The Docker stack already uses sensible defaults from `docker-compose.yml`.
For host-side Prisma commands, set:

- DATABASE_URL (host):
```
postgresql://quizspark_user:quizspark_password@localhost:5432/quizspark_db
```

Option A: Create a `.env` in `backend/` with:
```
DATABASE_URL=postgresql://quizspark_user:quizspark_password@localhost:5432/quizspark_db
```

Option B: Export for the current terminal session:
- Git Bash:
```bash
export DATABASE_URL="postgresql://quizspark_user:quizspark_password@localhost:5432/quizspark_db"
```
- PowerShell:
```powershell
$env:DATABASE_URL="postgresql://quizspark_user:quizspark_password@localhost:5432/quizspark_db"
```

## 4) Start the Docker stack
From `backend/` run:
```bash
docker-compose up --build
```
Services started:
- API: http://localhost:3000
- Match Service (WebSocket): ws://localhost:3001/ws (health: http://localhost:3001/health)
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Health check:
- API: http://localhost:3000/health
- API Docs: http://localhost:3000/api/v1

Stop (Ctrl+C) or run detached:
```bash
docker-compose up -d
# To stop when detached
docker-compose down
```

## 5) Prepare database schema (from host)
Run Prisma from your host (devDependencies are not in the production container):
```bash
# From backend/
npx prisma generate
npx prisma db push
```
This syncs `prisma/schema.prisma` to the running Postgres and generates the client.

## 6) Seed the database (from host)
```bash
# From backend/
npm run prisma:seed
# or
npx ts-node prisma/seed.ts
```
Expected console output begins with:
```
🌱 Starting database seed...
```
This creates the initial admin and sample data.

## 7) View data in pgAdmin
1. Open pgAdmin and register a new server:
   - Name: QuizSpark
   - Host: localhost
   - Port: 5432
   - Maintenance DB: quizspark_db
   - Username: quizspark_user
   - Password: quizspark_password
2. Browse tables:
   - Servers → QuizSpark → Databases → quizspark_db → Schemas → public → Tables
   - Right-click a table → View/Edit Data → First 100 Rows
3. Or run queries (Tools → Query Tool):
```sql
SELECT count(*) FROM "User";
SELECT * FROM "User" LIMIT 10;
```

## 8) Common commands
```bash
# Build and run
docker-compose up --build

# Run detached
docker-compose up -d

# Stop & remove containers, networks
docker-compose down

# Recreate images without cache (on build issues)
docker-compose build --no-cache && docker-compose up

# Prisma (host)
npx prisma format
npx prisma generate
npx prisma db push
npm run prisma:seed
```

## 9) Troubleshooting
- Cannot connect during `db push` or `seed`:
  - Ensure containers are running: `docker ps`
  - Use `localhost` in host-side `DATABASE_URL` (not `postgres`)
- Prisma CLI not found:
  - Run `npm i` in `backend/` to install devDependencies
- Docker Hub/DNS issues:
  - Restart Docker Desktop; optionally set DNS (Docker Desktop → Settings → Docker Engine):
    ```json
    { "dns": ["8.8.8.8", "1.1.1.1"] }
    ```
  - Apply & Restart
- Port already in use:
  - Stop conflicting apps on 3000/3001/5432/6379 or update ports in `docker-compose.yml`

## 10) Credentials summary
- Postgres
  - DB: `quizspark_db`
  - User: `quizspark_user`
  - Password: `quizspark_password`
  - Host (pgAdmin/host tools): `localhost`
- JWT Secret (API): configured in `docker-compose.yml` as `JWT_SECRET`

You're all set! Start the stack, push schema, seed, and verify with pgAdmin.
