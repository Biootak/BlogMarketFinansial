package main

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/internal/config"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/handlers"
	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/repositories"
	"biotak-go-backend/internal/services"
	"context"
	"log"

	"github.com/gin-gonic/gin"
)

// This example demonstrates how to set up and use the CommentHandler
func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database connection
	dbConfig := database.DefaultConfig(cfg.DatabaseURL)
	entClientWrapper, err := database.NewEntClient(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer entClientWrapper.Close()

	// Get the actual Ent client
	entClient := entClientWrapper.GetClient()

	// Run migrations
	ctx := context.Background()
	if err := entClient.Schema.Create(ctx); err != nil {
		log.Fatalf("Failed to create schema: %v", err)
	}

	// Initialize Redis client
	redisConfig := database.DefaultRedisConfig(cfg.RedisURL)
	redisClient, err := database.NewRedisClient(redisConfig)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	// Create repositories
	commentRepo := repositories.NewCommentRepository(entClient)

	// Create services
	commentService := services.NewCommentService(commentRepo, entClient, redisClient)

	// Create handlers
	commentHandler := handlers.NewCommentHandler(commentService)

	// Setup Gin router
	router := gin.Default()

	// Apply global middleware
	router.Use(middleware.LoggerMiddleware())
	router.Use(middleware.ErrorHandlerMiddleware())
	router.Use(middleware.SecureCORS(cfg.AppURL))

	// Setup API routes
	api := router.Group("/api/v1")
	{
		// Public endpoint - anyone can view comments
		// Authentication is optional but affects visibility
		api.GET("/posts/:postId/comments", commentHandler.GetCommentsByPost)

		// Authenticated endpoints
		authenticated := api.Group("")
		authenticated.Use(middleware.AuthMiddleware())
		{
			// Create comment - requires authentication
			authenticated.POST("/comments", commentHandler.CreateComment)

			// Delete comment - requires authentication (author or admin)
			authenticated.DELETE("/comments/:id", commentHandler.DeleteComment)
		}

		// Admin/moderator endpoints
		moderation := api.Group("")
		moderation.Use(middleware.AuthMiddleware())
		moderation.Use(middleware.RequireRole("ADMIN", "SUPER_ADMIN"))
		{
			// Moderate comment - requires admin role
			moderation.PUT("/comments/:id/moderate", commentHandler.ModerateComment)
		}
	}

	// Example: Create test data
	createTestData(ctx, entClient)

	// Start server
	log.Printf("Server starting on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// createTestData creates sample data for testing
func createTestData(ctx context.Context, client *ent.Client) {
	// Create test user
	user, err := client.User.Create().
		SetEmail("testuser@example.com").
		SetPassword("$2a$12$hashedpassword"). // bcrypt hash
		SetStatus("Active").
		Save(ctx)
	if err != nil {
		log.Printf("User might already exist: %v", err)
		return
	}

	// Create test post
	post, err := client.Post.Create().
		SetTitle("Test Post for Comments").
		SetSlug("test-post-comments").
		SetContent("This is a test post to demonstrate comment functionality.").
		SetStatus("PUBLISHED").
		SetPostType("STANDARD").
		SetAuthorID(user.ID).
		Save(ctx)
	if err != nil {
		log.Printf("Post might already exist: %v", err)
		return
	}

	// Create approved comment
	_, err = client.Comment.Create().
		SetContent("This is an approved comment. Great post!").
		SetApproved(true).
		SetPostID(post.ID).
		SetAuthorID(user.ID).
		Save(ctx)
	if err != nil {
		log.Printf("Failed to create approved comment: %v", err)
	}

	// Create pending comment (flagged as spam)
	_, err = client.Comment.Create().
		SetContent("Buy viagra now! Click here: http://spam.com http://spam2.com http://spam3.com http://spam4.com").
		SetApproved(false).
		SetPostID(post.ID).
		SetAuthorID(user.ID).
		Save(ctx)
	if err != nil {
		log.Printf("Failed to create pending comment: %v", err)
	}

	log.Println("Test data created successfully")
	log.Printf("Test User ID: %s", user.ID)
	log.Printf("Test Post ID: %s", post.ID)
}

/*
Example API Usage:

1. Get comments for a post (public):
   GET http://localhost:8080/api/v1/posts/{postId}/comments

   Response:
   {
     "comments": [
       {
         "id": "comment-uuid",
         "content": "This is an approved comment. Great post!",
         "approved": true,
         "postId": "post-uuid",
         "createdAt": "2024-12-07T10:00:00Z",
         "updatedAt": "2024-12-07T10:00:00Z",
         "author": {
           "id": "user-uuid",
           "name": "testuser@example.com",
           "email": "testuser@example.com"
         },
         "replies": []
       }
     ],
     "total": 1
   }

2. Create a comment (authenticated):
   POST http://localhost:8080/api/v1/comments
   Authorization: Bearer <jwt-token>
   Content-Type: application/json

   {
     "content": "This is my comment on the post",
     "post_id": "post-uuid"
   }

   Response (201 Created):
   {
     "id": "new-comment-uuid",
     "content": "This is my comment on the post",
     "approved": true,
     "postId": "post-uuid",
     "createdAt": "2024-12-07T10:30:00Z",
     "updatedAt": "2024-12-07T10:30:00Z",
     "author": {
       "id": "user-uuid",
       "name": "testuser@example.com",
       "email": "testuser@example.com"
     },
     "replies": []
   }

3. Create a nested reply:
   POST http://localhost:8080/api/v1/comments
   Authorization: Bearer <jwt-token>
   Content-Type: application/json

   {
     "content": "This is a reply to the comment",
     "post_id": "post-uuid",
     "parent_id": "parent-comment-uuid"
   }

4. Moderate a comment (admin only):
   PUT http://localhost:8080/api/v1/comments/{commentId}/moderate
   Authorization: Bearer <admin-jwt-token>
   Content-Type: application/json

   {
     "action": "approve"
   }

   Response (200 OK):
   {
     "id": "comment-uuid",
     "content": "Comment content",
     "approved": true,
     ...
   }

5. Delete a comment (author or admin):
   DELETE http://localhost:8080/api/v1/comments/{commentId}
   Authorization: Bearer <jwt-token>

   Response (200 OK):
   {
     "message": "Comment deleted successfully"
   }

Spam Detection Examples:

1. Comment with excessive links (will be flagged):
   {
     "content": "Check out http://link1.com http://link2.com http://link3.com http://link4.com",
     "post_id": "post-uuid"
   }
   Result: approved = false

2. Comment with banned keywords (will be flagged):
   {
     "content": "Buy viagra now! Limited offer!",
     "post_id": "post-uuid"
   }
   Result: approved = false

3. Comment with excessive caps (will be flagged):
   {
     "content": "THIS IS ALL CAPS AND LOOKS LIKE SPAM",
     "post_id": "post-uuid"
   }
   Result: approved = false

4. Normal comment (will be approved):
   {
     "content": "Great article! Thanks for sharing.",
     "post_id": "post-uuid"
   }
   Result: approved = true
*/
