# Frontend-Admin API Integration Guide

## 🚀 Complete API Setup for Quiz Management System

This guide shows how to integrate the Frontend-admin with the backend API for Categories, Quizzes, and Questions management.

## 📁 File Structure

```
src/
├── services/
│   ├── api.ts                 # Base API configuration
│   ├── categoryService.ts     # Category CRUD operations
│   ├── quizService.ts         # Quiz CRUD operations
│   ├── questionService.ts     # Question CRUD operations
│   └── index.ts               # Export all services
├── types/
│   └── api.ts                 # Backend-aligned TypeScript types
├── hooks/
│   └── useApi.ts              # React hooks for API state management
└── components/
    └── examples/
        ├── CategoryExample.tsx    # Category management example
        ├── QuizExample.tsx        # Quiz management example
        └── QuestionExample.tsx    # Question management example
```

## 🔧 Installation

The axios dependency has been added to package.json:

```bash
npm install  # axios is already included
```

## 📋 API Services Overview

### 1. **Category Service** (`categoryService.ts`)
```typescript
import { categoryService } from './services';

// Get all categories
const categories = await categoryService.getAllCategories();

// Create category
const newCategory = await categoryService.createCategory({ name: 'Technology' });

// Update category
const updated = await categoryService.updateCategory(1, { name: 'Updated Name' });

// Delete category
await categoryService.deleteCategory(1);

// Get category hierarchy
const hierarchy = await categoryService.getCategoryHierarchy();
```

### 2. **Quiz Service** (`quizService.ts`)
```typescript
import { quizService } from './services';

// Get all quizzes with filters
const { quizzes, total } = await quizService.getAllQuizzes({
  categoryId: 1,
  difficulty: 'MEDIUM',
  limit: 10
});

// Create quiz
const newQuiz = await quizService.createQuiz({
  title: 'JavaScript Basics',
  description: 'Test your JS knowledge',
  categoryId: 1,
  difficulty: 'EASY',
  timeLimit: 30
});

// Update quiz
const updated = await quizService.updateQuiz(1, { title: 'Updated Title' });

// Get quiz stats
const stats = await quizService.getQuizStats(1);
```

### 3. **Question Service** (`questionService.ts`)
```typescript
import { questionService } from './services';

// Get questions for a quiz
const questions = await questionService.getQuestionsByQuizId(1);

// Add question to quiz
const newQuestion = await questionService.addQuestionToQuiz(1, {
  questionText: 'What is React?',
  options: [
    { optionText: 'A library', isCorrect: true },
    { optionText: 'A framework', isCorrect: false },
    { optionText: 'A language', isCorrect: false },
    { optionText: 'A database', isCorrect: false }
  ]
});

// Update question
const updated = await questionService.updateQuestion(1, questionData);

// Validate question before submission
const validation = questionService.validateQuestionData(questionData);
if (!validation.isValid) {
  console.log('Errors:', validation.errors);
}
```

## 🎣 React Hooks Usage

### Using `useApi` for automatic data fetching:
```typescript
import { useApi } from '../hooks/useApi';
import { categoryService } from '../services';

function CategoryList() {
  const {
    data: categories,
    loading,
    error,
    refetch
  } = useApi(() => categoryService.getAllCategories());

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {categories?.map(category => (
        <div key={category.id}>{category.name}</div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Using `useApiMutation` for user-triggered actions:
```typescript
import { useApiMutation } from '../hooks/useApi';
import { categoryService } from '../services';

function CreateCategory() {
  const {
    loading,
    error,
    mutate: createCategory
  } = useApiMutation((data) => categoryService.createCategory(data));

  const handleSubmit = async (formData) => {
    try {
      const result = await createCategory(formData);
      console.log('Created:', result);
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
      {error && <p>Error: {error}</p>}
    </form>
  );
}
```

## 🎯 Complete Examples

Check out the example components in `src/components/examples/`:

- **CategoryExample.tsx** - Full CRUD operations for categories
- **QuizExample.tsx** - Complete quiz management with category selection
- **QuestionExample.tsx** - Question management with validation

## 🔗 API Configuration

The base API configuration is in `src/services/api.ts`:

```typescript
// Base URL - update this for production
const API_BASE_URL = 'http://localhost:3000/api';

// Axios instance with interceptors for auth and error handling
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## 📝 TypeScript Types

All types are aligned with the backend Prisma schema:

```typescript
interface Category {
  id: number;
  name: string;
  parentId?: number | null;
  parent?: Category | null;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
  quizzes?: Quiz[];
}

interface Quiz {
  id: number;
  title: string;
  description?: string;
  categoryId: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit?: number;
  // ... more fields
}
```

## 🚦 Error Handling

All services include comprehensive error handling:

```typescript
try {
  const result = await categoryService.createCategory(data);
} catch (error) {
  if (error.response?.status === 400) {
    // Validation error
    console.log('Validation failed:', error.response.data.message);
  } else if (error.response?.status === 500) {
    // Server error
    console.log('Server error occurred');
  }
}
```

## 🧪 Testing the Integration

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   cd Frontend-admin
   npm run dev
   ```

3. **Test the API calls:**
   - Import any example component
   - Use the services directly in your components
   - Check browser network tab for API calls

## 🔄 Data Flow

1. **Component** calls service method
2. **Service** makes HTTP request via apiClient
3. **Backend** processes request and returns data
4. **Service** returns typed data to component
5. **Component** updates UI with new data

## 📊 Available Operations

### Categories
- ✅ Create, Read, Update, Delete
- ✅ Hierarchy support (parent/child relationships)
- ✅ Get subcategories

### Quizzes  
- ✅ Create, Read, Update, Delete
- ✅ Filter by category, difficulty
- ✅ Get quiz statistics
- ✅ Pagination support

### Questions
- ✅ Create, Read, Update, Delete
- ✅ Add to specific quiz
- ✅ Multiple choice options (2-4 options)
- ✅ Multiple correct answers support
- ✅ Validation before submission
- ✅ Bulk operations

## 🎉 Ready to Use!

The API integration is complete and ready for production use. All services are properly typed, include error handling, and follow React best practices.
