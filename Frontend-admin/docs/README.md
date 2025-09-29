# QuizUP Frontend Admin Documentation

Welcome to the QuizUP Frontend Admin documentation! This site provides comprehensive documentation for the React-based admin interface.

## 📚 Documentation Sections

### 🚀 Getting Started
- [Quick Start Guide](docs/intro.md) - Get up and running with the frontend admin
- [Development Setup](docs/development-setup.md) - Local development environment
- [Architecture Overview](docs/architecture.md) - System architecture and design

### 🧩 Components
- [Component Library](docs/components/index.md) - All React components
- [UI Components](docs/components/ui.md) - Reusable UI elements
- [Form Components](docs/components/forms.md) - Form handling components

### 🔌 API Integration
- [API Reference](docs/api/index.md) - Complete API documentation
- [WebSocket Integration](docs/websocket.md) - Real-time communication
- [State Management](docs/state-management.md) - Application state handling

### 🎨 Styling & Theming
- [Tailwind CSS Guide](docs/styling/tailwind.md) - Styling with Tailwind
- [Theme Configuration](docs/styling/themes.md) - Theme customization
- [Responsive Design](docs/styling/responsive.md) - Mobile-first design

### 🧪 Testing
- [Testing Guide](docs/testing/index.md) - Testing strategies
- [Unit Tests](docs/testing/unit.md) - Component testing
- [Integration Tests](docs/testing/integration.md) - End-to-end testing

### 📖 Storybook
- [Storybook Guide](docs/storybook/index.md) - Interactive component documentation
- [Writing Stories](docs/storybook/writing-stories.md) - Creating component stories
- [Storybook Best Practices](docs/storybook/best-practices.md) - Development workflows

## 🛠️ Development Commands

```bash
# Generate all documentation
npm run docs:generate

# Generate TypeScript API docs
npm run docs:typedoc

# Generate React component docs
npm run docs:react

# Start Docusaurus development server
npm run docs:dev

# Build static documentation site
npm run docs:docusaurus

# Serve built documentation
npm run docs:serve

# Run Storybook
npm run storybook

# Build Storybook
npm run build-storybook
```

## 📁 Project Structure

```
Frontend-admin/
├── src/                    # Source code
│   ├── components/        # React components
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
├── docs/                  # Docusaurus documentation
│   ├── docusaurus.config.ts
│   ├── sidebars.ts
│   └── docs/              # Markdown documentation
├── .storybook/            # Storybook configuration
├── typedoc.json          # TypeDoc configuration
└── package.json          # Dependencies and scripts
```

## 🎯 Key Features

- **React 19** with TypeScript support
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Storybook** for component development
- **TypeDoc** for API documentation
- **Docusaurus** for static site generation

## 🤝 Contributing

1. Follow the established coding standards
2. Write comprehensive JSDoc comments
3. Create Storybook stories for new components
4. Update documentation for API changes
5. Run tests before submitting PRs

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/your-org/quizup-frontend-admin/issues)
- **Discussions**: [Ask questions](https://github.com/your-org/quizup-frontend-admin/discussions)
- **Documentation**: This site serves as the primary documentation source
