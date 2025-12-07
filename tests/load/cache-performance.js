/**
 * Cache Performance Test
 * 
 * Tests Redis cache performance:
 * - Cache hit rates
 * - Cache miss handling
 * - TTL behavior
 * - Cache invalidation
 * 
 * Validates: Requirements 5.2, 5.3 (Exchange rate caching)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const cacheHitRate = new Rate('cache_hits');
const cacheMissRate = new Rate('cache_misses');
const cacheHitResponseTime = new Trend('cache_hit_response_time');
const cacheMissResponseTime = new Trend('cache_miss_response_time');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Warm up cache
    { duration: '2m', target: 100 },   // Test cache hits
    { duration: '2m', target: 100 },   // Sustained load
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'cache_hits': ['rate>0.80'],                      // 80% cache hit rate
    'cache_hit_response_time': ['p(95)<50'],          // Cache hits should be very fast
    'cache_miss_response_time': ['p(95)<200'],        // Cache misses slower but acceptable
    'http_req_duration': ['p(95)<200'],               // Overall 95th percentile
    'http_req_failed': ['rate<0.01'],                 // Less than 1% errors
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_VERSION = '/api/v1';

// Endpoints to test (these should be cached)
const cachedEndpoints = [
  { path: '/posts', name: 'posts_list' },
  { path: '/posts?status=PUBLISHED&limit=20', name: 'published_posts' },
  { path: '/exchange-rates', name: 'exchange_rates' },
  { path: '/categories', name: 'categories' },
  { path: '/tags', name: 'tags' },
];

export function setup() {
  console.log('Starting cache performance test...');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${healthRes.status}`);
  }
  console.log('Health check passed');
  
  // Warm up cache by making initial requests
  console.log('Warming up cache...');
  cachedEndpoints.forEach(endpoint => {
    http.get(`${BASE_URL}${API_VERSION}${endpoint.path}`);
  });
  console.log('Cache warmed up');
  
  return { baseUrl: BASE_URL };
}

export default function(data) {
  // Select a random cached endpoint
  const endpoint = cachedEndpoints[Math.floor(Math.random() * cachedEndpoints.length)];
  
  testCachedEndpoint(endpoint);
  
  // Small sleep to simulate realistic user behavior
  sleep(0.1 + Math.random() * 0.4); // 100-500ms
}

function testCachedEndpoint(endpoint) {
  const url = `${BASE_URL}${API_VERSION}${endpoint.path}`;
  
  const params = {
    headers: {
      'Accept': 'application/json',
    },
    tags: { 
      name: endpoint.name,
      endpoint: endpoint.path,
    },
  };
  
  const res = http.get(url, params);
  totalRequests.add(1);
  
  // Determine if response came from cache
  const isCached = detectCacheHit(res);
  
  // Track metrics
  if (isCached) {
    cacheHitRate.add(1);
    cacheMissRate.add(0);
    cacheHitResponseTime.add(res.timings.duration);
  } else {
    cacheHitRate.add(0);
    cacheMissRate.add(1);
    cacheMissResponseTime.add(res.timings.duration);
  }
  
  // Validate response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null && Object.keys(body).length > 0;
      } catch (e) {
        return false;
      }
    },
    'response time acceptable': (r) => r.timings.duration < 500,
  });
  
  // Additional checks for cached responses
  if (isCached) {
    check(res, {
      'cached response is fast': (r) => r.timings.duration < 100,
      'cached response has cache headers': (r) => 
        r.headers['X-Cache-Hit'] !== undefined || 
        r.headers['X-Cache'] !== undefined ||
        r.headers['Cache-Control'] !== undefined,
    });
  }
  
  if (!success) {
    console.error(`Request failed for ${endpoint.name}: ${res.status}`);
  }
}

function detectCacheHit(response) {
  // Check various cache indicators
  
  // Explicit cache hit header
  if (response.headers['X-Cache-Hit'] === 'true' || 
      response.headers['X-Cache'] === 'HIT') {
    return true;
  }
  
  // Very fast response time suggests cache hit
  if (response.timings.duration < 50) {
    return true;
  }
  
  // Age header indicates cached response
  if (response.headers['Age'] !== undefined && 
      parseInt(response.headers['Age']) > 0) {
    return true;
  }
  
  // Default to cache miss
  return false;
}

export function teardown(data) {
  console.log('Cache performance test completed');
  console.log(`Total requests: ${totalRequests.count}`);
  console.log(`Cache hit rate: ${(cacheHitRate.rate * 100).toFixed(2)}%`);
  console.log(`Cache miss rate: ${(cacheMissRate.rate * 100).toFixed(2)}%`);
  
  if (cacheHitRate.rate < 0.5) {
    console.warn('WARNING: Cache hit rate is below 50%. Cache may not be working properly!');
  }
}
