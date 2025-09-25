#!/usr/bin/env node

/**
 * Pre-build verification script
 * Ensures all necessary files exist before Docker build
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Pre-build verification starting...');

// Check required files
const requiredFiles = [
  'src/server.ts',
  'src/matchServer-enhanced.ts',
  'package.json',
  'tsconfig.json',
  'start.sh',
  'start-server.js'
];

const requiredDirectories = [
  'src',
  'src/controllers',
  'src/services',
  'src/models',
  'src/routes',
  'src/middleware'
];

let hasErrors = false;

// Check files
console.log('📄 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

// Check directories
console.log('\n📁 Checking required directories...');
requiredDirectories.forEach(dir => {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    console.log(`✅ ${dir}/`);
  } else {
    console.log(`❌ ${dir}/ - MISSING`);
    hasErrors = true;
  }
});

// Check TypeScript files in src
console.log('\n🔧 Checking TypeScript source files...');
const srcFiles = [
  'src/server.ts',
  'src/matchServer-enhanced.ts'
];

srcFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.length > 100) { // Basic content check
      console.log(`✅ ${file} (${Math.round(content.length/1024)}KB)`);
    } else {
      console.log(`⚠️  ${file} - File seems too small`);
    }
  } else {
    console.log(`❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['build', 'start', 'start:match'];
  
  requiredScripts.forEach(script => {
    if (pkg.scripts && pkg.scripts[script]) {
      console.log(`✅ npm run ${script}: ${pkg.scripts[script]}`);
    } else {
      console.log(`❌ npm run ${script} - MISSING SCRIPT`);
      hasErrors = true;
    }
  });
}

// Check startup scripts are executable (Unix-like systems)
console.log('\n🚀 Checking startup scripts...');
['start.sh', 'start-server.js'].forEach(script => {
  if (fs.existsSync(script)) {
    try {
      const stats = fs.statSync(script);
      console.log(`✅ ${script} exists (${stats.size} bytes)`);
    } catch (error) {
      console.log(`⚠️  ${script} - Error checking file: ${error.message}`);
    }
  }
});

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Pre-build verification FAILED');
  console.log('Please fix the missing files/directories before building.');
  process.exit(1);
} else {
  console.log('✅ Pre-build verification PASSED');
  console.log('All required files and directories are present.');
  console.log('Ready for Docker build! 🚀');
}

console.log('\n💡 To build and run:');
console.log('   docker-compose up --build');
console.log('');
console.log('🔧 To run locally for development:');
console.log('   npm install');
console.log('   npm run build');
console.log('   npm run start:all');
