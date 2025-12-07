package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// FeatureFlag represents a feature flag configuration
type FeatureFlag struct {
	Name        string    `json:"name"`
	Enabled     bool      `json:"enabled"`
	Rollout     int       `json:"rollout"`      // Percentage 0-100
	Description string    `json:"description"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// FeatureFlagService manages feature flags for gradual migration
type FeatureFlagService struct {
	redis *redis.Client
}

// NewFeatureFlagService creates a new feature flag service
func NewFeatureFlagService(redis *redis.Client) *FeatureFlagService {
	return &FeatureFlagService{
		redis: redis,
	}
}

// Feature flag keys
const (
	FeatureFlagPrefix = "feature_flag:"

	// Authentication endpoints
	FlagAuthLogin    = "auth.login"
	FlagAuthRegister = "auth.register"
	FlagAuthRefresh  = "auth.refresh"
	FlagAuthLogout   = "auth.logout"

	// Post endpoints
	FlagPostCreate  = "post.create"
	FlagPostGet     = "post.get"
	FlagPostUpdate  = "post.update"
	FlagPostDelete  = "post.delete"
	FlagPostList    = "post.list"
	FlagPostPublish = "post.publish"

	// Comment endpoints
	FlagCommentCreate   = "comment.create"
	FlagCommentList     = "comment.list"
	FlagCommentModerate = "comment.moderate"
	FlagCommentDelete   = "comment.delete"

	// Exchange rate endpoints
	FlagExchangeRates           = "exchange.rates"
	FlagExchangeHistoricalRates = "exchange.historical"

	// Upload endpoints
	FlagUploadFile   = "upload.file"
	FlagUploadDelete = "upload.delete"

	// Report endpoints
	FlagReportUserActivity = "report.user_activity"
	FlagReportContent      = "report.content"
	FlagReportSystemHealth = "report.system_health"
)

// IsEnabled checks if a feature flag is enabled for a given user/request
// Uses percentage-based rollout for gradual migration
func (s *FeatureFlagService) IsEnabled(ctx context.Context, flagName string, userID string) (bool, error) {
	flag, err := s.GetFlag(ctx, flagName)
	if err != nil {
		// If flag doesn't exist, default to disabled (use Next.js)
		return false, nil
	}

	// If flag is completely disabled, return false
	if !flag.Enabled {
		return false, nil
	}

	// If rollout is 100%, always enabled
	if flag.Rollout >= 100 {
		return true, nil
	}

	// If rollout is 0%, always disabled
	if flag.Rollout <= 0 {
		return false, nil
	}

	// Use consistent hashing based on user ID to determine if enabled
	// This ensures the same user always gets the same result
	hash := s.hashString(userID)
	return (hash % 100) < flag.Rollout, nil
}

// GetFlag retrieves a feature flag from Redis
func (s *FeatureFlagService) GetFlag(ctx context.Context, flagName string) (*FeatureFlag, error) {
	key := FeatureFlagPrefix + flagName
	data, err := s.redis.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("feature flag not found: %s", flagName)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get feature flag: %w", err)
	}

	var flag FeatureFlag
	if err := json.Unmarshal([]byte(data), &flag); err != nil {
		return nil, fmt.Errorf("failed to unmarshal feature flag: %w", err)
	}

	return &flag, nil
}

// SetFlag creates or updates a feature flag
func (s *FeatureFlagService) SetFlag(ctx context.Context, flag *FeatureFlag) error {
	flag.UpdatedAt = time.Now()

	data, err := json.Marshal(flag)
	if err != nil {
		return fmt.Errorf("failed to marshal feature flag: %w", err)
	}

	key := FeatureFlagPrefix + flag.Name
	if err := s.redis.Set(ctx, key, data, 0).Err(); err != nil {
		return fmt.Errorf("failed to set feature flag: %w", err)
	}

	return nil
}

// DeleteFlag removes a feature flag
func (s *FeatureFlagService) DeleteFlag(ctx context.Context, flagName string) error {
	key := FeatureFlagPrefix + flagName
	if err := s.redis.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete feature flag: %w", err)
	}
	return nil
}

// ListFlags returns all feature flags
func (s *FeatureFlagService) ListFlags(ctx context.Context) ([]*FeatureFlag, error) {
	pattern := FeatureFlagPrefix + "*"
	keys, err := s.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to list feature flags: %w", err)
	}

	flags := make([]*FeatureFlag, 0, len(keys))
	for _, key := range keys {
		data, err := s.redis.Get(ctx, key).Result()
		if err != nil {
			continue
		}

		var flag FeatureFlag
		if err := json.Unmarshal([]byte(data), &flag); err != nil {
			continue
		}

		flags = append(flags, &flag)
	}

	return flags, nil
}

// InitializeDefaultFlags sets up default feature flags for all endpoints
// All flags start disabled (0% rollout) for safe gradual migration
func (s *FeatureFlagService) InitializeDefaultFlags(ctx context.Context) error {
	defaultFlags := []FeatureFlag{
		// Authentication
		{Name: FlagAuthLogin, Enabled: false, Rollout: 0, Description: "Use Go backend for login"},
		{Name: FlagAuthRegister, Enabled: false, Rollout: 0, Description: "Use Go backend for registration"},
		{Name: FlagAuthRefresh, Enabled: false, Rollout: 0, Description: "Use Go backend for token refresh"},
		{Name: FlagAuthLogout, Enabled: false, Rollout: 0, Description: "Use Go backend for logout"},

		// Posts
		{Name: FlagPostCreate, Enabled: false, Rollout: 0, Description: "Use Go backend for post creation"},
		{Name: FlagPostGet, Enabled: false, Rollout: 0, Description: "Use Go backend for getting posts"},
		{Name: FlagPostUpdate, Enabled: false, Rollout: 0, Description: "Use Go backend for post updates"},
		{Name: FlagPostDelete, Enabled: false, Rollout: 0, Description: "Use Go backend for post deletion"},
		{Name: FlagPostList, Enabled: false, Rollout: 0, Description: "Use Go backend for listing posts"},
		{Name: FlagPostPublish, Enabled: false, Rollout: 0, Description: "Use Go backend for publishing posts"},

		// Comments
		{Name: FlagCommentCreate, Enabled: false, Rollout: 0, Description: "Use Go backend for comment creation"},
		{Name: FlagCommentList, Enabled: false, Rollout: 0, Description: "Use Go backend for listing comments"},
		{Name: FlagCommentModerate, Enabled: false, Rollout: 0, Description: "Use Go backend for comment moderation"},
		{Name: FlagCommentDelete, Enabled: false, Rollout: 0, Description: "Use Go backend for comment deletion"},

		// Exchange rates
		{Name: FlagExchangeRates, Enabled: false, Rollout: 0, Description: "Use Go backend for exchange rates"},
		{Name: FlagExchangeHistoricalRates, Enabled: false, Rollout: 0, Description: "Use Go backend for historical rates"},

		// Uploads
		{Name: FlagUploadFile, Enabled: false, Rollout: 0, Description: "Use Go backend for file uploads"},
		{Name: FlagUploadDelete, Enabled: false, Rollout: 0, Description: "Use Go backend for file deletion"},

		// Reports
		{Name: FlagReportUserActivity, Enabled: false, Rollout: 0, Description: "Use Go backend for user activity reports"},
		{Name: FlagReportContent, Enabled: false, Rollout: 0, Description: "Use Go backend for content reports"},
		{Name: FlagReportSystemHealth, Enabled: false, Rollout: 0, Description: "Use Go backend for system health reports"},
	}

	for _, flag := range defaultFlags {
		// Only set if doesn't exist
		exists, err := s.redis.Exists(ctx, FeatureFlagPrefix+flag.Name).Result()
		if err != nil {
			return fmt.Errorf("failed to check flag existence: %w", err)
		}

		if exists == 0 {
			if err := s.SetFlag(ctx, &flag); err != nil {
				return fmt.Errorf("failed to initialize flag %s: %w", flag.Name, err)
			}
		}
	}

	return nil
}

// UpdateRollout updates the rollout percentage for a feature flag
func (s *FeatureFlagService) UpdateRollout(ctx context.Context, flagName string, rollout int) error {
	if rollout < 0 || rollout > 100 {
		return fmt.Errorf("rollout must be between 0 and 100")
	}

	flag, err := s.GetFlag(ctx, flagName)
	if err != nil {
		return err
	}

	flag.Rollout = rollout
	flag.Enabled = rollout > 0

	return s.SetFlag(ctx, flag)
}

// hashString creates a consistent hash from a string
func (s *FeatureFlagService) hashString(str string) int {
	hash := 0
	for _, char := range str {
		hash = (hash << 5) - hash + int(char)
		hash = hash & hash // Convert to 32-bit integer
	}
	if hash < 0 {
		hash = -hash
	}
	return hash
}
