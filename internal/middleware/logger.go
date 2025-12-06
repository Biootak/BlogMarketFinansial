package middleware

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// LogEntry represents a structured log entry
type LogEntry struct {
	Timestamp   string                 `json:"timestamp"`
	RequestID   string                 `json:"request_id"`
	Method      string                 `json:"method"`
	Path        string                 `json:"path"`
	Query       string                 `json:"query,omitempty"`
	Status      int                    `json:"status"`
	Latency     string                 `json:"latency"`
	LatencyMs   int64                  `json:"latency_ms"`
	ClientIP    string                 `json:"client_ip"`
	UserAgent   string                 `json:"user_agent,omitempty"`
	UserID      string                 `json:"user_id,omitempty"`
	UserRole    string                 `json:"user_role,omitempty"`
	Error       string                 `json:"error,omitempty"`
	RequestSize int                    `json:"request_size,omitempty"`
	Extra       map[string]interface{} `json:"extra,omitempty"`
}

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

		// Build log entry
		entry := LogEntry{
			Timestamp:   start.Format(time.RFC3339),
			RequestID:   requestID,
			Method:      c.Request.Method,
			Path:        c.Request.URL.Path,
			Query:       c.Request.URL.RawQuery,
			Status:      c.Writer.Status(),
			Latency:     latency.String(),
			LatencyMs:   latencyMs,
			ClientIP:    c.ClientIP(),
			UserAgent:   c.Request.UserAgent(),
			RequestSize: requestSize,
		}

		// Add user info if authenticated
		if userID, exists := c.Get("user_id"); exists {
			if id, ok := userID.(string); ok {
				entry.UserID = id
			}
		}
		if userRole, exists := c.Get("user_role"); exists {
			if role, ok := userRole.(string); ok {
				entry.UserRole = role
			}
		}

		// Add error if present
		if len(c.Errors) > 0 {
			entry.Error = c.Errors.String()
		}

		// Log as JSON
		logJSON, err := json.Marshal(entry)
		if err != nil {
			fmt.Printf("Failed to marshal log entry: %v\n", err)
			return
		}

		// Print log based on status code
		if c.Writer.Status() >= 500 {
			fmt.Printf("ERROR: %s\n", string(logJSON))
		} else if c.Writer.Status() >= 400 {
			fmt.Printf("WARN: %s\n", string(logJSON))
		} else {
			fmt.Printf("INFO: %s\n", string(logJSON))
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
	entry := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"level":      "INFO",
		"message":    message,
		"request_id": GetRequestID(c),
	}

	if userID, exists := c.Get("user_id"); exists {
		entry["user_id"] = userID
	}

	if extra != nil {
		entry["extra"] = extra
	}

	logJSON, _ := json.Marshal(entry)
	fmt.Printf("INFO: %s\n", string(logJSON))
}

// LogError logs an error message with context
func LogError(c *gin.Context, message string, err error, extra map[string]interface{}) {
	entry := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"level":      "ERROR",
		"message":    message,
		"request_id": GetRequestID(c),
	}

	if err != nil {
		entry["error"] = err.Error()
	}

	if userID, exists := c.Get("user_id"); exists {
		entry["user_id"] = userID
	}

	if extra != nil {
		entry["extra"] = extra
	}

	logJSON, _ := json.Marshal(entry)
	fmt.Printf("ERROR: %s\n", string(logJSON))
}

// LogWarn logs a warning message with context
func LogWarn(c *gin.Context, message string, extra map[string]interface{}) {
	entry := map[string]interface{}{
		"timestamp":  time.Now().Format(time.RFC3339),
		"level":      "WARN",
		"message":    message,
		"request_id": GetRequestID(c),
	}

	if userID, exists := c.Get("user_id"); exists {
		entry["user_id"] = userID
	}

	if extra != nil {
		entry["extra"] = extra
	}

	logJSON, _ := json.Marshal(entry)
	fmt.Printf("WARN: %s\n", string(logJSON))
}
