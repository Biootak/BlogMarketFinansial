/**
 * Rate Limiting Test
 * 
 * Tests rate limiting behavior:
 * - Verifies rate limits are enforced
 * - Tests 429 responses
 * - Validates Retry-After headers
 * - Tests per-user and per-IP limits
 * 
 * Validates: Requirements 9.1, 9.2
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Custom metrics
const rateLimitHits = new Counter('rate_limit_hits');
const rateLimitCorrect = new Rate('rate_limit_correct');

// Test configuration
export const options = {
  scenarios: {
    // Test global rate limit
    global_rate_limit: {
      executor: 'constant-arrival-rate',
      rate: 150, // 150 requests per second (exceeds 100/min limit)
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 50,
    },
    // Test auth endpoint rate limit
    auth_rate_limit: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 requests per second (exceeds 5/min limit)
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 5,
      maxVUs: 20,
      startTime: '35s', // Start after global test
      exec: 'testAuthRateLimit',
    },
  },
  thresholds: {
    'rate_limit_hits': ['count>0'],        // Should hit rate limits
    'rate_limit_correct': ['rate>0.95'],   // 95% of rate limit responses should be correct
    'http_req_duration': ['p(95)<1000'],   // Even rate limited requests should be fast
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_VERSION = '/api/v1';

export function setup() {
  console.log('Starting rate limiting test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('This test intentionally triggers rate limits');
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${healthRes.status}`);
  }
  console.log('Health check passed');
  
  return { baseUrl: BASE_URL };
}

// Default function tests global rate limit
export default function(data) {
  testGlobalRateLimit();
}

function testGlobalRateLimit() {
  const url = `${BASE_URL}${API_VERSION}/posts`;
  
  const params = {
    headers: {
      'Accept': 'application/json',
    },
    tags: { name: 'GlobalRateLimit' },
  };
  
  const res = http.get(url, params);
  
  if (res.status === 429) {
    rateLimitHits.add(1);
    
    const correct = check(res, {
      'rate limit status is 429': (r) => r.status === 429,
      'rate limit has Retry-After header': (r) => r.headers['Retry-After'] !== undefined,
      'rate limit has error message': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.error !== undefined;
        } catch (e) {
          return false;
        }
      },
      'rate limit response is fast': (r) => r.timings.duration < 100,
    });
    
    rateLimitCorrect.add(correct ? 1 : 0);
    
    if (correct) {
      console.log(`Rate limit hit correctly: Retry-After=${res.headers['Retry-After']}`);
    }
  } else {
    check(res, {
      'non-rate-limited status is 200': (r) => r.status === 200,
    });
  }
}

// Test authentication endpoint rate limit
export function testAuthRateLimit(data) {
  const url = `${BASE_URL}${API_VERSION}/auth/login`;
  const payload = JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'AuthRateLimit' },
  };
  
  const res = http.post(url, payload, params);
  
  if (res.status === 429) {
    rateLimitHits.add(1);
    
    const correct = check(res, {
      'auth rate limit status is 429': (r) => r.status === 429,
      'auth rate limit has Retry-After': (r) => r.headers['Retry-After'] !== undefined,
      'auth rate limit error message': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.error !== undefined && 
                 body.error.code === 'RATE_LIMIT_EXCEEDED';
        } catch (e) {
          return false;
        }
      },
    });
    
    rateLimitCorrect.add(correct ? 1 : 0);
    
    // Respect Retry-After header
    const retryAfter = parseInt(res.headers['Retry-After'] || '1');
    if (retryAfter > 0 && retryAfter < 60) {
      sleep(retryAfter);
    }
  } else {
    check(res, {
      'non-rate-limited auth response': (r) => r.status === 200 || r.status === 401,
    });
  }
}

export function teardown(data) {
  console.log('Rate limiting test completed');
  console.log(`Total rate limit hits: ${rateLimitHits.count}`);
  console.log(`Rate limit correctness: ${rateLimitCorrect.rate * 100}%`);
  
  if (rateLimitHits.count === 0) {
    console.warn('WARNING: No rate limits were hit. Rate limiting may not be working!');
  }
}
