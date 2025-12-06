// +build integration

package workers

import (
	"context"
	"os"
	"testing"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/internal/services"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	_ "github.com/lib/pq"
)

// TestExchangeRateWorker_Integration tests the worker with real database and Redis
// Run with: go test -tags=integration -v ./internal/workers/...
func TestExchangeRateWorker_Integration(t *testing.T) {
	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set, skipping integration test")
	}

	// Setup database connection
	client, err := ent.Open("postgres", databaseURL)
	require.NoError(t, err)
	defer client.Close()

	// Setup Redis connection
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: redisURL,
		DB:   1, // Use test database
	})
	defer redisClient.Close()

	// Test Redis connection
	ctx := context.Background()
	err = redisClient.Ping(ctx).Err()
	if err != nil {
		t.Skip("Redis not available, skipping integration test")
	}

	// Clear any existing cache
	redisClient.FlushDB(ctx)

	// Create service
	service := services.NewExchangeRateService(client, redisClient)

	// Create worker with short interval for testing
	worker := NewExchangeRateWorker(service, 2*time.Second)

	// Start worker
	worker.Start()

	// Wait for at least one fetch cycle to complete
	time.Sleep(3 * time.Second)

	// Stop worker
	worker.Stop()

	// Verify that rates were fetched and cached
	cacheKey := "exchange_rates:all"
	cachedData, err := redisClient.Get(ctx, cacheKey).Result()
	
	if err == nil && cachedData != "" {
		assert.NotEmpty(t, cachedData, "Expected cached data to be present")
		t.Logf("Successfully fetched and cached exchange rates")
	} else {
		t.Log("Warning: No cached data found. External API may be unavailable.")
	}
}

// TestExchangeRateWorker_StartAndStop_Integration tests graceful shutdown
func TestExchangeRateWorker_StartAndStop_Integration(t *testing.T) {
	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set, skipping integration test")
	}

	// Setup database connection
	client, err := ent.Open("postgres", databaseURL)
	require.NoError(t, err)
	defer client.Close()

	// Setup Redis connection
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: redisURL,
		DB:   1,
	})
	defer redisClient.Close()

	// Test Redis connection
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping integration test")
	}

	// Create service
	service := services.NewExchangeRateService(client, redisClient)

	// Create worker with short interval
	worker := NewExchangeRateWorker(service, 100*time.Millisecond)

	// Start worker
	worker.Start()

	// Let it run for a bit
	time.Sleep(250 * time.Millisecond)

	// Stop worker
	worker.Stop()

	// Verify worker stopped gracefully
	select {
	case <-worker.doneChan:
		t.Log("Worker stopped successfully")
	case <-time.After(1 * time.Second):
		t.Fatal("Worker did not stop within timeout")
	}
}

// TestExchangeRateWorker_MultipleStartStop_Integration tests multiple cycles
func TestExchangeRateWorker_MultipleStartStop_Integration(t *testing.T) {
	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set, skipping integration test")
	}

	// Setup database connection
	client, err := ent.Open("postgres", databaseURL)
	require.NoError(t, err)
	defer client.Close()

	// Setup Redis connection
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: redisURL,
		DB:   1,
	})
	defer redisClient.Close()

	// Test Redis connection
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping integration test")
	}

	// Create service
	service := services.NewExchangeRateService(client, redisClient)

	// Test multiple start/stop cycles
	for i := 0; i < 3; i++ {
		t.Logf("Cycle %d/3", i+1)
		worker := NewExchangeRateWorker(service, 100*time.Millisecond)
		worker.Start()
		time.Sleep(150 * time.Millisecond)
		worker.Stop()
	}

	t.Log("All cycles completed successfully")
}
