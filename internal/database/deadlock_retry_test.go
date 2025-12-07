package database

import (
	"errors"
	"testing"

	"github.com/lib/pq"
)

func TestIsDeadlockError_PostgreSQL(t *testing.T) {
	// Test PostgreSQL deadlock error
	pqErr := &pq.Error{
		Code: "40P01", // PostgreSQL deadlock error code
	}

	if !IsDeadlockError(pqErr) {
		t.Error("expected true for PostgreSQL deadlock error, got false")
	}
}

func TestIsDeadlockError_NonDeadlock(t *testing.T) {
	// Test non-deadlock error
	pqErr := &pq.Error{
		Code: "23505", // Unique violation
	}

	if IsDeadlockError(pqErr) {
		t.Error("expected false for non-deadlock error, got true")
	}
}

func TestIsDeadlockError_GenericDeadlock(t *testing.T) {
	// Test generic deadlock error message
	err := errors.New("database deadlock detected")

	if !IsDeadlockError(err) {
		t.Error("expected true for generic deadlock error, got false")
	}
}

func TestIsDeadlockError_LockWaitTimeout(t *testing.T) {
	// Test lock wait timeout error
	err := errors.New("lock wait timeout exceeded")

	if !IsDeadlockError(err) {
		t.Error("expected true for lock wait timeout error, got false")
	}
}

func TestIsDeadlockError_Nil(t *testing.T) {
	// Test nil error
	if IsDeadlockError(nil) {
		t.Error("expected false for nil error, got true")
	}
}

func TestIsDeadlockError_OtherError(t *testing.T) {
	// Test other error
	err := errors.New("some other database error")

	if IsDeadlockError(err) {
		t.Error("expected false for other error, got true")
	}
}

// Note: Integration tests for actual deadlock retry behavior
// should be in tests/integration/ directory with real database
// These tests would simulate concurrent transactions that cause deadlocks
