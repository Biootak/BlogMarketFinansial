package database

import (
	"errors"
	"fmt"
)

var (
	// ErrVersionMismatch is returned when optimistic locking detects a version conflict
	ErrVersionMismatch = errors.New("version mismatch: record was modified by another transaction")
)

// CheckVersion verifies that the current version matches the expected version
// This is used for optimistic locking to prevent lost updates
func CheckVersion(currentVersion, expectedVersion int) error {
	if currentVersion != expectedVersion {
		return fmt.Errorf("%w: expected version %d, got %d", 
			ErrVersionMismatch, expectedVersion, currentVersion)
	}
	return nil
}

// IncrementVersion returns the next version number
func IncrementVersion(currentVersion int) int {
	return currentVersion + 1
}
