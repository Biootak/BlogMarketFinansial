/**
 * Post Listing Load Test
 * 
 * Tests post listing endpoints with high concurrency:
 * - Paginated post queries
 * - Filtering by category/tag
 * - Sorting and search
 * - Cache performance
 * 
 * Validates: Requirements 9.1, 9.2
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 200 },   // Spike to 200 users
    { duration: '2m', target: 200 },   // Stay at 200 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<500'], // 95% < 300ms, 99% < 500ms
    'http_req_failed': ['rate<0.01'],                 // Error rate < 1%
    'errors': ['rate<0.01'],
    'checks': ['rate>0.98'],                          // 98% success rate
    'cache_hits': ['rate>0.80'],                      // 80% cache hit rate
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_VERSION = '/api/v1';

// Test scenarios
const scenarios = [
  { name: 'list_all', path: '/posts', weight: 40 },
  { name: 'list_paginated', path: '/posts?page=1&limit=20', weight: 30 },
  { name: 'filter_by_status', path: '/posts?status=PUBLISHED', weight: 15 },
  { name: 'filter_by_category', path: '/posts?category=technology', weight: 10 },
  { name: 'search', path: '/posts?search=bitcoin', weight: 5 },
];

export function setup() {
  console.log('Starting post listing load test...');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${healthRes.status}`);
  }
  console.log('Health check passed');
  
  return { baseUrl: BASE_URL };
}

export default function(data) {
  // Select a random scenario based on weights
  const scenario = selectScenario();
  
  // Execute the scenario
  testPostListing(scenario);
  
  // Random sleep between 0.5 and 2 seconds
  sleep(Math.random() * 1.5 + 0.5);
}

function selectScenario() {
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const scenario of scenarios) {
    random -= scenario.weight;
    if (random <= 0) {
      return scenario;
    }
  }
  
  return scenarios[0];
}

function testPostListing(scenario) {
  const url = `${BASE_URL}${API_VERSION}${scenario.path}`;
  
  const params = {
    headers: {
      'Accept': 'application/json',
    },
    tags: { name: scenario.name },
  };
  
  const res = http.get(url, params);
  
  // Track response time
  responseTime.add(res.timings.duration);
  
  // Check for cache headers
  const isCached = res.headers['X-Cache-Hit'] === 'true' || 
                   res.headers['X-Cache'] === 'HIT';
  cacheHitRate.add(isCached ? 1 : 0);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has posts': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.posts) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
    'response time < 300ms': (r) => r.timings.duration < 300,
    'response has pagination': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.pagination !== undefined || body.meta !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    errorRate.add(1);
    console.error(`Post listing failed for ${scenario.name}: ${res.status}`);
  } else {
    errorRate.add(0);
  }
  
  // Additional checks for specific scenarios
  if (scenario.name === 'filter_by_status') {
    check(res, {
      'filtered posts have correct status': (r) => {
        try {
          const body = JSON.parse(r.body);
          const posts = body.posts || body.data || [];
          return posts.every(post => post.status === 'PUBLISHED');
        } catch (e) {
          return false;
        }
      },
    });
  }
}

export function teardown(data) {
  console.log('Post listing load test completed');
  console.log(`Cache hit rate: ${cacheHitRate.rate * 100}%`);
}
