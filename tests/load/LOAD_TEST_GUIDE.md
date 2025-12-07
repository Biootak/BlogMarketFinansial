# Load Testing Guide

## Overview

This guide explains how to run, interpret, and act on load testing results for the Biotak Go Backend.

## Quick Start

### Prerequisites

1. **Install k6:**
   ```bash
   # Windows (Chocolatey)
   choco install k6
   
   # Windows (Scoop)
   scoop install k6
   ```

2. **Start the Go backend:**
   ```bash
   make run
   ```

3. **Run load tests:**
   ```bash
   # Run all tests
   make load-test
   
   # Or run individual tests
   make load-test-auth
   make load-test-posts
   make load-test-rate-limit
   make load-test-cache
   make load-test-full
   ```

## Understanding k6 Metrics

### Key Metrics

#### 1. http_req_duration
Response time for HTTP requests.

**Percentiles:**
- `p(50)` - Median: 50% of requests are faster than this
- `p(90)` - 90th percentile: 90% of requests are faster than this
- `p(95)` - 95th percentile: 95% of requests are faster than this
- `p(99)` - 99th percentile: 99% of requests are faster than this

**Good values:**
- p(95) < 300ms: Excellent
- p(95) < 500ms: Good
- p(95) < 1000ms: Acceptable
- p(95) > 1000ms: Needs optimization

#### 2. http_req_failed
Percentage of failed HTTP requests.

**Good values:**
- < 0.1%: Excellent
- < 1%: Good
- < 5%: Acceptable
- > 5%: Needs investigation

#### 3. http_reqs
Total number of HTTP requests and throughput (requests per second).

**Interpretation:**
- Higher is better
- Compare with baseline to measure improvement
- Should scale linearly with VUs (virtual users)

#### 4. checks
Percentage of successful validation checks.

**Good values:**
- > 99%: Excellent
- > 95%: Good
- > 90%: Acceptable
- < 90%: Needs investigation

#### 5. iterations
Number of complete test iterations.

**Interpretation:**
- Shows how many times the test scenario completed
- Higher is better
- Should be consistent across runs

### Custom Metrics

#### cache_hits
Percentage of requests served from cache.

**Good values:**
- > 80%: Excellent
- > 60%: Good
- > 40%: Acceptable
- < 40%: Cache may not be working properly

#### rate_limit_hits
Number of times rate limits were triggered.

**Interpretation:**
- Should be > 0 in rate limit tests
- If 0, rate limiting may not be working
- In normal tests, should be 0 or very low

## Test Scenarios Explained

### 1. Authentication Load Test (`auth-load.js`)

**Purpose:** Tests authentication system under load.

**What it tests:**
- User login with valid credentials
- Login with invalid credentials (should fail)
- Token validation
- Concurrent authentication requests

**Success criteria:**
- p(95) response time < 500ms
- Error rate < 5%
- 95% of checks pass

**Common issues:**
- High response times: Database connection pool too small
- High error rates: JWT secret mismatch or database issues
- Token validation failures: JWT configuration issues

### 2. Post Listing Load Test (`post-listing-load.js`)

**Purpose:** Tests post listing with various filters and pagination.

**What it tests:**
- Basic post listing
- Pagination
- Filtering by status, category
- Search functionality
- Cache effectiveness

**Success criteria:**
- p(95) response time < 300ms
- Error rate < 1%
- Cache hit rate > 80%
- 98% of checks pass

**Common issues:**
- Slow queries: Missing database indexes
- Low cache hit rate: Cache not configured or TTL too short
- High error rates: Database connection issues

### 3. Rate Limiting Test (`rate-limit-test.js`)

**Purpose:** Verifies rate limiting is working correctly.

**What it tests:**
- Global rate limit (100 req/min)
- Auth endpoint rate limit (5 req/min)
- 429 response codes
- Retry-After headers

**Success criteria:**
- Rate limits are hit (rate_limit_hits > 0)
- 429 responses have Retry-After headers
- Rate limit responses are fast (< 100ms)

**Common issues:**
- No rate limits hit: Rate limiting not configured
- Missing Retry-After headers: Middleware not setting headers
- Slow rate limit responses: Rate limiter implementation issue

### 4. Cache Performance Test (`cache-performance.js`)

**Purpose:** Tests Redis cache performance and effectiveness.

**What it tests:**
- Cache hit rates
- Cache miss handling
- Response time difference between hits and misses
- Multiple cached endpoints

**Success criteria:**
- Cache hit rate > 80%
- Cache hit response time < 50ms
- Cache miss response time < 200ms

**Common issues:**
- Low cache hit rate: Cache not working or TTL too short
- Slow cache hits: Redis connection issues
- No cache headers: Middleware not setting cache headers

### 5. Full System Load Test (`full-system-load.js`)

**Purpose:** Comprehensive test simulating real user behavior.

**What it tests:**
- Mixed read/write operations
- Multiple user behaviors (reader, commenter, author, browser)
- Sustained load over time
- Overall system performance

**Success criteria:**
- p(95) response time < 500ms
- p(99) response time < 1000ms
- Error rate < 2%
- 95% of checks pass

**Common issues:**
- Degrading performance over time: Memory leak or connection leak
- High error rates: Resource exhaustion (CPU, memory, connections)
- Uneven response times: Database query performance issues

## Interpreting Results

