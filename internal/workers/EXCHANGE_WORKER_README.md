# Exchange Rate Worker

## Overview

The Exchange Rate Worker is a background service that periodically fetches cryptocurrency exchange rates from external APIs and stores them in both Redis (for caching) and PostgreSQL (for historical data).

## Features

- **Periodic Execution**: Runs every 5 minutes (configurable)
- **Immediate Start**: Fetches rates immediately when started
- **Retry Logic**: Automatically retries up to 3 times on failure with 10-second delays
- **Graceful Shutdown**: Properly stops when receiving shutdown signal
- **Comprehensive Logging**: Logs all execution status, errors, and timing information

## Requirements

This worker implements **Requirement 5.1** from the design document:
> WHEN the exchange rate worker runs THEN the System SHALL fetch current rates from external APIs for configured currencies and cryptocurrencies

## Architecture

```
ExchangeRateWorker
    ├── Start()           - Begins periodic execution
    ├── Stop()            - Gracefully stops the worker
    └── runWithRetry()    - Executes fetch with retry logic
         └── ExchangeRateService.FetchRates()
              ├── Fetches from Exir API
              ├── Stores in PostgreSQL
              └── Caches in Redis (5-minute TTL)
```

## Usage

### Basic Usage

```go
import (
    "time"
    "biotak-go-backend/internal/services"
    "biotak-go-backend/internal/workers"
)

// Create exchange rate service
service := services.NewExchangeRateService(entClient, redisClient)

// Create worker with 5-minute interval
worker := workers.NewExchangeRateWorker(service, 5*time.Minute)

// Start the worker
worker.Start()

// ... application runs ...

// Stop the worker gracefully
worker.Stop()
```

### Convenience Function

```go
// Start worker in one line
worker := workers.StartExchangeRateWorker(service, 5*time.Minute)

// Stop when done
worker.Stop()
```

### Integration with Main Application

```go
func main() {
    // Setup database and Redis
    entClient := setupDatabase()
    redisClient := setupRedis()
    
    // Create service
    exchangeService := services.NewExchangeRateService(entClient, redisClient)
    
    // Start worker
    worker := workers.StartExchangeRateWorker(exchangeService, 5*time.Minute)
    
    // Setup graceful shutdown
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
    
    // Wait for shutdown signal
    <-sigChan
    
    // Stop worker
    worker.Stop()
}
```

## Configuration

### Interval

The worker interval is configurable when creating the worker:

```go
// 5 minutes (production default)
worker := workers.NewExchangeRateWorker(service, 5*time.Minute)

// 1 minute (for testing)
worker := workers.NewExchangeRateWorker(service, 1*time.Minute)

// 10 minutes (for reduced API calls)
worker := workers.NewExchangeRateWorker(service, 10*time.Minute)
```

### Retry Configuration

Retry settings are defined as constants in the worker:

```go
const maxRetries = 3              // Number of retry attempts
const retryDelay = 10 * time.Second  // Delay between retries
```

## Behavior

### Execution Flow

1. **Start**: Worker starts and immediately fetches rates
2. **Periodic Execution**: Every 5 minutes, the worker:
   - Calls `ExchangeRateService.FetchRates()`
   - Logs start time
   - Retries up to 3 times on failure
   - Logs success/failure with duration
3. **Stop**: Worker stops gracefully when `Stop()` is called

### Retry Logic

When a fetch fails:
1. Log the error with attempt number
2. Wait 10 seconds
3. Retry (up to 3 total attempts)
4. If all attempts fail, log final error

### Logging

The worker logs:
- Worker start/stop events
- Each fetch attempt start
- Success with duration
- Failures with error details
- Retry attempts with countdown

Example log output:
```
[ExchangeRateWorker] Starting worker with interval: 5m0s
[ExchangeRateWorker] Starting exchange rate fetch
[ExchangeRateWorker] Successfully fetched exchange rates (took 1.234s)
[ExchangeRateWorker] Starting exchange rate fetch
[ExchangeRateWorker] Attempt 1/3 failed: connection timeout
[ExchangeRateWorker] Retrying in 10s...
[ExchangeRateWorker] Successfully fetched exchange rates (took 2.456s)
[ExchangeRateWorker] Stop signal received
[ExchangeRateWorker] Stopping worker
[ExchangeRateWorker] Worker stopped
```

## Error Handling

### Network Errors

If the external API is unreachable:
- Worker retries up to 3 times
- Logs each failure
- Continues running (doesn't crash)
- Next scheduled run will try again

### Service Errors

If `FetchRates()` returns an error:
- Error is logged with context
- Retry logic is applied
- Worker continues running

### Graceful Degradation

If all retries fail:
- Error is logged
- Worker continues running
- Next scheduled execution will try again
- Cached data in Redis remains available
- Historical data in PostgreSQL remains available

## Testing

### Unit Tests

Run unit tests:
```bash
go test ./internal/workers/... -v
```

### Integration Test

Run the example usage:
```bash
go run examples/exchange-worker-usage.go
```

### Manual Testing

1. Start the worker
2. Check logs for successful fetches
3. Verify Redis cache is populated
4. Verify PostgreSQL has historical data
5. Stop the worker and verify graceful shutdown

## Performance

### Resource Usage

- **CPU**: Minimal (only active during fetch)
- **Memory**: ~10MB per worker instance
- **Network**: One API call every 5 minutes
- **Database**: One write transaction per fetch

### Scalability

- Single worker instance is sufficient for most deployments
- Multiple instances can run with distributed locking (future enhancement)
- Worker is lightweight and can run alongside other services

## Monitoring

### Health Checks

Monitor worker health by:
- Checking log output for errors
- Verifying Redis cache freshness
- Checking PostgreSQL for recent records
- Monitoring API response times

### Metrics to Track

- Fetch success rate
- Fetch duration
- Retry frequency
- API error rate
- Cache hit rate

## Troubleshooting

### Worker Not Starting

**Symptom**: No log output after calling `Start()`

**Solution**: 
- Check that `Start()` is called
- Verify service is properly initialized
- Check for panics in logs

### Fetch Failures

**Symptom**: All fetch attempts fail

**Possible Causes**:
- External API is down
- Network connectivity issues
- Invalid API credentials
- Rate limiting by API

**Solution**:
- Check API status
- Verify network connectivity
- Check API credentials
- Review API rate limits

### Worker Not Stopping

**Symptom**: `Stop()` hangs or times out

**Solution**:
- Ensure `Stop()` is called only once
- Check for deadlocks in service layer
- Verify context cancellation is working

## Future Enhancements

- [ ] Distributed locking for multi-instance deployments
- [ ] Configurable retry strategy (exponential backoff)
- [ ] Circuit breaker for API failures
- [ ] Metrics export (Prometheus)
- [ ] Health check endpoint
- [ ] Dynamic interval adjustment based on API rate limits
- [ ] Support for multiple API sources with fallback

## Related Components

- **ExchangeRateService**: Handles the actual fetching and storage logic
- **ExchangeRateHandler**: Provides HTTP endpoints for accessing rates
- **Redis**: Caches rates with 5-minute TTL
- **PostgreSQL**: Stores historical rate data

## References

- Design Document: Section "Background Workers"
- Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
- Exchange Rate Service: `internal/services/exchange_service.go`
- Example Usage: `examples/exchange-worker-usage.go`
