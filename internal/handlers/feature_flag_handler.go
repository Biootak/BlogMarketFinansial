package handlers

import (
	"net/http"
	"strconv"

	"biotak-go-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// FeatureFlagHandler handles feature flag management endpoints
type FeatureFlagHandler struct {
	service *services.FeatureFlagService
}

// NewFeatureFlagHandler creates a new feature flag handler
func NewFeatureFlagHandler(service *services.FeatureFlagService) *FeatureFlagHandler {
	return &FeatureFlagHandler{
		service: service,
	}
}

// ListFlags returns all feature flags
// GET /api/v1/feature-flags
func (h *FeatureFlagHandler) ListFlags(c *gin.Context) {
	flags, err := h.service.ListFlags(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to list feature flags",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"flags": flags,
	})
}

// GetFlag returns a specific feature flag
// GET /api/v1/feature-flags/:name
func (h *FeatureFlagHandler) GetFlag(c *gin.Context) {
	flagName := c.Param("name")

	flag, err := h.service.GetFlag(c.Request.Context(), flagName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Feature flag not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, flag)
}

// UpdateFlag updates a feature flag
// PUT /api/v1/feature-flags/:name
func (h *FeatureFlagHandler) UpdateFlag(c *gin.Context) {
	flagName := c.Param("name")

	var req struct {
		Enabled     *bool   `json:"enabled"`
		Rollout     *int    `json:"rollout"`
		Description *string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid request body",
			},
		})
		return
	}

	// Get existing flag
	flag, err := h.service.GetFlag(c.Request.Context(), flagName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Feature flag not found",
			},
		})
		return
	}

	// Update fields if provided
	if req.Enabled != nil {
		flag.Enabled = *req.Enabled
	}
	if req.Rollout != nil {
		if *req.Rollout < 0 || *req.Rollout > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": "Rollout must be between 0 and 100",
				},
			})
			return
		}
		flag.Rollout = *req.Rollout
	}
	if req.Description != nil {
		flag.Description = *req.Description
	}

	// Save updated flag
	if err := h.service.SetFlag(c.Request.Context(), flag); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update feature flag",
			},
		})
		return
	}

	c.JSON(http.StatusOK, flag)
}

// UpdateRollout updates only the rollout percentage
// PATCH /api/v1/feature-flags/:name/rollout
func (h *FeatureFlagHandler) UpdateRollout(c *gin.Context) {
	flagName := c.Param("name")
	rolloutStr := c.Query("percentage")

	if rolloutStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "percentage query parameter is required",
			},
		})
		return
	}

	rollout, err := strconv.Atoi(rolloutStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "percentage must be a valid integer",
			},
		})
		return
	}

	if err := h.service.UpdateRollout(c.Request.Context(), flagName, rollout); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	flag, _ := h.service.GetFlag(c.Request.Context(), flagName)
	c.JSON(http.StatusOK, flag)
}

// InitializeFlags initializes default feature flags
// POST /api/v1/feature-flags/initialize
func (h *FeatureFlagHandler) InitializeFlags(c *gin.Context) {
	if err := h.service.InitializeDefaultFlags(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to initialize feature flags",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Feature flags initialized successfully",
	})
}

// CheckFlag checks if a feature is enabled for a specific user
// GET /api/v1/feature-flags/:name/check?user_id=xxx
func (h *FeatureFlagHandler) CheckFlag(c *gin.Context) {
	flagName := c.Param("name")
	userID := c.Query("user_id")

	if userID == "" {
		userID = "anonymous"
	}

	enabled, err := h.service.IsEnabled(c.Request.Context(), flagName, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to check feature flag",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"flag":    flagName,
		"user_id": userID,
		"enabled": enabled,
	})
}
