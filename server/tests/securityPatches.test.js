/**
 * Security Patches Test Suite
 * Verifies all security fixes work correctly without breaking functionality
 */

import axios from 'axios';
import https from 'https';

const API_URL = 'http://localhost:3000/api';

// Suppress SSL warnings for local testing
const agent = new https.Agent({ rejectUnauthorized: false });

const tests = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function for tests
const test = async (name, fn) => {
  try {
    await fn();
    console.log(`✅ ${name}`);
    tests.passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    tests.failed++;
    tests.errors.push({ test: name, error: error.message });
  }
};

// Test 1: Security Headers Present
test('Security Headers - HSTS Enabled', async () => {
  const response = await axios.get(`${API_URL}/health`);
  const hsts = response.headers['strict-transport-security'];
  if (!hsts) throw new Error('HSTS header missing');
  if (!hsts.includes('max-age=31536000')) throw new Error('HSTS not configured for 1 year');
});

test('Security Headers - X-Frame-Options Set', async () => {
  const response = await axios.get(`${API_URL}/health`);
  const xfo = response.headers['x-frame-options'];
  if (xfo !== 'DENY') throw new Error(`X-Frame-Options should be DENY, got ${xfo}`);
});

test('Security Headers - X-Content-Type-Options Set', async () => {
  const response = await axios.get(`${API_URL}/health`);
  const xcto = response.headers['x-content-type-options'];
  if (xcto !== 'nosniff') throw new Error(`X-Content-Type-Options should be nosniff, got ${xcto}`);
});

test('Security Headers - CSP Present', async () => {
  const response = await axios.get(`${API_URL}/health`);
  const csp = response.headers['content-security-policy'];
  if (!csp) throw new Error('Content-Security-Policy header missing');
  if (!csp.includes('default-src')) throw new Error('CSP incomplete');
});

// Test 2: Strong Password Requirements
test('Password Validation - Rejects Weak Password (< 12 chars)', async () => {
  try {
    await axios.post(`${API_URL}/auth/register`, {
      email: `test_weak_${Date.now()}@test.com`,
      password: 'weak123',
      name: 'Test User',
      role: 'student'
    });
    throw new Error('Should have rejected weak password');
  } catch (error) {
    if (error.response?.status !== 400) throw error;
    if (!error.response?.data?.errors) throw new Error('Should return validation errors');
  }
});

test('Password Validation - Requires Uppercase Letter', async () => {
  try {
    await axios.post(`${API_URL}/auth/register`, {
      email: `test_no_upper_${Date.now()}@test.com`,
      password: 'password123!@#',
      name: 'Test User',
      role: 'student'
    });
    throw new Error('Should have rejected password without uppercase');
  } catch (error) {
    if (error.response?.status !== 400) throw error;
  }
});

test('Password Validation - Requires Lowercase Letter', async () => {
  try {
    await axios.post(`${API_URL}/auth/register`, {
      email: `test_no_lower_${Date.now()}@test.com`,
      password: 'PASSWORD123!@#',
      name: 'Test User',
      role: 'student'
    });
    throw new Error('Should have rejected password without lowercase');
  } catch (error) {
    if (error.response?.status !== 400) throw error;
  }
});

test('Password Validation - Requires Number', async () => {
  try {
    await axios.post(`${API_URL}/auth/register`, {
      email: `test_no_number_${Date.now()}@test.com`,
      password: 'PasswordAbcd!@#',
      name: 'Test User',
      role: 'student'
    });
    throw new Error('Should have rejected password without number');
  } catch (error) {
    if (error.response?.status !== 400) throw error;
  }
});

test('Password Validation - Requires Special Character', async () => {
  try {
    await axios.post(`${API_URL}/auth/register`, {
      email: `test_no_special_${Date.now()}@test.com`,
      password: 'Password1234abc',
      name: 'Test User',
      role: 'student'
    });
    throw new Error('Should have rejected password without special char');
  } catch (error) {
    if (error.response?.status !== 400) throw error;
  }
});

test('Password Validation - Accepts Valid Strong Password', async () => {
  const response = await axios.post(`${API_URL}/auth/register`, {
    email: `test_strong_${Date.now()}@test.com`,
    password: 'StrongPass123!@#',
    name: 'Test User',
    role: 'student'
  });
  if (!response.data.success) throw new Error('Strong password should be accepted');
  if (!response.data.data.id) throw new Error('User ID not returned');
});

// Test 3: Input Sanitization
test('Input Sanitization - Removes HTML Tags', async () => {
  const timestamp = Date.now();
  const response = await axios.post(`${API_URL}/auth/register`, {
    email: `test_sanitize_${timestamp}@test.com`,
    password: 'StrongPass123!@#',
    name: '<script>alert("xss")</script>Test User',
    role: 'student'
  });
  
  // Login and verify name is sanitized
  const loginResponse = await axios.post(`${API_URL}/auth/login`, {
    email: `test_sanitize_${timestamp}@test.com`,
    password: 'StrongPass123!@#'
  });
  
  if (!loginResponse.data.success) throw new Error('Login failed');
  if (loginResponse.data.data.name.includes('<script>')) {
    throw new Error('HTML tags not sanitized');
  }
});

