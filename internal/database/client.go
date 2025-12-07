package database

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/pkg/logger"
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "github.com/lib/pq" // PostgreSQL driver
)

// EntClient wraps the generated Ent client
type EntClient struct {
	Client *ent.Client
	DB     *entsql.Driver
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

// slowQueryDriver wraps the SQL driver to log slow queries
type slowQueryDriver struct {
	*entsql.Driver
	threshold time.Duration
}

// Exec wraps the Exec method to log slow queries
func (d *slowQueryDriver) Exec(ctx context.Context, query string, args, v interface{}) error {
	start := time.Now()
	err := d.Driver.Exec(ctx, query, args, v)
	duration := time.Since(start)

	if duration > d.threshold {
		logger.Warn("Slow query detected", map[string]interface{}{
			"query":        query,
			"duration_ms":  duration.Milliseconds(),
			"threshold_ms": d.threshold.Milliseconds(),
		})
	}

	return err
}

// Query wraps the Query method to log slow queries
func (d *slowQueryDriver) Query(ctx context.Context, query string, args, v interface{}) error {
	start := time.Now()
	err := d.Driver.Query(ctx, query, args, v)
	duration := time.Since(start)

	if duration > d.threshold {
		logger.Warn("Slow query detected", map[string]interface{}{
			"query":        query,
			"duration_ms":  duration.Milliseconds(),
			"threshold_ms": d.threshold.Milliseconds(),
		})
	}

	return err
}

// NewEntClient creates a new Ent client with PostgreSQL connection
func NewEntClient(config *Config) (*EntClient, error) {
	if config.DatabaseURL == "" {
		return nil, fmt.Errorf("database URL is required")
	}

	// Open database connection
	drv, err := entsql.Open(dialect.Postgres, config.DatabaseURL)
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

	// Wrap driver with slow query logging (100ms threshold)
	slowQueryDrv := &slowQueryDriver{
		Driver:    drv,
		threshold: 100 * time.Millisecond,
	}

	// Create Ent client with the slow query driver
	client := ent.NewClient(ent.Driver(slowQueryDrv))

	log.Println("✅ PostgreSQL connection established successfully")
	log.Println("✅ Ent client initialized with generated schemas")

	return &EntClient{
		Client: client,
		DB:     drv,
	}, nil
}

// Close closes the database connection
func (c *EntClient) Close() error {
	if c.Client != nil {
		return c.Client.Close()
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

// GetClient returns the Ent client for database operations
func (c *EntClient) GetClient() *ent.Client {
	return c.Client
}
