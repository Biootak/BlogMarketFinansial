package utils

import (
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

const (
	// BcryptCost is the cost factor for bcrypt hashing
	// Using cost factor 12 as specified in requirements (matching Next.js bcryptjs default)
	BcryptCost = 12
)

var (
	// ErrEmptyPassword is returned when attempting to hash an empty password
	ErrEmptyPassword = errors.New("password cannot be empty")
	// ErrHashingFailed is returned when bcrypt hashing fails
	ErrHashingFailed = errors.New("failed to hash password")
)

// HashPassword hashes a plain text password using bcrypt with cost factor 12
// Returns the hashed password string or an error
// Compatible with bcryptjs used in Next.js (same algorithm and cost)
func HashPassword(password string) (string, error) {
	if password == "" {
		return "", ErrEmptyPassword
	}

	// Hash the password using bcrypt with cost factor 12
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrHashingFailed, err)
	}

	return string(hashedBytes), nil
}

// ComparePassword compares a hashed password with a plain text password
// Returns true if they match, false otherwise
// Compatible with bcryptjs used in Next.js
func ComparePassword(hashedPassword, plainPassword string) bool {
	// bcrypt.CompareHashAndPassword returns nil if passwords match
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))
	return err == nil
}
