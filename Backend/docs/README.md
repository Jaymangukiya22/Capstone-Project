# QuizUP Backend API Documentation

Welcome to the QuizUP Backend API documentation! This site provides comprehensive documentation for the Node.js backend API that powers the QuizUP platform.

## 📚 Documentation Sections

### 🚀 Getting Started
- [Quick Start Guide](docs/intro.md) - Get up and running with the backend
- [Development Setup](docs/development-setup.md) - Local development environment
- [Architecture Overview](docs/architecture.md) - System architecture and design

### 🔌 API Reference
- [REST API](docs/api/index.md) - Complete REST API documentation
- [WebSocket Events](docs/websocket.md) - Real-time communication events
- [Authentication](docs/auth.md) - JWT authentication system
- [Database Models](docs/database.md) - Data models and relationships

### 🏗️ Architecture
- [Microservices](docs/architecture/microservices.md) - Service architecture
- [Database Design](docs/architecture/database.md) - PostgreSQL schema
- [Caching Strategy](docs/architecture/caching.md) - Redis implementation
- [Security](docs/architecture/security.md) - Security measures

### 🧪 Testing
- [Testing Guide](docs/testing/index.md) - Testing strategies
- [Unit Tests](docs/testing/unit.md) - Service testing
- [Integration Tests](docs/testing/integration.md) - API testing
- [Load Testing](docs/testing/load.md) - Performance testing

### 🚀 Deployment
- [Docker Setup](docs/deployment/docker.md) - Containerization
- [Kubernetes](docs/deployment/kubernetes.md) - Orchestration
- [CI/CD Pipeline](docs/deployment/cicd.md) - Continuous integration
- [Monitoring](docs/deployment/monitoring.md) - Observability

## 🛠️ Development Commands

```bash
# Generate all documentation
npm run docs:generate

# Generate TypeScript API docs
npm run docs:typedoc

# Start Docusaurus development server
npm run docs:dev

# Build static documentation site
npm run docs:docusaurus

# Serve built documentation
npm run docs:serve

# Run tests
npm run test

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
backend/
├── src/                   # Source code
│   ├── controllers/      # Route controllers
│   ├── services/         # Business logic
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   └── utils/            # Utility functions
├── docs/                 # Docusaurus documentation
│   ├── docusaurus.config.ts
│   ├── sidebars.ts
│   └── docs/             # Markdown documentation
├── tests/                # Test files
└── package.json          # Dependencies and scripts
```

## 🎯 Key Features

- **Express.js** with TypeScript support
- **Sequelize ORM** for PostgreSQL
- **Redis** for caching and sessions
- **Socket.io** for real-time communication
- **JWT Authentication** with role-based access
- **Joi Validation** for request validation
- **Winston** for structured logging
- **Jest** for testing
- **Docker** for containerization

## 🔧 Architecture Highlights

### Microservices Design
- Main API server (port 3000)
- Match service with WebSocket (port 3001)
- Redis for session management and caching

### Database Design
- PostgreSQL with optimized indexing
- Sequelize ORM with TypeScript
- Migration support with Sequelize CLI

### Real-time Features
- WebSocket connections for live matches
- Redis pub/sub for inter-service communication
- Real-time scoring and game state

### Security
- JWT authentication with refresh tokens
- Rate limiting and CORS protection
- Input validation and sanitization
- Helmet for security headers

## 🤝 Contributing

1. Follow the established coding standards
2. Write comprehensive JSDoc comments
3. Add unit and integration tests
4. Update API documentation for changes
5. Run tests before submitting PRs

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/your-org/quizup-backend/issues)
- **Discussions**: [Ask questions](https://github.com/your-org/quizup-backend/discussions)
- **API Documentation**: This site serves as the primary API reference
- **Postman Collection**: Import the provided collection for testing

## 🔗 Links

- [Main API](http://localhost:3000) - Development server
- [API Documentation](http://localhost:3000/api-docs) - Swagger UI
- [Match Service](http://localhost:3001) - WebSocket server
- [GitHub Repository](https://github.com/your-org/quizup-backend) - Source code
- [Health Check](http://localhost:3000/health) - Service health endpoint
