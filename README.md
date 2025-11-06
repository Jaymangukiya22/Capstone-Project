# QuizUP - Quiz Management Platform

A comprehensive quiz management system built with React, Node.js, and PostgreSQL with LocalTunnel for easy sharing and testing. competitive learning and knowledge assessment.**

## 🎯 Project Overview

QuizUP is a modern, scalable quiz platform designed for educational institutions, competitive gaming, and skill assessment. Built with enterprise-grade architecture, it supports real-time multiplayer matches, AI opponents, and comprehensive question management.
### Key Features
- **Real-time Multiplayer Matches** with friend invitations and join codes
- **AI Opponent System** with multiple difficulty levels (Rookie, Smart, Genius)
- **Comprehensive Quiz Management** with hierarchical categories
- **Question Bank System** with bulk import/export capabilities
- **ELO Rating System** for competitive ranking and matchmaking
- **Role-based Access Control** (Admin, Faculty, Student)
- **Session Management** with reconnection capabilities
- **Responsive Design** supporting desktop and mobile devices

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript + Sequelize ORM
- **Database**: PostgreSQL with optimized indexing and materialized views
- **Cache**: Redis with in-memory fallback for high availability
- **Real-time**: Socket.io with Redis adapter for clustering
- **Containerization**: Docker with multi-stage builds
- **CI/CD**: GitHub Actions with comprehensive testing pipeline

### System Components
- **API Server** (Port 3000): RESTful API for data management
- **Match Server** (Port 3001): WebSocket server for real-time gameplay
- **Database**: PostgreSQL for persistent data storage
- **Cache Layer**: Redis for session management and match state
- **Load Balancer**: Nginx for production scaling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ LTS
- Docker & Docker Compose
- PostgreSQL 15+ (if running locally)
- Redis 7+ (if running locally)
- LocalTunnel for public access (optional)

### Development Setup

#### Using Docker (Recommended)
```bash
# Clone repository
git clone <repository-url>
cd QuizUP

# Copy environment configuration
cp .env.example .env

# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Match Server: http://localhost:3001
```

#### Manual Setup
```bash
# Backend setup
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev

# Match server (new terminal)
cd backend
npm run dev:match

# Frontend (new terminal)
cd Frontend-admin
npm install
npm run dev
```

### Service URLs
- **Application**: http://localhost:8090 (via nginx proxy)
- **Frontend Dev**: http://localhost:5173 (direct Vite)
- **Backend API**: http://localhost:3000
- **Match Server**: http://localhost:3001
- **Database Admin**: http://localhost:8080 (Adminer)
- **Cache Admin**: http://localhost:8081 (Redis Commander)
- **Grafana**: http://localhost:3003 (monitoring)

### 🌐 Public Access with Tunnelmole

For sharing your application publicly (demos, testing, mobile access):

#### Quick Start with Tunnelmole
```bash
# Install Tunnelmole globally
npm install -g tunnelmole

# Start your application
docker compose up -d --build

# Create public tunnel (Windows)
scripts\start-tunnelmole.bat

# Create public tunnel (Linux/macOS)
./scripts/start-tunnelmole.sh
```

#### Manual Tunnelmole Setup
```bash
# Start tunnel (automatic URL generation)
tmole 8090

# Your app will be available at:
# https://random-id.tunnelmole.net
```

#### Tunnelmole Benefits
- ✅ **Much Faster** - Optimized for speed and performance
- ✅ **Open Source** - Transparent and community-driven
- ✅ **No Registration** - Works immediately without signup
- ✅ **No Domain Required** - Get instant public URLs
- ✅ **Unlimited Bandwidth** - No artificial speed limits
- ✅ **More Reliable** - Less congested than alternatives
- ✅ **Perfect for Development** - Ideal for testing and demos

## 📋 System Design Documentation

Comprehensive system design and implementation details are available in:

- **[System Design](docs/SYSTEM_DESIGN.md)** - Complete architecture overview
- **[Database Schema](docs/database-schema.sql)** - PostgreSQL schema with indexes
- **[API Specification](docs/openapi.yaml)** - OpenAPI 3.0 REST API documentation  
- **[WebSocket Events](docs/socket_spec.md)** - Real-time event specifications
- **[Architecture Diagrams](docs/architecture-diagrams.md)** - Visual system architecture
- **[Development Guide](DEV_NOTES.md)** - Setup, testing, and troubleshooting

## 🎮 Game Modes

### 1. Friend Match
- Create private matches with join codes
- Real-time synchronization between players
- Support for 2-10 players per match
- Instant lobby with ready system

### 2. Solo vs AI
- Three AI difficulty levels with realistic behavior
- Dynamic response timing based on question complexity
- Performance tracking and improvement suggestions

### 3. Multiplayer Tournaments
- Public matches with ELO-based matchmaking
- Leaderboards and ranking systems
- Achievement tracking and badges

### 4. Practice Mode
- Self-paced learning without time pressure
- Detailed explanations and learning resources
- Progress tracking and analytics

