# QuizUP Multi-Host Deployment Guide

## 🎯 Three Deployment Modes

### 1. **LOCALHOST** (Development - Single Machine)
- **Use Case**: Local development, testing
- **Access**: `http://localhost:5173` (Frontend), `http://localhost:3000` (API), `ws://localhost:3001` (WebSocket)
- **Database**: Local PostgreSQL
- **Scaling**: Minimal (1-2 workers)
- **Command**: `npm run deploy:localhost`

### 2. **NETWORK** (LAN Testing - Multiple Machines)
- **Use Case**: Testing across multiple devices on same network
- **Access**: `http://{NETWORK_IP}:5173` (Frontend), `http://{NETWORK_IP}:3000` (API), `ws://{NETWORK_IP}:3001` (WebSocket)
- **Database**: Shared PostgreSQL on host machine
- **Scaling**: Medium (2-4 workers)
- **Command**: `npm run deploy:network`

### 3. **SELF-HOSTED** (Cloudflare Tunnel - Production)
- **Use Case**: Public hosting with Cloudflare Tunnel (Argo Tunnel)
- **Access**: `https://quizdash.dpdns.org` (Frontend), `https://api.quizdash.dpdns.org` (API), `wss://match.quizdash.dpdns.org` (WebSocket)
- **Database**: Managed PostgreSQL
- **Scaling**: High (4-8 workers)
- **Command**: `npm run deploy:self-hosted`

---

## 🚀 Quick Start

### Localhost Deployment
```bash
npm run deploy:localhost
# Frontend: http://localhost:5173
# API: http://localhost:3000
# WebSocket: ws://localhost:3001
```

### Network Deployment
```bash
npm run deploy:network
# Auto-detects network IP and configures all services
# Frontend: http://{NETWORK_IP}:5173
# API: http://{NETWORK_IP}:3000
# WebSocket: ws://{NETWORK_IP}:3001
```

### Self-Hosted Deployment (Cloudflare Tunnel)
```bash
npm run deploy:self-hosted
# Requires Cloudflare tunnel configured
# Frontend: https://quizdash.dpdns.org
# API: https://api.quizdash.dpdns.org
# WebSocket: wss://match.quizdash.dpdns.org
```

---

## 📋 Environment Files

Each mode has dedicated environment files:

- **Localhost**: `.env.localhost`, `backend/.env.localhost`, `Frontend-admin/.env.localhost`
- **Network**: `.env.network`, `backend/.env.network`, `Frontend-admin/.env.network`
- **Self-Hosted**: `.env.self-hosted`, `backend/.env.self-hosted`, `Frontend-admin/.env.self-hosted`

---

## 🔧 Configuration Details

### Database Configuration
| Mode | Host | Port | Pool Min | Pool Max |
|------|------|------|----------|----------|
| Localhost | localhost | 5432 | 5 | 20 |
| Network | {NETWORK_IP} | 5432 | 10 | 50 |
| Self-Hosted | postgres (Docker) | 5432 | 20 | 2000 |

### Worker Pool Configuration
| Mode | Min Workers | Max Workers | Max Matches/Worker |
|------|-------------|-------------|-------------------|
| Localhost | 1 | 2 | 3 |
| Network | 2 | 4 | 5 |
| Self-Hosted | 20 | 1000 | 10 |

### Resource Limits
| Mode | Backend CPU | Backend Memory | MatchServer CPU | MatchServer Memory |
|------|------------|----------------|-----------------|-------------------|
| Localhost | 0.5 | 512MB | 0.5 | 512MB |
| Network | 1.0 | 1GB | 1.0 | 1GB |
| Self-Hosted | 4.0 | 4GB | 8.0 | 8GB |

---

## 🔐 Security Configuration

### CORS Origins
- **Localhost**: `http://localhost:5173`, `http://127.0.0.1:5173`
- **Network**: `http://{NETWORK_IP}:5173`, `http://localhost:5173`
- **Self-Hosted**: `https://quizdash.dpdns.org`, `https://www.quizdash.dpdns.org`

### API URLs
- **Localhost**: `http://localhost:8090`
- **Network**: `http://{NETWORK_IP}:8090`
- **Self-Hosted**: `https://api.quizdash.dpdns.org`

### WebSocket URLs
- **Localhost**: `ws://localhost:3001`
- **Network**: `ws://{NETWORK_IP}:3001`
- **Self-Hosted**: `wss://match.quizdash.dpdns.org`

---

## 📊 Monitoring & Logs

### View Logs by Mode
```bash
# Localhost
docker-compose logs -f backend

# Network
docker-compose -f docker-compose.yml -f docker-compose.network.yml logs -f backend

# Self-Hosted
docker service logs -f quizup_backend
```

### Health Checks
```bash
# Localhost
curl http://localhost:3000/health

# Network
curl http://{NETWORK_IP}:3000/health

# Self-Hosted
curl https://api.quizdash.dpdns.org/health
```

---

## 🧪 Testing

### Run Stress Tests
```bash
# Localhost (10 matches)
node tests/stress-test-bots-small.js 10

# Network (50 matches)
node tests/stress-test-bots-small.js 50

# Self-Hosted (100 matches)
node tests/stress-test-bots-small.js 100
```

---

## 🔄 Switching Between Modes

```bash
# Switch to localhost
npm run switch:localhost

# Switch to network
npm run switch:network

# Switch to self-hosted
npm run switch:self-hosted
```

---

## 🐛 Troubleshooting

### Services Not Starting
```bash
# Check Docker status
docker ps -a

# View detailed logs
docker-compose logs backend

# Restart all services
docker-compose restart
```

### Network Mode Not Working
```bash
# Verify network IP
ipconfig (Windows) or ifconfig (Linux/Mac)

# Update .env.network with correct IP
NETWORK_IP=192.168.x.x
```

### Self-Hosted Issues
```bash
# Verify Cloudflare tunnel
cloudflared tunnel list

# Check tunnel status
cloudflared tunnel info 260b3937-da0e-4802-bd8b-219e47806139

# View tunnel logs
cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139
```

---

## 📞 Support

For issues or questions, check the logs and verify:
1. All services are running: `docker ps`
2. Database is accessible: `psql -h localhost -U quizup_user -d quizup_db`
3. Redis is accessible: `redis-cli ping`
4. Network connectivity: `ping {NETWORK_IP}` (for network mode)
