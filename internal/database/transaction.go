package database

import (
	"biotak-go-backend/ent"
	"context"
	"fmt"
)

// TxFunc is a function that executes within a transaction
type TxFunc func(ctx context.Context, tx *ent.Tx) error

// WithTx executes a function within a database transaction
// If the function returns an error, the transaction is rolled back
// Otherwise, the transaction is committed
func WithTx(ctx context.Context, client *ent.Client, fn TxFunc) error {
	// Begin transaction
	tx, err := client.Tx(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	// Defer rollback in case of panic or error
	defer func() {
		if v := recover(); v != nil {
			_ = tx.Rollback()
			panic(v)
		}
	}()

	// Execute function
	if err := fn(ctx, tx); err != nil {
		// Rollback on error
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("failed to rollback transaction: %v (original error: %w)", rbErr, err)
		}
		return err
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// WithTxResult executes a function within a transaction and returns a result
// If the function returns an error, the transaction is rolled back
// Otherwise, the transaction is committed and the result is returned
func WithTxResult[T any](ctx context.Context, client *ent.Client, fn func(ctx context.Context, tx *ent.Tx) (T, error)) (T, error) {
	var result T

	// Begin transaction
	tx, err := client.Tx(ctx)
	if err != nil {
		return result, fmt.Errorf("failed to begin transaction: %w", err)
	}

	// Defer rollback in case of panic or error
	defer func() {
		if v := recover(); v != nil {
			_ = tx.Rollback()
			panic(v)
		}
	}()

	// Execute function
	result, err = fn(ctx, tx)
	if err != nil {
		// Rollback on error
		if rbErr := tx.Rollback(); rbErr != nil {
			return result, fmt.Errorf("failed to rollback transaction: %v (original error: %w)", rbErr, err)
		}
		return result, err
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return result, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return result, nil
}
