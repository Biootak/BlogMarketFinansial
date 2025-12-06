package utils

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateToken(t *testing.T) {
	// Set up test environment
	os.Setenv("AUTH_SECRET", "test-secret-key-for-jwt-testing-minimum-32-chars")
	defer os.Unsetenv("AUTH_SECRET")

	t.Run("generates valid token with all fields", func(t *testing.T) {
		userID := "user-123"
		email := "test@example.com"
		name := "Test User"
		role := "USER"
		emailVerified := time.Now()

		token, err := GenerateToken(userID, email, name, role, &emailVerified)

		require.NoError(t, err)
		assert.NotEmpty(t, token)
	})

	t.Run("generates token with nil emailVerified", func(t *testing.T) {
		userID := "user-456"
		email := "unverified@example.com"
		name := "Unverified User"
		role := "USER"

		token, err := GenerateToken(userID, email, name, role, nil)

		require.NoError(t, err)
		assert.NotEmpty(t, token)
	})

	t.Run("returns error when secret is missing", func(t *testing.T) {
		os.Unsetenv("AUTH_SECRET")

		_, err := GenerateToken("user-123", "test@example.com", "Test", "USER", nil)

		assert.ErrorIs(t, err, ErrMissingSecret)

		// Restore secret for other tests
		os.Setenv("AUTH_SECRET", "test-secret-key-for-jwt-testing-minimum-32-chars")
	})
}

func TestValidateToken(t *testing.T) {
	// Set up test environment
	os.Setenv("AUTH_SECRET", "test-secret-key-for-jwt-testing-minimum-32-chars")
	defer os.Unsetenv("AUTH_SECRET")

	t.Run("validates token and extracts claims", func(t *testing.T) {
		userID := "user-789"
		email := "validate@example.com"
		name := "Validate User"
		role := "AUTHOR"
		emailVerified := time.Now()

		token, err := GenerateToken(userID, email, name, role, &emailVerified)
		require.NoError(t, err)

		claims, err := ValidateToken(token)

		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, name, claims.Name)
		assert.Equal(t, role, claims.Role)
		assert.NotNil(t, claims.EmailVerified)
	})

	t.Run("returns error for invalid token", func(t *testing.T) {
		invalidToken := "invalid.token.string"

		_, err := ValidateToken(invalidToken)

		assert.ErrorIs(t, err, ErrInvalidToken)
	})

	t.Run("returns error for tampered token", func(t *testing.T) {
		token, err := GenerateToken("user-123", "test@example.com", "Test", "USER", nil)
		require.NoError(t, err)

		// Tamper with the token
		tamperedToken := token + "tampered"

		_, err = ValidateToken(tamperedToken)

		assert.ErrorIs(t, err, ErrInvalidToken)
	})

	t.Run("returns error when secret is missing", func(t *testing.T) {
		token, err := GenerateToken("user-123", "test@example.com", "Test", "USER", nil)
		require.NoError(t, err)

		os.Unsetenv("AUTH_SECRET")

		_, err = ValidateToken(token)

		assert.ErrorIs(t, err, ErrMissingSecret)

		// Restore secret
		os.Setenv("AUTH_SECRET", "test-secret-key-for-jwt-testing-minimum-32-chars")
	})
}

func TestRefreshToken(t *testing.T) {
	// Set up test environment
	os.Setenv("AUTH_SECRET", "test-secret-key-for-jwt-testing-minimum-32-chars")
	defer os.Unsetenv("AUTH_SECRET")

	t.Run("refreshes valid token successfully", func(t *testing.T) {
		userID := "user-refresh-123"
		email := "refresh@example.com"
		name := "Refresh User"
		role := "ADMIN"
		emailVerified := time.Now()

		originalToken, err := GenerateToken(userID, email, name, role, &emailVerified)
		require.NoError(t, err)

		newToken, err := RefreshToken(originalToken)

		require.NoError(t, err)
		assert.NotEmpty(t, newToken)

		// Validate the new token has same user info
		claims, err := ValidateToken(newToken)
		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, name, claims.Name)
		assert.Equal(t, role, claims.Role)
		
		// Verify the new token has a fresh expiration time
		assert.True(t, claims.ExpiresAt.Time.After(time.Now()))
	})

	t.Run("returns error for invalid token", func(t *testing.T) {
		invalidToken := "invalid.token.string"

		_, err := RefreshToken(invalidToken)

		assert.Error(t, err)
	})

	t.Run("returns error when secret is missing", func(t *testing.T) {
		token, err := GenerateToken("user-123", "test@example.com", "Test", "USER", nil)
		require.NoError(t, err)

		os.Unsetenv("AUTH_SECRET")

		_, err = RefreshToken(token)

		assert.ErrorIs(t, err, ErrMissingSecret)

		// Restore secret
		os.Setenv("AUTH_SECRET", "test-secret-key-for-jwt-testing-minimum-32-chars")
	})
}

func TestJWTRoundTrip(t *testing.T) {
	// Set up test environment
	os.Setenv("AUTH_SECRET", "test-secret-key-for-jwt-testing-minimum-32-chars")
	defer os.Unsetenv("AUTH_SECRET")

	t.Run("generate and validate round trip", func(t *testing.T) {
		userID := "user-roundtrip-123"
		email := "roundtrip@example.com"
		name := "Round Trip User"
		role := "SUPER_ADMIN"
		emailVerified := time.Now()

		// Generate token
		token, err := GenerateToken(userID, email, name, role, &emailVerified)
		require.NoError(t, err)

		// Validate token
		claims, err := ValidateToken(token)
		require.NoError(t, err)

		// Verify all fields match
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, name, claims.Name)
		assert.Equal(t, role, claims.Role)
		assert.NotNil(t, claims.EmailVerified)

		// Verify timestamps are reasonable
		assert.True(t, claims.IssuedAt.Time.Before(time.Now()))
		assert.True(t, claims.ExpiresAt.Time.After(time.Now()))
		assert.True(t, claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time) <= 3*24*time.Hour+time.Minute)
	})
}
