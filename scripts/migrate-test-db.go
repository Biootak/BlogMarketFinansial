package main

import (
	"context"
	"fmt"
	"log"

	"biotak-go-backend/ent"
	"biotak-go-backend/internal/config"

	_ "github.com/lib/pq"
)

func main() {
	// Load test configuration
	if err := config.LoadTestConfig(); err != nil {
		log.Printf("Warning: Could not load .env.test: %v", err)
	}

	// Get database URL
	dbURL := config.GetTestDatabaseURL()
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set in environment")
	}

	fmt.Printf("📊 Connecting to database...\n")
	fmt.Printf("   URL: %s\n\n", maskPassword(dbURL))

	// Create Ent client
	client, err := ent.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer client.Close()

	ctx := context.Background()

	// Run migrations
	fmt.Println("🔄 Running database migrations...")
	if err := client.Schema.Create(ctx); err != nil {
		log.Fatalf("❌ Failed to create schema: %v", err)
	}

	fmt.Println("✅ Database schema created successfully!")
	fmt.Println("")
	fmt.Println("You can now run tests with:")
	fmt.Println("  go test ./... -v")
}

// maskPassword masks the password in the database URL for display
func maskPassword(url string) string {
	// Simple masking - just show first few chars
	if len(url) > 50 {
		return url[:30] + "..." + url[len(url)-20:]
	}
	return url
}
