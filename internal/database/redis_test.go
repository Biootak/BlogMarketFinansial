package database

import (
	"testing"
	"time"
)

func TestDefaultRedisConfig(t *testing.T) {
	redisURL := "redis://localhost:6379"
	config := DefaultRedisConfig(redisURL)

	if config.URL != redisURL {
		t.Errorf("Expected URL %s, got %s", redisURL, config.URL)
	}

	if config.MaxRetries != 3 {
		t.Errorf("Expected MaxRetries 3, got %d", config.MaxRetries)
	}

	if config.PoolSize != 10 {
		t.Errorf("Expected PoolSize 10, got %d", config.PoolSize)
	}

	if config.MinIdleConns != 5 {
		t.Errorf("Expected MinIdleConns 5, got %d", config.MinIdleConns)
	}
}

func TestNewRedisClient_EmptyURL(t *testing.T) {
	config := &RedisConfig{
		URL: "",
	}

	_, err := NewRedisClient(config)
	if err == nil {
		t.Error("Expected error for empty Redis URL, got nil")
	}
}

func TestNewRedisClient_InvalidURL(t *testing.T) {
	config := &RedisConfig{
		URL:             "invalid-url",
		MaxRetries:      3,
		PoolSize:        10,
		MinIdleConns:    5,
		ConnMaxLifetime: 5 * time.Minute,
		ConnMaxIdleTime: 2 * time.Minute,
		DialTimeout:     5 * time.Second,
		ReadTimeout:     3 * time.Second,
		WriteTimeout:    3 * time.Second,
	}

	_, err := NewRedisClient(config)
	if err == nil {
		t.Error("Expected error for invalid Redis URL, got nil")
	}
}

// Note: Integration tests with actual Redis connection
// should be in tests/integration/ directory
