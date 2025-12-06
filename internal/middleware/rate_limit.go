package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Limit  int           // Maximum number of requests
	Window time.Duration // Time window for the limit
}

// RateLimiter implements token bucket algorithm using Redis
type RateLimiter struct {
	redis  *redis.Client
	config RateLimitConfig
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(redis *redis.Client, config RateLimitConfig) *RateLimiter {
	return &RateLimiter{
		redis:  redis,
		config: config,
	}
}

// RateLimitMiddleware creates a rate limiting middleware
// Uses token bucket algorithm with Redis for distributed rate limiting
func RateLimitMiddleware(redis *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	limiter := NewRateLimiter(redis, RateLimitConfig{
		Limit:  limit,
		Window: window,
	})

	return func(c *gin.Context) {
		// Skip rate limiting if Redis is not available
		if redis == nil {
			c.Next()
			return
		}

		// Get identifier (user ID if authenticated, otherwise IP address)
		identifier := getIdentifier(c)

		// Check rate limit
		allowed, remaining, resetTime, err := limiter.Allow(c.Request.Context(), identifier)
		if err != nil {
			// Log error but don't block request if Redis fails
			c.Next()
			return
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))

		if !allowed {
			retryAfter := int(time.Until(resetTime).Seconds())
			if retryAfter < 0 {
				retryAfter = 0
			}

			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": "Too many requests. Please try again later.",
					"details": gin.H{
						"limit":       limit,
						"window":      window.String(),
						"retry_after": retryAfter,
						"reset_at":    resetTime.Format(time.RFC3339),
					},
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Allow checks if a request is allowed under the rate limit
// Returns: allowed, remaining, resetTime, error
func (rl *RateLimiter) Allow(ctx context.Context, identifier string) (bool, int, time.Time, error) {
	key := fmt.Sprintf("rate_limit:%s", identifier)
	now := time.Now()
	windowStart := now.Add(-rl.config.Window)

	// Use Redis sorted set to implement sliding window
	pipe := rl.redis.Pipeline()

	// Remove old entries outside the window
	pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart.UnixNano(), 10))

	// Count current requests in window
	countCmd := pipe.ZCard(ctx, key)

	// Add current request
	pipe.ZAdd(ctx, key, redis.Z{
		Score:  float64(now.UnixNano()),
		Member: fmt.Sprintf("%d", now.UnixNano()),
	})

	// Set expiration on the key
	pipe.Expire(ctx, key, rl.config.Window+time.Minute)

	// Execute pipeline
	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, 0, time.Time{}, fmt.Errorf("failed to execute rate limit check: %w", err)
	}

	// Get count result
	count := int(countCmd.Val())

	// Calculate remaining and reset time
	remaining := rl.config.Limit - count - 1
	if remaining < 0 {
		remaining = 0
	}

	resetTime := now.Add(rl.config.Window)

	// Check if limit exceeded
	allowed := count < rl.config.Limit

	return allowed, remaining, resetTime, nil
}

// getIdentifier returns a unique identifier for rate limiting
// Uses user ID if authenticated, otherwise uses IP address
func getIdentifier(c *gin.Context) string {
	// Try to get user ID from context (if authenticated)
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok && id != "" {
			return fmt.Sprintf("user:%s", id)
		}
	}

	// Fall back to IP address
	ip := c.ClientIP()
	return fmt.Sprintf("ip:%s", ip)
}

// GlobalRateLimit creates a global rate limiter (100 requests per minute)
func GlobalRateLimit(redis *redis.Client) gin.HandlerFunc {
	return RateLimitMiddleware(redis, 100, time.Minute)
}

// AuthRateLimit creates a rate limiter for authentication endpoints (5 requests per minute)
func AuthRateLimit(redis *redis.Client) gin.HandlerFunc {
	return RateLimitMiddleware(redis, 5, time.Minute)
}

// UploadRateLimit creates a rate limiter for upload endpoints (10 requests per hour)
func UploadRateLimit(redis *redis.Client) gin.HandlerFunc {
	return RateLimitMiddleware(redis, 10, time.Hour)
}

// CustomRateLimit creates a rate limiter with custom configuration
func CustomRateLimit(redis *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return RateLimitMiddleware(redis, limit, window)
}
