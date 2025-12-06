package utils

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPassword(t *testing.T) {
	t.Run("hashes password successfully", func(t *testing.T) {
		password := "mySecurePassword123!"

		hashed, err := HashPassword(password)

		require.NoError(t, err)
		assert.NotEmpty(t, hashed)
		assert.NotEqual(t, password, hashed)
		// Bcrypt hashes start with $2a$ or $2b$
		assert.True(t, strings.HasPrefix(hashed, "$2a$") || strings.HasPrefix(hashed, "$2b$"))
	})

	t.Run("produces different hashes for same password", func(t *testing.T) {
		password := "samePassword123"

		hash1, err1 := HashPassword(password)
		hash2, err2 := HashPassword(password)

		require.NoError(t, err1)
		require.NoError(t, err2)
		// Bcrypt includes a random salt, so hashes should be different
		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("returns error for empty password", func(t *testing.T) {
		_, err := HashPassword("")

		assert.ErrorIs(t, err, ErrEmptyPassword)
	})

	t.Run("hashes Persian/Unicode passwords", func(t *testing.T) {
		password := "رمزعبور۱۲۳"

		hashed, err := HashPassword(password)

		require.NoError(t, err)
		assert.NotEmpty(t, hashed)
		assert.NotEqual(t, password, hashed)
	})

	t.Run("handles passwords within bcrypt limit", func(t *testing.T) {
		// Bcrypt has a 72 byte limit
		password := strings.Repeat("a", 70)

		hashed, err := HashPassword(password)

		require.NoError(t, err)
		assert.NotEmpty(t, hashed)
	})
}

func TestComparePassword(t *testing.T) {
	t.Run("returns true for matching password", func(t *testing.T) {
		password := "correctPassword123"
		hashed, err := HashPassword(password)
		require.NoError(t, err)

		result := ComparePassword(hashed, password)

		assert.True(t, result)
	})

	t.Run("returns false for non-matching password", func(t *testing.T) {
		password := "correctPassword123"
		wrongPassword := "wrongPassword456"
		hashed, err := HashPassword(password)
		require.NoError(t, err)

		result := ComparePassword(hashed, wrongPassword)

		assert.False(t, result)
	})

	t.Run("returns false for empty password", func(t *testing.T) {
		password := "somePassword"
		hashed, err := HashPassword(password)
		require.NoError(t, err)

		result := ComparePassword(hashed, "")

		assert.False(t, result)
	})

	t.Run("returns false for invalid hash", func(t *testing.T) {
		invalidHash := "not-a-valid-bcrypt-hash"
		password := "somePassword"

		result := ComparePassword(invalidHash, password)

		assert.False(t, result)
	})

	t.Run("handles Persian/Unicode passwords", func(t *testing.T) {
		password := "رمزعبور۱۲۳"
		hashed, err := HashPassword(password)
		require.NoError(t, err)

		result := ComparePassword(hashed, password)

		assert.True(t, result)
	})

	t.Run("case sensitive comparison", func(t *testing.T) {
		password := "Password123"
		hashed, err := HashPassword(password)
		require.NoError(t, err)

		// Different case should not match
		result := ComparePassword(hashed, "password123")

		assert.False(t, result)
	})
}

func TestPasswordHashingRoundTrip(t *testing.T) {
	t.Run("hash and compare round trip", func(t *testing.T) {
		testPasswords := []string{
			"simplePassword",
			"Complex!Pass@123",
			"رمزعبورفارسی",
			"emoji🔒password",
			"spaces in password",
			"12345678",
		}

		for _, password := range testPasswords {
			t.Run(password, func(t *testing.T) {
				// Hash the password
				hashed, err := HashPassword(password)
				require.NoError(t, err)

				// Verify the hash doesn't match the plain text
				assert.NotEqual(t, password, hashed)

				// Verify comparison works
				assert.True(t, ComparePassword(hashed, password))

				// Verify wrong password fails
				assert.False(t, ComparePassword(hashed, password+"wrong"))
			})
		}
	})
}

func TestBcryptCostFactor(t *testing.T) {
	t.Run("uses cost factor 12", func(t *testing.T) {
		password := "testPassword"

		hashed, err := HashPassword(password)
		require.NoError(t, err)

		// Bcrypt hash format: $2a$12$... where 12 is the cost
		// Extract cost from hash
		parts := strings.Split(hashed, "$")
		require.Len(t, parts, 4, "bcrypt hash should have 4 parts")
		
		cost := parts[2]
		assert.Equal(t, "12", cost, "bcrypt cost should be 12")
	})
}