## 👥 User Roles

### Student
- Take quizzes and participate in matches
- View personal statistics and progress
- Join friend matches and tournaments
- Access learning materials and explanations

### Faculty
- Create and manage quizzes
- Import questions via CSV/Excel
- Monitor student progress
- Generate reports and analytics

### Admin
- Complete system administration
- User management and role assignment
- System configuration and monitoring
- Database maintenance and backups

## 🔧 Technical Features

### Real-time Communication
- WebSocket-based match synchronization
- Sub-50ms latency for competitive gameplay
- Automatic reconnection and state recovery
- Cross-browser compatibility

### Scalability
- Horizontal scaling support up to 10,000+ concurrent users
- Redis clustering for session distribution
- PostgreSQL read replicas for database scaling
- CDN integration for global content delivery

### Security
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Input validation and SQL injection prevention
- Rate limiting and DDoS protection
- HTTPS/WSS encryption for all communications

### Monitoring & Observability
- Prometheus metrics collection
- Grafana dashboards for system monitoring
- Structured logging with Winston
- Health checks for all services
- Error tracking and alerting

## 📊 Performance Characteristics

### Response Times
- API Responses: < 200ms (95th percentile)
- WebSocket Events: < 50ms latency
- Database Queries: < 100ms for complex operations
- Page Load Times: < 2s initial load

### Throughput
- 10,000+ simultaneous users
- 100+ new matches per second
- 50,000+ API requests per minute
- 500+ concurrent database connections

### Availability
- 99.9% uptime target (43.8 minutes downtime/month)
- < 5 minutes recovery time objective
- Automatic failover and redundancy
- Zero-downtime deployments

## 🧪 Testing

### Test Coverage
```bash
# Backend tests
cd backend
npm run test              # All tests
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests
npm run test:coverage     # Coverage report

# Frontend tests  
cd Frontend-admin
npm run test              # Unit tests
npm run test:e2e         # End-to-end tests
```

### Testing Scenarios
- User authentication and authorization
- Quiz creation and management
- Friend match creation and joining
- Real-time gameplay synchronization
- AI opponent behavior validation
- Database operations and migrations
- WebSocket connection stability
- Load testing and performance validation

## 🚀 Deployment

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Monitor services
docker-compose logs -f
```

### Environment Configuration
- **Development**: Debug logging, hot reloading, dev tools enabled
- **Staging**: Production-like environment for testing
- **Production**: Optimized builds, security hardening, monitoring

### CI/CD Pipeline
- Automated testing on pull requests
- Security scanning and dependency audits
- Multi-stage Docker builds with caching
- Blue-green deployments for zero downtime
- Automatic rollback on deployment failures

## 📈 Monitoring

### Health Checks
- Application health: `GET /health`
- Database connectivity verification
- Redis connection status
- WebSocket server availability
- External service dependencies

### Metrics & Alerting
- System resource utilization
- Application performance metrics
- User engagement analytics
- Error rates and response times
- Business metrics (matches, users, quizzes)

### Dashboards & Prometheus jobs
- Grafana dashboards live in `monitoring/grafana/dashboards/`.
- Preferred dashboards:
  - `match-server-performance.json`
  - `bottleneck-detection.json`
  - `working-metrics-dashboard.json`
  - `postgresql-exporter.json` or `postgresql-prometheus.json`
  - `redis-prometheus.json`
- Prometheus jobs expected by dashboards:
  - `job="match-server-master"` for match server (`GET /metrics`)
  - `job="postgresql"` for postgres-exporter
  - `job="redis"` for redis-exporter

See `monitoring/README.md` for scrape config examples and troubleshooting.

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow coding standards and write tests
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request with detailed description

### Code Standards
- Follow TypeScript best practices
- Maintain 80%+ test coverage
- Use conventional commit messages
- Document all public APIs
- Follow security guidelines

## 📞 Support

### Documentation
- [System Design](docs/SYSTEM_DESIGN.md) - Architecture overview
- [API Documentation](docs/openapi.yaml) - REST API specification
- [Developer Guide](DEV_NOTES.md) - Setup and troubleshooting
- [WebSocket Events](docs/socket_spec.md) - Real-time communication

### Getting Help
1. Check existing documentation and FAQ
2. Search GitHub Issues for similar problems  
3. Create new issue with detailed information
4. Join community discussions and support channels

### Reporting Issues
When reporting bugs, please include:
- Environment details (OS, Node.js version, browser)
- Steps to reproduce the issue
- Expected vs actual behavior
- Error logs and screenshots
- System configuration details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with modern web technologies and best practices:
- React ecosystem for dynamic user interfaces
- Node.js runtime for server-side JavaScript
- PostgreSQL for reliable data persistence
- Redis for high-performance caching
- Socket.io for real-time communication
- Docker for containerization and deployment
- Open source community for tools and libraries

---

**QuizUP** - Empowering education through gamified learning experiences.
