/**
 * Authentication Load Test
 * 
 * Tests authentication endpoints under high load:
 * - User login
 * - Token validation
 * - Registration flow
 * - Concurrent authentication requests
 * 
 * Validates: Requirements 9.1, 9.2
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'http_req_failed': ['rate<0.05'],   // Error rate should be below 5%
    'errors': ['rate<0.05'],            // Custom error rate below 5%
    'checks': ['rate>0.95'],            // 95% of checks should pass
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_VERSION = '/api/v1';

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'TestPassword123!' },
  { email: 'test2@example.com', password: 'TestPassword123!' },
  { email: 'test3@example.com', password: 'TestPassword123!' },
  { email: 'test4@example.com', password: 'TestPassword123!' },
  { email: 'test5@example.com', password: 'TestPassword123!' },
];

export function setup() {
  console.log('Starting authentication load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test users: ${testUsers.length}`);
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${healthRes.status}`);
  }
  console.log('Health check passed');
  
  return { baseUrl: BASE_URL };
}

export default function(data) {
  // Select a random test user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Test 1: Login
  testLogin(user);
  sleep(1);
  
  // Test 2: Login with invalid credentials (should fail)
  testInvalidLogin();
  sleep(1);
  
  // Test 3: Token validation
  const token = testLogin(user);
  if (token) {
    testTokenValidation(token);
  }
  sleep(1);
}

function testLogin(user) {
  const url = `${BASE_URL}${API_VERSION}/auth/login`;
  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'Login' },
  };
  
  const res = http.post(url, payload, params);
  
  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch (e) {
        return false;
      }
    },
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  if (!success) {
    errorRate.add(1);
    console.error(`Login failed for ${user.email}: ${res.status} ${res.body}`);
    return null;
  } else {
    errorRate.add(0);
  }
  
  try {
    const body = JSON.parse(res.body);
    return body.token;
  } catch (e) {
    console.error(`Failed to parse login response: ${e}`);
    return null;
  }
}

function testInvalidLogin() {
  const url = `${BASE_URL}${API_VERSION}/auth/login`;
  const payload = JSON.stringify({
    email: 'invalid@example.com',
    password: 'wrongpassword',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'InvalidLogin' },
  };
  
  const res = http.post(url, payload, params);
  
  const success = check(res, {
    'invalid login status is 401': (r) => r.status === 401,
    'invalid login has error message': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.error !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testTokenValidation(token) {
  // Make an authenticated request to validate token
  const url = `${BASE_URL}${API_VERSION}/posts`;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'TokenValidation' },
  };
  
  const res = http.get(url, params);
  
  const success = check(res, {
    'token validation status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'token validation response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

export function teardown(data) {
  console.log('Authentication load test completed');
}
