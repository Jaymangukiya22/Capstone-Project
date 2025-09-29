# Getting Started with QuizUP Frontend Admin

Welcome to the QuizUP Frontend Admin documentation! This guide will help you get started with the React-based admin interface for the QuizUP platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Basic knowledge of React and TypeScript

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/quizup-frontend-admin.git
   cd quizup-frontend-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to see the application.

## 🛠️ Development Setup

### Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_APP_NAME=QuizUP Admin
VITE_APP_VERSION=1.0.0
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run storybook` - Start Storybook
- `npm run build-storybook` - Build Storybook

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── forms/          # Form components
│   ├── layout/         # Layout components
│   └── pages/          # Page components
├── services/           # API services and utilities
├── utils/              # Helper functions
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
└── styles/             # Global styles and CSS
```

## 🎨 Styling

The project uses **Tailwind CSS** for styling with **Radix UI** components for accessibility. Key styling principles:

- Mobile-first responsive design
- Dark/light theme support
- Consistent spacing and typography
- Accessible color contrasts

## 🔧 Key Technologies

- **React 19** - Latest React with concurrent features
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Router** - Client-side routing
- **React Hook Form** - Form state management
- **Zustand** - Lightweight state management
- **Axios** - HTTP client
- **Socket.io** - Real-time communication

## 📚 Documentation

This documentation site provides:

- **Component Documentation** - Interactive Storybook stories
- **API Reference** - Generated from TypeScript code
- **Development Guides** - Best practices and tutorials
- **Architecture Overview** - System design and patterns

## 🤝 Contributing

1. Follow the coding standards defined in the project
2. Write JSDoc comments for all public APIs
3. Create Storybook stories for new components
4. Update documentation for significant changes
5. Run tests and linting before submitting PRs

## 🔗 Links

- [Main Application](http://localhost:5173) - Development server
- [Storybook](http://localhost:6006) - Component documentation
- [GitHub Repository](https://github.com/your-org/quizup-frontend-admin) - Source code
- [API Documentation](http://localhost:3000/api-docs) - Backend API docs
