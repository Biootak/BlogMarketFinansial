package handlers

import (
	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new authentication handler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// UserResponse represents user data in API responses (compatible with Next.js format)
type UserResponse struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Name          string  `json:"name"`
	Image         *string `json:"image,omitempty"`
	Role          string  `json:"role"`
	EmailVerified bool    `json:"emailVerified"`
}

// LoginResponse represents login API response (compatible with Next.js format)
type LoginResponse struct {
	User        UserResponse `json:"user"`
	AccessToken string       `json:"accessToken"`
	ExpiresIn   int64        `json:"expiresIn"`
}

// RegisterResponse represents register API response (compatible with Next.js format)
type RegisterResponse struct {
	User        UserResponse `json:"user"`
	AccessToken string       `json:"accessToken"`
	ExpiresIn   int64        `json:"expiresIn"`
}

// RefreshResponse represents refresh token API response
type RefreshResponse struct {
	AccessToken string `json:"accessToken"`
	ExpiresIn   int64  `json:"expiresIn"`
}

// Login handles POST /api/v1/auth/login
// @Summary User login
// @Description Authenticate user with email and password
// @Tags auth
// @Accept json
// @Produce json
// @Param body body services.LoginRequest true "Login credentials"
// @Success 200 {object} LoginResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req services.LoginRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, "Invalid request data", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Perform login
	tokenPair, user, err := h.authService.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		if err == services.ErrInvalidCredentials {
			middleware.Unauthorized(c, "Invalid email or password")
			return
		}
		middleware.InternalServerError(c, "Failed to login")
		return
	}

	// Build response (compatible with Next.js format)
	response := LoginResponse{
		User: UserResponse{
			ID:            user.ID,
			Email:         user.Email,
			Name:          getUserName(user.Name, user.Email),
			Image:         user.Image,
			Role:          string(user.Role),
			EmailVerified: user.EmailVerified,
		},
		AccessToken: tokenPair.AccessToken,
		ExpiresIn:   tokenPair.ExpiresIn,
	}

	c.JSON(http.StatusOK, response)
}

// Register handles POST /api/v1/auth/register
// @Summary User registration
// @Description Create a new user account
// @Tags auth
// @Accept json
// @Produce json
// @Param body body services.RegisterRequest true "Registration data"
// @Success 201 {object} RegisterResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 409 {object} middleware.ErrorResponse
// @Router /api/v1/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req services.RegisterRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, "Invalid request data", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Perform registration
	tokenPair, user, err := h.authService.Register(c.Request.Context(), req)
	if err != nil {
		if err == services.ErrEmailAlreadyExists {
			middleware.Conflict(c, "Email already exists", map[string]interface{}{
				"field": "email",
			})
			return
		}
		middleware.InternalServerError(c, "Failed to register")
		return
	}

	// Build response (compatible with Next.js format)
	response := RegisterResponse{
		User: UserResponse{
			ID:            user.ID,
			Email:         user.Email,
			Name:          getUserName(user.Name, user.Email),
			Image:         user.Image,
			Role:          string(user.Role),
			EmailVerified: user.EmailVerified,
		},
		AccessToken: tokenPair.AccessToken,
		ExpiresIn:   tokenPair.ExpiresIn,
	}

	c.JSON(http.StatusCreated, response)
}

// RefreshToken handles POST /api/v1/auth/refresh
// @Summary Refresh access token
// @Description Generate a new access token from a refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Success 200 {object} RefreshResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Router /api/v1/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// Extract token from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		middleware.Unauthorized(c, "Authorization header is required")
		return
	}

	// Check if header starts with "Bearer "
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		middleware.Unauthorized(c, "Invalid authorization header format")
		return
	}

	token := parts[1]

	// Refresh token
	tokenPair, err := h.authService.RefreshToken(c.Request.Context(), token)
	if err != nil {
		middleware.Unauthorized(c, "Invalid or expired token")
		return
	}

	// Build response
	response := RefreshResponse{
		AccessToken: tokenPair.AccessToken,
		ExpiresIn:   tokenPair.ExpiresIn,
	}

	c.JSON(http.StatusOK, response)
}

// Logout handles POST /api/v1/auth/logout
// @Summary User logout
// @Description Invalidate the current access token
// @Tags auth
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Success 200 {object} map[string]string
// @Failure 401 {object} middleware.ErrorResponse
// @Router /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// Extract token from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		middleware.Unauthorized(c, "Authorization header is required")
		return
	}

	// Check if header starts with "Bearer "
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		middleware.Unauthorized(c, "Invalid authorization header format")
		return
	}

	token := parts[1]

	// Logout (blacklist token)
	if err := h.authService.Logout(c.Request.Context(), token); err != nil {
		middleware.InternalServerError(c, "Failed to logout")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

// Me handles GET /api/v1/auth/me
// @Summary Get current user
// @Description Get the currently authenticated user's information
// @Tags auth
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Success 200 {object} UserResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Router /api/v1/auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := middleware.GetUserID(c)
	if !exists {
		middleware.Unauthorized(c, "Authentication required")
		return
	}

	// Get user from database
	user, err := h.authService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if err == services.ErrUserNotFound {
			middleware.NotFound(c, "User not found")
			return
		}
		middleware.InternalServerError(c, "Failed to get user")
		return
	}

	// Build response
	response := UserResponse{
		ID:            user.ID,
		Email:         user.Email,
		Name:          getUserName(user.Name, user.Email),
		Image:         user.Image,
		Role:          string(user.Role),
		EmailVerified: user.EmailVerified,
	}

	c.JSON(http.StatusOK, response)
}

// getUserName returns user name or email as fallback
func getUserName(name *string, email string) string {
	if name != nil && *name != "" {
		return *name
	}
	return email
}
