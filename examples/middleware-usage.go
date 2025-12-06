package main

import (
	"biotak-go-backend/internal/middleware"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// This example demonstrates how to use the middleware components
// This is for documentation purposes only - not meant to be run directly

func main() {
	// Initialize Redis client (optional - middleware will work without it)
	redisClient := redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_URL"),
	})

	// Create Gin router
	router := gin.New() // Use gin.New() instead of gin.Default() to have full control

	// Apply global middleware in order
	// 1. Error handler (should be first to catch all panics)
	router.Use(middleware.ErrorHandlerMiddleware())

	// 2. Logger (logs all requests)
	router.Use(middleware.LoggerMiddleware())

	// 3. CORS (handles cross-origin requests)
	frontendURL := os.Getenv("NEXT_PUBLIC_APP_URL")
	router.Use(middleware.SecureCORS(frontendURL))

	// Public routes (no authentication required)
	public := router.Group("/api/v1")
	public.Use(middleware.GlobalRateLimit(redisClient)) // 100 req/min
	{
		public.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		public.GET("/posts", func(c *gin.Context) {
			c.JSON(200, gin.H{"posts": []string{}})
		})

		public.GET("/posts/:slug", func(c *gin.Context) {
			slug := c.Param("slug")
			c.JSON(200, gin.H{"slug": slug})
		})
	}

	// Authentication routes (special rate limit)
	auth := router.Group("/api/v1/auth")
	auth.Use(middleware.AuthRateLimit(redisClient)) // 5 req/min
	{
		auth.POST("/login", func(c *gin.Context) {
			// Login logic here
			c.JSON(200, gin.H{"token": "example-token"})
		})

		auth.POST("/register", func(c *gin.Context) {
			// Register logic here
			c.JSON(201, gin.H{"message": "User created"})
		})

		auth.POST("/refresh", func(c *gin.Context) {
			// Refresh token logic here
			c.JSON(200, gin.H{"token": "new-token"})
		})
	}

	// Protected routes (authentication required)
	protected := router.Group("/api/v1")
	protected.Use(middleware.AuthMiddleware())                // Requires valid JWT
	protected.Use(middleware.GlobalRateLimit(redisClient))    // 100 req/min
	{
		protected.POST("/posts", func(c *gin.Context) {
			// Get user info from context
			userID, _ := middleware.GetUserID(c)
			userRole, _ := middleware.GetUserRole(c)

			log.Printf("Creating post for user %s with role %s", userID, userRole)
			c.JSON(201, gin.H{"message": "Post created"})
		})

		protected.PUT("/posts/:id", func(c *gin.Context) {
			postID := c.Param("id")
			userID, _ := middleware.GetUserID(c)

			log.Printf("User %s updating post %s", userID, postID)
			c.JSON(200, gin.H{"message": "Post updated"})
		})

		protected.DELETE("/comments/:id", func(c *gin.Context) {
			commentID := c.Param("id")
			c.JSON(200, gin.H{"message": "Comment deleted", "id": commentID})
		})
	}

	// Admin routes (admin role required)
	admin := router.Group("/api/v1/admin")
	admin.Use(middleware.AuthMiddleware())                           // Requires valid JWT
	admin.Use(middleware.RequireRole("ADMIN", "SUPER_ADMIN"))        // Requires admin role
	admin.Use(middleware.GlobalRateLimit(redisClient))               // 100 req/min
	{
		admin.DELETE("/posts/:id", func(c *gin.Context) {
			postID := c.Param("id")
			userID, _ := middleware.GetUserID(c)

			log.Printf("Admin %s deleting post %s", userID, postID)
			c.JSON(200, gin.H{"message": "Post deleted"})
		})

		admin.GET("/reports/users", func(c *gin.Context) {
			c.JSON(200, gin.H{"report": "user activity"})
		})

		admin.POST("/users/:id/ban", func(c *gin.Context) {
			userID := c.Param("id")
			c.JSON(200, gin.H{"message": "User banned", "id": userID})
		})
	}

	// Upload routes (special rate limit)
	upload := router.Group("/api/v1/upload")
	upload.Use(middleware.AuthMiddleware())                   // Requires valid JWT
	upload.Use(middleware.UploadRateLimit(redisClient))       // 10 req/hour
	{
		upload.POST("/", func(c *gin.Context) {
			// File upload logic here
			c.JSON(200, gin.H{"url": "https://example.com/file.jpg"})
		})

		upload.DELETE("/:filename", func(c *gin.Context) {
			filename := c.Param("filename")
			c.JSON(200, gin.H{"message": "File deleted", "filename": filename})
		})
	}

	// Optional auth routes (work for both authenticated and anonymous users)
	optional := router.Group("/api/v1")
	optional.Use(middleware.OptionalAuth())                   // Optional JWT
	optional.Use(middleware.GlobalRateLimit(redisClient))     // 100 req/min
	{
		optional.GET("/posts/:slug/view", func(c *gin.Context) {
			slug := c.Param("slug")

			// Check if user is authenticated
			if userID, exists := middleware.GetUserID(c); exists {
				log.Printf("Authenticated user %s viewing post %s", userID, slug)
			} else {
				log.Printf("Anonymous user viewing post %s", slug)
			}

			c.JSON(200, gin.H{"slug": slug, "views": 100})
		})
	}

	// Example of using error helpers
	router.GET("/api/v1/example-errors", func(c *gin.Context) {
		errorType := c.Query("type")

		switch errorType {
		case "bad_request":
			middleware.BadRequest(c, "Invalid input", map[string]interface{}{
				"field": "email",
				"reason": "Invalid format",
			})
		case "unauthorized":
			middleware.Unauthorized(c, "Authentication required")
		case "forbidden":
			middleware.Forbidden(c, "Insufficient permissions")
		case "not_found":
			middleware.NotFound(c, "Resource not found")
		case "conflict":
			middleware.Conflict(c, "Email already exists", map[string]interface{}{
				"field": "email",
			})
		case "validation":
			middleware.ValidationError(c, "Validation failed", map[string]interface{}{
				"errors": []string{"Email is required", "Password too short"},
			})
		case "internal":
			middleware.InternalServerError(c, "Something went wrong")
		default:
			c.JSON(200, gin.H{"message": "Use ?type=bad_request|unauthorized|forbidden|not_found|conflict|validation|internal"})
		}
	})

	// Start server
	log.Println("Server starting on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
