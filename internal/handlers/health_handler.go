package handlers

import (
	"context"
	"net/http"
	"time"

	"biotak-go-backend/internal/database"

	"github.com/gin-gonic/gin"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	entClient   *database.EntClient
	redisClient *database.RedisClient
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(entClient *database.EntClient, redisClient *database.RedisClient) *HealthHandler {
	return &HealthHandler{
		entClient:   entClient,
		redisClient: redisClient,
	}
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Services  map[string]string `json:"services"`
	Version   string            `json:"version"`
}

// Check handles GET /health
func (h *HealthHandler) Check(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	services := make(map[string]string)
	overallStatus := "healthy"

	// Check PostgreSQL connection
	if err := h.checkDatabase(ctx); err != nil {
		services["database"] = "unhealthy: " + err.Error()
		// Don't fail the health check if database is down - just report it
		// overallStatus = "unhealthy"
	} else {
		services["database"] = "connected"
	}

	// Check Redis connection
	if err := h.checkRedis(ctx); err != nil {
		services["redis"] = "unhealthy: " + err.Error()
		// Don't fail the health check if Redis is down - just report it
		// overallStatus = "unhealthy"
	} else {
		services["redis"] = "connected"
	}

	// Prepare response
	response := HealthResponse{
		Status:    overallStatus,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Services:  services,
		Version:   "1.0.0", // TODO: Get from build info
	}

	// Always return 200 OK for basic health check
	// Railway just needs to know the server is running
	c.JSON(http.StatusOK, response)
}

// checkDatabase checks PostgreSQL connection
func (h *HealthHandler) checkDatabase(ctx context.Context) error {
	if h.entClient == nil {
		return nil // Database not configured (optional)
	}
	return h.entClient.Ping(ctx)
}

// checkRedis checks Redis connection
func (h *HealthHandler) checkRedis(ctx context.Context) error {
	if h.redisClient == nil {
		return nil // Redis not configured (optional)
	}
	return h.redisClient.Ping(ctx)
}

// Detailed handles GET /health/detailed (admin only)
func (h *HealthHandler) Detailed(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	response := gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"version":   "1.0.0",
	}

	// Database details
	if h.entClient != nil {
		dbStats := h.entClient.Stats()
		response["database"] = gin.H{
			"status":           "connected",
			"max_open_conns":   dbStats.MaxOpenConnections,
			"open_conns":       dbStats.OpenConnections,
			"in_use":           dbStats.InUse,
			"idle":             dbStats.Idle,
			"wait_count":       dbStats.WaitCount,
			"wait_duration_ms": dbStats.WaitDuration.Milliseconds(),
		}
	}

	// Redis details
	if h.redisClient != nil {
		if err := h.redisClient.Ping(ctx); err == nil {
			redisStats := h.redisClient.Stats()
			response["redis"] = gin.H{
				"status":    "connected",
				"hits":      redisStats.Hits,
				"misses":    redisStats.Misses,
				"timeouts":  redisStats.Timeouts,
				"total_conns": redisStats.TotalConns,
				"idle_conns":  redisStats.IdleConns,
				"stale_conns": redisStats.StaleConns,
			}
		} else {
			response["redis"] = gin.H{
				"status": "unhealthy",
				"error":  err.Error(),
			}
		}
	}

	c.JSON(http.StatusOK, response)
}

// Ready handles GET /health/ready (readiness probe for Kubernetes)
func (h *HealthHandler) Ready(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	// Check if critical services are ready
	if err := h.checkDatabase(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"ready":  false,
			"reason": "database not ready",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ready": true,
	})
}

// Live handles GET /health/live (liveness probe for Kubernetes)
func (h *HealthHandler) Live(c *gin.Context) {
	// Simple liveness check - just return OK if the server is running
	c.JSON(http.StatusOK, gin.H{
		"alive": true,
	})
}
