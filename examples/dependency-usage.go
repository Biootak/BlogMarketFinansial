package examples

// This file demonstrates basic usage of each core dependency
// These are examples only - actual implementation will be in internal/ packages

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

// Example 1: Gin Framework - HTTP Handler
func exampleGinHandler() {
	// Create a Gin router
	router := gin.Default()

	// Define a simple route
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	// Start server (example only - don't run in production like this)
	// router.Run(":8080")
}

// Example 2: JWT - Token Generation and Validation
func exampleJWT() {
	// Create JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": "123",
		"role":    "ADMIN",
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	// Sign token with secret
	secret := []byte("your-secret-key")
	tokenString, _ := token.SignedString(secret)

	// Validate token
	parsedToken, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return secret, nil
	})

	_ = parsedToken // Use the parsed token
}

// Example 3: Bcrypt - Password Hashing
func exampleBcrypt() {
	password := "mySecurePassword123"

	// Hash password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	// Compare password
	err := bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
	_ = err // Check if password matches
}

// Example 4: UUID - Generate Unique IDs
func exampleUUID() {
	// Generate new UUID
	id := uuid.New()

	// Convert to string
	idString := id.String()

	// Parse UUID from string
	parsedID, _ := uuid.Parse(idString)
	_ = parsedID
}

// Example 5: Redis - Caching
func exampleRedis() {
	// Create Redis client
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", // no password
		DB:       0,  // default DB
	})

	ctx := context.Background()

	// Set value
	rdb.Set(ctx, "key", "value", time.Hour)

	// Get value
	val, _ := rdb.Get(ctx, "key").Result()
	_ = val
}

// Example 6: Validator - Struct Validation
type User struct {
	Email    string `validate:"required,email"`
	Password string `validate:"required,min=8"`
	Age      int    `validate:"required,gte=18"`
}

func exampleValidator() {
	validate := validator.New()

	user := User{
		Email:    "user@example.com",
		Password: "password123",
		Age:      25,
	}

	// Validate struct
	err := validate.Struct(user)
	_ = err // Check validation errors
}

// Example 7: AWS S3 SDK - File Upload (structure only)
// Actual implementation will use aws-sdk-go-v2
func exampleS3Upload() {
	// This is a placeholder showing the structure
	// Actual implementation will be in internal/services/upload_service.go

	/*
		import (
			"github.com/aws/aws-sdk-go-v2/config"
			"github.com/aws/aws-sdk-go-v2/service/s3"
		)

		// Load AWS config
		cfg, _ := config.LoadDefaultConfig(context.TODO())

		// Create S3 client
		client := s3.NewFromConfig(cfg)

		// Upload file
		// client.PutObject(...)
	*/
}

// Example 8: Ent ORM - Database Operations (structure only)
// Actual implementation will be after schema generation
func exampleEntORM() {
	// This is a placeholder showing the structure
	// Actual implementation will be in internal/repositories/

	/*
		import "biotak-go-backend/ent"

		// Create Ent client
		client, _ := ent.Open("postgres", "connection-string")
		defer client.Close()

		// Query users
		users, _ := client.User.Query().All(context.Background())

		// Create user
		user, _ := client.User.Create().
			SetEmail("user@example.com").
			SetName("John Doe").
			Save(context.Background())
	*/
}

// Note: These are simplified examples for demonstration purposes.
// Production code will have proper error handling, configuration, and structure.
