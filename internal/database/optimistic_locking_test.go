package database

import (
	"errors"
	"testing"
)

func TestCheckVersion_Success(t *testing.T) {
	// Test successful version check
	err := CheckVersion(5, 5)
	if err != nil {
		t.Errorf("expected no error for matching versions, got: %v", err)
	}
}

func TestCheckVersion_Mismatch(t *testing.T) {
	// Test version mismatch
	err := CheckVersion(5, 3)
	if err == nil {
		t.Error("expected error for version mismatch, got nil")
	}

	if err != ErrVersionMismatch && !errors.Is(err, ErrVersionMismatch) {
		t.Errorf("expected ErrVersionMismatch, got: %v", err)
	}
}

func TestIncrementVersion(t *testing.T) {
	tests := []struct {
		name            string
		currentVersion  int
		expectedVersion int
	}{
		{"increment from 1", 1, 2},
		{"increment from 5", 5, 6},
		{"increment from 100", 100, 101},
		{"increment from 0", 0, 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IncrementVersion(tt.currentVersion)
			if result != tt.expectedVersion {
				t.Errorf("expected version %d, got %d", tt.expectedVersion, result)
			}
		})
	}
}

// Note: Integration tests for optimistic locking with actual database
// should be in tests/integration/ directory
