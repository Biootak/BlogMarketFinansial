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
	"biotak-go-backend/internal/handlers"

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
		}
	} else {
		log.Println("⚠️  Redis URL not configured, running without Redis")
	}

	// Setup Gin router
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.Default()

	// Setup health check routes
	healthHandler := handlers.NewHealthHandler(entClient, redisClient)
	router.GET("/health", healthHandler.Check)
	router.GET("/health/detailed", healthHandler.Detailed)
	router.GET("/health/ready", healthHandler.Ready)
	router.GET("/health/live", healthHandler.Live)

	// TODO: Setup API routes (will be added in later tasks)
	// api := router.Group("/api/v1")
	// {
	//     // Authentication routes
	//     // Post routes
	//     // Comment routes
	//     // etc.
	// }

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
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

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("❌ Server forced to shutdown: %v", err)
	}

	log.Println("✅ Server exited gracefully")
}
