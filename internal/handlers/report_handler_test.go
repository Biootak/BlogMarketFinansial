package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"biotak-go-backend/ent/enttest"
	"biotak-go-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	_ "github.com/mattn/go-sqlite3"
)

func setupReportHandlerTest(t *testing.T) (*ReportHandler, *gin.Engine, func()) {
	// Create test database
	client := enttest.Open(t, "sqlite3", "file:ent?mode=memory&cache=shared&_fk=1")

	// Create test Redis client
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1,
	})

	// Create service and handler
	service := services.NewReportService(client, redisClient)
	handler := NewReportHandler(service)

	// Setup Gin router
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Register routes
	router.GET("/api/v1/reports/user-activity", handler.GetUserActivityReport)
	router.GET("/api/v1/reports/content", handler.GetContentReport)
	router.GET("/api/v1/reports/system-health", handler.GetSystemHealthReport)
	router.GET("/api/v1/reports/jobs/:jobId", handler.GetJobStatus)

	cleanup := func() {
		client.Close()
		redisClient.Close()
	}

	return handler, router, cleanup
}

func TestGetUserActivityReport_Success(t *testing.T) {
	_, router, cleanup := setupReportHandlerTest(t)
	defer cleanup()

	// Prepare request
	now := time.Now()
	from := now.Add(-24 * time.Hour).Format(time.RFC3339)
	to := now.Format(time.RFC3339)

	req, _ := http.NewRequest("GET", "/api/v1/reports/user-activity?from="+from+"&to="+to, nil)
	w := httptest.NewRecorder()

	// Execute request
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response services.UserActivityReport
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.NotNil(t, response)
}

func TestGetUserActivityReport_MissingParameters(t *testing.T) {
	_, router, cleanup := setupReportHandlerTest(t)
	defer cleanup()

	// Prepare request without parameters
	req, _ := http.NewRequest("GET", "/api/v1/reports/user-activity", nil)
	w := httptest.NewRecorder()

	// Execute request
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Contains(t, response, "error")
}

func TestGetUserActivityReport_InvalidDateFormat(t *testing.T) {
	_, router, cleanup := setupReportHandlerTest(t)
	defer cleanup()

	// Prepare request with invalid date format
	req, _ := http.NewRequest("GET", "/api/v1/reports/user-activity?from=invalid&to=invalid", nil)
	w := httptest.NewRecorder()

	// Execute request
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserActivityReport_InvalidDateRange(t *testing.T) {
	_, router, cleanup := setupReportHandlerTest(t)
	defer cleanup()

	// Prepare request with invalid date range (to before from)
	now := time.Now()
	from := now.Format(time.RFC3339)
	to := now.Add(-24 * time.Hour).Format(time.RFC3339)

	req, _ := http.NewRequest("GET", "/api/v1/reports/user-activity?from="+from+"&to="+to, nil)
	w := httptest.NewRecorder()

	// Execute request
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserActivityReport_Async(t *testing.T) {
	_, router, cleanup := setupReportHandlerTest(t)
	defer cleanup()

	// Prepare request with async flag
	now := time.Now()
	from := now.Add(-24 * time.Hour).Format(time.RFC3339)
	to := now.Format(time.RFC3339)

	req, _ := http.NewRequest("GET", "/api/v1/reports/user-activity?from="+from+"&to="+to+"&async=true", nil)
	w := httptest.NewRecorder()

	// Execute request
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusAccepted, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Contains(t, response, "job_id")
	assert.Equal(t, "pending", response["status"])
}

func TestGetContentReport_Success(t *testing.T) {
	_, router, cleanup := setupReportHandlerTest(t)
	defer cleanup()

	// Prepare request
	now := time.Now()
	from := now.Add(-24 * time.Hour).Format(time.RFC3339)
	to := now.Format(time.RFC3339)

	req, _ := http.NewRequest("GET", "/api/v1/reports/content?from="+from+"&to="+to, nil)
	w := httptest.NewRecorder()

	// Execute request
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response services.ContentReport
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.NotNil(t, response)
}

func TestGetSystemHealthReport_Success(t *testing.T) {
	_, router, cleanup := setupReportHandlerTest(t)
	defer cleanup()

	// Prepare request
	req, _ := http.NewRequest("GET", "/api/v1/reports/system-health", nil)
	w := httptest.NewRecorder()

	// Execute request
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response services.SystemHealthReport
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.NotNil(t, response)
	assert.NotEmpty(t, response.Status)
}

func TestGetJobStatus_NotFound(t *testing.T) {
	_, router, cleanup := setupReportHandlerTest(t)
	defer cleanup()

	// Prepare request with non-existent job ID
	req, _ := http.NewRequest("GET", "/api/v1/reports/jobs/nonexistent", nil)
	w := httptest.NewRecorder()

	// Execute request
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusNotFound, w.Code)
}
