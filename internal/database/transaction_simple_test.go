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

// Simple transaction tests using PostgreSQL

func TestTransactionBasics(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping database test in short mode")
	}

	// Load test configuration
	config.LoadTestConfig()

	// Create test client
	dbURL := config.GetTestDatabaseURL()
	client, err := ent.Open("postgres", dbURL)
	if err != nil {
		t.Skipf("Skipping test: cannot connect to test database: %v", err)
	}
	defer client.Close()

	ctx := context.Background()

	// Ensure schema exists
	if err := client.Schema.Create(ctx); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	t.Run("successful transaction commits", func(t *testing.T) {
		// Clean up before test
		client.User.Delete().ExecX(ctx)

		err := WithTx(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
			_, err := tx.User.Create().
				SetID(fmt.Sprintf("user-%d", time.Now().UnixNano())).
				SetEmail(fmt.Sprintf("test-%d@example.com", time.Now().UnixNano())).
				SetPassword("hashed").
				SetName("Test").
				SetRole(user.RoleUSER).
				Save(ctx)
			return err
		})

		if err != nil {
			t.Fatalf("transaction failed: %v", err)
		}

		// Verify user was created
		count, err := client.User.Query().Count(ctx)
		if err != nil {
			t.Fatalf("failed to count users: %v", err)
		}

		if count != 1 {
			t.Errorf("expected 1 user, got %d", count)
		}

		// Clean up
		client.User.Delete().ExecX(ctx)
	})

	t.Run("failed transaction rolls back", func(t *testing.T) {
		// Clean up before test
		client.User.Delete().ExecX(ctx)

		testError := errors.New("test error")
		err := WithTx(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
			_, err := tx.User.Create().
				SetID(fmt.Sprintf("user-%d", time.Now().UnixNano())).
				SetEmail(fmt.Sprintf("test-%d@example.com", time.Now().UnixNano())).
				SetPassword("hashed").
				SetName("Test").
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

		// Verify user was NOT created (rolled back)
		count, err := client.User.Query().Count(ctx)
		if err != nil {
			t.Fatalf("failed to count users: %v", err)
		}

		if count != 0 {
			t.Errorf("expected 0 users (rollback), got %d", count)
		}
	})

	t.Run("multiple operations rollback together", func(t *testing.T) {
		// Clean up before test
		client.User.Delete().ExecX(ctx)

		testError := errors.New("test error")
		err := WithTx(ctx, client, func(ctx context.Context, tx *ent.Tx) error {
			// Create multiple users
			for i := 0; i < 3; i++ {
				_, err := tx.User.Create().
					SetID(fmt.Sprintf("user-%d-%d", i, time.Now().UnixNano())).
					SetEmail(fmt.Sprintf("test-%d-%d@example.com", i, time.Now().UnixNano())).
					SetPassword("hashed").
					SetName(fmt.Sprintf("User %d", i)).
					SetRole(user.RoleUSER).
					Save(ctx)
				if err != nil {
					return err
				}
			}

			// Return error to rollback all
			return testError
		})

		if err == nil {
			t.Fatal("expected error, got nil")
		}

		// Verify NO users were created
		count, err := client.User.Query().Count(ctx)
		if err != nil {
			t.Fatalf("failed to count users: %v", err)
		}

		if count != 0 {
			t.Errorf("expected 0 users (all rolled back), got %d", count)
		}
	})
}
