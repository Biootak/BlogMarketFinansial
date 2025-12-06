package middleware

import (
	"biotak-go-backend/internal/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// UserContextKey is the key used to store user info in gin.Context
const UserContextKey = "user"

// AuthMiddleware validates JWT tokens and injects user info into context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "MISSING_TOKEN",
					"message": "Authorization header is required",
				},
			})
			c.Abort()
			return
		}

		// Check if header starts with "Bearer "
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "INVALID_TOKEN_FORMAT",
					"message": "Authorization header must be in format: Bearer <token>",
				},
			})
			c.Abort()
			return
		}

		token := parts[1]

		// Validate token
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "INVALID_TOKEN",
					"message": "Invalid or expired token",
					"details": gin.H{
						"reason": err.Error(),
					},
				},
			})
			c.Abort()
			return
		}

		// Inject user info into context
		c.Set(UserContextKey, claims)
		c.Set("user_id", claims.UserID)
		c.Set("user_role", claims.Role)
		c.Set("user_email", claims.Email)

		c.Next()
	}
}

// RequireRole checks if the authenticated user has one of the required roles
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user claims from context
		claimsInterface, exists := c.Get(UserContextKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "AUTHENTICATION_REQUIRED",
					"message": "Authentication is required for this endpoint",
				},
			})
			c.Abort()
			return
		}

		claims, ok := claimsInterface.(*utils.Claims)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":    "INVALID_USER_CONTEXT",
					"message": "Invalid user context",
				},
			})
			c.Abort()
			return
		}

		// Check if user has one of the required roles
		hasRole := false
		for _, role := range roles {
			if claims.Role == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "INSUFFICIENT_PERMISSIONS",
					"message": "You do not have permission to access this resource",
					"details": gin.H{
						"required_roles": roles,
						"user_role":      claims.Role,
					},
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth is like AuthMiddleware but doesn't abort if token is missing
// Useful for endpoints that work differently for authenticated vs anonymous users
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No token provided, continue without authentication
			c.Next()
			return
		}

		// Check if header starts with "Bearer "
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			// Invalid format, continue without authentication
			c.Next()
			return
		}

		token := parts[1]

		// Validate token
		claims, err := utils.ValidateToken(token)
		if err != nil {
			// Invalid token, continue without authentication
			c.Next()
			return
		}

		// Inject user info into context
		c.Set(UserContextKey, claims)
		c.Set("user_id", claims.UserID)
		c.Set("user_role", claims.Role)
		c.Set("user_email", claims.Email)

		c.Next()
	}
}

// GetUserID extracts the user ID from the context
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}
	id, ok := userID.(string)
	return id, ok
}

// GetUserRole extracts the user role from the context
func GetUserRole(c *gin.Context) (string, bool) {
	userRole, exists := c.Get("user_role")
	if !exists {
		return "", false
	}
	role, ok := userRole.(string)
	return role, ok
}

// GetUserClaims extracts the full user claims from the context
func GetUserClaims(c *gin.Context) (*utils.Claims, bool) {
	claimsInterface, exists := c.Get(UserContextKey)
	if !exists {
		return nil, false
	}
	claims, ok := claimsInterface.(*utils.Claims)
	return claims, ok
}
