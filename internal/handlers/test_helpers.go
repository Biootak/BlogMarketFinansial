package handlers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/internal/config"

	_ "github.com/lib/pq"
)

// setupTestDB creates a test database client for handlers
func setupTestDB(t *testing.T) (*ent.Client, func()) {
	if testing.Short() {
		t.Skip("Skipping database test in short mode")
	}

	// Load test configuration
	config.LoadTestConfig()

	// Create test client with PostgreSQL
	dbURL := config.GetTestDatabaseURL()
	client, err := ent.Open("postgres", dbURL)
	if err != nil {
		t.Skipf("Skipping test: cannot connect to test database: %v", err)
	}

	ctx := context.Background()

	// Run migrations
	if err := client.Schema.Create(ctx); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	// Cleanup function
	cleanup := func() {
		ctx := context.Background()
		// Clean up all test data
		client.Comment.Delete().ExecX(ctx)
		client.Post.Delete().ExecX(ctx)
		client.User.Delete().ExecX(ctx)
		client.ExchangeRate.Delete().ExecX(ctx)
		client.Close()
	}

	return client, cleanup
}

// generateTestID generates a unique test ID
func generateTestID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

// generateTestEmail generates a unique test email
func generateTestEmail() string {
	return fmt.Sprintf("test-%d@example.com", time.Now().UnixNano())
}
