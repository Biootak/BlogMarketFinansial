package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/internal/services"
	"biotak-go-backend/internal/workers"

	"github.com/redis/go-redis/v9"
	_ "github.com/lib/pq"
)

func main() {
	// Setup database connection
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgresql://postgres:postgres@localhost:5432/biotak?sslmode=disable"
	}

	client, err := ent.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer client.Close()

	// Setup Redis connection
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})
	defer redisClient.Close()

	// Test Redis connection
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	log.Println("=== Exchange Rate Worker Usage Example ===")
	log.Println()

	// Create exchange rate service
	exchangeService := services.NewExchangeRateService(client, redisClient)

	// Create worker with 5-minute interval (as per requirements)
	log.Println("Creating exchange rate worker with 5-minute interval...")
	worker := workers.NewExchangeRateWorker(exchangeService, 5*time.Minute)

	// Start the worker
	log.Println("Starting exchange rate worker...")
	worker.Start()

	log.Println("Worker started successfully!")
	log.Println("The worker will:")
	log.Println("  1. Fetch exchange rates immediately on start")
	log.Println("  2. Fetch exchange rates every 5 minutes")
	log.Println("  3. Retry up to 3 times on failure with 10-second delays")
	log.Println("  4. Log all execution status")
	log.Println()
	log.Println("Press Ctrl+C to stop the worker...")

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Wait for interrupt signal
	<-sigChan

	log.Println()
	log.Println("Shutdown signal received, stopping worker...")
	worker.Stop()
	log.Println("Worker stopped successfully!")
}
