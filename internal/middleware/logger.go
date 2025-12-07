package middleware

import (
	"biotak-go-backend/pkg/logger"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// LoggerMiddleware creates a structured logging middleware
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate request ID
		requestID := uuid.New().String()
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		// Start timer
		start := time.Now()

		// Get request size
		requestSize := 0
		if c.Request.ContentLength > 0 {
			requestSize = int(c.Request.ContentLength)
		}

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)
		latencyMs := latency.Milliseconds()

		// Build context for logging
		context := map[string]interface{}{
			"request_id":   requestID,
			"method":       c.Request.Method,
			"path":         c.Request.URL.Path,
			"status":       c.Writer.Status(),
			"latency":      latency.String(),
			"latency_ms":   latencyMs,
			"client_ip":    c.ClientIP(),
			"request_size": requestSize,
		}

		if c.Request.URL.RawQuery != "" {
			context["query"] = c.Request.URL.RawQuery
		}

		if c.Request.UserAgent() != "" {
			context["user_agent"] = c.Request.UserAgent()
		}

		// Add user info if authenticated
		if userID, exists := c.Get("user_id"); exists {
			if id, ok := userID.(string); ok {
				context["user_id"] = id
			}
		}
		if userRole, exists := c.Get("user_role"); exists {
			if role, ok := userRole.(string); ok {
				context["user_role"] = role
			}
		}

		// Add error if present
		if len(c.Errors) > 0 {
			context["error"] = c.Errors.String()
		}

		// Log based on status code
		message := "HTTP Request"
		if c.Writer.Status() >= 500 {
			logger.Error(message, context)
		} else if c.Writer.Status() >= 400 {
			logger.Warn(message, context)
		} else {
			logger.Info(message, context)
		}
	}
}

// RequestIDMiddleware adds a request ID to the context
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if request ID already exists in header
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// GetRequestID extracts the request ID from the context
func GetRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return ""
}

// LogInfo logs an informational message with context
func LogInfo(c *gin.Context, message string, extra map[string]interface{}) {
	context := map[string]interface{}{
		"request_id": GetRequestID(c),
	}

	if userID, exists := c.Get("user_id"); exists {
		context["user_id"] = userID
	}

	if extra != nil {
		for k, v := range extra {
			context[k] = v
		}
	}

	logger.Info(message, context)
}

// LogError logs an error message with context
func LogError(c *gin.Context, message string, err error, extra map[string]interface{}) {
	context := map[string]interface{}{
		"request_id": GetRequestID(c),
	}

	if err != nil {
		context["error"] = err.Error()
	}

	if userID, exists := c.Get("user_id"); exists {
		context["user_id"] = userID
	}

	if extra != nil {
		for k, v := range extra {
			context[k] = v
		}
	}

	logger.Error(message, context)
}

// LogWarn logs a warning message with context
func LogWarn(c *gin.Context, message string, extra map[string]interface{}) {
	context := map[string]interface{}{
		"request_id": GetRequestID(c),
	}

	if userID, exists := c.Get("user_id"); exists {
		context["user_id"] = userID
	}

	if extra != nil {
		for k, v := range extra {
			context[k] = v
		}
	}

	logger.Warn(message, context)
}
