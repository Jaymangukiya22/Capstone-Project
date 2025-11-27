# 🚀 QuizUP Multi-Host Deployment System

## Welcome! 👋

You now have a **complete multi-host deployment system** that supports three deployment modes:

1. **🖥️ LOCALHOST** - Single machine development
2. **🌐 NETWORK** - Multiple machines on LAN
3. ☁️ **SELF-HOSTED** - Production with Cloudflare Tunnel

---

## ⚡ Quick Start (30 seconds)

### Choose Your Mode

#### Windows
```bash
deploy.bat localhost    # Single machine
deploy.bat network      # Multiple machines
deploy.bat self-hosted  # Production
```

#### Linux/Mac
```bash
./deploy.sh localhost    # Single machine
./deploy.sh network      # Multiple machines
./deploy.sh self-hosted  # Production
```

That's it! Everything else is automatic. ✨

---

## 📚 Documentation

### For Quick Overview
👉 **Read**: [`DEPLOYMENT_QUICK_START.md`](./DEPLOYMENT_QUICK_START.md)
- One-page quick start guide
- All three modes explained
- Access points and URLs

### For Detailed Setup
👉 **Read**: [`SETUP_GUIDE.md`](./SETUP_GUIDE.md)
- Step-by-step instructions
- Prerequisites and installation
- Troubleshooting guide
- Monitoring and logs

### For Architecture Details
👉 **Read**: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- System architecture diagrams
- Data flow visualization
- Scaling strategy
- Security architecture

### For Mode Comparison
👉 **Read**: [`DEPLOYMENT_MODES.md`](./DEPLOYMENT_MODES.md)
- Detailed mode descriptions
- Configuration details
- Resource limits
- Use cases

### For Summary
👉 **Read**: [`DEPLOYMENT_SUMMARY.md`](./DEPLOYMENT_SUMMARY.md)
- Complete overview
- File structure
- Quick reference
- Troubleshooting

---

## 🎯 Three Deployment Modes

### 1. LOCALHOST 🖥️
```bash
deploy.bat localhost  # Windows
./deploy.sh localhost # Linux/Mac
```
- **Access**: http://localhost:5173
- **Best for**: Local development
- **Workers**: 1-2
- **Database**: Local PostgreSQL
- **Resources**: 0.5 CPU, 512MB RAM

### 2. NETWORK 🌐
```bash
deploy.bat network  # Windows
./deploy.sh network # Linux/Mac
```
- **Access**: http://{NETWORK_IP}:5173 (auto-detected)
- **Best for**: Testing with friends on same network
- **Workers**: 2-4
- **Database**: Shared PostgreSQL
- **Resources**: 1.0 CPU, 1GB RAM

### 3. SELF-HOSTED ☁️
```bash
deploy.bat self-hosted  # Windows
./deploy.sh self-hosted # Linux/Mac
```
- **Access**: https://quizdash.dpdns.org
- **Best for**: Public production deployment
- **Workers**: 20-1000 (auto-scaling)
- **Database**: Docker PostgreSQL
- **Resources**: 4.0 CPU, 4GB RAM

---

## 📋 What Gets Deployed

All modes include:
- ✅ PostgreSQL (database)
- ✅ Redis (cache)
- ✅ Backend API (scalable)
- ✅ Match Server (WebSocket)
- ✅ Frontend (React + Vite)
- ✅ Nginx (reverse proxy)
- ✅ Adminer (database admin)

Self-hosted adds:
- ✅ Docker Swarm (orchestration)
- ✅ Cloudflare Tunnel (public access)
- ✅ Auto-scaling workers
- ✅ Health monitoring

---

## 🔧 Environment Files

Each mode has pre-configured environment files:

```
.env.localhost              # Main config
.env.network               # Main config
.env.self-hosted           # Main config
backend/.env.localhost     # Backend config
backend/.env.network       # Backend config
backend/.env.self-hosted   # Backend config
Frontend-admin/.env.localhost     # Frontend config
Frontend-admin/.env.network       # Frontend config
Frontend-admin/.env.self-hosted   # Frontend config
```

**No manual configuration needed!** The deployment script handles everything.

---

## 🚀 Deployment Steps

### Step 1: Prerequisites
- Docker installed and running
- Docker Compose installed
- Git repository cloned

### Step 2: Choose Mode
- Localhost: Single machine
- Network: Multiple machines
- Self-hosted: Production

### Step 3: Run Command
```bash
# Windows
deploy.bat {mode}

# Linux/Mac
./deploy.sh {mode}
```

### Step 4: Wait
- Localhost/Network: ~10 seconds
- Self-hosted: ~15 seconds

### Step 5: Access
- Open browser to provided URL
- Create account or login
- Start playing!

---

## 🧪 Testing

### Stress Test
```bash
# Test with different match counts
node tests/stress-test-bots-small.js 10   # 10 matches
node tests/stress-test-bots-small.js 50   # 50 matches
node tests/stress-test-bots-small.js 100  # 100 matches
```

### Health Check
```bash
# Verify services are running
curl http://localhost:3000/health
```

---

## 📊 Configuration Comparison

