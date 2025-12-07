package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// APICompatibilityTest tests that Go API responses match Next.js API responses
// This ensures backward compatibility during migration

const (
	goAPIBaseURL     = "http://localhost:8080/api/v1"
	nextJSAPIBaseURL = "http://localhost:3000/api"
)

// TestAuthEndpointCompatibility tests authentication endpoint compatibility
func TestAuthEndpointCompatibility(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	tests := []struct {
		name     string
		endpoint string
		method   string
		body     map[string]interface{}
	}{
		{
			name:     "Register endpoint",
			endpoint: "/auth/register",
			method:   "POST",
			body: map[string]interface{}{
				"email":    fmt.Sprintf("test-%d@example.com", time.Now().Unix()),
				"password": "testpassword123",
				"name":     "Test User",
			},
		},
		{
			name:     "Login endpoint",
			endpoint: "/auth/login",
			method:   "POST",
			body: map[string]interface{}{
				"email":    "test@example.com",
				"password": "testpassword123",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Make request to Go API
			goResp, goBody := makeRequest(t, goAPIBaseURL+tt.endpoint, tt.method, tt.body)
			
			// Make request to Next.js API
			nextJSResp, nextJSBody := makeRequest(t, nextJSAPIBaseURL+tt.endpoint, tt.method, tt.body)

			// Compare status codes
			assert.Equal(t, nextJSResp.StatusCode, goResp.StatusCode, 
				"Status codes should match")

			// Compare response structure
			compareJSONStructure(t, nextJSBody, goBody)
		})
	}
}

// TestPostEndpointCompatibility tests post endpoint compatibility
func TestPostEndpointCompatibility(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// First, get an auth token
	token := getAuthToken(t)

	tests := []struct {
		name     string
		endpoint string
		method   string
		body     map[string]interface{}
		useAuth  bool
	}{
		{
			name:     "List posts",
			endpoint: "/posts",
			method:   "GET",
			body:     nil,
			useAuth:  false,
		},
		{
			name:     "List posts with pagination",
			endpoint: "/posts?page=1&pageSize=10",
			method:   "GET",
			body:     nil,
			useAuth:  false,
		},
		{
			name:     "Create post",
			endpoint: "/posts",
			method:   "POST",
			body: map[string]interface{}{
				"title":   fmt.Sprintf("Test Post %d", time.Now().Unix()),
				"content": "Test content",
				"excerpt": "Test excerpt",
			},
			useAuth: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Make request to Go API
			goResp, goBody := makeRequestWithAuth(t, goAPIBaseURL+tt.endpoint, tt.method, tt.body, token, tt.useAuth)
			
			// Make request to Next.js API
			nextJSResp, nextJSBody := makeRequestWithAuth(t, nextJSAPIBaseURL+tt.endpoint, tt.method, tt.body, token, tt.useAuth)

			// Compare status codes
			assert.Equal(t, nextJSResp.StatusCode, goResp.StatusCode, 
				"Status codes should match")

			// Compare response structure
			if goResp.StatusCode == http.StatusOK || goResp.StatusCode == http.StatusCreated {
				compareJSONStructure(t, nextJSBody, goBody)
			}
		})
	}
}

// TestErrorResponseCompatibility tests error response format compatibility
func TestErrorResponseCompatibility(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	tests := []struct {
		name     string
		endpoint string
		method   string
		body     map[string]interface{}
	}{
		{
			name:     "Invalid login",
			endpoint: "/auth/login",
			method:   "POST",
			body: map[string]interface{}{
				"email":    "invalid@example.com",
				"password": "wrongpassword",
			},
		},
		{
			name:     "Missing required fields",
			endpoint: "/auth/register",
			method:   "POST",
			body: map[string]interface{}{
				"email": "test@example.com",
				// Missing password
			},
		},
		{
			name:     "Unauthorized access",
			endpoint: "/posts",
			method:   "POST",
			body: map[string]interface{}{
				"title":   "Test",
				"content": "Test",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Make request to Go API
			goResp, goBody := makeRequest(t, goAPIBaseURL+tt.endpoint, tt.method, tt.body)
			
			// Make request to Next.js API
			nextJSResp, nextJSBody := makeRequest(t, nextJSAPIBaseURL+tt.endpoint, tt.method, tt.body)

			// Both should return error status codes
			assert.True(t, goResp.StatusCode >= 400, "Go API should return error status")
			assert.True(t, nextJSResp.StatusCode >= 400, "Next.js API should return error status")

			// Compare error response structure
			compareErrorStructure(t, nextJSBody, goBody)
		})
	}
}

