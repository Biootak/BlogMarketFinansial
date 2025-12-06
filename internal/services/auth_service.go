package services

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/ent/user"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/utils"
	"context"
	"errors"
	"fmt"
	"time"
)

var (
	// ErrInvalidCredentials is returned when login credentials are invalid
	ErrInvalidCredentials = errors.New("invalid email or password")
	// ErrEmailAlreadyExists is returned when trying to register with an existing email
	ErrEmailAlreadyExists = errors.New("email already exists")
	// ErrUserNotFound is returned when user is not found
	ErrUserNotFound = errors.New("user not found")
)

// AuthService handles authentication operations
type AuthService struct {
	entClient   *ent.Client
	redisClient *database.RedisClient
}

// NewAuthService creates a new authentication service
func NewAuthService(entClient *ent.Client, redisClient *database.RedisClient) *AuthService {
	return &AuthService{
		entClient:   entClient,
		redisClient: redisClient,
	}
}

// LoginRequest represents login request data
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// RegisterRequest represents registration request data
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required,min=2"`
}

// TokenPair represents access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int64  `json:"expires_in"` // seconds until expiration
	TokenType    string `json:"token_type"`
}

// Login validates credentials and generates JWT token
func (s *AuthService) Login(ctx context.Context, email, password string) (*TokenPair, *ent.User, error) {
	// Find user by email
	u, err := s.entClient.User.
		Query().
		Where(user.Email(email)).
		Where(user.DeletedAtIsNil()).
		Only(ctx)

	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, fmt.Errorf("failed to query user: %w", err)
	}

	// Verify password
	if u.Password == nil {
		return nil, nil, ErrInvalidCredentials
	}
	if !utils.ComparePassword(*u.Password, password) {
		return nil, nil, ErrInvalidCredentials
	}

	// Generate JWT token
	token, err := s.generateToken(u)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return token, u, nil
}

// Register creates a new user and generates JWT token
func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*TokenPair, *ent.User, error) {
	// Check if email already exists
	exists, err := s.entClient.User.
		Query().
		Where(user.Email(req.Email)).
		Where(user.DeletedAtIsNil()).
		Exist(ctx)

	if err != nil {
		return nil, nil, fmt.Errorf("failed to check email existence: %w", err)
	}

	if exists {
		return nil, nil, ErrEmailAlreadyExists
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	u, err := s.entClient.User.
		Create().
		SetEmail(req.Email).
		SetPassword(hashedPassword).
		SetName(req.Name).
		SetRole(user.RoleUSER).
		SetEmailVerified(false).
		Save(ctx)

	if err != nil {
		return nil, nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	token, err := s.generateToken(u)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return token, u, nil
}

// RefreshToken validates refresh token and generates new access token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*TokenPair, error) {
	// Validate the refresh token
	newToken, err := utils.RefreshToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}

	// Validate the new token to get claims
	claims, err := utils.ValidateToken(newToken)
	if err != nil {
		return nil, fmt.Errorf("failed to validate new token: %w", err)
	}

	// Verify user still exists and is not deleted
	exists, err := s.entClient.User.
		Query().
		Where(user.ID(claims.UserID)).
		Where(user.DeletedAtIsNil()).
		Exist(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to verify user: %w", err)
	}

	if !exists {
		return nil, ErrUserNotFound
	}

	// Return new token pair
	return &TokenPair{
		AccessToken: newToken,
		ExpiresIn:   3 * 24 * 60 * 60, // 3 days in seconds
		TokenType:   "Bearer",
	}, nil
}

// Logout adds token to Redis blacklist
func (s *AuthService) Logout(ctx context.Context, token string) error {
	// If Redis is not available, we can't blacklist tokens
	// This is acceptable as tokens will expire naturally
	if s.redisClient == nil {
		return nil
	}

	// Validate token to get expiration
	claims, err := utils.ValidateToken(token)
	if err != nil {
		// If token is invalid, no need to blacklist
		return nil
	}

	// Calculate TTL (time until token expires)
	expiresAt := time.Unix(claims.ExpiresAt.Unix(), 0)
	ttl := time.Until(expiresAt)

	// Only blacklist if token hasn't expired yet
	if ttl > 0 {
		key := fmt.Sprintf("blacklist:token:%s", token)
		if err := s.redisClient.Set(ctx, key, "1", ttl); err != nil {
			return fmt.Errorf("failed to blacklist token: %w", err)
		}
	}

	return nil
}

// IsTokenBlacklisted checks if a token is blacklisted
func (s *AuthService) IsTokenBlacklisted(ctx context.Context, token string) (bool, error) {
	// If Redis is not available, assume token is not blacklisted
	if s.redisClient == nil {
		return false, nil
	}

	key := fmt.Sprintf("blacklist:token:%s", token)
	exists, err := s.redisClient.Exists(ctx, key)
	if err != nil {
		return false, fmt.Errorf("failed to check token blacklist: %w", err)
	}

	return exists > 0, nil
}

// generateToken creates a JWT token for the given user
func (s *AuthService) generateToken(u *ent.User) (*TokenPair, error) {
	// Convert email_verified to time.Time pointer
	var emailVerified *time.Time
	if u.EmailVerified {
		now := time.Now()
		emailVerified = &now
	}

	// Get user name (use email if name is not set)
	userName := u.Email
	if u.Name != nil && *u.Name != "" {
		userName = *u.Name
	}

	// Generate JWT token
	token, err := utils.GenerateToken(
		u.ID,
		u.Email,
		userName,
		string(u.Role),
		emailVerified,
	)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken: token,
		ExpiresIn:   3 * 24 * 60 * 60, // 3 days in seconds
		TokenType:   "Bearer",
	}, nil
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(ctx context.Context, userID string) (*ent.User, error) {
	u, err := s.entClient.User.
		Query().
		Where(user.ID(userID)).
		Where(user.DeletedAtIsNil()).
		Only(ctx)

	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	return u, nil
}

// GetUserByEmail retrieves a user by email
func (s *AuthService) GetUserByEmail(ctx context.Context, email string) (*ent.User, error) {
	u, err := s.entClient.User.
		Query().
		Where(user.Email(email)).
		Where(user.DeletedAtIsNil()).
		Only(ctx)

	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	return u, nil
}
