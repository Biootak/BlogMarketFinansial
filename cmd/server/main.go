package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"biotak-go-backend/internal/config"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/router"
	"biotak-go-backend/internal/workers"
	"biotak-go-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("🚀 Biotak Go Backend Server")
	log.Println("Starting server initialization...")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}
	log.Printf("✅ Configuration loaded (env: %s)", cfg.Env)

	// Initialize PostgreSQL connection
	dbConfig := database.DefaultConfig(cfg.DatabaseURL)
	entClient, err := database.NewEntClient(dbConfig)
	if err != nil {
		log.Fatalf("❌ Failed to connect to PostgreSQL: %v", err)
	}
	defer func() {
		if err := entClient.Close(); err != nil {
			log.Printf("⚠️  Error closing database connection: %v", err)
		}
	}()

	// Initialize Redis connection (optional)
	var redisClient *database.RedisClient
	if cfg.RedisURL != "" {
		redisConfig := database.DefaultRedisConfig(cfg.RedisURL)
		redisClient, err = database.NewRedisClient(redisConfig)
		if err != nil {
			log.Printf("⚠️  Failed to connect to Redis: %v (continuing without Redis)", err)
			redisClient = nil
		} else {
			defer func() {
				if err := redisClient.Close(); err != nil {
					log.Printf("⚠️  Error closing Redis connection: %v", err)
				}
			}()
			log.Println("✅ Redis connected successfully")
		}
	} else {
		log.Println("⚠️  Redis URL not configured, running without Redis")
	}

	// Initialize logger
	logLevel := logger.INFO
	if cfg.Env == "development" {
		logLevel = logger.DEBUG
	}
	appLogger := logger.New(os.Stdout, logLevel)
	log.Println("✅ Logger initialized")

	// Setup Gin router
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Setup router with all routes and middleware
	routerConfig := &router.RouterConfig{
		EntClient:   entClient,
		RedisClient: redisClient,
		Logger:      appLogger,
		JWTSecret:   cfg.JWTSecret,
		S3Endpoint:  cfg.S3Endpoint,
		S3AccessKey: cfg.S3AccessKey,
		S3SecretKey: cfg.S3SecretKey,
		S3Bucket:    cfg.S3Bucket,
	}
	r := router.SetupRouter(routerConfig)
	log.Println("✅ Router configured with all routes")

	// Start background workers
	var workerManager *workers.WorkerManager
	if redisClient != nil {
		workerConfig := workers.DefaultWorkerConfig()
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		
		workerManager = workers.StartWorkersInBackground(ctx, entClient.Client, redisClient.Client, workerConfig)
		log.Println("✅ Background workers started")
	} else {
		log.Println("⚠️  Skipping background workers (Redis not available)")
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("🌐 Server starting on port %s", cfg.Port)
		log.Printf("📍 Health check: http://localhost:%s/health", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")

	// Stop background workers first
	if workerManager != nil {
		log.Println("🛑 Stopping background workers...")
		workerManager.Stop()
		log.Println("✅ Background workers stopped")
	}

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("❌ Server forced to shutdown: %v", err)
	}

	log.Println("✅ Server exited gracefully")
}