// TestPaginationCompatibility tests pagination format compatibility
func TestPaginationCompatibility(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	endpoints := []string{
		"/posts?page=1&pageSize=5",
		"/posts?page=2&pageSize=10",
	}

	for _, endpoint := range endpoints {
		t.Run(endpoint, func(t *testing.T) {
			// Make request to Go API
			goResp, goBody := makeRequest(t, goAPIBaseURL+endpoint, "GET", nil)
			
			// Make request to Next.js API
			nextJSResp, nextJSBody := makeRequest(t, nextJSAPIBaseURL+endpoint, "GET", nil)

			// Compare status codes
			assert.Equal(t, nextJSResp.StatusCode, goResp.StatusCode)

			if goResp.StatusCode == http.StatusOK {
				// Check pagination fields exist
				var goData, nextJSData map[string]interface{}
				json.Unmarshal(goBody, &goData)
				json.Unmarshal(nextJSBody, &nextJSData)

				// Both should have pagination fields
				assert.Contains(t, goData, "page")
				assert.Contains(t, goData, "pageSize")
				assert.Contains(t, goData, "total")
				assert.Contains(t, goData, "totalPages")

				assert.Contains(t, nextJSData, "page")
				assert.Contains(t, nextJSData, "pageSize")
				assert.Contains(t, nextJSData, "total")
				assert.Contains(t, nextJSData, "totalPages")
			}
		})
	}
}

// Helper functions

func makeRequest(t *testing.T, url, method string, body map[string]interface{}) (*http.Response, []byte) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		require.NoError(t, err)
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, url, reqBody)
	require.NoError(t, err)

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp, respBody
}

func makeRequestWithAuth(t *testing.T, url, method string, body map[string]interface{}, token string, useAuth bool) (*http.Response, []byte) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		require.NoError(t, err)
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, url, reqBody)
	require.NoError(t, err)

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	if useAuth && token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp, respBody
}

func getAuthToken(t *testing.T) string {
	// Register a test user
	registerBody := map[string]interface{}{
		"email":    fmt.Sprintf("test-%d@example.com", time.Now().Unix()),
		"password": "testpassword123",
		"name":     "Test User",
	}

	resp, body := makeRequest(t, goAPIBaseURL+"/auth/register", "POST", registerBody)
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var result map[string]interface{}
	err := json.Unmarshal(body, &result)
	require.NoError(t, err)

	token, ok := result["accessToken"].(string)
	require.True(t, ok, "accessToken should be a string")
	require.NotEmpty(t, token)

	return token
}

func compareJSONStructure(t *testing.T, expected, actual []byte) {
	var expectedData, actualData interface{}
	
	err := json.Unmarshal(expected, &expectedData)
	require.NoError(t, err, "Expected data should be valid JSON")
	
	err = json.Unmarshal(actual, &actualData)
	require.NoError(t, err, "Actual data should be valid JSON")

	// Compare keys at top level
	expectedMap, expectedOk := expectedData.(map[string]interface{})
	actualMap, actualOk := actualData.(map[string]interface{})

	if expectedOk && actualOk {
		// Check that all expected keys exist in actual
		for key := range expectedMap {
			assert.Contains(t, actualMap, key, 
				fmt.Sprintf("Response should contain key: %s", key))
		}

		// Check that types match for common keys
		for key, expectedValue := range expectedMap {
			if actualValue, ok := actualMap[key]; ok {
				assert.IsType(t, expectedValue, actualValue,
					fmt.Sprintf("Type mismatch for key: %s", key))
			}
		}
	}
}

func compareErrorStructure(t *testing.T, expected, actual []byte) {
	var expectedData, actualData map[string]interface{}
	
	err := json.Unmarshal(expected, &expectedData)
	require.NoError(t, err, "Expected error should be valid JSON")
	
	err = json.Unmarshal(actual, &actualData)
	require.NoError(t, err, "Actual error should be valid JSON")

	// Both should have an "error" field
	assert.Contains(t, expectedData, "error", "Expected response should have error field")
	assert.Contains(t, actualData, "error", "Actual response should have error field")

	// Check error structure
	expectedError, expectedOk := expectedData["error"].(map[string]interface{})
	actualError, actualOk := actualData["error"].(map[string]interface{})

	if expectedOk && actualOk {
		// Both should have code and message
		assert.Contains(t, expectedError, "code")
		assert.Contains(t, expectedError, "message")
		assert.Contains(t, actualError, "code")
		assert.Contains(t, actualError, "message")
	}
}
