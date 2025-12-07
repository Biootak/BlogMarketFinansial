# Load Testing with k6

This directory contains load testing scripts for the Biotak Go Backend using [k6](https://k6.io/).

## Prerequisites

### Install k6

**Windows (using Chocolatey):**
```bash
choco install k6
```

**Windows (using Scoop):**
```bash
scoop install k6
```

**Windows (Manual):**
Download from https://github.com/grafana/k6/releases

**Linux/macOS:**
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Test Scenarios

### 1. Authentication Load Test (`auth-load.js`)
Tests authentication endpoints under high load:
- User login
- Token validation
- Registration flow
- Concurrent authentication requests

**Run:**
```bash
k6 run tests/load/auth-load.js
```

### 2. Post Listing Load Test (`post-listing-load.js`)
Tests post listing with high concurrency:
- Paginated post queries
- Filtering by category/tag
- Sorting and search
- Cache performance

**Run:**
```bash
k6 run tests/load/post-listing-load.js
```

### 3. Rate Limiting Test (`rate-limit-test.js`)
Tests rate limiting behavior:
- Verifies rate limits are enforced
- Tests 429 responses
- Validates Retry-After headers
- Tests per-user and per-IP limits

**Run:**
```bash
k6 run tests/load/rate-limit-test.js
```

### 4. Cache Performance Test (`cache-performance.js`)
Tests Redis cache performance:
- Cache hit rates
- Cache miss handling
- TTL behavior
- Cache invalidation

**Run:**
```bash
k6 run tests/load/cache-performance.js
```

### 5. Full System Load Test (`full-system-load.js`)
Comprehensive test simulating real user behavior:
- Mixed workload (read/write operations)
- Multiple endpoints
- Realistic user scenarios
- Sustained load over time

**Run:**
```bash
k6 run tests/load/full-system-load.js
```

## Load Test Profiles

Each test can be run with different load profiles:

### Smoke Test (Quick validation)
```bash
k6 run --vus 1 --duration 30s tests/load/auth-load.js
```

### Load Test (Normal traffic)
```bash
k6 run --vus 50 --duration 5m tests/load/auth-load.js
```

### Stress Test (High traffic)
```bash
k6 run --vus 200 --duration 10m tests/load/auth-load.js
```

### Spike Test (Sudden traffic spike)
```bash
k6 run --stage 0s:0 --stage 10s:500 --stage 1m:500 --stage 10s:0 tests/load/auth-load.js
```

### Soak Test (Extended duration)
```bash
k6 run --vus 100 --duration 1h tests/load/auth-load.js
```

## Configuration

Tests use environment variables for configuration:

```bash
# Set base URL (default: http://localhost:8080)
export BASE_URL=http://localhost:8080

# Set test user credentials
export TEST_EMAIL=test@example.com
export TEST_PASSWORD=testpassword123

# Run test
k6 run tests/load/auth-load.js
```

## Metrics and Thresholds

Each test defines thresholds for key metrics:

- **http_req_duration**: 95% of requests should complete within acceptable time
- **http_req_failed**: Error rate should be below threshold
- **http_reqs**: Minimum throughput requirements
- **checks**: Success rate for validation checks

Example output:
```
     ✓ status is 200
     ✓ response time < 500ms
     
     checks.........................: 100.00% ✓ 5000      ✗ 0
     data_received..................: 2.5 MB  42 kB/s
     data_sent......................: 1.2 MB  20 kB/s
     http_req_blocked...............: avg=1.2ms    min=0s      med=0s      max=50ms    p(90)=2ms     p(95)=5ms
     http_req_connecting............: avg=800µs    min=0s      med=0s      max=30ms    p(90)=1ms     p(95)=2ms
     http_req_duration..............: avg=120ms    min=50ms    med=100ms   max=500ms   p(90)=200ms   p(95)=300ms
     http_req_failed................: 0.00%   ✓ 0         ✗ 5000
     http_req_receiving.............: avg=500µs    min=100µs   med=400µs   max=5ms     p(90)=800µs   p(95)=1ms
     http_req_sending...............: avg=200µs    min=50µs    med=150µs   max=2ms     p(90)=300µs   p(95)=500µs
     http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s      p(90)=0s      p(95)=0s
     http_req_waiting...............: avg=119ms    min=49ms    med=99ms    max=499ms   p(90)=199ms   p(95)=299ms
     http_reqs......................: 5000    83.33/s
     iteration_duration.............: avg=1.2s     min=1s      med=1.1s    max=1.5s    p(90)=1.3s    p(95)=1.4s
     iterations.....................: 5000    83.33/s
     vus............................: 100     min=100     max=100
     vus_max........................: 100     min=100     max=100
```

## Comparing with Next.js Baseline

To compare Go backend performance with Next.js:

1. **Run Next.js baseline test:**
```bash
export BASE_URL=http://localhost:3000
k6 run tests/load/auth-load.js > nextjs-baseline.txt
```

2. **Run Go backend test:**
```bash
export BASE_URL=http://localhost:8080
k6 run tests/load/auth-load.js > go-backend.txt
```

3. **Compare results:**
```bash
# Compare response times, throughput, error rates
diff nextjs-baseline.txt go-backend.txt
```

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run Load Tests
  run: |
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    sleep 10
    
    # Run smoke tests
    k6 run --vus 10 --duration 1m tests/load/full-system-load.js
    
    # Check exit code
    if [ $? -ne 0 ]; then
      echo "Load tests failed"
      exit 1
    fi
```

## Troubleshooting

### Connection Refused
- Ensure the Go backend is running: `make run`
- Check the BASE_URL is correct
- Verify firewall settings

### High Error Rates
- Check server logs for errors
- Verify database connections
- Check Redis connectivity
- Review rate limiting configuration

### Slow Response Times
- Check database query performance
- Verify cache is working
- Review connection pool settings
- Check for resource constraints (CPU, memory)

## Best Practices

1. **Start Small**: Begin with smoke tests before running full load tests
2. **Monitor Resources**: Watch CPU, memory, and database connections during tests
3. **Gradual Ramp-Up**: Use stages to gradually increase load
4. **Realistic Scenarios**: Model tests after actual user behavior
5. **Regular Testing**: Run load tests regularly to catch performance regressions
6. **Baseline Comparison**: Always compare against baseline metrics

## Requirements Validation

These load tests validate:
- **Requirement 9.1**: Rate limiting based on IP and user identity
- **Requirement 9.2**: HTTP 429 responses when limits exceeded
- **Performance**: Response times under load
- **Scalability**: System behavior with high concurrency
- **Cache Effectiveness**: Redis cache performance
