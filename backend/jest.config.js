module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '**/tests/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        strict: false,
        types: ['jest', 'node']
      }
    }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/matchServer*.ts',
    '!src/tracing.ts',
    '!src/scripts/**',
    '!src/seeders/**',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  
  // Test patterns for different test types (temporarily disabled for debugging)
  // projects: [
  //   {
  //     displayName: 'unit',
  //     testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  //     setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
  //   },
  //   {
  //     displayName: 'integration',
  //     testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  //     setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
  //   }
  // ]
};
