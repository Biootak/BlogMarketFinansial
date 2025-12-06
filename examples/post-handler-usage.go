package main

import (
	"biotak-go-backend/internal/config"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/handlers"
	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/repositories"
	"biotak-go-backend/internal/services"
	"log"

	"github.com/gin-gonic/gin"
)

// This example demonstrates how to setup and use the PostHandler
// This is for documentation purposes only - not meant to be run directly

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database connections
	dbConfig := database.DefaultConfig(cfg.DatabaseURL)
	entClientWrapper, err := database.NewEntClient(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer entClientWrapper.Close()

	// Get the actual Ent client
	entClient := entClientWrapper.GetClient()

	// Initialize Redis (optional)
	var redisClient *database.RedisClient
	if cfg.RedisURL != "" {
		redisConfig := database.DefaultRedisConfig(cfg.RedisURL)
		redisClient, err = database.NewRedisClient(redisConfig)
		if err != nil {
			log.Printf("Warning: Failed to connect to Redis: %v", err)
			redisClient = nil
		} else {
			defer redisClient.Close()
		}
	}

	// Initialize repositories
	postRepo := repositories.NewPostRepository(entClient)

	// Initialize services
	postService := services.NewPostService(postRepo, entClient, redisClient)

	// Initialize handlers
	postHandler := handlers.NewPostHandler(postService)

	// Create Gin router
	router := gin.Default()

	// Apply global middleware
	router.Use(middleware.ErrorHandlerMiddleware())
	router.Use(middleware.LoggerMiddleware())
	router.Use(middleware.SecureCORS(cfg.AppURL))

	// Setup API routes
	api := router.Group("/api/v1")
	// Note: GlobalRateLimit expects *redis.Client, not *database.RedisClient
	// For simplicity in this example, we'll skip rate limiting
	// In production, you would extract the redis.Client from RedisClient
	// api.Use(middleware.GlobalRateLimit(redisClient.Client))

	// Public post routes (no authentication required)
	{
		// Get post by ID
		api.GET("/posts/:id", postHandler.GetPost)

		// Get post by slug
		api.GET("/posts/slug/:slug", postHandler.GetPostBySlug)

		// List posts with filters
		// Query params: page, pageSize, categoryId, tagId, authorId, status, postType, dateFrom, dateTo, search
		// Example: GET /api/v1/posts?page=1&pageSize=10&status=PUBLISHED&categoryId=123
		api.GET("/posts", postHandler.ListPosts)
	}

	// Protected post routes (authentication required)
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())
	{
		// Create a new post (any authenticated user can create)
		// POST /api/v1/posts
		// Body: {
		//   "title": "My Post Title",
		//   "content": "Post content here...",
		//   "excerpt": "Optional excerpt",
		//   "featured_image": "https://example.com/image.jpg",
		//   "post_type": "STANDARD",
		//   "category_ids": ["cat-id-1", "cat-id-2"],
		//   "tag_ids": ["tag-id-1", "tag-id-2"]
		// }
		protected.POST("/posts", postHandler.CreatePost)

		// Update a post (author or admin only)
		// PUT /api/v1/posts/:id
		// Body: {
		//   "title": "Updated Title",
		//   "content": "Updated content",
		//   "category_ids": ["new-cat-id"]
		// }
		protected.PUT("/posts/:id", postHandler.UpdatePost)

		// Publish a post (author or admin only)
		// POST /api/v1/posts/:id/publish
		protected.POST("/posts/:id/publish", postHandler.PublishPost)
	}

	// Admin-only post routes
	admin := api.Group("")
	admin.Use(middleware.AuthMiddleware())
	admin.Use(middleware.RequireRole("ADMIN", "SUPER_ADMIN"))
	{
		// Delete a post (soft delete, admin only)
		// DELETE /api/v1/posts/:id
		admin.DELETE("/posts/:id", postHandler.DeletePost)
	}

	// Example API calls:
	//
	// 1. List all published posts:
	//    GET /api/v1/posts?status=PUBLISHED&page=1&pageSize=10
	//
	// 2. Get a specific post by slug:
	//    GET /api/v1/posts/slug/my-post-title
	//
	// 3. Create a new post (requires authentication):
	//    POST /api/v1/posts
	//    Headers: Authorization: Bearer <token>
	//    Body: {"title": "New Post", "content": "Content here..."}
	//
	// 4. Update a post (requires authentication and authorization):
	//    PUT /api/v1/posts/post-id-123
	//    Headers: Authorization: Bearer <token>
	//    Body: {"title": "Updated Title"}
	//
	// 5. Publish a post (requires authentication and authorization):
	//    POST /api/v1/posts/post-id-123/publish
	//    Headers: Authorization: Bearer <token>
	//
	// 6. Delete a post (requires admin role):
	//    DELETE /api/v1/posts/post-id-123
	//    Headers: Authorization: Bearer <token>
	//
	// 7. Filter posts by category:
	//    GET /api/v1/posts?categoryId=cat-id-123&status=PUBLISHED
	//
	// 8. Search posts:
	//    GET /api/v1/posts?search=bitcoin&status=PUBLISHED
	//
	// 9. Filter by date range:
	//    GET /api/v1/posts?dateFrom=2024-01-01T00:00:00Z&dateTo=2024-12-31T23:59:59Z

	// Start server
	log.Println("Server starting on :8080")
	log.Println("Post endpoints:")
	log.Println("  GET    /api/v1/posts           - List posts")
	log.Println("  GET    /api/v1/posts/:id       - Get post by ID")
	log.Println("  GET    /api/v1/posts/slug/:slug - Get post by slug")
	log.Println("  POST   /api/v1/posts           - Create post (auth required)")
	log.Println("  PUT    /api/v1/posts/:id       - Update post (auth + author/admin)")
	log.Println("  POST   /api/v1/posts/:id/publish - Publish post (auth + author/admin)")
	log.Println("  DELETE /api/v1/posts/:id       - Delete post (admin only)")

	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
