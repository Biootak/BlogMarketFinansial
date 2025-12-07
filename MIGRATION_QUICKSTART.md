# Migration Quick Start Guide

This guide will help you quickly set up and test the gradual migration infrastructure.

## Prerequisites

- Docker and Docker Compose installed
- Go 1.21+ installed
- Make installed
- curl and jq installed (for testing)

## Quick Start

### 1. Start the Migration Infrastructure

```bash
# Start all services (Nginx, Next.js, Go backend, PostgreSQL, Redis)
make migration-up
```

This will start:
- **Nginx** on port 80 (API Gateway)
- **Next.js** on port 3000 (internal)
- **Go Backend** on port 8080 (internal)
- **PostgreSQL** on port 5432
- **Redis** on port 6379

### 2. Verify Services are Running

```bash
# Check overall health
make migration-health

# Or manually:
curl http://localhost/health | jq
curl http://localhost/health/nextjs | jq
curl http://localhost/health/go | jq
```

Expected output:
```json
{
  "status": "healthy",
  "service": "nextjs",
  "timestamp": "2024-12-07T10:00:00Z",
  "database": "connected"
}
```

### 3. Initialize Feature Flags

```bash
# Build the feature flags CLI tool
make feature-flags

# Initialize default flags (all disabled)
make flags-init
```

This creates feature flags for all endpoints, starting at 0% rollout (all traffic goes to Next.js).

### 4. Test the Infrastructure

#### Test Next.js Endpoints (Default)

```bash
# All traffic goes to Next.js by default
curl http://localhost/api/posts
curl http://localhost/api/categories
```

#### Enable Go Backend for Specific Endpoint

```bash
# Enable 100% rollout for exchange rates
make flags-enable FLAG=exchange.rates

# Now this endpoint uses Go backend
curl http://localhost/api/v1/exchange-rates
```

#### Gradual Rollout Example

```bash
# Start with 10% rollout
make flags-set FLAG=post.list PERCENT=10

# Check if enabled for specific user
./bin/feature-flags check post.list user123

# Increase to 25%
make flags-set FLAG=post.list PERCENT=25

# Increase to 50%
make flags-set FLAG=post.list PERCENT=50

# Full rollout
make flags-enable FLAG=post.list
```

### 5. Monitor the Migration

```bash
# View logs from all services
make migration-logs

# Or view specific service logs
docker-compose -f docker-compose.migration.yml logs -f nginx
docker-compose -f docker-compose.migration.yml logs -f go-backend
docker-compose -f docker-compose.migration.yml logs -f web
```

### 6. Test Circuit Breaker

The circuit breaker automatically falls back to Next.js if Go backend fails.

```bash
# Stop Go backend
docker-compose -f docker-compose.migration.yml stop go-backend

# Try to access Go endpoint - should fallback to Next.js
curl -I http://localhost/api/v1/posts | grep X-Served-By
# Should show: X-Served-By: nextjs-fallback

# Restart Go backend
docker-compose -f docker-compose.migration.yml start go-backend
```

## Common Commands

### Feature Flag Management

```bash
# List all flags
make flags-list

# Get specific flag details
make flags-get FLAG=auth.login

# Set rollout percentage (0-100)
make flags-set FLAG=auth.login PERCENT=25

# Enable flag completely (100%)
make flags-enable FLAG=auth.login

# Disable flag completely (0%)
make flags-disable FLAG=auth.login
```

### Service Management

```bash
# Start services
make migration-up

# Stop services
make migration-down

# Restart specific service
docker-compose -f docker-compose.migration.yml restart go-backend

# View logs
make migration-logs

# Check health
make migration-health
```

## Migration Workflow

### Phase 1: Preparation

```bash
# 1. Start infrastructure
make migration-up

# 2. Initialize flags
make flags-init

# 3. Verify all services healthy
make migration-health
```

### Phase 2: Canary Testing (10%)

```bash
# Enable 10% rollout for read-only endpoints
make flags-set FLAG=post.get PERCENT=10
make flags-set FLAG=post.list PERCENT=10
make flags-set FLAG=exchange.rates PERCENT=10

# Monitor for 24-48 hours
make migration-logs
```

