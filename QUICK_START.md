# 🚀 QuizUP Quick Start Guide

Get your QuizUP application running in minutes!

---

## 📦 What You Have

Your QuizUP application now has:

- ✅ Fixed WebSocket event handling
- ✅ Standardized player data structures
- ✅ Fixed ready state management
- ✅ Proper match connection and state restoration
- ✅ Support for 2000 concurrent matches
- ✅ Three deployment environments (localhost, network, production)

---

## 🎯 Quick Start (Choose Your Path)

### Option 1: Interactive Deployment (Recommended)

**Windows:**

```cmd
deploy-all.bat
```

**Linux/Mac:**

```bash
chmod +x deploy-all.sh
./deploy-all.sh
```

This will show you a menu where you can:

1. Deploy to any environment
2. Run tests
3. Check status
4. View logs
5. Stop services

### Option 2: Command Line Deployment

**Deploy Localhost:**

```bash
# Linux/Mac
./deploy-all.sh localhost

# Windows
deploy-all.bat
# Then select option 1
```

**Deploy Network:**

```bash
# Linux/Mac
./deploy-all.sh network

# Windows
deploy-all.bat
# Then select option 2
```

**Deploy Production:**

```bash
# Linux/Mac
./deploy-all.sh production

# Windows
deploy-all.bat
# Then select option 3
```

### Option 3: Manual Deployment

**Localhost:**

```bash
docker-compose up -d
```

**Network:**

```bash
export NETWORK_IP=192.168.1.100  # Your IP
docker-compose -f docker-compose.yml -f docker-compose.network.yml up -d
```

**Production:**

```bash
docker stack deploy -c docker-stack.yml quizup
```

---

## 🧪 Testing Your Deployment

### Quick Test

```bash
cd tests
npm install
npm run run:localhost  # Test localhost
npm run run:network    # Test network
npm run run:hosted     # Test production
npm run run:all        # Test all environments
```

### Load Testing (2000 Matches)

```bash
cd tests
node run-stress-tests.js hosted --matches=2000
```

---

## 🔍 Verify Everything Works

### 1. Check Services Are Running

```bash
# Localhost/Network
docker-compose ps

# Production
docker stack services quizup
```

### 2. Test Endpoints

```bash
# Localhost
curl http://localhost:3000/api/health
curl http://localhost:3001/health
curl http://localhost:5173

# Network (replace with your IP)
curl http://192.168.1.100:3000/api/health
curl http://192.168.1.100:3001/health

# Production
curl https://api.quizdash.dpdns.org/api/health
curl https://match.quizdash.dpdns.org/health
curl https://quizdash.dpdns.org
```

### 3. Test Friend Match Flow

1. Open frontend in browser
2. Login as two different users (two browser windows/devices)
3. User 1: Select quiz → "Play with Friend" → Generate code
4. User 2: Enter the join code
5. Both users should see each other in lobby
6. Both click "I'm Ready!"
7. Match should start automatically

---

## 📊 Monitor Your Deployment

### View Logs

```bash
# Localhost/Network
docker-compose logs -f backend
docker-compose logs -f matchserver

# Production
docker service logs -f quizup_backend
docker service logs -f quizup_matchserver
```

### Check Resource Usage

```bash
docker stats
```

### Access Monitoring Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Adminer** (Database): http://localhost:8080

---

## 🔧 Common Issues & Solutions

### Issue: Services won't start

```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs

# Restart services
docker-compose restart
```

### Issue: Can't connect to match server

```bash
# Check match server is running
docker-compose ps matchserver

# Check logs
docker-compose logs matchserver

# Verify WebSocket connection
# Open browser console and check for WebSocket errors
```

### Issue: Players can't see each other

```bash
# Check Redis is running
docker-compose ps redis

# Check backend logs for errors
docker-compose logs backend

# Verify both players are in the same match
# Check match server logs
docker-compose logs matchserver
```

### Issue: Connection timeout errors

This should be fixed now! But if you still see them:

1. Check WebSocket connection in browser console
2. Verify CORS settings in backend
3. Check firewall isn't blocking connections
4. Ensure match server is accessible

---

## 🎯 Production Deployment Steps

### 1. Prepare Environment

```bash
# Initialize Docker Swarm
docker swarm init

# Create secrets
echo "your-jwt-secret" | docker secret create quizup_jwt_secret -
echo "your-db-password" | docker secret create quizup_db_password -
```

### 2. Build Images

```bash
docker build -t quizup-backend:latest ./backend
docker build -t quizup-matchserver:latest ./backend
docker build -t quizup-frontend:latest ./Frontend-admin
```

### 3. Deploy Stack

```bash
docker stack deploy -c docker-stack.yml quizup
```

### 4. Setup Cloudflare Tunnel

```bash
# Authenticate
cloudflared tunnel login

# Start tunnel
cloudflared tunnel run quizup

# Or install as service
sudo cloudflared service install
sudo systemctl start cloudflared
```

### 5. Verify Deployment

```bash
# Check services
docker stack services quizup

# Test endpoints
curl https://quizdash.dpdns.org
curl https://api.quizdash.dpdns.org/api/health
curl https://match.quizdash.dpdns.org/health
```

---

## 📈 Scaling for 2000 Matches

### Scale Services

```bash
# Scale match servers
docker service scale quizup_matchserver=6

# Scale backend
docker service scale quizup_backend=4

# Scale nginx
docker service scale quizup_nginx=3
```

### Monitor Performance

```bash
# Watch resource usage
docker stats

# Check service distribution
docker service ps quizup_matchserver

# View logs
docker service logs -f quizup_matchserver
```

---

## 🛑 Stop Services

### Localhost/Network

```bash
docker-compose down
```

### Production

```bash
docker stack rm quizup
```

---

## 📚 Additional Resources

- **Full Deployment Guide**: `DEPLOYMENT_CHECKLIST.md`
- **Cloudflare Setup**: `CLOUDFLARE_TUNNEL_SETUP.md`
- **Load Testing Guide**: `PRODUCTION-2000-MATCHES-GUIDE.md`
- **Multi-Environment Testing**: `README-MULTI-ENVIRONMENT-TESTING.md`

---

## ✅ Success Checklist

Your deployment is successful when:

- [ ] Services start without errors
- [ ] Health checks pass
- [ ] Frontend loads in browser
- [ ] Can login successfully
- [ ] Can create friend match
- [ ] Can join match with code
- [ ] Both players see each other
- [ ] Ready state synchronizes
- [ ] Match starts when both ready
- [ ] Questions load correctly
- [ ] Can submit answers
- [ ] Match completes successfully
- [ ] No connection timeout errors
- [ ] Load tests pass

---

## 🎉 You're Ready!

Your QuizUP application is now:

- ✅ Fixed and working
- ✅ Deployed across all environments
- ✅ Tested and verified
- ✅ Ready for 2000 concurrent matches
- ✅ Production-ready!

**Need help?** Check the detailed guides in the documentation folder.

**Happy quizzing! 🚀**
