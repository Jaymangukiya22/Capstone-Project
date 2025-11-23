#!/usr/bin/env node

/**
 * Stress Test Runner for Multiple Environments
 * Usage: node run-stress-tests.js [environment] [options]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const ENVIRONMENTS = {
  localhost: {
    DEPLOYMENT_MODE: 'localhost',
    description: 'Local Docker Compose deployment'
  },
  network: {
    DEPLOYMENT_MODE: 'network',
    NETWORK_IP: process.env.NETWORK_IP || '192.168.1.100', // Update this
    description: 'Network deployment (LAN access)'
  },
  hosted: {
    DEPLOYMENT_MODE: 'hosted',
    description: 'Production hosted deployment (Cloudflare)'
  }
};

function printUsage() {
  console.log('🧪 Multi-Environment Stress Test Runner');
  console.log('=====================================\n');
  console.log('Usage: node run-stress-tests.js [environment] [options]\n');
  console.log('Environments:');
  Object.entries(ENVIRONMENTS).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(10)} - ${config.description}`);
  });
  console.log('\nOptions:');
  console.log('  --matches=N     Number of matches to run (default: 3)');
  console.log('  --headless      Run in headless mode (default: true)');
  console.log('  --visible       Run with visible browser');
  console.log('  --network-ip=IP Set network IP address for network mode');
  console.log('\nExamples:');
  console.log('  node run-stress-tests.js localhost --matches=5');
  console.log('  node run-stress-tests.js network --network-ip=192.168.1.50 --visible');
  console.log('  node run-stress-tests.js hosted --matches=10');
  console.log('  node run-stress-tests.js all --matches=3  # Run on all environments');
}

function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  const environment = args[0];
  const options = {
    matches: 3,
    headless: true,
    networkIp: null
  };
  
  // Parse options
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--matches=')) {
      options.matches = parseInt(arg.split('=')[1]) || 3;
    } else if (arg === '--visible') {
      options.headless = false;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg.startsWith('--network-ip=')) {
      options.networkIp = arg.split('=')[1];
    }
  });
  
  return { environment, options };
}

function runTest(envName, envConfig, options) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Starting stress test for ${envName.toUpperCase()}`);
    console.log(`📝 Configuration: ${envConfig.description}`);
    console.log(`🎯 Matches: ${options.matches}`);
    console.log(`👁️  Headless: ${options.headless}`);
    
    const env = {
      ...process.env,
      ...envConfig,
      NUM_MATCHES: options.matches.toString(),
      HEADLESS: options.headless.toString()
    };
    
    // Override network IP if provided
    if (options.networkIp && envName === 'network') {
      env.NETWORK_IP = options.networkIp;
    }
    
    const testScript = path.join(__dirname, 'multi-environment-stress-test.js');
    const child = spawn('node', [testScript], {
      env,
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${envName.toUpperCase()} test completed successfully`);
        resolve({ environment: envName, success: true, code });
      } else {
        console.log(`❌ ${envName.toUpperCase()} test failed with code ${code}`);
        resolve({ environment: envName, success: false, code });
      }
    });
    
    child.on('error', (error) => {
      console.error(`💥 Failed to start ${envName.toUpperCase()} test:`, error.message);
      reject({ environment: envName, error: error.message });
    });
  });
}

async function runAllTests(options) {
  const results = [];
  
  console.log('🌍 Running stress tests on ALL environments...\n');
  
  for (const [envName, envConfig] of Object.entries(ENVIRONMENTS)) {
    try {
      const result = await runTest(envName, envConfig, options);
      results.push(result);
      
      // Pause between environments
      if (envName !== 'hosted') {
        console.log('\n⏸️  Pausing 10 seconds before next environment...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      results.push(error);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 ALL ENVIRONMENTS TEST SUMMARY');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${result.environment.toUpperCase().padEnd(10)} - ${status}`);
  });
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n🎯 Overall Result: ${passed}/${total} environments passed`);
  console.log('='.repeat(80));
  
  return results;
}

async function main() {
  const { environment, options } = parseArgs();
  
  if (!ENVIRONMENTS[environment] && environment !== 'all') {
    console.error(`❌ Unknown environment: ${environment}`);
    console.error(`Available environments: ${Object.keys(ENVIRONMENTS).join(', ')}, all`);
    process.exit(1);
  }
  
  try {
    if (environment === 'all') {
      await runAllTests(options);
    } else {
      const envConfig = ENVIRONMENTS[environment];
      await runTest(environment, envConfig, options);
    }
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Check if required dependencies are installed
function checkDependencies() {
  const requiredPackages = ['playwright', 'axios'];
  const packageJson = path.join(__dirname, '..', 'package.json');
  
  if (!fs.existsSync(packageJson)) {
    console.warn('⚠️  package.json not found. Make sure you have playwright and axios installed.');
    return;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    const missing = requiredPackages.filter(dep => !allDeps[dep]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required dependencies:', missing.join(', '));
      console.error('Install them with: npm install playwright axios');
      process.exit(1);
    }
  } catch (error) {
    console.warn('⚠️  Could not check dependencies:', error.message);
  }
}

if (require.main === module) {
  checkDependencies();
  main().catch(console.error);
}

module.exports = { runTest, runAllTests };
