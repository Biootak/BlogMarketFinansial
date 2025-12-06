package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClient wraps the Redis client
type RedisClient struct {
	Client *redis.Client
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	URL             string
	MaxRetries      int
	PoolSize        int
	MinIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
	DialTimeout     time.Duration
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
}

// DefaultRedisConfig returns default Redis configuration
func DefaultRedisConfig(redisURL string) *RedisConfig {
	return &RedisConfig{
		URL:             redisURL,
		MaxRetries:      3,
		PoolSize:        10,
		MinIdleConns:    5,
		ConnMaxLifetime: 5 * time.Minute,
		ConnMaxIdleTime: 2 * time.Minute,
		DialTimeout:     5 * time.Second,
		ReadTimeout:     3 * time.Second,
		WriteTimeout:    3 * time.Second,
	}
}

// NewRedisClient creates a new Redis client
func NewRedisClient(config *RedisConfig) (*RedisClient, error) {
	if config.URL == "" {
		return nil, fmt.Errorf("redis URL is required")
	}

	// Parse Redis URL
	opt, err := redis.ParseURL(config.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	// Configure connection pool
	opt.MaxRetries = config.MaxRetries
	opt.PoolSize = config.PoolSize
	opt.MinIdleConns = config.MinIdleConns
	opt.ConnMaxLifetime = config.ConnMaxLifetime
	opt.ConnMaxIdleTime = config.ConnMaxIdleTime
	opt.DialTimeout = config.DialTimeout
	opt.ReadTimeout = config.ReadTimeout
	opt.WriteTimeout = config.WriteTimeout

	// Create Redis client
	client := redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	log.Println("✅ Redis connection established successfully")

	return &RedisClient{Client: client}, nil
}

// Close closes the Redis connection
func (r *RedisClient) Close() error {
	if r.Client != nil {
		return r.Client.Close()
	}
	return nil
}

// Ping checks if the Redis connection is alive
func (r *RedisClient) Ping(ctx context.Context) error {
	if r.Client == nil {
		return fmt.Errorf("redis client is not initialized")
	}
	return r.Client.Ping(ctx).Err()
}

// Set stores a key-value pair with expiration
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return r.Client.Set(ctx, key, value, expiration).Err()
}

// Get retrieves a value by key
func (r *RedisClient) Get(ctx context.Context, key string) (string, error) {
	return r.Client.Get(ctx, key).Result()
}

// Delete removes a key
func (r *RedisClient) Delete(ctx context.Context, keys ...string) error {
	return r.Client.Del(ctx, keys...).Err()
}

// Exists checks if a key exists
func (r *RedisClient) Exists(ctx context.Context, keys ...string) (int64, error) {
	return r.Client.Exists(ctx, keys...).Result()
}

// SetNX sets a key only if it doesn't exist (for distributed locks)
func (r *RedisClient) SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) (bool, error) {
	return r.Client.SetNX(ctx, key, value, expiration).Result()
}

// Expire sets expiration on a key
func (r *RedisClient) Expire(ctx context.Context, key string, expiration time.Duration) error {
	return r.Client.Expire(ctx, key, expiration).Err()
}

// FlushDB clears all keys in the current database (use with caution!)
func (r *RedisClient) FlushDB(ctx context.Context) error {
	return r.Client.FlushDB(ctx).Err()
}

// Stats returns Redis connection pool statistics
func (r *RedisClient) Stats() *redis.PoolStats {
	if r.Client == nil {
		return nil
	}
	return r.Client.PoolStats()
}

// Info returns Redis server information
func (r *RedisClient) Info(ctx context.Context) (string, error) {
	return r.Client.Info(ctx).Result()
}
