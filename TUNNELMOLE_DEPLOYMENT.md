# 🚀 Tunnelmole Deployment for QuizUP

## 🎯 Why Tunnelmole?

Tunnelmole is the perfect replacement for LocalTunnel when you need speed and reliability:
- ✅ **Much Faster** - Less congested than LocalTunnel
- ✅ **Open Source** - Transparent and community-driven
- ✅ **No Registration** - Works immediately without signup
- ✅ **No Domain Required** - Get instant public URLs
- ✅ **Unlimited Bandwidth** - No artificial speed limits
- ✅ **Stable Connections** - More reliable than alternatives
- ✅ **Perfect for Development** - Ideal for testing and demos

## 🏗️ Architecture Overview

```
Internet → Tunnelmole → Nginx (Port 8090) → {
  /api/*      → Backend (Port 3000)
  /socket.io/* → Match Server (Port 3001)  
  /*          → Frontend (Port 5173)
}
```

## 🚀 Quick Start

### Option A: Automated Scripts

1. **Start the stack:**
   ```cmd
   scripts\start-tunnelmole.bat
   ```

2. **Your app will be available at:**
   ```
   https://random-id.tunnelmole.net
   ```

### Option B: Manual Steps

1. **Install Tunnelmole globally:**
   ```cmd
   npm install -g tunnelmole
   ```

2. **Launch Docker Stack:**
   ```cmd
   docker compose up -d --build
   ```

3. **Start Tunnelmole:**
   ```cmd
   tmole 8090
   ```

4. **Access your application:**
   ```
   https://your-id.tunnelmole.net
   ```

## 🔧 Configuration Details

### Tunnelmole Features
- **Fast Performance**: Optimized for speed and low latency
- **Random URLs**: Secure random subdomains
- **WebSocket Support**: Full support for real-time features
- **No Rate Limits**: Unlimited requests and bandwidth
- **HTTPS by Default**: Secure connections out of the box

### Nginx Configuration
The nginx reverse proxy handles:
- **Frontend**: React app with Vite dev server
- **API Routes**: `/api/*` → Backend service
- **WebSocket**: `/socket.io/*` → Match server
- **Static Assets**: Proper caching and compression

## 📋 Available Commands

```bash
# Basic tunnel
tmole 8090

# Tunnel with custom subdomain (if available)
tmole 8090 --subdomain my-app

# Tunnel with specific region
tmole 8090 --region us

# Show help
tmole --help
```

## 🛠️ Troubleshooting

### Common Issues

1. **"Port not accessible"**
   - Ensure Docker services are running: `docker compose ps`
   - Check nginx is healthy: `curl http://localhost:8090/health`

2. **Slow performance**
   - Tunnelmole is much faster than LocalTunnel by design
   - Try different regions if available

3. **WebSocket connection fails**
   - Tunnelmole supports WebSockets natively
   - Check browser dev tools for connection errors

4. **CORS errors**
   - The scripts automatically update CORS settings
   - Manual fix: Update `backend/.env` with your Tunnelmole URL

### Useful Commands

```cmd
# View all logs
docker compose logs -f

# Check service health
docker compose ps
curl http://localhost:8090/health

# Restart specific service
docker compose restart [service-name]
```

## 🌐 Sharing Your Application

Once Tunnelmole is running, share your URL:
- **Main App**: `https://your-id.tunnelmole.net`
- **Direct API**: `https://your-id.tunnelmole.net/api/health`
- **WebSocket**: `wss://your-id.tunnelmole.net/socket.io`

## 🔒 Security Notes

- Tunnelmole URLs are public but use random IDs for security
- Perfect for development, demos, and testing
- For production, consider upgrading to a proper hosting solution
- Much more reliable than LocalTunnel for team collaboration

## 📊 Performance Comparison

| Feature | LocalTunnel | Tunnelmole | ngrok (free) |
|---------|-------------|------------|--------------|
| Speed | Slow | **Fast** | Medium |
| Reliability | Poor | **Excellent** | Good |
| Setup | Easy | **Easiest** | Medium |
| Limits | None | **None** | 40 req/min |
| Registration | No | **No** | Yes |
| Cost | Free | **Free** | Freemium |

## 📱 Mobile Testing

Tunnelmole makes mobile testing effortless:
1. Start Tunnelmole on your computer
2. Open the .tunnelmole.net URL on your phone
3. Test touch interactions and responsive design
4. Share with team members instantly

## 🎉 You're Ready!

Your QuizUP application is now running with Tunnelmole - faster, more reliable, and perfect for development and testing!

For more detailed information, see:
- [Full README](README.md)
- [Quick Start Guide](QUICK_START.md)
- [Development Notes](DEV_NOTES.md)
