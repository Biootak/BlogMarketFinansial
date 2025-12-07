# Gradual Migration Infrastructure

This document describes the infrastructure for gradually migrating from Next.js API routes to the Go backend.

## Overview

The gradual migration infrastructure consists of two main components:

1. **Nginx Reverse Proxy / API Gateway**: Routes traffic between Next.js and Go backend
2. **Feature Flags System**: Controls which endpoints use Go backend vs Next.js

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│     Nginx Reverse Proxy             │
│  (API Gateway + Circuit Breaker)    │
└──────┬──────────────────────────────┘
       │
       ├─────────────┬─────────────────┐
       ▼             ▼                 ▼
┌──────────┐  ┌──────────┐     ┌──────────┐
│ Next.js  │  │ Go       │     │ Feature  │
│ Backend  │  │ Backend  │     │ Flags    │
│ (Legacy) │  │ (New)    │     │ (Redis)  │
└──────────┘  └──────────┘     └──────────┘
       │             │
       └──────┬──────┘
              ▼
       ┌──────────────┐
       │  PostgreSQL  │
       │  + Redis     │
       └──────────────┘
```

## 1. Nginx Reverse Proxy

### Configuration

The Nginx configuration (`nginx.conf`) provides:

- **Traffic Routing**: Routes `/api/v1/*` to Go backend, `/api/*` to Next.js
- **Health Checks**: Monitors both services at `/health/nextjs` and `/health/go`
- **Circuit Breaker**: Falls back to Next.js if Go backend fails
- **Rate Limiting**: Protects both services from abuse
- **Load Balancing**: Distributes traffic with keepalive connections

### Routing Rules

| Path Pattern | Primary Target | Fallback | Notes |
|-------------|----------------|----------|-------|
| `/api/v1/*` | Go Backend | Next.js | New endpoints |
| `/api/*` | Next.js | None | Legacy endpoints |
| `/health` | Combined | None | Overall health |
| `/health/nextjs` | Next.js | None | Next.js health |
| `/health/go` | Go Backend | None | Go health |
| `/*` | Next.js | None | Frontend routes |

### Circuit Breaker

The circuit breaker automatically falls back to Next.js if:
- Go backend returns 502, 503, or 504 errors
- Connection timeout (5 seconds)
- Request timeout (30 seconds)

When fallback occurs, the response includes header: `X-Served-By: nextjs-fallback`

### Starting the Infrastructure

```bash
# Start all services with Nginx proxy
docker-compose -f docker-compose.migration.yml up -d

# Check service health
curl http://localhost/health
curl http://localhost/health/nextjs
curl http://localhost/health/go

# View Nginx logs
docker-compose -f docker-compose.migration.yml logs -f nginx
```

## 2. Feature Flags System

### Overview

Feature flags enable gradual rollout of Go backend endpoints on a per-endpoint and per-user basis.

### How It Works

1. Each API endpoint has a corresponding feature flag (e.g., `auth.login`, `post.create`)
2. Flags have a **rollout percentage** (0-100%)
3. Users are consistently assigned to Go or Next.js based on their user ID hash
4. Rollout can be increased gradually: 0% → 10% → 25% → 50% → 75% → 100%

### Available Flags

#### Authentication
- `auth.login` - Login endpoint
- `auth.register` - Registration endpoint
- `auth.refresh` - Token refresh endpoint
- `auth.logout` - Logout endpoint

#### Posts
- `post.create` - Create post
- `post.get` - Get post by ID
- `post.update` - Update post
- `post.delete` - Delete post
- `post.list` - List posts
- `post.publish` - Publish post

#### Comments
- `comment.create` - Create comment
- `comment.list` - List comments
- `comment.moderate` - Moderate comment
- `comment.delete` - Delete comment

#### Exchange Rates
- `exchange.rates` - Get current rates
- `exchange.historical` - Get historical rates

#### Uploads
- `upload.file` - Upload file
- `upload.delete` - Delete file

#### Reports
- `report.user_activity` - User activity report
- `report.content` - Content report
- `report.system_health` - System health report

### Managing Feature Flags

#### Using the CLI Tool

```bash
# Build the CLI tool
go build -o feature-flags ./cmd/feature-flags

# Initialize default flags (all disabled)
./feature-flags init

# List all flags
./feature-flags list

# Get specific flag
./feature-flags get auth.login

# Set rollout percentage (0-100)
./feature-flags set auth.login 25

# Enable flag completely (100%)
./feature-flags enable auth.login

# Disable flag completely (0%)
./feature-flags disable auth.login

# Check if flag is enabled for specific user
./feature-flags check auth.login user123
```

#### Using the API

```bash
# List all flags (requires admin auth)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/feature-flags

# Get specific flag
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/feature-flags/auth.login

# Update rollout percentage
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/feature-flags/auth.login/rollout?percentage=25"

# Update flag details
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rollout": 50}' \
  http://localhost/api/v1/feature-flags/auth.login

# Check if enabled for user
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/feature-flags/auth.login/check?user_id=user123"

# Initialize default flags
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/feature-flags/initialize
```

## Migration Strategy

### Phase 1: Preparation (Week 1)

1. Deploy infrastructure with all flags at 0%
2. Verify both services are healthy
3. Monitor logs and metrics
4. Test circuit breaker by stopping Go backend

```bash
# Deploy
docker-compose -f docker-compose.migration.yml up -d

# Initialize flags
./feature-flags init

# Verify health
curl http://localhost/health
```

### Phase 2: Canary Testing (Week 2)

1. Enable 10% rollout for low-risk endpoints
2. Monitor error rates and latency
3. Compare Go vs Next.js performance
4. Rollback if issues detected

```bash
# Start with read-only endpoints
./feature-flags set post.get 10
./feature-flags set post.list 10
./feature-flags set exchange.rates 10

# Monitor for 24-48 hours
docker-compose -f docker-compose.migration.yml logs -f go-backend
```

### Phase 3: Gradual Rollout (Weeks 3-6)

1. Increase rollout in stages: 25% → 50% → 75%
2. Wait 24-48 hours between increases
3. Monitor metrics at each stage
4. Enable write endpoints after read endpoints are stable

```bash
# Week 3: Increase to 25%
./feature-flags set post.get 25
./feature-flags set post.list 25

# Week 4: Increase to 50%
./feature-flags set post.get 50
./feature-flags set post.list 50

# Week 5: Add write endpoints at 25%
./feature-flags set post.create 25
./feature-flags set post.update 25

# Week 6: Increase all to 75%
./feature-flags set post.get 75
./feature-flags set post.create 75
```

### Phase 4: Full Migration (Week 7)

1. Enable 100% rollout for all endpoints
2. Monitor for 1 week
3. Keep Next.js as fallback
4. Prepare for decommissioning

```bash
# Enable all endpoints
./feature-flags enable post.get
./feature-flags enable post.create
./feature-flags enable post.update
./feature-flags enable auth.login
# ... etc for all endpoints
```

### Phase 5: Decommissioning (Week 8+)

1. Remove Next.js API routes
2. Update Nginx to route directly to Go
3. Remove feature flag checks
4. Archive old code

## Monitoring

### Key Metrics to Monitor

1. **Error Rates**
   - Compare Go vs Next.js error rates
   - Alert on significant increases
   - Track by endpoint

2. **Latency**
   - P50, P95, P99 response times
   - Compare Go vs Next.js
   - Track by endpoint

3. **Throughput**
   - Requests per second
   - Success rate
   - Cache hit rates

4. **Resource Usage**
   - CPU and memory usage
   - Database connections
   - Redis connections

### Monitoring Commands

```bash
# View Go backend logs
docker-compose -f docker-compose.migration.yml logs -f go-backend

# View Next.js logs
docker-compose -f docker-compose.migration.yml logs -f web

# View Nginx access logs
docker-compose -f docker-compose.migration.yml exec nginx tail -f /var/log/nginx/access.log

# Check service health
watch -n 5 'curl -s http://localhost/health | jq'

# Monitor Redis (feature flags)
docker-compose -f docker-compose.migration.yml exec redis redis-cli
> KEYS feature_flag:*
> GET feature_flag:auth.login
```

## Rollback Procedures

### Emergency Rollback (Immediate)

If critical issues are detected:

```bash
# Disable all Go backend flags
./feature-flags disable auth.login
./feature-flags disable post.create
# ... etc for all affected endpoints

# Or stop Go backend entirely
docker-compose -f docker-compose.migration.yml stop go-backend

# Nginx will automatically fallback to Next.js
```

### Partial Rollback

If specific endpoints have issues:

```bash
# Reduce rollout percentage
./feature-flags set post.create 0

# Or reduce to previous level
./feature-flags set post.create 25
```

### Verification After Rollback

```bash
# Check that traffic is going to Next.js
curl -I http://localhost/api/posts | grep X-Served-By

# Monitor error rates
docker-compose -f docker-compose.migration.yml logs -f web
```

## Troubleshooting

### Go Backend Not Responding

```bash
# Check if service is running
docker-compose -f docker-compose.migration.yml ps go-backend

# Check logs
docker-compose -f docker-compose.migration.yml logs go-backend

# Restart service
docker-compose -f docker-compose.migration.yml restart go-backend

# Verify health
curl http://localhost/health/go
```

### Feature Flags Not Working

```bash
# Check Redis connection
docker-compose -f docker-compose.migration.yml exec redis redis-cli ping

# List flags in Redis
docker-compose -f docker-compose.migration.yml exec redis redis-cli KEYS "feature_flag:*"

# Reinitialize flags
./feature-flags init
```

### Circuit Breaker Triggering

```bash
# Check Nginx error logs
docker-compose -f docker-compose.migration.yml logs nginx | grep error

# Check Go backend health
curl http://localhost/health/go

# Verify database connectivity
docker-compose -f docker-compose.migration.yml exec go-backend wget -O- http://localhost:8080/health
```

## Best Practices

1. **Start Small**: Begin with read-only endpoints
2. **Monitor Closely**: Watch metrics at each rollout stage
3. **Be Patient**: Wait 24-48 hours between increases
4. **Test Thoroughly**: Verify functionality at each stage
5. **Have Rollback Plan**: Be ready to disable flags quickly
6. **Communicate**: Keep team informed of rollout progress
7. **Document Issues**: Track any problems encountered
8. **Celebrate Wins**: Acknowledge successful milestones

## Security Considerations

1. **Feature Flag Access**: Only admins can modify flags
2. **API Authentication**: All flag management requires JWT token
3. **Rate Limiting**: Nginx protects both services
4. **Health Checks**: Don't expose sensitive information
5. **Logging**: Sanitize logs to remove sensitive data

## Performance Optimization

1. **Connection Pooling**: Both services use connection pools
2. **Keepalive**: Nginx maintains persistent connections
3. **Caching**: Redis caches frequently accessed data
4. **Compression**: Enable gzip in Nginx for responses
5. **CDN**: Use CDN for static assets

## Support

For issues or questions:
1. Check logs: `docker-compose -f docker-compose.migration.yml logs`
2. Review metrics in monitoring dashboard
3. Consult this documentation
4. Contact the backend team
