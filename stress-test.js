#!/usr/bin/env node

const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:8090';
const CONCURRENT_REQUESTS = 50;
const TOTAL_REQUESTS = 500;
const TEST_DURATION_SECONDS = 60;

let requestCount = 0;
let successCount = 0;
let errorCount = 0;
let totalResponseTime = 0;
let minResponseTime = Infinity;
let maxResponseTime = 0;
let authToken = null;

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const startTime = Date.now();
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        totalResponseTime += responseTime;
        minResponseTime = Math.min(minResponseTime, responseTime);
        maxResponseTime = Math.max(maxResponseTime, responseTime);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          successCount++;
        } else {
          errorCount++;
        }

        resolve({
          status: res.statusCode,
          data: data,
          responseTime: responseTime,
        });
      });
    });

    req.on('error', (error) => {
      errorCount++;
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Login or register a user
async function authenticate() {
  try {
    console.log('🔐 Authenticating...');
    
    // Try to login with a test user
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'test123',
    });

    if (loginResponse.status === 200) {
      const data = JSON.parse(loginResponse.data);
      authToken = data.token || data.accessToken;
      console.log('✅ Login successful');
      return true;
    }

    // If login fails, try to register
    console.log('📝 Registering new user...');
    const registerResponse = await makeRequest('POST', '/api/auth/register', {
      email: `test-${Date.now()}@example.com`,
      password: 'test123',
      firstName: 'Test',
      lastName: 'User',
    });

    if (registerResponse.status === 201 || registerResponse.status === 200) {
      const data = JSON.parse(registerResponse.data);
      authToken = data.token || data.accessToken;
      console.log('✅ Registration successful');
      return true;
    }

    console.error('❌ Authentication failed');
    return false;
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return false;
  }
}

// Run stress test
async function runStressTest() {
  console.log(`\n🚀 Starting stress test...`);
  console.log(`📊 Configuration:`);
  console.log(`   - Concurrent requests: ${CONCURRENT_REQUESTS}`);
  console.log(`   - Total requests: ${TOTAL_REQUESTS}`);
  console.log(`   - Duration: ${TEST_DURATION_SECONDS}s`);
  console.log(`   - API Base: ${API_BASE}\n`);

  const startTime = Date.now();
  const endpoints = [
    { method: 'GET', path: '/api/quizzes' },
    { method: 'GET', path: '/api/categories' },
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/api/performance' },
  ];

  let endpointIndex = 0;

  // Create a queue of requests
  const requestQueue = [];
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const endpoint = endpoints[endpointIndex % endpoints.length];
    requestQueue.push(endpoint);
    endpointIndex++;
  }

  // Process requests concurrently
  const activeRequests = [];

  while (requestQueue.length > 0 || activeRequests.length > 0) {
    // Fill up to CONCURRENT_REQUESTS
    while (activeRequests.length < CONCURRENT_REQUESTS && requestQueue.length > 0) {
      const endpoint = requestQueue.shift();
      requestCount++;

      const promise = makeRequest(endpoint.method, endpoint.path, null, authToken)
        .then(() => {
          activeRequests.splice(activeRequests.indexOf(promise), 1);
        })
        .catch((error) => {
          console.error(`❌ Request error: ${error.message}`);
          activeRequests.splice(activeRequests.indexOf(promise), 1);
        });

      activeRequests.push(promise);

      // Print progress every 50 requests
      if (requestCount % 50 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rps = (requestCount / elapsed).toFixed(2);
        console.log(`📈 Progress: ${requestCount}/${TOTAL_REQUESTS} requests (${rps} req/s)`);
      }
    }

    // Wait for at least one request to complete
    if (activeRequests.length > 0) {
      await Promise.race(activeRequests);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  // Print results
  console.log(`\n✅ Stress test completed!\n`);
  console.log(`📊 Results:`);
  console.log(`   - Total requests: ${requestCount}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - Failed: ${errorCount}`);
  console.log(`   - Success rate: ${((successCount / requestCount) * 100).toFixed(2)}%`);
  console.log(`   - Total time: ${totalTime.toFixed(2)}s`);
  console.log(`   - Requests/sec: ${(requestCount / totalTime).toFixed(2)}`);
  console.log(`   - Avg response time: ${(totalResponseTime / requestCount).toFixed(2)}ms`);
  console.log(`   - Min response time: ${minResponseTime}ms`);
  console.log(`   - Max response time: ${maxResponseTime}ms`);
  console.log(`\n🎯 Check Grafana at http://localhost:3000 for detailed metrics\n`);
}

// Main
(async () => {
  const authenticated = await authenticate();
  if (!authenticated) {
    console.error('Failed to authenticate. Exiting.');
    process.exit(1);
  }

  await runStressTest();
})();
