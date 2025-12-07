package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
)

// SecurityHeaders adds security headers to all responses
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")

		// Enable XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")

		// Referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Content Security Policy
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")

		// Strict Transport Security (HSTS) - only for HTTPS
		if c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		// Permissions Policy (formerly Feature Policy)
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		c.Next()
	}
}

// CSRFProtection implements CSRF protection for state-changing operations
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip CSRF check for safe methods
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// Get CSRF token from header
		token := c.GetHeader("X-CSRF-Token")
		if token == "" {
			// Try to get from form data
			token = c.PostForm("csrf_token")
		}

		// Get expected token from session/cookie
		expectedToken, exists := c.Get("csrf_token")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "CSRF token not found in session",
			})
			c.Abort()
			return
		}

		// Validate token
		if token != expectedToken {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Invalid CSRF token",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GenerateCSRFToken generates a new CSRF token
func GenerateCSRFToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// SetCSRFToken sets a CSRF token in the context and cookie
func SetCSRFToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate token
		token, err := GenerateCSRFToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to generate CSRF token",
			})
			c.Abort()
			return
		}

		// Store in context
		c.Set("csrf_token", token)

		// Set in cookie
		c.SetCookie(
			"csrf_token",
			token,
			3600,           // 1 hour
			"/",            // path
			"",             // domain
			true,           // secure (HTTPS only)
			true,           // httpOnly
		)

		// Also send in response header for client-side access
		c.Header("X-CSRF-Token", token)

		c.Next()
	}
}

// RequestSizeLimiter limits the size of request bodies
func RequestSizeLimiter(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Request body too large",
				"max_size": maxSize,
			})
			c.Abort()
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	}
}

// SecureHeaders is a convenience function that applies all security headers
func SecureHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		SecurityHeaders()(c)
	}
}