### Phase 3: Gradual Increase (25% → 50% → 75%)

```bash
# Week 1: 25%
make flags-set FLAG=post.get PERCENT=25
make flags-set FLAG=post.list PERCENT=25

# Week 2: 50%
make flags-set FLAG=post.get PERCENT=50
make flags-set FLAG=post.list PERCENT=50

# Week 3: 75%
make flags-set FLAG=post.get PERCENT=75
make flags-set FLAG=post.list PERCENT=75
```

### Phase 4: Full Migration (100%)

```bash
# Enable all endpoints
make flags-enable FLAG=post.get
make flags-enable FLAG=post.list
make flags-enable FLAG=post.create
make flags-enable FLAG=auth.login
# ... etc
```

## Rollback Procedures

### Emergency Rollback

```bash
# Disable all Go backend endpoints immediately
make flags-disable FLAG=auth.login
make flags-disable FLAG=post.create
# ... etc

# Or stop Go backend entirely
docker-compose -f docker-compose.migration.yml stop go-backend
```

### Partial Rollback

```bash
# Reduce rollout for specific endpoint
make flags-set FLAG=post.create PERCENT=0

# Or reduce to previous level
make flags-set FLAG=post.create PERCENT=25
```

## Troubleshooting

### Services Not Starting

```bash
# Check service status
docker-compose -f docker-compose.migration.yml ps

# View logs
docker-compose -f docker-compose.migration.yml logs

# Restart services
make migration-down
make migration-up
```

### Feature Flags Not Working

```bash
# Check Redis connection
docker-compose -f docker-compose.migration.yml exec redis redis-cli ping

# List flags in Redis
docker-compose -f docker-compose.migration.yml exec redis redis-cli KEYS "feature_flag:*"

# Reinitialize flags
make flags-init
```

### Go Backend Not Responding

```bash
# Check logs
docker-compose -f docker-compose.migration.yml logs go-backend

# Check health
curl http://localhost/health/go

# Restart service
docker-compose -f docker-compose.migration.yml restart go-backend
```

## Testing Endpoints

### Authentication

```bash
# Login (Next.js by default)
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Login (Go backend when enabled)
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Posts

```bash
# List posts (Next.js)
curl http://localhost/api/posts

# List posts (Go backend)
curl http://localhost/api/v1/posts

# Get specific post
curl http://localhost/api/v1/posts/123
```

### Exchange Rates

```bash
# Get current rates (Go backend)
curl http://localhost/api/v1/exchange-rates

# Get historical rates
curl "http://localhost/api/v1/exchange-rates/historical?currency=USD&from=2024-01-01&to=2024-12-31"
```

## Monitoring

### Key Metrics

1. **Error Rates**: Compare Go vs Next.js
2. **Latency**: P50, P95, P99 response times
3. **Throughput**: Requests per second
4. **Resource Usage**: CPU, memory, connections

### Monitoring Commands

```bash
# Watch health status
watch -n 5 'curl -s http://localhost/health | jq'

# Monitor Nginx access logs
docker-compose -f docker-compose.migration.yml exec nginx tail -f /var/log/nginx/access.log

# Monitor Redis (feature flags)
docker-compose -f docker-compose.migration.yml exec redis redis-cli
> KEYS feature_flag:*
> GET feature_flag:auth.login
```

## Next Steps

1. Read the full [Gradual Migration Guide](docs/GRADUAL_MIGRATION.md)
2. Review the [API Documentation](docs/API.md)
3. Set up monitoring dashboards
4. Plan your migration timeline
5. Communicate with your team

## Support

For detailed documentation, see:
- [Gradual Migration Guide](docs/GRADUAL_MIGRATION.md)
- [API Documentation](docs/API.md)
- [Go Backend README](README.go.md)

For issues:
1. Check logs: `make migration-logs`
2. Check health: `make migration-health`
3. Review this guide
4. Contact the backend team