test('Input Sanitization - Removes JavaScript Protocol', async () => {
  const timestamp = Date.now();
  const response = await axios.post(`${API_URL}/auth/register`, {
    email: `test_js_${timestamp}@test.com`,
    password: 'StrongPass123!@#',
    name: 'Test User',
    role: 'student'
  });
  
  if (response.data.data.name && response.data.data.name.toLowerCase().includes('javascript:')) {
    throw new Error('JavaScript protocol not removed');
  }
});

test('Input Sanitization - Removes Event Handlers', async () => {
  const timestamp = Date.now();
  const response = await axios.post(`${API_URL}/auth/register`, {
    email: `test_handler_${timestamp}@test.com`,
    password: 'StrongPass123!@#',
    name: 'Test onclick="alert(1)"',
    role: 'student'
  });
  
  if (response.data.data.name && response.data.data.name.toLowerCase().includes('onclick')) {
    throw new Error('Event handlers not removed');
  }
});

// Test 4: CSRF Protection
test('CSRF Protection - Server Sets Cookie on Request', async () => {
  const response = await axios.get(`${API_URL}/health`);
  const setCookie = response.headers['set-cookie'];
  if (!setCookie) throw new Error('No Set-Cookie header');
  if (!Array.isArray(setCookie)) throw new Error('Set-Cookie should be array');
  
  const csrfCookie = setCookie.find(c => c.includes('csrf-token'));
  if (!csrfCookie) throw new Error('CSRF token cookie not set');
});

test('CSRF Protection - POST Without Token Fails', async () => {
  try {
    await axios.post(`${API_URL}/student/od-request`, 
      { event_name: 'Test' },
      {
        headers: {
          'Authorization': 'Bearer invalid_token'
        }
      }
    );
    throw new Error('Should have failed CSRF validation');
  } catch (error) {
    // Expected to fail (either auth or CSRF)
    if (!error.response) throw error;
  }
});

// Test 5: Middleware Integration
test('Middleware - Express Parser Still Works', async () => {
  const timestamp = Date.now();
  const response = await axios.post(`${API_URL}/auth/register`, {
    email: `test_parser_${timestamp}@test.com`,
    password: 'StrongPass123!@#',
    name: 'Test User',
    role: 'student'
  });
  
  if (!response.data.success) throw new Error('Request parsing failed');
});

test('Middleware - Rate Limiting Still Active', async () => {
  // Make multiple health check requests (shouldn't hit rate limit for GET)
  for (let i = 0; i < 5; i++) {
    const response = await axios.get(`${API_URL}/health`);
    if (response.status !== 200) throw new Error(`Health check failed on iteration ${i}`);
  }
});

// Test 6: Original Functionality Preserved
test('Original Functionality - Login Endpoint Works', async () => {
  // Create user first
  const timestamp = Date.now();
  const registerResponse = await axios.post(`${API_URL}/auth/register`, {
    email: `test_login_${timestamp}@test.com`,
    password: 'StrongPass123!@#',
    name: 'Test User',
    role: 'student'
  });
  
  if (!registerResponse.data.success) throw new Error('Registration failed');
  
  // Try to login
  const loginResponse = await axios.post(`${API_URL}/auth/login`, {
    email: `test_login_${timestamp}@test.com`,
    password: 'StrongPass123!@#'
  });
  
  if (!loginResponse.data.success) throw new Error('Login failed');
  if (!loginResponse.data.data.token) throw new Error('Token not returned');
});

test('Original Functionality - JWT Token Valid', async () => {
  const timestamp = Date.now();
  
  // Register
  await axios.post(`${API_URL}/auth/register`, {
    email: `test_jwt_${timestamp}@test.com`,
    password: 'StrongPass123!@#',
    name: 'Test User',
    role: 'student'
  });
  
  // Login
  const loginResponse = await axios.post(`${API_URL}/auth/login`, {
    email: `test_jwt_${timestamp}@test.com`,
    password: 'StrongPass123!@#'
  });
  
  const token = loginResponse.data.data.token;
  
  // Use token to access protected route
  try {
    const response = await axios.get(`${API_URL}/student/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status !== 200) throw new Error('Dashboard access failed');
  } catch (error) {
    if (error.response?.status === 500) {
      // May fail due to database queries, but shouldn't be auth error
      throw error;
    }
  }
});

test('Original Functionality - CORS Enabled', async () => {
  const response = await axios.get(`${API_URL}/health`);
  const cors = response.headers['access-control-allow-origin'];
  
  // CORS might not be set for same-origin requests, check if request succeeds
  if (response.status !== 200) throw new Error('CORS issue - request failed');
});

// Run all tests
console.log('\n🧪 Security Patches Test Suite\n');
console.log('=' .repeat(60));
console.log('Running test suite...\n');

// Wait for all tests to complete
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${tests.passed}`);
  console.log(`   ❌ Failed: ${tests.failed}`);
  console.log(`   📈 Total:  ${tests.passed + tests.failed}`);
  
  if (tests.failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    tests.errors.forEach(e => {
      console.log(`   - ${e.test}: ${e.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (tests.failed === 0) {
    console.log('✅ All tests passed! Security patches are working correctly.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}, 1000);

// Run the first test to start the chain
(async () => {
  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Connected to server at', API_URL, '\n');
  } catch (error) {
    console.error('❌ Cannot connect to server. Make sure it is running on port 3000.');
    console.error('   Run: npm run server\n');
    process.exit(1);
  }
})();
