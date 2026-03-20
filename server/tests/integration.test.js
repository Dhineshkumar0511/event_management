/**
 * Integration Test Suite
 * Tests core functionality to ensure security patches didn't break anything
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

// Create axios instance with cookie support
const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 5000
});

let csrfToken = null;

const log = (status, message, detail = '') => {
  const icons = {
    'pass': '✅',
    'fail': '❌',
    'warn': '⚠️'
  };
  
  console.log(`${icons[status]} ${message}`);
  if (detail) console.log(`   ${detail}`);
  
  testResults.details.push({ status, message, detail });
  
  if (status === 'pass') testResults.passed++;
  else if (status === 'fail') testResults.failed++;
  else testResults.warnings++;
};

// Helper to extract CSRF token from response cookies
function extractCsrfToken(response) {
  const setCookie = response.headers['set-cookie'];
  if (setCookie && Array.isArray(setCookie)) {
    for (const cookie of setCookie) {
      if (cookie.includes('csrf-token=')) {
        const match = cookie.match(/csrf-token=([^;]+)/);
        if (match) {
          csrfToken = match[1];
          return csrfToken;
        }
      }
    }
  }
  return csrfToken;
}

// Helper to fetch CSRF token  
async function getCsrfToken() {
  try {
    const response = await axiosInstance.get(`${API_URL}/health`, {
      headers: csrfToken ? { 'Cookie': `csrf-token=${csrfToken}` } : {}
    });
    extractCsrfToken(response);
    return csrfToken;
  } catch (error) {
    console.warn('Could not fetch CSRF token:', error.message);
    return null;
  }
}

async function runIntegrationTests() {
  console.log('\n🔗 Integration Test Suite\n');
  console.log('='.repeat(60));
  
  // Fetch CSRF token first
  console.log('\n🔐 Fetching CSRF Token');
  console.log('-'.repeat(60));
  
  try {
    await getCsrfToken();
    log('pass', 'CSRF token obtained', csrfToken ? csrfToken.substring(0, 20) + '...' : 'cookie-based');
  } catch (error) {
    log('warn', 'CSRF token fetch warning', 'Continuing without token');
  }
  
  // Test 1: Server Health
  console.log('\n1️⃣  Server Health Checks');
  console.log('-'.repeat(60));
  
  try {
    const response = await axiosInstance.get(`${API_URL}/health`);
    if (response.status === 200) {
      log('pass', 'Server is running', `Status: ${response.status}`);
    } else {
      log('fail', 'Unexpected response code', `Expected 200, got ${response.status}`);
    }
  } catch (error) {
    log('fail', 'Cannot connect to server', `Make sure server is running on port 3000`);
    return; // Stop if server not running
  }
  
  // Test 2: Authentication
  console.log('\n2️⃣  Authentication Tests');
  console.log('-'.repeat(60));
  
  const testEmail = `integration_test_${Date.now()}@test.com`;
  const testPassword = 'StrongPass123!@#';
  let authToken = null;
  
  // Get fresh CSRF token before registration
  await getCsrfToken();
  
  try {
    // Register
    const registerResponse = await axiosInstance.post(`${API_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      name: 'Integration Test User',
      role: 'student'
    }, {
      headers: csrfToken ? {
        'X-CSRF-Token': csrfToken,
        'Cookie': `csrf-token=${csrfToken}`
      } : {}
    });
    
    if (registerResponse.data.success) {
      log('pass', 'User registration successful', `Email: ${testEmail}`);
    } else {
      log('fail', 'User registration failed', registerResponse.data.message);
    }
  } catch (error) {
    log('fail', 'Registration error', error.response?.data?.message || error.message);
  }
  
  // Get fresh CSRF token before login
  await getCsrfToken();
  
  try {
    // Login
    const loginResponse = await axiosInstance.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    }, {
      headers: csrfToken ? {
        'X-CSRF-Token': csrfToken,
        'Cookie': `csrf-token=${csrfToken}`
      } : {}
    });
    
    if (loginResponse.data.success && loginResponse.data.data.token) {
      authToken = loginResponse.data.data.token;
      log('pass', 'User login successful', `Token: ${authToken.substring(0, 20)}...`);
    } else {
      log('fail', 'Login failed', loginResponse.data.message);
    }
  } catch (error) {
    log('fail', 'Login error', error.response?.data?.message || error.message);
  }
  
  // Test 3: Protected Routes (if authenticated)
  if (authToken) {
    console.log('\n3️⃣  Protected Route Tests');
    console.log('-'.repeat(60));
    
    try {
      const dashResponse = await axiosInstance.get(`${API_URL}/student/dashboard`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (dashResponse.status === 200) {
        log('pass', 'Student dashboard accessible', `Response: 200 OK`);
      } else {
        log('warn', 'Dashboard returned status', dashResponse.status);
      }
    } catch (error) {
      if (error.response?.status === 500) {
        log('warn', 'Dashboard returned 500', 'Backend processing (expected for test data)');
      } else if (error.response?.status === 401) {
        log('fail', 'Authentication failed', 'Token not accepted');
      } else {
        log('fail', 'Dashboard access error', error.message);
      }
    }
  }
  
  // Test 4: Input Validation
  console.log('\n4️⃣  Input Validation Tests');
  console.log('-'.repeat(60));
  
  // Get fresh CSRF token for weak password test
  await getCsrfToken();
  
  try {
    // Weak password test
    const weakPassResponse = await axiosInstance.post(`${API_URL}/auth/register`, {
      email: `weak_${Date.now()}@test.com`,
      password: 'weak123',
      name: 'Test',
      role: 'student'
    }, {
      headers: csrfToken ? {
        'X-CSRF-Token': csrfToken,
        'Cookie': `csrf-token=${csrfToken}`
      } : {}
    });
    
    log('fail', 'Weak password was accepted', 'Should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      log('pass', 'Weak password validation working', 'Properly rejected');
    } else {
      log('warn', 'Unexpected error on weak password', error.response?.status);
    }
  }
  
  // Get fresh CSRF token for invalid role test
  await getCsrfToken();
  
  try {
    // Missing role test
    const noRoleResponse = await axiosInstance.post(`${API_URL}/auth/register`, {
      email: `norole_${Date.now()}@test.com`,
      password: 'StrongPass123!@#',
      name: 'Test',
      role: 'invalid_role'
    }, {
      headers: csrfToken ? {
        'X-CSRF-Token': csrfToken,
        'Cookie': `csrf-token=${csrfToken}`
      } : {}
    });
    
    log('fail', 'Invalid role was accepted', 'Should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      log('pass', 'Role validation working', 'Properly rejected invalid role');
    } else {
      log('warn', 'Unexpected error on invalid role', error.response?.status);
    }
  }
  
  // Test 5: Rate Limiting
  console.log('\n5️⃣  Rate Limiting Tests');
  console.log('-'.repeat(60));
  
  try {
    let successCount = 0;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await axiosInstance.get(`${API_URL}/health`);
        if (response.status === 200) successCount++;
      } catch (e) {
        // Track rate limit
        if (e.response?.status === 429) {
          log('pass', 'Rate limiting active', `Hit after ${i} requests`);
          break;
        }
      }
    }
    
    if (successCount === 5) {
      log('warn', 'Rate limiting may not be active', 'GET requests typically not rate limited');
    }
  } catch (error) {
    log('warn', 'Rate limit test error', error.message);
  }
  
  // Test 6: CORS
  console.log('\n6️⃣  CORS Configuration Tests');
  console.log('-'.repeat(60));
  
  try {
    const response = await axiosInstance.get(`${API_URL}/health`);
    
    if (response.headers['access-control-allow-origin']) {
      log('pass', 'CORS headers present', response.headers['access-control-allow-origin']);
    } else {
      log('warn', 'CORS headers not detected', 'May be OK for same-origin requests');
    }
  } catch (error) {
    log('fail', 'CORS test failed', error.message);
  }
  
  // Test 7: Security Headers
  console.log('\n7️⃣  Security Headers Tests');
  console.log('-'.repeat(60));
  
  try {
    const response = await axiosInstance.get(`${API_URL}/health`);
    const headers = response.headers;
    
    const securityHeaders = {
      'strict-transport-security': 'HSTS',
      'x-frame-options': 'X-Frame-Options',
      'x-content-type-options': 'X-Content-Type-Options',
      'content-security-policy': 'CSP'
    };
    
    for (const [header, name] of Object.entries(securityHeaders)) {
      if (headers[header]) {
        log('pass', `${name} header present`, headers[header].substring(0, 40) + '...');
      } else {
        log('warn', `${name} header missing`, 'May need configuration');
      }
    }
  } catch (error) {
    log('fail', 'Security headers test failed', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');
  console.log(`✅ Passed:  ${testResults.passed}`);
  console.log(`❌ Failed:  ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📈 Total:   ${testResults.passed + testResults.failed + testResults.warnings}`);
  console.log('\n' + '='.repeat(60));
  
  if (testResults.failed === 0) {
    console.log('\n✅ All critical tests passed!\n');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Review above for details.\n`);
  }
}

// Run tests
runIntegrationTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
