# 🚀 QuizUP Quick Start Guide

## 🎯 Get Running in 5 Minutes

### Step 1: Start the Application
```bash
# Start all services
docker compose up -d --build

# Wait for services to be ready (30 seconds)
```

### Step 2: Access Locally
- **Main App**: http://localhost:8090
- **Health Check**: http://localhost:8090/health

### Step 3: Share Publicly (Optional)
```bash
# Install Tunnelmole
npm install -g tunnelmole

# Windows: Use automated script
scripts\start-tunnelmole.bat

# Linux/macOS: Use automated script
./scripts/start-tunnelmole.sh

# Manual: Start tunnel
tmole 8090
```

#### 🚀 Instant Access
Tunnelmole provides immediate access without any security pages or passwords:

1. **Run the tunnel** - `tmole 8090`
2. **Copy the URL** - It appears instantly in your terminal
3. **Share and access** - No additional setup required
4. **Much faster** - Optimized for speed and reliability

## 🔗 Important URLs

### Local Development
- **Application**: http://localhost:8090
- **API**: http://localhost:3000
- **WebSocket**: http://localhost:3001
- **Database Admin**: http://localhost:8080
- **Redis Admin**: http://localhost:8081
- **Monitoring**: http://localhost:3003

### Public Access (Tunnelmole)
- **Your App**: https://random-id.tunnelmole.net
- **API**: https://random-id.tunnelmole.net/api
- **WebSocket**: wss://random-id.tunnelmole.net/socket.io

## 🛠️ Common Commands

### Docker Management
```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Restart service
docker compose restart frontend

# Stop all services
docker compose down
```

### Tunnelmole Management
```bash
# Start tunnel (automatic URL)
tmole 8090

# Start with custom subdomain (if available)
tmole 8090 --subdomain my-quiz-app

# Start with specific region
tmole 8090 --region us
```

### Development
```bash
# Backend development
cd backend && npm run dev

# Frontend development
cd Frontend-admin && npm run dev

# Run tests
npm test
```

## 🔧 Troubleshooting

### Services Not Starting
```bash
# Check service status
docker compose ps

# View service logs
docker compose logs [service-name]

# Restart all services
docker compose restart
```

### LocalTunnel Issues
```bash
# Check if port 8090 is accessible
curl http://localhost:8090/health

# Try different subdomain
lt --port 8090 --subdomain quiz-app-$(date +%s)

# Check LocalTunnel status
# Look for "your tunnel is available at" message
```

### Database Issues
```bash
# Reset database
docker compose down -v
docker compose up -d

# Access database directly
docker exec -it quizup_postgres psql -U quizup_user -d quizup_db
```

## 🎮 Test the Application

### Create Your First Quiz
1. Go to http://localhost:8090
2. Navigate to "Categories" 
3. Create a new category
4. Add questions to the category
5. Create a quiz from the questions

### Test Friend Match
1. Open two browser windows
2. In first window: Create a friend match
3. Copy the join code
4. In second window: Join using the code
5. Both players click "I'm Ready!"
6. Play the quiz together

### Test Public Access
1. Start LocalTunnel: `lt --port 8090`
2. Copy the https://....loca.lt URL
3. Open on your phone or share with friends
4. Test all features work remotely

## 📱 Mobile Testing

LocalTunnel makes mobile testing easy:
1. Start LocalTunnel on your computer
2. Open the .loca.lt URL on your phone
3. Test touch interactions and responsive design
4. Share with team members for testing

## 🎉 You're Ready!

Your QuizUP application is now running and accessible both locally and publicly. Start creating quizzes and inviting friends to play!

For more detailed information, see:
- [Full README](README.md)
- [LocalTunnel Deployment Guide](LOCALTUNNEL_DEPLOYMENT.md)
- [Development Notes](DEV_NOTES.md)
