package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"testing"

	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/services"
	"biotak-go-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupTestRouter creates a test router with upload routes
func setupUploadTestRouter(uploadService *services.UploadService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	uploadHandler := NewUploadHandler(uploadService)

	// Setup routes
	upload := router.Group("/api/v1/upload")
	upload.Use(middleware.AuthMiddleware())
	{
		upload.POST("/", uploadHandler.UploadFile)
		upload.DELETE("/:filename", uploadHandler.DeleteFile)
	}

	return router
}

// createTestImage creates a simple test image
func createTestImage(width, height int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, image.White)
		}
	}
	return img
}

// createMultipartRequest creates a multipart form request with a file
func createMultipartRequest(img image.Image, filename, fieldName string) (*http.Request, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Create form file
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, fieldName, filename))
	h.Set("Content-Type", "image/png")

	part, err := writer.CreatePart(h)
	if err != nil {
		return nil, err
	}

	// Encode image to part
	if err := png.Encode(part, img); err != nil {
		return nil, err
	}

	if err := writer.Close(); err != nil {
		return nil, err
	}

	req := httptest.NewRequest("POST", "/api/v1/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	return req, nil
}

// generateTestToken generates a valid JWT token for testing
func generateTestToken() string {
	token, _ := utils.GenerateToken("test-user-id", "test@example.com", "Test User", "USER", nil)
	return token
}

func TestUploadFile_Success(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	// Initialize upload service
	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	router := setupUploadTestRouter(uploadService)

	// Create test image
	img := createTestImage(200, 200)
	req, err := createMultipartRequest(img, "test.png", "file")
	require.NoError(t, err)

	// Add authentication token
	token := generateTestToken()
	req.Header.Set("Authorization", "Bearer "+token)

	// Perform request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response UploadResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response.Success)
	assert.NotEmpty(t, response.OriginalURL)
	assert.Len(t, response.Images, 3)
	assert.Equal(t, "File uploaded successfully", response.Message)

	// Verify image sizes
	sizeNames := make(map[string]bool)
	for _, img := range response.Images {
		sizeNames[img.Size] = true
		assert.NotEmpty(t, img.URL)
		assert.Greater(t, img.Width, 0)
		assert.Greater(t, img.Height, 0)
	}

	assert.True(t, sizeNames["thumbnail"])
	assert.True(t, sizeNames["medium"])
	assert.True(t, sizeNames["large"])

	// Clean up uploaded files
	ctx := context.Background()
	for _, img := range response.Images {
		_ = uploadService.DeleteFile(ctx, img.URL)
	}
	_ = uploadService.DeleteFile(ctx, response.OriginalURL)
}

func TestUploadFile_NoFile(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	router := setupUploadTestRouter(uploadService)

	// Create request without file
	req := httptest.NewRequest("POST", "/api/v1/upload", nil)
	req.Header.Set("Content-Type", "multipart/form-data")
	token := generateTestToken()
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 Bad Request
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response middleware.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "BAD_REQUEST", response.Error.Code)
	assert.Contains(t, response.Error.Message, "No file provided")
}

func TestUploadFile_NoAuthentication(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	router := setupUploadTestRouter(uploadService)

	// Create test image
	img := createTestImage(200, 200)
	req, err := createMultipartRequest(img, "test.png", "file")
	require.NoError(t, err)

	// No authentication token

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 401 Unauthorized
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	errorData := response["error"].(map[string]interface{})
	assert.Equal(t, "MISSING_TOKEN", errorData["code"])
}

func TestUploadFile_InvalidToken(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	router := setupUploadTestRouter(uploadService)

	// Create test image
	img := createTestImage(200, 200)
	req, err := createMultipartRequest(img, "test.png", "file")
	require.NoError(t, err)

	// Invalid token
	req.Header.Set("Authorization", "Bearer invalid-token")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 401 Unauthorized
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	errorData := response["error"].(map[string]interface{})
	assert.Equal(t, "INVALID_TOKEN", errorData["code"])
}

func TestDeleteFile_Success(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	router := setupUploadTestRouter(uploadService)

	// Create request
	req := httptest.NewRequest("DELETE", "/api/v1/upload/test-file.jpg", nil)
	token := generateTestToken()
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 OK (even if file doesn't exist)
	assert.Equal(t, http.StatusOK, w.Code)

	var response DeleteResponse
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response.Success)
	assert.Equal(t, "File deleted successfully", response.Message)
}

func TestDeleteFile_NoFilename(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	router := setupUploadTestRouter(uploadService)

	// Create request without filename
	req := httptest.NewRequest("DELETE", "/api/v1/upload/", nil)
	token := generateTestToken()
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 404 (route not found) or 400
	assert.True(t, w.Code == http.StatusNotFound || w.Code == http.StatusBadRequest)
}

func TestDeleteFile_NoAuthentication(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	router := setupUploadTestRouter(uploadService)

	// Create request without authentication
	req := httptest.NewRequest("DELETE", "/api/v1/upload/test-file.jpg", nil)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 401 Unauthorized
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	errorData := response["error"].(map[string]interface{})
	assert.Equal(t, "MISSING_TOKEN", errorData["code"])
}

// Integration test for complete upload and delete flow
func TestUploadAndDelete_Integration(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	router := setupUploadTestRouter(uploadService)
	token := generateTestToken()

	// Step 1: Upload a file
	img := createTestImage(300, 300)
	uploadReq, err := createMultipartRequest(img, "integration-test.png", "file")
	require.NoError(t, err)
	uploadReq.Header.Set("Authorization", "Bearer "+token)

	uploadW := httptest.NewRecorder()
	router.ServeHTTP(uploadW, uploadReq)

	assert.Equal(t, http.StatusOK, uploadW.Code)

	var uploadResponse UploadResponse
	err = json.Unmarshal(uploadW.Body.Bytes(), &uploadResponse)
	require.NoError(t, err)
	require.True(t, uploadResponse.Success)

	// Step 2: Delete the uploaded files
	// Extract filename from original URL
	originalFilename := uploadResponse.OriginalURL[len(uploadResponse.OriginalURL)-40:]

	deleteReq := httptest.NewRequest("DELETE", "/api/v1/upload/"+originalFilename, nil)
	deleteReq.Header.Set("Authorization", "Bearer "+token)

	deleteW := httptest.NewRecorder()
	router.ServeHTTP(deleteW, deleteReq)

	assert.Equal(t, http.StatusOK, deleteW.Code)

	var deleteResponse DeleteResponse
	err = json.Unmarshal(deleteW.Body.Bytes(), &deleteResponse)
	require.NoError(t, err)
	assert.True(t, deleteResponse.Success)

	// Clean up processed images
	ctx := context.Background()
	for _, img := range uploadResponse.Images {
		_ = uploadService.DeleteFile(ctx, img.URL)
	}
}

// Benchmark tests
func BenchmarkUploadFile(b *testing.B) {
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		b.Skip("Skipping benchmark: S3 credentials not configured")
	}

	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(b, err)

	router := setupUploadTestRouter(uploadService)
	token := generateTestToken()

	img := createTestImage(200, 200)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req, _ := createMultipartRequest(img, "bench.png", "file")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Clean up
		if w.Code == http.StatusOK {
			var response UploadResponse
			_ = json.Unmarshal(w.Body.Bytes(), &response)
			ctx := context.Background()
			for _, img := range response.Images {
				_ = uploadService.DeleteFile(ctx, img.URL)
			}
			_ = uploadService.DeleteFile(ctx, response.OriginalURL)
		}
	}
}

