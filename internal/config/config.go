package config

import (
	"fmt"
	"os"
)

// Config holds all configuration for the application
type Config struct {
	// Server configuration
	Port string
	Env  string

	// Database configuration
	DatabaseURL string

	// Redis configuration
	RedisURL string

	// JWT configuration
	JWTSecret string

	// S3/Liara configuration
	S3Endpoint  string
	S3Bucket    string
	S3AccessKey string
	S3SecretKey string

	// App configuration
	AppURL string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	config := &Config{
		Port:        getEnv("PORT", "8080"),
		Env:         getEnv("ENV", "development"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getEnv("AUTH_SECRET", ""),
		S3Endpoint:  getEnv("LIARA_ENDPOINT", ""),
		S3Bucket:    getEnv("LIARA_BUCKET_NAME", ""),
		S3AccessKey: getEnv("LIARA_ACCESS_KEY", ""),
		S3SecretKey: getEnv("LIARA_SECRET_KEY", ""),
		AppURL:      getEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
	}

	// Validate required configuration
	if config.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if config.JWTSecret == "" {
		return nil, fmt.Errorf("AUTH_SECRET is required")
	}

	return config, nil
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
