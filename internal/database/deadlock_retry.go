package database

import (
	"biotak-go-backend/ent"
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

const (
	// MaxRetries is the maximum number of retry attempts for deadlock
	MaxRetries = 3
	// InitialBackoff is the initial backoff duration
	InitialBackoff = 100 * time.Millisecond
)

var (
	// ErrMaxRetriesExceeded is returned when max retry attempts are exceeded
	ErrMaxRetriesExceeded = errors.New("maximum retry attempts exceeded")
)

// IsDeadlockError checks if an error is a database deadlock error
func IsDeadlockError(err error) bool {
	if err == nil {
		return false
	}

	// Check for PostgreSQL deadlock error
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		// PostgreSQL deadlock error code is "40P01"
		return pqErr.Code == "40P01"
	}

	// Check for common deadlock error messages
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "deadlock") ||
		strings.Contains(errMsg, "lock wait timeout")
}

// WithTxRetry executes a function within a transaction with automatic retry on deadlock
// It will retry up to MaxRetries times with exponential backoff
func WithTxRetry(ctx context.Context, client *ent.Client, fn TxFunc) error {
	var lastErr error

	for attempt := 0; attempt <= MaxRetries; attempt++ {
		// Execute transaction
		err := WithTx(ctx, client, fn)

		// If successful, return
		if err == nil {
			return nil
		}

		// Store the error
		lastErr = err

		// Check if it's a deadlock error
		if !IsDeadlockError(err) {
			// Not a deadlock, return error immediately
			return err
		}

		// If we've exhausted retries, return error
		if attempt == MaxRetries {
			return fmt.Errorf("%w after %d attempts: %v", ErrMaxRetriesExceeded, MaxRetries, lastErr)
		}

		// Calculate backoff duration with exponential backoff
		backoff := InitialBackoff * time.Duration(1<<uint(attempt))

		// Log retry attempt (in production, use proper logger)
		fmt.Printf("Deadlock detected, retrying in %v (attempt %d/%d)\n", backoff, attempt+1, MaxRetries)

		// Wait before retrying
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(backoff):
			// Continue to next retry
		}
	}

	return lastErr
}

// WithTxResultRetry executes a function within a transaction with automatic retry on deadlock
// It will retry up to MaxRetries times with exponential backoff and return a result
func WithTxResultRetry[T any](ctx context.Context, client *ent.Client, fn func(ctx context.Context, tx *ent.Tx) (T, error)) (T, error) {
	var result T
	var lastErr error

	for attempt := 0; attempt <= MaxRetries; attempt++ {
		// Execute transaction
		res, err := WithTxResult(ctx, client, fn)

		// If successful, return result
		if err == nil {
			return res, nil
		}

		// Store the error
		lastErr = err

		// Check if it's a deadlock error
		if !IsDeadlockError(err) {
			// Not a deadlock, return error immediately
			return result, err
		}

		// If we've exhausted retries, return error
		if attempt == MaxRetries {
			return result, fmt.Errorf("%w after %d attempts: %v", ErrMaxRetriesExceeded, MaxRetries, lastErr)
		}

		// Calculate backoff duration with exponential backoff
		backoff := InitialBackoff * time.Duration(1<<uint(attempt))

		// Log retry attempt (in production, use proper logger)
		fmt.Printf("Deadlock detected, retrying in %v (attempt %d/%d)\n", backoff, attempt+1, MaxRetries)

		// Wait before retrying
		select {
		case <-ctx.Done():
			return result, ctx.Err()
		case <-time.After(backoff):
			// Continue to next retry
		}
	}

	return result, lastErr
}
