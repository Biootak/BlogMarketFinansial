/**
 * Full System Load Test
 * 
 * Comprehensive test simulating real user behavior:
 * - Mixed workload (read/write operations)
 * - Multiple endpoints
 * - Realistic user scenarios
 * - Sustained load over time
 * 
 * Validates: Overall system performance and scalability
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const readOperations = new Counter('read_operations');
const writeOperations = new Counter('write_operations');
const userScenarios = new Counter('user_scenarios');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },    // Warm up
    { duration: '2m', target: 50 },    // Normal load
    { duration: '3m', target: 100 },   // Increased load
    { duration: '2m', target: 150 },   // High load
    { duration: '1m', target: 200 },   // Peak load
    { duration: '2m', target: 100 },   // Cool down
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.02'],  // Less than 2% errors
    'errors': ['rate<0.02'],
    'checks': ['rate>0.95'],           // 95% success rate
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_VERSION = '/api/v1';

// User behavior patterns
const userBehaviors = [
  { name: 'reader', weight: 60, func: readerBehavior },
  { name: 'commenter', weight: 25, func: commenterBehavior },
  { name: 'author', weight: 10, func: authorBehavior },
  { name: 'browser', weight: 5, func: browserBehavior },
];

export function setup() {
  console.log('Starting full system load test...');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${healthRes.status}`);
  }
  console.log('Health check passed');
  
  // Create test user and get token
  const token = loginTestUser();
  
  return { 
    baseUrl: BASE_URL,
    token: token,
  };
}

export default function(data) {
  // Select user behavior based on weights
  const behavior = selectBehavior();
  
  // Execute the behavior
  behavior.func(data);
  
  userScenarios.add(1);
}

function selectBehavior() {
  const totalWeight = userBehaviors.reduce((sum, b) => sum + b.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const behavior of userBehaviors) {
    random -= behavior.weight;
    if (random <= 0) {
      return behavior;
    }
  }
  
  return userBehaviors[0];
}

// Reader: Browses posts, reads content
function readerBehavior(data) {
  group('Reader Behavior', function() {
    // View homepage/post list
    const listRes = makeRequest('GET', '/posts?limit=20', null, null, 'list_posts');
    readOperations.add(1);
    
    if (listRes.status === 200) {
      sleep(1 + Math.random() * 2); // Read for 1-3 seconds
      
      // View a specific post
      makeRequest('GET', '/posts/1', null, null, 'view_post');
      readOperations.add(1);
      
      sleep(2 + Math.random() * 3); // Read post for 2-5 seconds
      
      // View exchange rates
      makeRequest('GET', '/exchange-rates', null, null, 'view_rates');
      readOperations.add(1);
    }
  });
  
  sleep(1);
}

// Commenter: Reads posts and leaves comments
function commenterBehavior(data) {
  group('Commenter Behavior', function() {
    // View post
    const postRes = makeRequest('GET', '/posts/1', null, null, 'view_post');
    readOperations.add(1);
    
    if (postRes.status === 200) {
      sleep(3 + Math.random() * 2); // Read post
      
      // Post a comment (requires auth)
      if (data.token) {
        const commentPayload = {
          content: `Great article! ${Date.now()}`,
          postId: '1',
        };
        makeRequest('POST', '/comments', commentPayload, data.token, 'post_comment');
        writeOperations.add(1);
      }
    }
  });
  
  sleep(2);
}

// Author: Creates and manages content
function authorBehavior(data) {
  group('Author Behavior', function() {
    if (!data.token) {
      return;
    }
    
    // View own posts
    makeRequest('GET', '/posts?author=me', null, data.token, 'my_posts');
    readOperations.add(1);
    
    sleep(1);
    
    // Create a draft post
    const postPayload = {
      title: `Test Post ${Date.now()}`,
      content: 'This is a test post content',
      status: 'DRAFT',
    };
    const createRes = makeRequest('POST', '/posts', postPayload, data.token, 'create_post');
    writeOperations.add(1);
    
    if (createRes.status === 201) {
      sleep(2);
      
      // Update the post
      const postId = extractPostId(createRes);
      if (postId) {
        const updatePayload = {
          title: `Updated Post ${Date.now()}`,
        };
        makeRequest('PUT', `/posts/${postId}`, updatePayload, data.token, 'update_post');
        writeOperations.add(1);
      }
    }
  });
  
  sleep(3);
}

// Browser: Explores different sections
function browserBehavior(data) {
  group('Browser Behavior', function() {
    // View categories
    makeRequest('GET', '/categories', null, null, 'view_categories');
    readOperations.add(1);
    
    sleep(1);
    
    // View tags
    makeRequest('GET', '/tags', null, null, 'view_tags');
    readOperations.add(1);
    
    sleep(1);
    
    // Search posts
    makeRequest('GET', '/posts?search=bitcoin', null, null, 'search_posts');
    readOperations.add(1);
    
    sleep(1);
    
    // View exchange rates
    makeRequest('GET', '/exchange-rates', null, null, 'view_rates');
    readOperations.add(1);
  });
  
  sleep(2);
}

// Helper functions

function makeRequest(method, path, payload, token, name) {
  const url = `${BASE_URL}${API_VERSION}${path}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    tags: { name: name },
  };
  
  if (token) {
    params.headers['Authorization'] = `Bearer ${token}`;
  }
  
  let res;
  if (method === 'GET') {
    res = http.get(url, params);
  } else if (method === 'POST') {
    res = http.post(url, JSON.stringify(payload), params);
  } else if (method === 'PUT') {
    res = http.put(url, JSON.stringify(payload), params);
  } else if (method === 'DELETE') {
    res = http.del(url, null, params);
  }
  
  const success = check(res, {
    [`${name}: status is success`]: (r) => r.status >= 200 && r.status < 300,
    [`${name}: response time acceptable`]: (r) => r.timings.duration < 1000,
  });
  
  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
  
  return res;
}

function loginTestUser() {
  const url = `${BASE_URL}${API_VERSION}/auth/login`;
  const payload = JSON.stringify({
    email: 'test@example.com',
    password: 'TestPassword123!',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.post(url, payload, params);
  
  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      return body.token;
    } catch (e) {
      console.error('Failed to parse login response');
    }
  }
  
  return null;
}

function extractPostId(response) {
  try {
    const body = JSON.parse(response.body);
    return body.id || body.post?.id;
  } catch (e) {
    return null;
  }
}

export function teardown(data) {
  console.log('Full system load test completed');
  console.log(`Total user scenarios: ${userScenarios.count}`);
  console.log(`Read operations: ${readOperations.count}`);
  console.log(`Write operations: ${writeOperations.count}`);
  console.log(`Read/Write ratio: ${(readOperations.count / writeOperations.count).toFixed(2)}`);
  console.log(`Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);
}
