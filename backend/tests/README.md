# QuizUP Backend Test Suite

This directory contains comprehensive tests for the QuizUP backend application, including unit tests, integration tests, and test utilities.

## 📁 Test Structure

```
tests/
├── setup.ts                    # Global test setup and utilities
├── testRunner.ts               # Custom test runner script
├── README.md                   # This file
├── unit/                       # Unit tests
│   ├── services/               # Service layer tests
│   │   ├── categoryService.test.ts
│   │   ├── quizService.test.ts
│   │   └── questionBankService.test.ts
│   └── utils/                  # Utility tests
│       └── validation.test.ts
└── integration/                # Integration tests
    ├── categoryController.test.ts
    ├── quizController.test.ts
    ├── authController.test.ts
    └── health.test.ts
```

## 🧪 Test Types

### Unit Tests
- **Service Tests**: Test business logic in isolation
- **Utility Tests**: Test helper functions and validation schemas
- **Model Tests**: Test database models and relationships

### Integration Tests
- **Controller Tests**: Test API endpoints with real database
- **Route Tests**: Test complete request/response cycles
- **Authentication Tests**: Test auth flows and middleware

## 🚀 Running Tests

### Using NPM Scripts

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Using Custom Test Runner

```bash
# Run all tests
npm run test:runner all

# Run unit tests only
npm run test:runner unit

# Run integration tests only
npm run test:runner integration

# Run tests with coverage
npm run test:runner coverage

# Run tests with HTML coverage report
npm run test:runner coverage-html

# Run specific test file
npm run test:runner file categoryService

# Run tests for specific service
npm run test:runner service quiz

# Run tests with verbose output
npm run test:runner verbose

# Run tests in watch mode
npm run test:runner watch
```

## 🛠️ Test Configuration

### Jest Configuration
- **Environment**: Node.js
- **Test Timeout**: 30 seconds
- **Coverage Threshold**: 70% for all metrics
- **Max Workers**: 1 (sequential execution to avoid database conflicts)

### Database Configuration
- **Test Database**: `quizup_test` (separate from development)
- **Auto-sync**: Tables are recreated before each test run
- **Cleanup**: All data is cleared after each test

### Environment Variables
```bash
NODE_ENV=test
DB_NAME=quizup_test
DB_HOST=localhost
DB_PORT=5432
DB_USER=quizup_user
DB_PASSWORD=quizup_password
```

## 📊 Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **LCOV**: For CI/CD integration (`coverage/lcov.info`)
- **HTML**: Interactive report (`coverage/index.html`)
- **JSON**: Machine-readable format (`coverage/coverage-final.json`)

### Coverage Thresholds
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 🔧 Test Utilities

### Setup File (`setup.ts`)
- Database connection and sync
- Test data cleanup
- Helper functions for creating test data
- Global test configuration

### Helper Functions
```typescript
// Create test data
createTestUser(overrides?)
createTestCategory(overrides?)
createTestQuiz(categoryId, overrides?)
createTestQuestion(quizId, overrides?)
createTestQuestionBankQuestion(overrides?)
```

## 📝 Writing Tests

### Unit Test Example
```typescript
import { CategoryService } from '../../../src/services/categoryService';
import { createTestUser, createTestCategory } from '../../setup';

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let testUser: any;

  beforeEach(async () => {
    categoryService = new CategoryService();
    testUser = await createTestUser();
  });

  it('should create a category', async () => {
    const categoryData = {
      name: 'Test Category',
      description: 'Test description'
    };

    const result = await categoryService.createCategory(categoryData, testUser.id);
    
    expect(result).toBeDefined();
    expect(result.name).toBe(categoryData.name);
  });
});
```

### Integration Test Example
```typescript
import request from 'supertest';
import express from 'express';
import categoryRoutes from '../../src/routes/categoryRoutes';

const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);

describe('Category Controller', () => {
  it('should create a category', async () => {
    const categoryData = {
      name: 'Test Category',
      description: 'Test description'
    };

    const response = await request(app)
      .post('/api/categories')
      .send(categoryData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe(categoryData.name);
  });
});
```

## 🐛 Debugging Tests

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and test database exists
2. **Port Conflicts**: Make sure test ports are available
3. **Async Issues**: Use proper async/await patterns
4. **Memory Leaks**: Tests run with `--detectOpenHandles` to catch leaks

### Debug Commands
```bash
# Run tests with verbose output
npm run test:runner verbose

# Run specific test file
npm run test:runner file categoryService

# Run tests in watch mode for development
npm run test:runner watch
```

## 🔄 CI/CD Integration

### GitHub Actions
Tests are automatically run on:
- Pull requests
- Pushes to main branch
- Scheduled runs (daily)

### Test Pipeline
1. **Setup**: Install dependencies, start services
2. **Unit Tests**: Run isolated unit tests
3. **Integration Tests**: Run API and database tests
4. **Coverage**: Generate and upload coverage reports
5. **Cleanup**: Stop services, clean up resources

## 📈 Test Metrics

### Current Coverage
- **Services**: 85%+ coverage target
- **Controllers**: 80%+ coverage target
- **Utilities**: 90%+ coverage target
- **Overall**: 70%+ minimum threshold

### Performance Targets
- **Unit Tests**: < 5 seconds total
- **Integration Tests**: < 30 seconds total
- **Full Suite**: < 60 seconds total

## 🤝 Contributing

### Adding New Tests
1. Follow existing naming conventions
2. Use appropriate test helpers
3. Include both positive and negative test cases
4. Add integration tests for new API endpoints
5. Maintain coverage thresholds

### Test Guidelines
- **Descriptive Names**: Test names should clearly describe what is being tested
- **Arrange-Act-Assert**: Follow AAA pattern in test structure
- **Isolation**: Each test should be independent
- **Cleanup**: Always clean up test data
- **Mocking**: Mock external dependencies appropriately

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Sequelize Testing](https://sequelize.org/docs/v6/other-topics/testing/)
- [TypeScript Testing](https://typescript-eslint.io/docs/linting/troubleshooting/#testing-frameworks)

---

For questions or issues with the test suite, please check the existing tests for examples or consult the team documentation.
