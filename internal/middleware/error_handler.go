package middleware

import (
	"fmt"
	"net/http"
	"os"
	"runtime/debug"
	"time"

	"github.com/gin-gonic/gin"
)

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail contains error information
type ErrorDetail struct {
	Code      string                 `json:"code"`
	Message   string                 `json:"message"`
	Details   map[string]interface{} `json:"details,omitempty"`
	Timestamp string                 `json:"timestamp"`
	RequestID string                 `json:"request_id,omitempty"`
}

// ErrorHandlerMiddleware catches panics and converts them to 500 errors
func ErrorHandlerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Get stack trace
				stack := debug.Stack()

				// Get request ID
				requestID := GetRequestID(c)

				// Log the panic with full details
				fmt.Printf("PANIC: %s\n", formatPanicLog(err, stack, requestID, c))

				// Determine if we're in production
				isProduction := os.Getenv("ENV") == "production"

				// Build error response
				errorResponse := ErrorResponse{
					Error: ErrorDetail{
						Code:      "INTERNAL_SERVER_ERROR",
						Message:   "An unexpected error occurred",
						Timestamp: time.Now().Format(time.RFC3339),
						RequestID: requestID,
					},
				}

				// In development, include more details
				if !isProduction {
					errorResponse.Error.Details = map[string]interface{}{
						"panic": fmt.Sprintf("%v", err),
					}
				}

				// Return 500 error
				c.JSON(http.StatusInternalServerError, errorResponse)
				c.Abort()
			}
		}()

		c.Next()
	}
}

// formatPanicLog formats a panic log entry
func formatPanicLog(err interface{}, stack []byte, requestID string, c *gin.Context) string {
	return fmt.Sprintf(`{
  "timestamp": "%s",
  "level": "PANIC",
  "request_id": "%s",
  "method": "%s",
  "path": "%s",
  "client_ip": "%s",
  "panic": "%v",
  "stack_trace": "%s"
}`, time.Now().Format(time.RFC3339), requestID, c.Request.Method, c.Request.URL.Path, c.ClientIP(), err, sanitizeStackTrace(stack))
}

// sanitizeStackTrace removes sensitive information from stack traces in production
func sanitizeStackTrace(stack []byte) string {
	isProduction := os.Getenv("ENV") == "production"
	if isProduction {
		return "[stack trace hidden in production]"
	}
	return string(stack)
}

// NewErrorResponse creates a standardized error response
func NewErrorResponse(c *gin.Context, code string, message string, details map[string]interface{}) ErrorResponse {
	return ErrorResponse{
		Error: ErrorDetail{
			Code:      code,
			Message:   message,
			Details:   details,
			Timestamp: time.Now().Format(time.RFC3339),
			RequestID: GetRequestID(c),
		},
	}
}

// RespondWithError sends a standardized error response
func RespondWithError(c *gin.Context, statusCode int, code string, message string, details map[string]interface{}) {
	response := NewErrorResponse(c, code, message, details)
	c.JSON(statusCode, response)
}

// Common error response helpers

// BadRequest returns a 400 Bad Request error
func BadRequest(c *gin.Context, message string, details map[string]interface{}) {
	RespondWithError(c, http.StatusBadRequest, "BAD_REQUEST", message, details)
}

// Unauthorized returns a 401 Unauthorized error
func Unauthorized(c *gin.Context, message string) {
	RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", message, nil)
}

// Forbidden returns a 403 Forbidden error
func Forbidden(c *gin.Context, message string) {
	RespondWithError(c, http.StatusForbidden, "FORBIDDEN", message, nil)
}

// NotFound returns a 404 Not Found error
func NotFound(c *gin.Context, message string) {
	RespondWithError(c, http.StatusNotFound, "NOT_FOUND", message, nil)
}

// Conflict returns a 409 Conflict error
func Conflict(c *gin.Context, message string, details map[string]interface{}) {
	RespondWithError(c, http.StatusConflict, "CONFLICT", message, details)
}

// ValidationError returns a 400 validation error
func ValidationError(c *gin.Context, message string, details map[string]interface{}) {
	RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", message, details)
}

// InternalServerError returns a 500 Internal Server Error
func InternalServerError(c *gin.Context, message string) {
	// Log the error
	LogError(c, message, nil, nil)

	// Sanitize message in production
	isProduction := os.Getenv("ENV") == "production"
	if isProduction {
		message = "An unexpected error occurred"
	}

	RespondWithError(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", message, nil)
}

// ServiceUnavailable returns a 503 Service Unavailable error
func ServiceUnavailable(c *gin.Context, message string) {
	RespondWithError(c, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", message, nil)
}

// TooManyRequests returns a 429 Too Many Requests error
func TooManyRequests(c *gin.Context, message string, retryAfter int) {
	c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
	RespondWithError(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", message, map[string]interface{}{
		"retry_after": retryAfter,
	})
}
