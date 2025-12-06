package utils

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents the JWT claims structure compatible with NextAuth
type Claims struct {
	UserID        string `json:"sub"`           // Subject (user ID) - NextAuth uses "sub"
	Email         string `json:"email"`         // User email
	Name          string `json:"name"`          // User name
	Role          string `json:"role"`          // User role (USER, AUTHOR, ADMIN, SUPER_ADMIN)
	EmailVerified *int64 `json:"emailVerified"` // Email verification timestamp (nullable)
	jwt.RegisteredClaims
}

var (
	// ErrInvalidToken is returned when token validation fails
	ErrInvalidToken = errors.New("invalid token")
	// ErrExpiredToken is returned when token has expired
	ErrExpiredToken = errors.New("token has expired")
	// ErrMissingSecret is returned when JWT secret is not configured
	ErrMissingSecret = errors.New("JWT secret not configured")
)

// getJWTSecret retrieves the JWT secret from environment
func getJWTSecret() ([]byte, error) {
	secret := os.Getenv("AUTH_SECRET")
	if secret == "" {
		return nil, ErrMissingSecret
	}
	return []byte(secret), nil
}

// GenerateToken creates a new JWT token for the given user
// Compatible with NextAuth JWT format
func GenerateToken(userID, email, name, role string, emailVerified *time.Time) (string, error) {
	secret, err := getJWTSecret()
	if err != nil {
		return "", err
	}

	// Convert emailVerified to Unix timestamp (nullable)
	var emailVerifiedTimestamp *int64
	if emailVerified != nil {
		timestamp := emailVerified.Unix()
		emailVerifiedTimestamp = &timestamp
	}

	// Create claims compatible with NextAuth
	// Session duration: 3 days (matching NextAuth configuration)
	now := time.Now()
	expirationTime := now.Add(3 * 24 * time.Hour)

	claims := &Claims{
		UserID:        userID,
		Email:         email,
		Name:          name,
		Role:          role,
		EmailVerified: emailVerifiedTimestamp,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	// Create token with HS256 algorithm (same as NextAuth)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign and return the token
	tokenString, err := token.SignedString(secret)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken validates a JWT token and returns the claims
// Compatible with NextAuth JWT tokens
func ValidateToken(tokenString string) (*Claims, error) {
	secret, err := getJWTSecret()
	if err != nil {
		return nil, err
	}

	// Parse and validate the token
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method is HS256
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	})

	if err != nil {
		// Check if error is due to expiration
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	// Extract claims
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// RefreshToken generates a new token from an existing valid token
// Maintains the same user information but updates expiration
func RefreshToken(tokenString string) (string, error) {
	// First validate the existing token
	claims, err := ValidateToken(tokenString)
	if err != nil {
		// Allow refresh even if token is expired (but not if invalid)
		if !errors.Is(err, ErrExpiredToken) {
			return "", fmt.Errorf("cannot refresh invalid token: %w", err)
		}
		
		// For expired tokens, we need to parse without validation
		secret, secretErr := getJWTSecret()
		if secretErr != nil {
			return "", secretErr
		}
		
		token, parseErr := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return secret, nil
		}, jwt.WithoutClaimsValidation())
		
		if parseErr != nil {
			return "", fmt.Errorf("cannot parse expired token: %w", parseErr)
		}
		
		var ok bool
		claims, ok = token.Claims.(*Claims)
		if !ok {
			return "", ErrInvalidToken
		}
	}

	// Convert emailVerified timestamp back to time.Time
	var emailVerified *time.Time
	if claims.EmailVerified != nil {
		t := time.Unix(*claims.EmailVerified, 0)
		emailVerified = &t
	}

	// Generate a new token with the same user information
	return GenerateToken(claims.UserID, claims.Email, claims.Name, claims.Role, emailVerified)
}