| Feature | Localhost | Network | Self-Hosted |
|---------|-----------|---------|-------------|
| **Access** | localhost | Network IP | Cloudflare domain |
| **Protocol** | HTTP | HTTP | HTTPS |
| **Workers** | 1-2 | 2-4 | 20-1000 |
| **DB Pool** | 5-20 | 10-50 | 20-2000 |
| **CPU** | 0.5 | 1.0 | 4.0 |
| **Memory** | 512MB | 1GB | 4GB |
| **Scaling** | Manual | Manual | Auto |
| **SSL** | No | No | Yes |

---

## 🔄 Switching Modes

To switch from one mode to another:

```bash
# Stop current deployment
docker-compose down  # for localhost/network
docker stack rm quizup  # for self-hosted

# Deploy new mode
./deploy.sh network  # or deploy.bat network
```

---

## 📊 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f matchserver
```

### Check Status
```bash
# List all containers
docker ps

# View resource usage
docker stats
```

---

## 🆘 Troubleshooting

### Services Won't Start
```bash
# Check Docker
docker ps -a

# View logs
docker-compose logs backend

# Rebuild
docker-compose build --no-cache
```

### Network Mode Issues
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
```

---

## 📞 Quick Reference

| Command | Purpose |
|---------|---------|
| `deploy.bat localhost` | Deploy on Windows (localhost) |
| `deploy.bat network` | Deploy on Windows (network) |
| `deploy.bat self-hosted` | Deploy on Windows (self-hosted) |
| `./deploy.sh localhost` | Deploy on Linux/Mac (localhost) |
| `./deploy.sh network` | Deploy on Linux/Mac (network) |
| `./deploy.sh self-hosted` | Deploy on Linux/Mac (self-hosted) |
| `docker-compose logs -f` | View all logs |
| `docker ps` | List running containers |
| `docker-compose down` | Stop all services |
| `curl http://localhost:3000/health` | Health check |

---

## 📁 File Structure

```
Capstone-Project/
├── .env.localhost              # Localhost config
├── .env.network               # Network config
├── .env.self-hosted           # Self-hosted config
├── deploy.sh                  # Linux/Mac script
├── deploy.bat                 # Windows script
├── DEPLOYMENT_QUICK_START.md  # Quick start guide
├── SETUP_GUIDE.md             # Detailed setup
├── ARCHITECTURE.md            # Architecture diagrams
├── DEPLOYMENT_MODES.md        # Mode descriptions
├── DEPLOYMENT_SUMMARY.md      # Summary
├── README_DEPLOYMENT.md       # This file
├── backend/
│   ├── .env.localhost
│   ├── .env.network
│   ├── .env.self-hosted
│   └── Dockerfile
├── Frontend-admin/
│   ├── .env.localhost
│   ├── .env.network
│   ├── .env.self-hosted
│   └── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

---

## ✨ Key Features

### Automatic Configuration
- ✅ Pre-configured environment files
- ✅ Network IP auto-detection
- ✅ Database auto-seeding
- ✅ Health checks included

### Easy Switching
- ✅ Switch modes with one command
- ✅ No manual configuration
- ✅ All settings automatic

### Production Ready
- ✅ Docker Swarm support
- ✅ Cloudflare Tunnel integration
- ✅ Auto-scaling workers
- ✅ Health monitoring

### Developer Friendly
- ✅ Comprehensive documentation
- ✅ Quick start guides
- ✅ Troubleshooting tips
- ✅ Example commands

---

## 🎓 Next Steps

1. **Read** [`DEPLOYMENT_QUICK_START.md`](./DEPLOYMENT_QUICK_START.md) (2 min read)
2. **Choose** your deployment mode
3. **Run** the deployment command (1 line!)
4. **Wait** for services to start (~10-15 seconds)
5. **Access** your application
6. **Test** with stress tests
7. **Monitor** with logs

---

## 📝 Important Notes

- All environment files are **pre-configured and ready to use**
- Deployment script handles **all setup automatically**
- **No manual Docker commands needed**
- All three modes **can coexist** (use different ports if needed)
- Database is **automatically seeded** in localhost mode
- Network mode **auto-detects** your network IP
- Self-hosted mode **requires Cloudflare tunnel**

---

## 🎉 You're Ready!

Everything is set up and ready to go. Just:

1. Choose your mode (localhost, network, or self-hosted)
2. Run the deployment command
3. Access your application

**That's it! Happy deploying! 🚀**

---

## 📖 Documentation Index

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [`DEPLOYMENT_QUICK_START.md`](./DEPLOYMENT_QUICK_START.md) | Quick overview of all modes | 2 min |
| [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) | Detailed setup instructions | 15 min |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture diagrams | 10 min |
| [`DEPLOYMENT_MODES.md`](./DEPLOYMENT_MODES.md) | Mode comparison and details | 10 min |
| [`DEPLOYMENT_SUMMARY.md`](./DEPLOYMENT_SUMMARY.md) | Complete summary | 5 min |
| [`README_DEPLOYMENT.md`](./README_DEPLOYMENT.md) | This file (overview) | 5 min |

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section in [`SETUP_GUIDE.md`](./SETUP_GUIDE.md)
2. Review the logs: `docker-compose logs -f`
3. Verify services: `docker ps`
4. Check health: `curl http://localhost:3000/health`

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Status**: ✅ Production Ready
