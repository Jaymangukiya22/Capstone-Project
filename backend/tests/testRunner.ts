// With this:
import { execSync } from 'child_process';
import * as path from 'path';

// Type declarations for Node.js globals
declare const process: any;
declare const __dirname: string;


/**
 * Test Runner Script
 * Runs different types of tests based on command line arguments
 */

const args = process.argv.slice(2);
const command = args[0] || 'all';

const testCommands = {
  // Run all tests
  all: 'jest --detectOpenHandles --forceExit',
  
  // Run only unit tests
  unit: 'jest --testPathPattern="unit" --detectOpenHandles --forceExit',
  
  // Run only integration tests
  integration: 'jest --testPathPattern="integration" --detectOpenHandles --forceExit',
  
  // Run tests with coverage
  coverage: 'jest --coverage --detectOpenHandles --forceExit',
  
  // Run tests in watch mode
  watch: 'jest --watch --detectOpenHandles',
  
  // Run specific test file
  file: (filename: string) => `jest --testPathPattern="${filename}" --detectOpenHandles --forceExit`,
  
  // Run tests for specific service
  service: (serviceName: string) => `jest --testPathPattern="${serviceName}" --detectOpenHandles --forceExit`,
  
  // Run tests with verbose output
  verbose: 'jest --verbose --detectOpenHandles --forceExit',
  
  // Run tests and generate HTML coverage report
  'coverage-html': 'jest --coverage --coverageReporters=html --detectOpenHandles --forceExit'
};

function runTests() {
  console.log('🧪 QuizUP Backend Test Runner');
  console.log('================================');
  
  try {
    let cmd: string = '';
    
    switch (command) {
      case 'all':
        console.log('📋 Running all tests...');
        cmd = testCommands.all;
        break;
        
      case 'unit':
        console.log('🔧 Running unit tests...');
        cmd = testCommands.unit;
        break;
        
      case 'integration':
        console.log('🔗 Running integration tests...');
        cmd = testCommands.integration;
        break;
        
      case 'coverage':
        console.log('📊 Running tests with coverage...');
        cmd = testCommands.coverage;
        break;
        
      case 'watch':
        console.log('👀 Running tests in watch mode...');
        cmd = testCommands.watch;
        break;
        
      case 'file':
        const filename = args[1];
        if (!filename) {
          console.error('❌ Please specify a test file name');
          process.exit(1);
        }
        console.log(`📄 Running tests for file: ${filename}`);
        cmd = testCommands.file(filename);
        break;
        
      case 'service':
        const serviceName = args[1];
        if (!serviceName) {
          console.error('❌ Please specify a service name');
          process.exit(1);
        }
        console.log(`🔧 Running tests for service: ${serviceName}`);
        cmd = testCommands.service(serviceName);
        break;
        
      case 'verbose':
        console.log('📢 Running tests with verbose output...');
        cmd = testCommands.verbose;
        break;
        
      case 'coverage-html':
        console.log('📊 Running tests with HTML coverage report...');
        cmd = testCommands['coverage-html'];
        break;
        
      case 'help':
        showHelp();
        return;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
    
    // Set environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = process.env.DB_NAME || 'quizup_test';
    
    console.log(`\n🚀 Executing: ${cmd}\n`);
    
    execSync(cmd, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    console.log('\n✅ Tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Tests failed!');
    console.error(error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
📚 Available Commands:
  all              Run all tests (default)
  unit             Run only unit tests
  integration      Run only integration tests
  coverage         Run tests with coverage report
  watch            Run tests in watch mode
  file <filename>  Run specific test file
  service <name>   Run tests for specific service
  verbose          Run tests with verbose output
  coverage-html    Generate HTML coverage report
  help             Show this help message

📝 Examples:
  npm run test:runner all
  npm run test:runner unit
  npm run test:runner file categoryService
  npm run test:runner service quiz
  npm run test:runner coverage-html

🔧 Environment:
  NODE_ENV will be set to 'test'
  DB_NAME will default to 'quizup_test'
`);
}

// Run the tests
runTests();