### Example Output

```
✓ status is 200
✓ response time < 500ms

checks.........................: 100.00% ✓ 5000      ✗ 0
data_received..................: 2.5 MB  42 kB/s
data_sent......................: 1.2 MB  20 kB/s
http_req_duration..............: avg=120ms    min=50ms    med=100ms   max=500ms   p(90)=200ms   p(95)=300ms
http_req_failed................: 0.00%   ✓ 0         ✗ 5000
http_reqs......................: 5000    83.33/s
iterations.....................: 5000    83.33/s
vus............................: 100     min=100     max=100
```

### What to look for:

1. **All checks passing (✓)**: Good sign
2. **http_req_duration p(95)**: Should meet threshold
3. **http_req_failed**: Should be 0% or very low
4. **http_reqs**: Throughput - higher is better
5. **No threshold violations**: All thresholds should pass

### Red Flags

🚩 **High error rate (> 5%)**
- Check server logs for errors
- Verify database connectivity
- Check resource usage (CPU, memory)

🚩 **Slow response times (p(95) > 1000ms)**
- Check database query performance
- Verify cache is working
- Check for N+1 query problems
- Review connection pool settings

🚩 **Threshold violations**
- Test failed to meet performance requirements
- Investigate specific failing thresholds
- Compare with baseline

🚩 **Degrading performance over time**
- Possible memory leak
- Connection pool exhaustion
- Cache not expiring properly

## Comparing with Next.js Baseline

### Run Comparison

```bash
# Using PowerShell script
powershell -ExecutionPolicy Bypass -File tests/load/compare-baseline.ps1

# Or manually
# 1. Test Next.js
$env:BASE_URL="http://localhost:3000"
k6 run tests/load/auth-load.js > nextjs-results.txt

# 2. Test Go
$env:BASE_URL="http://localhost:8080"
k6 run tests/load/auth-load.js > go-results.txt

# 3. Compare
diff nextjs-results.txt go-results.txt
```

### Expected Improvements

Based on Go's performance characteristics:

- **Response Time**: 30-50% faster
- **Throughput**: 2-5x higher
- **Memory Usage**: 50-70% lower
- **CPU Usage**: 30-50% lower
- **Error Rate**: Similar or better

### Example Comparison

```
Metric                    Next.js         Go Backend      Improvement
------------------------------------------------------------------------
P95 Response Time         450ms           180ms           60%
Error Rate                0.5%            0.1%            80%
Throughput (req/s)        120             380             217%
Checks Pass Rate          98%             99.5%           1.5%
```

## Troubleshooting

### Test Fails to Start

**Error:** "k6 is not installed"
**Solution:** Install k6 using chocolatey or scoop

**Error:** "Server is not responding"
**Solution:** Start the Go backend with `make run`

### High Error Rates

**Possible causes:**
1. Database connection pool exhausted
2. Redis connection issues
3. Rate limiting too aggressive
4. Application errors

**Debug steps:**
1. Check server logs: `docker-compose logs -f go-backend`
2. Check database connections: `SELECT count(*) FROM pg_stat_activity;`
3. Check Redis: `redis-cli INFO stats`
4. Review error responses in k6 output

### Slow Response Times

**Possible causes:**
1. Missing database indexes
2. N+1 query problems
3. Cache not working
4. Slow external API calls

**Debug steps:**
1. Enable slow query logging
2. Check database query performance
3. Verify cache hit rates
4. Profile the application

### Inconsistent Results

**Possible causes:**
1. Background processes interfering
2. Network issues
3. Database not warmed up
4. Cache state varies

**Solutions:**
1. Run tests multiple times
2. Use dedicated test environment
3. Warm up database before tests
4. Clear cache between runs

## Best Practices

### 1. Run Tests Regularly

- Run smoke tests on every commit
- Run full load tests before releases
- Compare with baseline regularly

### 2. Monitor During Tests

- Watch server logs
- Monitor resource usage (CPU, memory, disk)
- Check database connections
- Monitor Redis memory

### 3. Gradual Load Increase

- Start with smoke tests (low load)
- Gradually increase to stress tests
- Don't jump directly to peak load

### 4. Realistic Scenarios

- Model tests after actual user behavior
- Use realistic data volumes
- Include think time (sleep) between requests

### 5. Document Baselines

- Record baseline metrics
- Track improvements over time
- Set performance budgets

## Performance Budgets

Set and enforce performance budgets:

```javascript
export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<300'],  // 95% under 300ms
    'http_req_failed': ['rate<0.01'],    // Less than 1% errors
    'http_reqs': ['rate>100'],           // At least 100 req/s
  },
};
```

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/load-test.yml
name: Load Tests

on:
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Wait for services
        run: sleep 30
      
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run smoke tests
        run: make load-test-smoke
      
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: load-test-results
          path: tests/load/results/
```

## Requirements Validation

These load tests validate:

- ✅ **Requirement 9.1**: Rate limiting based on IP and user identity
- ✅ **Requirement 9.2**: HTTP 429 responses when limits exceeded
- ✅ **Performance**: Response times under load
- ✅ **Scalability**: System behavior with high concurrency
- ✅ **Cache Effectiveness**: Redis cache performance (Req 5.2, 5.3)

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/)
- [Grafana k6 Cloud](https://k6.io/cloud/) - For advanced analytics
