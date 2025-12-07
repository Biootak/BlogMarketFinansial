package database

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/ent/user"
	"biotak-go-backend/internal/config"
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// generateTestID generates a unique test ID
func generateTestID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

// setupTestClient creates a test database client
func setupTestClient(t *testing.T) (*ent.Client, func()) {
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
		// Clean up test data
		ctx := context.Background()
		client.User.Delete().ExecX(ctx)
		client.Close()
	}

	return client, cleanup
}

func TestWithTx_Success(t *testing.T) {
	client, cleanup := setupTestClient(t)
	defer cleanup()

	ctx := context.Background()

	// Test successful transaction
	err := WithTx(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
		// Create a user within transaction
		_, err := tx.User.Create().
			SetID(generateTestID("user")).
			SetEmail(fmt.Sprintf("test-%d@example.com", time.Now().UnixNano())).
			SetPassword("hashedpassword").
			SetName("Test User").
			SetRole(user.RoleUSER).
			Save(ctx)
		return err
	})

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Verify user was created
	count, err := client.User.Query().Count(ctx)
	if err != nil {
		t.Fatalf("failed to count users: %v", err)
	}

	if count != 1 {
		t.Errorf("expected 1 user, got %d", count)
	}
}

func TestWithTx_RollbackOnError(t *testing.T) {
	client, cleanup := setupTestClient(t)
	defer cleanup()

	ctx := context.Background()

	// Test transaction rollback on error
	testError := errors.New("intentional error")
	err := WithTx(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
		// Create a user within transaction
		_, err := tx.User.Create().
			SetEmail("test@example.com").
			SetPassword("hashedpassword").
			SetName("Test User").
			SetRole(user.RoleUSER).
			Save(ctx)
		if err != nil {
			return err
		}

		// Return error to trigger rollback
		return testError
	})

	if err == nil {
		t.Fatal("expected error, got nil")
	}

	if !errors.Is(err, testError) {
		t.Errorf("expected testError, got: %v", err)
	}

	// Verify user was NOT created (transaction rolled back)
	count, err := client.User.Query().Count(ctx)
	if err != nil {
		t.Fatalf("failed to count users: %v", err)
	}

	if count != 0 {
		t.Errorf("expected 0 users (rollback), got %d", count)
	}
}

func TestWithTx_RollbackOnPanic(t *testing.T) {
	client, cleanup := setupTestClient(t)
	defer cleanup()

	ctx := context.Background()

	// Test transaction rollback on panic
	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic, got none")
		}
	}()

	_ = WithTx(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
		// Create a user within transaction
		_, err := tx.User.Create().
			SetEmail("test@example.com").
			SetPassword("hashedpassword").
			SetName("Test User").
			SetRole(user.RoleUSER).
			Save(ctx)
		if err != nil {
			return err
		}

		// Panic to trigger rollback
		panic("intentional panic")
	})

	// This should not be reached due to panic
	// But if it is, verify rollback happened
	count, err := client.User.Query().Count(ctx)
	if err != nil {
		t.Fatalf("failed to count users: %v", err)
	}

	if count != 0 {
		t.Errorf("expected 0 users (rollback on panic), got %d", count)
	}
}

func TestWithTxResult_Success(t *testing.T) {
	client, cleanup := setupTestClient(t)
	defer cleanup()

	ctx := context.Background()

	// Test successful transaction with result
	createdUser, err := WithTxResult(ctx, client, func(ctx context.Context, tx *ent.Tx) (*ent.User, error) {
		return tx.User.Create().
			SetEmail("test@example.com").
			SetPassword("hashedpassword").
			SetName("Test User").
			SetRole(user.RoleUSER).
			Save(ctx)
	})

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if createdUser == nil {
		t.Fatal("expected user, got nil")
	}

	if createdUser.Email != "test@example.com" {
		t.Errorf("expected email 'test@example.com', got '%s'", createdUser.Email)
	}

	// Verify user was created
	count, err := client.User.Query().Count(ctx)
	if err != nil {
		t.Fatalf("failed to count users: %v", err)
	}

	if count != 1 {
		t.Errorf("expected 1 user, got %d", count)
	}
}

func TestWithTxResult_RollbackOnError(t *testing.T) {
	client, cleanup := setupTestClient(t)
	defer cleanup()

	ctx := context.Background()

	// Test transaction rollback on error with result
	testError := errors.New("intentional error")
	createdUser, err := WithTxResult(ctx, client, func(ctx context.Context, tx *ent.Tx) (*ent.User, error) {
		// Create a user within transaction
		user, err := tx.User.Create().
			SetEmail("test@example.com").
			SetPassword("hashedpassword").
			SetName("Test User").
			SetRole(user.RoleUSER).
			Save(ctx)
		if err != nil {
			return nil, err
		}

		// Return error to trigger rollback
		return user, testError
	})

	if err == nil {
		t.Fatal("expected error, got nil")
	}

	if !errors.Is(err, testError) {
		t.Errorf("expected testError, got: %v", err)
	}

	if createdUser != nil {
		t.Error("expected nil user on error, got user")
	}

	// Verify user was NOT created (transaction rolled back)
	count, err := client.User.Query().Count(ctx)
	if err != nil {
		t.Fatalf("failed to count users: %v", err)
	}

	if count != 0 {
		t.Errorf("expected 0 users (rollback), got %d", count)
	}
}

func TestWithTx_MultipleOperations_RollbackAll(t *testing.T) {
	client, cleanup := setupTestClient(t)
	defer cleanup()

	ctx := context.Background()

	// Test that all operations are rolled back on error
	testError := errors.New("intentional error")
	err := WithTx(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
		// Create first user
		_, err := tx.User.Create().
			SetEmail("user1@example.com").
			SetPassword("hashedpassword").
			SetName("User 1").
			SetRole(user.RoleUSER).
			Save(ctx)
		if err != nil {
			return err
		}

		// Create second user
		_, err = tx.User.Create().
			SetEmail("user2@example.com").
			SetPassword("hashedpassword").
			SetName("User 2").
			SetRole(user.RoleAUTHOR).
			Save(ctx)
		if err != nil {
			return err
		}

		// Create third user
		_, err = tx.User.Create().
			SetEmail("user3@example.com").
			SetPassword("hashedpassword").
			SetName("User 3").
			SetRole(user.RoleADMIN).
			Save(ctx)
		if err != nil {
			return err
		}

		// Return error to trigger rollback of ALL operations
		return testError
	})

	if err == nil {
		t.Fatal("expected error, got nil")
	}

	// Verify NO users were created (all rolled back)
	count, err := client.User.Query().Count(ctx)
	if err != nil {
		t.Fatalf("failed to count users: %v", err)
	}

	if count != 0 {
		t.Errorf("expected 0 users (all operations rolled back), got %d", count)
	}
}
