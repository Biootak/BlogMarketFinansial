package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"biotak-go-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

// TestHealthCheckWithoutConnections tests health check when no connections are configured
func TestHealthCheckWithoutConnections(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Create health handler without database connections
	healthHandler := handlers.NewHealthHandler(nil, nil)
	router.GET("/health", healthHandler.Check)

	// Create test request
	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	// Perform request
	router.ServeHTTP(w, req)

	// Check response
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	// Parse response
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify response structure
	if response["status"] != "healthy" {
		t.Errorf("Expected status 'healthy', got '%v'", response["status"])
	}

	if response["timestamp"] == nil {
		t.Error("Expected timestamp in response")
	}

	if response["services"] == nil {
		t.Error("Expected services in response")
	}
}

// TestHealthCheckReady tests readiness probe
func TestHealthCheckReady(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	healthHandler := handlers.NewHealthHandler(nil, nil)
	router.GET("/health/ready", healthHandler.Ready)

	req, _ := http.NewRequest("GET", "/health/ready", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response["ready"] != true {
		t.Errorf("Expected ready true, got %v", response["ready"])
	}
}

// TestHealthCheckLive tests liveness probe
func TestHealthCheckLive(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	healthHandler := handlers.NewHealthHandler(nil, nil)
	router.GET("/health/live", healthHandler.Live)

	req, _ := http.NewRequest("GET", "/health/live", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response["alive"] != true {
		t.Errorf("Expected alive true, got %v", response["alive"])
	}
}

// Note: Tests with actual database connections require Docker or test database
// These should be run with: go test -tags=integration ./tests/integration/...
