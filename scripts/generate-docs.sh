#!/bin/bash

# QuizUP Documentation Generation Script
# This script generates comprehensive documentation for both Frontend and Backend projects

set -e  # Exit on any error

echo "🚀 Starting QuizUP Documentation Generation..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "Frontend-admin" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the Capstone-Project root directory"
    exit 1
fi

print_status "Working directory: $(pwd)"

# Generate Backend Documentation
print_status "📚 Generating Backend Documentation..."
cd backend

print_status "Installing Docusaurus dependencies..."
npm install --silent

print_status "Generating TypeDoc documentation..."
npm run docs:typedoc

print_status "Building Docusaurus site..."
npm run docs:docusaurus

print_success "Backend documentation generated successfully!"
cd ..

# Generate Frontend Documentation
print_status "📱 Generating Frontend Documentation..."
cd Frontend-admin

print_status "Installing documentation dependencies..."
npm install --silent

print_status "Generating TypeDoc documentation..."
npm run docs:typedoc

print_status "Generating React component documentation..."
npm run docs:react

print_status "Building Docusaurus site..."
npm run docs:docusaurus

print_success "Frontend documentation generated successfully!"
cd ..

# Create unified documentation index
print_status "🔗 Creating unified documentation index..."

cat > docs/README.md << 'EOF'
# QuizUP Documentation Hub

Welcome to the comprehensive documentation for the QuizUP platform! This hub provides access to all documentation for both the frontend and backend components.

## 📋 Documentation Overview

### 🎯 Frontend Documentation (React Admin)
- **Framework**: React 19 + TypeScript + Vite
- **UI Components**: Radix UI + Tailwind CSS
- **Documentation**: [Frontend Docs](./Frontend-admin/docs/build/index.html)
- **Storybook**: [Component Stories](./Frontend-admin/storybook-static/index.html)

**Key Features:**
- Interactive component documentation
- Real-time API integration
- Responsive admin interface
- Comprehensive form handling

### ⚙️ Backend Documentation (Node.js API)
- **Framework**: Express.js + TypeScript + Sequelize
- **Database**: PostgreSQL with Redis caching
- **Documentation**: [Backend API Docs](./backend/docs/build/index.html)
- **API Reference**: [Swagger UI](http://localhost:3000/api-docs)

**Key Features:**
- RESTful API with WebSocket support
- Real-time quiz matching system
- JWT authentication and authorization
- Comprehensive testing suite

## 🚀 Quick Start

### Development Environment
```bash
# Frontend Development
cd Frontend-admin
npm run dev          # Start Vite dev server
npm run storybook    # Start Storybook

# Backend Development
cd backend
npm run dev          # Start main API server
npm run dev:match    # Start match service
```

### Documentation Generation
```bash
# Generate all documentation
./generate-docs.sh

# Generate specific documentation
cd Frontend-admin && npm run docs:generate
cd backend && npm run docs:generate
```

## 📚 Documentation Structure

### Frontend Documentation
```
Frontend-admin/docs/
├── build/                 # Generated Docusaurus site
├── docs/                  # Source documentation
│   ├── intro.md          # Getting started
│   ├── components/       # Component docs
│   └── api/              # API reference
├── typedoc/              # TypeScript API docs
└── react-components.json  # React component metadata
```

### Backend Documentation
```
backend/docs/
├── build/                 # Generated Docusaurus site
├── docs/                  # Source documentation
│   ├── intro.md          # Getting started
│   ├── api/              # API reference
│   └── architecture/     # System architecture
└── api/                   # TypeScript API docs
```

## 🛠️ Tools Used

### Documentation Generators
- **TypeDoc**: TypeScript API documentation
- **react-docgen-typescript**: React component analysis
- **Docusaurus**: Static site generator
- **Storybook**: Interactive component development

### Development Tools
- **Vite**: Fast build tool (Frontend)
- **Express**: Web framework (Backend)
- **Sequelize**: ORM (Backend)
- **Jest**: Testing framework

## 🎨 Styling & UI

### Frontend
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **shadcn/ui**: Component library

### Backend
- **OpenAPI/Swagger**: API documentation
- **Winston**: Structured logging
- **Joi**: Schema validation

## 🔧 Architecture

### System Design
- **Microservices**: Separate API and Match services
- **Real-time**: WebSocket for live quiz gameplay
- **Database**: PostgreSQL with optimized indexing
- **Caching**: Redis for performance and scaling

### Key Features
- Friend match system with join codes
- AI opponent integration with difficulty levels
- Real-time quiz gameplay with WebSocket synchronization
- Question bank management with bulk import
- ELO rating system for competitive play
- Session management with reconnection capability

## 📞 Support & Resources

### Getting Help
- **GitHub Issues**: [Report bugs](https://github.com/your-org/quizup/issues)
- **Discussions**: [Ask questions](https://github.com/your-org/quizup/discussions)
- **Documentation**: This site serves as the primary reference

### Development Resources
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://typescriptlang.org/docs)
- [Node.js Documentation](https://nodejs.org/docs)
- [PostgreSQL Docs](https://postgresql.org/docs)

## 🤝 Contributing

We welcome contributions to both the codebase and documentation!

### Code Contributions
1. Follow established coding standards
2. Write comprehensive tests
3. Update documentation for API changes
4. Use conventional commit messages

### Documentation Contributions
1. Keep documentation current with code changes
2. Use clear, concise language
3. Include code examples where helpful
4. Test documentation links and references

## 📈 Project Status

- ✅ **Phase 1**: Backend Integration - Complete
- ✅ **Phase 2**: AI Opponent & Match System - Complete
- ✅ **Phase 3**: Frontend Integration - Complete
- 🚧 **Phase 4**: Documentation & Deployment - In Progress

## 🔗 Quick Links

| Component | Development | Documentation | API Reference |
|-----------|-------------|---------------|---------------|
| Frontend Admin | http://localhost:5173 | ./Frontend-admin/docs/build | Component Stories |
| Backend API | http://localhost:3000 | ./backend/docs/build | Swagger UI |
| Match Service | http://localhost:3001 | - | WebSocket Events |

---

**Built with ❤️ by the QuizUP Team**

*Generated on $(date)*
EOF

print_success "Unified documentation index created!"

# Summary
print_status "📊 Documentation Generation Summary"
print_success "✅ Frontend TypeDoc documentation generated"
print_success "✅ Frontend React component documentation generated"
print_success "✅ Frontend Docusaurus site built"
print_success "✅ Backend TypeDoc documentation generated"
print_success "✅ Backend Docusaurus site built"
print_success "✅ Unified documentation index created"

echo ""
print_status "🌐 Access your documentation:"
echo "  📱 Frontend Docs: $(pwd)/Frontend-admin/docs/build/index.html"
echo "  ⚙️  Backend Docs: $(pwd)/backend/docs/build/index.html"
echo "  📋 Storybook: $(pwd)/Frontend-admin/storybook-static/index.html"
echo "  🔗 API Docs: http://localhost:3000/api-docs (when backend is running)"
echo ""

print_success "🎉 Documentation generation completed successfully!"
print_status "You can now serve the documentation sites using:"
echo "  cd Frontend-admin/docs && npm run docs:serve"
echo "  cd backend/docs && npm run docs:serve"
