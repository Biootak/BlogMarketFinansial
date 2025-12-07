package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"biotak-go-backend/internal/config"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/handlers"
	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database connections
	dbConfig := database.DefaultConfig(cfg.DatabaseURL)
	entClient, err := database.NewEntClient(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer entClient.Close()

	// Initialize Redis (optional but recommended for rate limiting)
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

	// Initialize upload service
	uploadService, err := services.NewUploadService(
		cfg.S3Endpoint,
		cfg.S3AccessKey,
		cfg.S3SecretKey,
		cfg.S3BucketName,
	)
	if err != nil {
		log.Fatalf("Failed to initialize upload service: %v", err)
	}

	// Initialize upload handler
	uploadHandler := handlers.NewUploadHandler(uploadService)

	// Setup Gin router
	router := gin.Default()

	// Apply global middleware
	router.Use(middleware.ErrorHandlerMiddleware())
	router.Use(middleware.LoggerMiddleware())
	router.Use(middleware.CORSMiddleware(cfg))

	// Setup upload routes with authentication and rate limiting
	// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
	upload := router.Group("/api/v1/upload")
	upload.Use(middleware.AuthMiddleware())                   // Requires valid JWT
	if redisClient != nil {
		upload.Use(middleware.UploadRateLimit(redisClient.Client)) // 10 uploads per hour
	}
	{
		// POST /api/v1/upload - Upload a file
		// Accepts multipart/form-data with "file" field
		// Returns: { success, originalUrl, images[], message }
		upload.POST("/", uploadHandler.UploadFile)

		// DELETE /api/v1/upload/:filename - Delete a file
		// Accepts filename or full URL as path parameter
		// Returns: { success, message }
		upload.DELETE("/:filename", uploadHandler.DeleteFile)
	}

	// Example: Test the upload endpoint
	fmt.Println("Upload Handler Usage Example")
	fmt.Println("=============================")
	fmt.Println()
	fmt.Println("1. Upload a file:")
	fmt.Println("   POST /api/v1/upload")
	fmt.Println("   Headers:")
	fmt.Println("     Authorization: Bearer <your-jwt-token>")
	fmt.Println("     Content-Type: multipart/form-data")
	fmt.Println("   Body:")
	fmt.Println("     file: <your-image-file>")
	fmt.Println()
	fmt.Println("   Response:")
	fmt.Println("   {")
	fmt.Println("     \"success\": true,")
	fmt.Println("     \"originalUrl\": \"https://storage.example.com/bucket/uuid-original.jpg\",")
	fmt.Println("     \"images\": [")
	fmt.Println("       {")
	fmt.Println("         \"url\": \"https://storage.example.com/bucket/uuid-thumbnail.webp\",")
	fmt.Println("         \"width\": 150,")
	fmt.Println("         \"height\": 150,")
	fmt.Println("         \"size\": \"thumbnail\"")
	fmt.Println("       },")
	fmt.Println("       {")
	fmt.Println("         \"url\": \"https://storage.example.com/bucket/uuid-medium.webp\",")
	fmt.Println("         \"width\": 600,")
	fmt.Println("         \"height\": 400,")
	fmt.Println("         \"size\": \"medium\"")
	fmt.Println("       },")
	fmt.Println("       {")
	fmt.Println("         \"url\": \"https://storage.example.com/bucket/uuid-large.webp\",")
	fmt.Println("         \"width\": 1200,")
	fmt.Println("         \"height\": 800,")
	fmt.Println("         \"size\": \"large\"")
	fmt.Println("       }")
	fmt.Println("     ],")
	fmt.Println("     \"message\": \"File uploaded successfully\"")
	fmt.Println("   }")
	fmt.Println()
	fmt.Println("2. Delete a file:")
	fmt.Println("   DELETE /api/v1/upload/uuid-original.jpg")
	fmt.Println("   Headers:")
	fmt.Println("     Authorization: Bearer <your-jwt-token>")
	fmt.Println()
	fmt.Println("   Response:")
	fmt.Println("   {")
	fmt.Println("     \"success\": true,")
	fmt.Println("     \"message\": \"File deleted successfully\"")
	fmt.Println("   }")
	fmt.Println()
	fmt.Println("Features:")
	fmt.Println("  ✓ File validation (type, size, dimensions)")
	fmt.Println("  ✓ Image processing (resize to multiple sizes)")
	fmt.Println("  ✓ WebP conversion for optimization")
	fmt.Println("  ✓ S3/Liara storage integration")
	fmt.Println("  ✓ Automatic cleanup on upload failure")
	fmt.Println("  ✓ Authentication required (JWT)")
	fmt.Println("  ✓ Rate limiting (10 uploads per hour)")
	fmt.Println()
	fmt.Println("Validation Rules:")
	fmt.Println("  • Max file size: 10MB")
	fmt.Println("  • Allowed types: jpg, png, webp")
	fmt.Println("  • Must be a valid image file")
	fmt.Println()
	fmt.Println("Generated Sizes:")
	fmt.Println("  • Thumbnail: 150x150")
	fmt.Println("  • Medium: 600x400")
	fmt.Println("  • Large: 1200x800")
	fmt.Println("  • Original: preserved")
	fmt.Println()

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s...\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// Example curl commands for testing:
//
// 1. Upload a file:
// curl -X POST http://localhost:8080/api/v1/upload \
//   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
//   -F "file=@/path/to/image.jpg"
//
// 2. Delete a file:
// curl -X DELETE http://localhost:8080/api/v1/upload/uuid-original.jpg \
//   -H "Authorization: Bearer YOUR_JWT_TOKEN"
//
// 3. Test with invalid file type:
// curl -X POST http://localhost:8080/api/v1/upload \
//   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
//   -F "file=@/path/to/document.pdf"
//
// Expected error response:
// {
//   "error": {
//     "code": "VALIDATION_ERROR",
//     "message": "unsupported file type: application/pdf (allowed: jpg, png, webp)",
//     "details": {
//       "field": "file"
//     },
//     "timestamp": "2024-12-07T10:30:00Z",
//     "request_id": "uuid"
//   }
// }
//
// 4. Test without authentication:
// curl -X POST http://localhost:8080/api/v1/upload \
//   -F "file=@/path/to/image.jpg"
//
// Expected error response:
// {
//   "error": {
//     "code": "MISSING_TOKEN",
//     "message": "Authorization header is required"
//   }
// }
//
// 5. Test rate limiting (make 11 requests within an hour):
// for i in {1..11}; do
//   curl -X POST http://localhost:8080/api/v1/upload \
//     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
//     -F "file=@/path/to/image.jpg"
// done
//
// Expected error response on 11th request:
// {
//   "error": {
//     "code": "RATE_LIMIT_EXCEEDED",
//     "message": "Too many requests. Please try again later.",
//     "details": {
//       "limit": 10,
//       "window": "1h0m0s",
//       "retry_after": 3600,
//       "reset_at": "2024-12-07T11:30:00Z"
//     }
//   }
// }

