# 🚀 QuizUP Multi-Host Deployment - Quick Start

## One Command Deployment

Choose your deployment mode and run ONE command:

### 1️⃣ **LOCALHOST** (Single Machine Development)
```bash
# Linux/Mac
./deploy.sh localhost

# Windows
deploy.bat localhost
```
**Access**: http://localhost:5173

---

### 2️⃣ **NETWORK** (Multiple Machines on Same Network)
```bash
# Linux/Mac
./deploy.sh network

# Windows
deploy.bat network
```
**Access**: http://{NETWORK_IP}:5173 (auto-detected)

---

### 3️⃣ **SELF-HOSTED** (Cloudflare Tunnel - Production)
```bash
# Linux/Mac
./deploy.sh self-hosted

# Windows
deploy.bat self-hosted
```
**Access**: https://quizdash.dpdns.org

---

## 📋 What Gets Deployed

### Localhost
- ✅ PostgreSQL (local)
- ✅ Redis (local)
- ✅ Backend API (1-2 workers)
- ✅ Match Server (WebSocket)
- ✅ Frontend (Dev server)
- ✅ Nginx (reverse proxy)
- ✅ Adminer (database management)

### Network
- ✅ PostgreSQL (shared on host)
- ✅ Redis (shared on host)
- ✅ Backend API (2-4 workers)
- ✅ Match Server (WebSocket)
- ✅ Frontend (Dev server)
- ✅ Nginx (reverse proxy)
- ✅ Adminer (database management)

### Self-Hosted
- ✅ PostgreSQL (Docker)
- ✅ Redis (Docker)
- ✅ Backend API (20-1000 workers)
- ✅ Match Server (WebSocket)
- ✅ Frontend (Production build)
- ✅ Nginx (reverse proxy)
- ✅ Adminer (database management)
- ✅ Cloudflare Tunnel (public access)

---

## 🔧 Environment Files

Each mode has dedicated configuration:

| File | Localhost | Network | Self-Hosted |
|------|-----------|---------|-------------|
| `.env` | `.env.localhost` | `.env.network` | `.env.self-hosted` |
| `backend/.env` | `.env.localhost` | `.env.network` | `.env.self-hosted` |
| `Frontend-admin/.env` | `.env.localhost` | `.env.network` | `.env.self-hosted` |

The deployment script automatically copies the correct files.

---

## 📊 Configuration Comparison

| Aspect | Localhost | Network | Self-Hosted |
|--------|-----------|---------|-------------|
| **Access** | localhost | Network IP | Cloudflare domain |
| **Workers** | 1-2 | 2-4 | 20-1000 |
| **DB Pool** | 5-20 | 10-50 | 20-2000 |
| **CPU Limit** | 0.5 | 1.0 | 4.0 |
| **Memory Limit** | 512MB | 1GB | 4GB |
| **Use Case** | Dev | Testing | Production |

---

## 🌐 Network Mode Details

When you run `deploy.sh network` or `deploy.bat network`:

1. **Auto-detects** your network IP (192.168.x.x or 10.x.x.x)
2. **Configures** all services to listen on that IP
3. **Updates** frontend to connect to network IP
4. **Shares** the URL: `http://{NETWORK_IP}:5173`

### Example
```
Detected Network IP: 192.168.1.100

Access from any device on network:
- Frontend: http://192.168.1.100:5173
- API: http://192.168.1.100:3000
- WebSocket: ws://192.168.1.100:3001
```

---

## ☁️ Self-Hosted Mode Details

When you run `deploy.sh self-hosted` or `deploy.bat self-hosted`:

1. **Initializes** Docker Swarm
2. **Builds** production images
3. **Deploys** stack with replicas
4. **Requires** Cloudflare tunnel to be running

### Start Tunnel
```bash
cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139
```

### Access
- Frontend: https://quizdash.dpdns.org
- API: https://api.quizdash.dpdns.org
- WebSocket: wss://match.quizdash.dpdns.org

---

## 🧪 Testing After Deployment

### Stress Test
```bash
# Localhost (10 matches)
node tests/stress-test-bots-small.js 10

# Network (50 matches)
node tests/stress-test-bots-small.js 50

# Self-Hosted (100 matches)
node tests/stress-test-bots-small.js 100
```

### Health Check
```bash
# Localhost
curl http://localhost:3000/health

# Network
curl http://{NETWORK_IP}:3000/health

# Self-Hosted
curl https://api.quizdash.dpdns.org/health
```

---

## 📊 View Logs

### Localhost/Network
```bash
docker-compose logs -f backend
docker-compose logs -f matchserver
docker-compose logs -f frontend
```

### Self-Hosted
```bash
docker service logs -f quizup_backend
docker service logs -f quizup_matchserver
docker service logs -f quizup_frontend
```

---

## 🔄 Switch Between Modes

To switch from one mode to another:

```bash
# Stop current deployment
docker-compose down  # for localhost/network
docker stack rm quizup  # for self-hosted

# Deploy new mode
./deploy.sh network
```

---

## 🆘 Troubleshooting

### Services Not Starting
```bash
# Check Docker
docker ps -a

# View logs
docker-compose logs backend

# Restart
docker-compose restart
```

### Network Mode Not Working
```bash
# Verify network IP
ipconfig (Windows) or ifconfig (Linux/Mac)

# Check connectivity
ping {NETWORK_IP}
```

### Self-Hosted Issues
```bash
# Check tunnel
cloudflared tunnel list

# View tunnel logs
cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139

# Check stack status
docker stack services quizup
```

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Deploy Localhost | `./deploy.sh localhost` |
| Deploy Network | `./deploy.sh network` |
| Deploy Self-Hosted | `./deploy.sh self-hosted` |
| View Logs | `docker-compose logs -f` |
| Stop Services | `docker-compose down` |
| Check Status | `docker ps` |
| Run Stress Test | `node tests/stress-test-bots-small.js 10` |
| Health Check | `curl http://localhost:3000/health` |

---

## 🎯 Next Steps

1. **Choose your mode** (localhost, network, or self-hosted)
2. **Run the deployment command** (one line!)
3. **Wait for services to start** (~10-15 seconds)
4. **Access the frontend** at the provided URL
5. **Run stress tests** to verify everything works

---

## 📝 Notes

- All environment files are pre-configured
- Deployment script handles all setup automatically
- No manual configuration needed
- All three modes can coexist (use different ports if needed)
- Database is seeded automatically in localhost mode

**Happy deploying! 🚀**
