package router

import (
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/handlers"
	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/repositories"
	"biotak-go-backend/internal/services"
	"biotak-go-backend/pkg/logger"
	"time"

	"github.com/gin-gonic/gin"
)

// RouterConfig holds configuration for router setup
type RouterConfig struct {
	EntClient   *database.EntClient
	RedisClient *database.RedisClient
	Logger      *logger.Logger
	JWTSecret   string
	S3Endpoint  string
	S3AccessKey string
	S3SecretKey string
	S3Bucket    string
}

// SetupRouter initializes and configures the Gin router with all routes and middleware
func SetupRouter(config *RouterConfig) *gin.Engine {
	// Create Gin router
	router := gin.New()

	// Apply global middleware
	router.Use(gin.Recovery()) // Recover from panics
	router.Use(middleware.RequestIDMiddleware()) // Add request ID to context
	router.Use(middleware.LoggerMiddleware()) // Structured logging
	router.Use(middleware.ErrorHandlerMiddleware()) // Error handling
	router.Use(middleware.CORSMiddleware(middleware.DefaultCORSConfig("http://localhost:3000"))) // CORS configuration
	router.Use(middleware.SecurityHeaders()) // Security headers

	// Initialize repositories
	postRepo := repositories.NewPostRepository(config.EntClient.Client)
	commentRepo := repositories.NewCommentRepository(config.EntClient.Client)

	// Initialize services
	authService := services.NewAuthService(config.EntClient.Client, config.RedisClient)
	postService := services.NewPostService(postRepo, config.EntClient.Client, config.RedisClient)
	commentService := services.NewCommentService(commentRepo, config.EntClient.Client, config.RedisClient)
	exchangeService := services.NewExchangeRateService(config.EntClient.Client, config.RedisClient.Client)
	uploadService, err := services.NewUploadService(config.S3Endpoint, config.S3AccessKey, config.S3SecretKey, config.S3Bucket)
	if err != nil {
		panic("Failed to initialize upload service: " + err.Error())
	}
	reportService := services.NewReportService(config.EntClient.Client, config.RedisClient.Client)
	featureFlagService := services.NewFeatureFlagService(config.RedisClient.Client)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(config.EntClient, config.RedisClient)
	authHandler := handlers.NewAuthHandler(authService)
	postHandler := handlers.NewPostHandler(postService)
	commentHandler := handlers.NewCommentHandler(commentService)
	exchangeHandler := handlers.NewExchangeRateHandler(exchangeService)
	uploadHandler := handlers.NewUploadHandler(uploadService)
	reportHandler := handlers.NewReportHandler(reportService)
	featureFlagHandler := handlers.NewFeatureFlagHandler(featureFlagService)

	// Health check endpoints (no authentication required)
	router.GET("/health", healthHandler.Check)
	router.GET("/health/ready", healthHandler.Ready)
	router.GET("/health/live", healthHandler.Live)
	router.GET("/health/detailed", 
		middleware.AuthMiddleware(),
		middleware.RequireRole("ADMIN", "SUPER_ADMIN"),
		healthHandler.Detailed,
	)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Authentication routes (no auth required)
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/register", authHandler.Register)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/me", 
				middleware.AuthMiddleware(),
				authHandler.Me,
			)
		}

		// Post routes
		posts := v1.Group("/posts")
		{
			// Public routes
			posts.GET("", postHandler.ListPosts)
			posts.GET("/:id", postHandler.GetPost)
			posts.GET("/slug/:slug", postHandler.GetPostBySlug)

			// Protected routes (require authentication)
			posts.POST("", 
				middleware.AuthMiddleware(),
				middleware.RequireRole("AUTHOR", "ADMIN", "SUPER_ADMIN"),
				postHandler.CreatePost,
			)
			posts.PUT("/:id", 
				middleware.AuthMiddleware(),
				middleware.RequireRole("AUTHOR", "ADMIN", "SUPER_ADMIN"),
				postHandler.UpdatePost,
			)
			posts.POST("/:id/publish", 
				middleware.AuthMiddleware(),
				middleware.RequireRole("AUTHOR", "ADMIN", "SUPER_ADMIN"),
				postHandler.PublishPost,
			)
			posts.DELETE("/:id", 
				middleware.AuthMiddleware(),
				middleware.RequireRole("ADMIN", "SUPER_ADMIN"),
				postHandler.DeletePost,
			)
		}

		// Comment routes
		comments := v1.Group("/comments")
		{
			// Public route (with optional auth for visibility)
			v1.GET("/posts/:postId/comments", commentHandler.GetCommentsByPost)

			// Protected routes (require authentication)
			comments.POST("", 
				middleware.AuthMiddleware(),
				commentHandler.CreateComment,
			)
			comments.PUT("/:id/moderate", 
				middleware.AuthMiddleware(),
				middleware.RequireRole("ADMIN", "SUPER_ADMIN"),
				commentHandler.ModerateComment,
			)
			comments.DELETE("/:id", 
				middleware.AuthMiddleware(),
				commentHandler.DeleteComment,
			)
		}

		// Exchange rate routes (public)
		exchangeRates := v1.Group("/exchange-rates")
		{
			exchangeRates.GET("", exchangeHandler.GetRates)
			exchangeRates.GET("/historical", exchangeHandler.GetHistoricalRates)
		}

		// Upload routes (protected, with rate limiting)
		upload := v1.Group("/upload")
		upload.Use(middleware.AuthMiddleware())
		upload.Use(middleware.RateLimitMiddleware(config.RedisClient.Client, 10, time.Hour)) // 10 uploads per hour
		{
			upload.POST("", uploadHandler.UploadFile)
			upload.DELETE("/:filename", uploadHandler.DeleteFile)
		}

		// Report routes (admin only)
		reports := v1.Group("/reports")
		reports.Use(middleware.AuthMiddleware())
		reports.Use(middleware.RequireRole("ADMIN", "SUPER_ADMIN"))
		{
			reports.GET("/user-activity", reportHandler.GetUserActivityReport)
			reports.GET("/content", reportHandler.GetContentReport)
			reports.GET("/system-health", reportHandler.GetSystemHealthReport)
			reports.GET("/jobs/:jobId", reportHandler.GetJobStatus)
		}

		// Feature flag routes (admin only)
		featureFlags := v1.Group("/feature-flags")
		featureFlags.Use(middleware.AuthMiddleware())
		featureFlags.Use(middleware.RequireRole("ADMIN", "SUPER_ADMIN"))
		{
			featureFlags.GET("", featureFlagHandler.ListFlags)
			featureFlags.GET("/:name", featureFlagHandler.GetFlag)
			featureFlags.PUT("/:name", featureFlagHandler.UpdateFlag)
			featureFlags.PATCH("/:name/rollout", featureFlagHandler.UpdateRollout)
			featureFlags.POST("/initialize", featureFlagHandler.InitializeFlags)
			featureFlags.GET("/:name/check", featureFlagHandler.CheckFlag)
		}
	}

	return router
}
