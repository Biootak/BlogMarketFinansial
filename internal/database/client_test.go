package database

import (
	"context"
	"testing"
	"time"
)

func TestDefaultConfig(t *testing.T) {
	databaseURL := "postgresql://user:pass@localhost:5432/testdb"
	config := DefaultConfig(databaseURL)

	if config.DatabaseURL != databaseURL {
		t.Errorf("Expected DatabaseURL %s, got %s", databaseURL, config.DatabaseURL)
	}

	if config.MaxOpenConns != 25 {
		t.Errorf("Expected MaxOpenConns 25, got %d", config.MaxOpenConns)
	}

	if config.MaxIdleConns != 10 {
		t.Errorf("Expected MaxIdleConns 10, got %d", config.MaxIdleConns)
	}
}

func TestNewEntClient_EmptyURL(t *testing.T) {
	config := &Config{
		DatabaseURL: "",
	}

	_, err := NewEntClient(config)
	if err == nil {
		t.Error("Expected error for empty database URL, got nil")
	}
}

// Note: Integration tests with actual database connection
// should be in tests/integration/ directory
