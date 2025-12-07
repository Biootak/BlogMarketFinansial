package middleware

import (
	"biotak-go-backend/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ValidateRequest is a middleware that validates request body against a struct
// Usage: router.POST("/endpoint", ValidateRequest(&RequestStruct{}), handler)
func ValidateRequest(schema interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Bind JSON to the schema
		if err := c.ShouldBindJSON(schema); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Validate the struct
		if err := utils.ValidateStruct(schema); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Store validated data in context
		c.Set("validated_data", schema)
		c.Next()
	}
}

// RequestSizeLimit limits the size of request bodies
func RequestSizeLimit(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	}
}

// SanitizeInputs sanitizes all string inputs in the request
func SanitizeInputs() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get all query parameters and sanitize
		for key, values := range c.Request.URL.Query() {
			for i, value := range values {
				values[i] = utils.SanitizeInput(value)
			}
			c.Request.URL.Query()[key] = values
		}

		c.Next()
	}
}
