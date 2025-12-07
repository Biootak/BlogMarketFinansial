package config

import (
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// LoadTestConfig loads configuration from .env.test file for testing
func LoadTestConfig() error {
	// Try to find .env.test in current directory or parent directories
	paths := []string{
		".env.test",
		"../.env.test",
		"../../.env.test",
		"../../../.env.test",
	}

	var err error
	for _, path := range paths {
		if _, statErr := os.Stat(path); statErr == nil {
			err = godotenv.Load(path)
			if err == nil {
				return nil
			}
		}
	}

	// If .env.test not found, try to find it relative to project root
	if projectRoot := findProjectRoot(); projectRoot != "" {
		testEnvPath := filepath.Join(projectRoot, ".env.test")
		if _, statErr := os.Stat(testEnvPath); statErr == nil {
			return godotenv.Load(testEnvPath)
		}
	}

	// If still not found, return the last error or nil
	return err
}

// findProjectRoot tries to find the project root by looking for go.mod
func findProjectRoot() string {
	dir, err := os.Getwd()
	if err != nil {
		return ""
	}

	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return ""
}

// GetTestDatabaseURL returns the test database URL from environment
func GetTestDatabaseURL() string {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		// Fallback to a default test database URL
		return "postgresql://postgres:postgres@localhost:5432/biotak_test?sslmode=disable"
	}
	return url
}

// GetTestRedisURL returns the test Redis URL from environment
func GetTestRedisURL() string {
	url := os.Getenv("REDIS_URL")
	if url == "" {
		// Use Redis DB 1 for tests by default
		return "redis://localhost:6379/1"
	}
	return url
}
