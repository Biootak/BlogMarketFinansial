package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/sql"
	_ "github.com/lib/pq" // PostgreSQL driver
)

// EntClient will be replaced with actual Ent client after schema generation
// For now, we use sql.DB directly
type EntClient struct {
	DB *sql.DB
}

// Config holds database configuration
type Config struct {
	DatabaseURL      string
	MaxOpenConns     int
	MaxIdleConns     int
	ConnMaxLifetime  time.Duration
	ConnMaxIdleTime  time.Duration
	ConnectionTimeout time.Duration
}

// DefaultConfig returns default database configuration
func DefaultConfig(databaseURL string) *Config {
	return &Config{
		DatabaseURL:       databaseURL,
		MaxOpenConns:      25,
		MaxIdleConns:      10,
		ConnMaxLifetime:   5 * time.Minute,
		ConnMaxIdleTime:   2 * time.Minute,
		ConnectionTimeout: 10 * time.Second,
	}
}

// NewEntClient creates a new Ent client with PostgreSQL connection
func NewEntClient(config *Config) (*EntClient, error) {
	if config.DatabaseURL == "" {
		return nil, fmt.Errorf("database URL is required")
	}

	// Open database connection
	drv, err := sql.Open(dialect.Postgres, config.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Configure connection pool
	db := drv.DB()
	db.SetMaxOpenConns(config.MaxOpenConns)
	db.SetMaxIdleConns(config.MaxIdleConns)
	db.SetConnMaxLifetime(config.ConnMaxLifetime)
	db.SetConnMaxIdleTime(config.ConnMaxIdleTime)

	// Test connection with timeout
	ctx, cancel := context.WithTimeout(context.Background(), config.ConnectionTimeout)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ PostgreSQL connection established successfully")

	return &EntClient{DB: drv}, nil
}

// Close closes the database connection
func (c *EntClient) Close() error {
	if c.DB != nil {
		return c.DB.DB().Close()
	}
	return nil
}

// Ping checks if the database connection is alive
func (c *EntClient) Ping(ctx context.Context) error {
	if c.DB == nil {
		return fmt.Errorf("database client is not initialized")
	}
	return c.DB.DB().PingContext(ctx)
}

// Stats returns database connection pool statistics
func (c *EntClient) Stats() sql.DBStats {
	if c.DB == nil {
		return sql.DBStats{}
	}
	return c.DB.DB().Stats()
}

// Note: After Ent schemas are generated (Task 4), this file will be updated to use:
// import "biotak-go-backend/ent"
// client, err := ent.Open(dialect.Postgres, config.DatabaseURL)
