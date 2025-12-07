package services

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestRedis(t *testing.T) (*redis.Client, func()) {
	// Create a miniredis server for testing
	mr, err := miniredis.Run()
	require.NoError(t, err)

	// Create Redis client
	client := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})

	// Return client and cleanup function
	return client, func() {
		client.Close()
		mr.Close()
	}
}

func TestFeatureFlagService_SetAndGetFlag(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Create a test flag
	flag := &FeatureFlag{
		Name:        "test.flag",
		Enabled:     true,
		Rollout:     50,
		Description: "Test flag",
	}

	// Set the flag
	err := service.SetFlag(ctx, flag)
	require.NoError(t, err)

	// Get the flag
	retrieved, err := service.GetFlag(ctx, "test.flag")
	require.NoError(t, err)

	// Verify
	assert.Equal(t, flag.Name, retrieved.Name)
	assert.Equal(t, flag.Enabled, retrieved.Enabled)
	assert.Equal(t, flag.Rollout, retrieved.Rollout)
	assert.Equal(t, flag.Description, retrieved.Description)
}

func TestFeatureFlagService_IsEnabled_FullRollout(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Create flag with 100% rollout
	flag := &FeatureFlag{
		Name:    "test.flag",
		Enabled: true,
		Rollout: 100,
	}
	err := service.SetFlag(ctx, flag)
	require.NoError(t, err)

	// Should be enabled for all users
	enabled, err := service.IsEnabled(ctx, "test.flag", "user1")
	require.NoError(t, err)
	assert.True(t, enabled)

	enabled, err = service.IsEnabled(ctx, "test.flag", "user2")
	require.NoError(t, err)
	assert.True(t, enabled)
}

func TestFeatureFlagService_IsEnabled_NoRollout(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Create flag with 0% rollout
	flag := &FeatureFlag{
		Name:    "test.flag",
		Enabled: false,
		Rollout: 0,
	}
	err := service.SetFlag(ctx, flag)
	require.NoError(t, err)

	// Should be disabled for all users
	enabled, err := service.IsEnabled(ctx, "test.flag", "user1")
	require.NoError(t, err)
	assert.False(t, enabled)

	enabled, err = service.IsEnabled(ctx, "test.flag", "user2")
	require.NoError(t, err)
	assert.False(t, enabled)
}

func TestFeatureFlagService_IsEnabled_PartialRollout(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Create flag with 50% rollout
	flag := &FeatureFlag{
		Name:    "test.flag",
		Enabled: true,
		Rollout: 50,
	}
	err := service.SetFlag(ctx, flag)
	require.NoError(t, err)

	// Test with multiple users - should get consistent results
	user1Result1, err := service.IsEnabled(ctx, "test.flag", "user1")
	require.NoError(t, err)

	user1Result2, err := service.IsEnabled(ctx, "test.flag", "user1")
	require.NoError(t, err)

	// Same user should always get same result (consistency)
	assert.Equal(t, user1Result1, user1Result2)

	// Test with many users to verify approximately 50% are enabled
	enabledCount := 0
	totalUsers := 100
	for i := 0; i < totalUsers; i++ {
		userID := "user" + string(rune(i))
		enabled, err := service.IsEnabled(ctx, "test.flag", userID)
		require.NoError(t, err)
		if enabled {
			enabledCount++
		}
	}

	// Should be roughly 50% (allow 20% margin for small sample size)
	assert.InDelta(t, 50, enabledCount, 20, "Expected roughly 50%% rollout")
}

func TestFeatureFlagService_UpdateRollout(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Create initial flag
	flag := &FeatureFlag{
		Name:    "test.flag",
		Enabled: false,
		Rollout: 0,
	}
	err := service.SetFlag(ctx, flag)
	require.NoError(t, err)

	// Update rollout to 75%
	err = service.UpdateRollout(ctx, "test.flag", 75)
	require.NoError(t, err)

	// Verify update
	updated, err := service.GetFlag(ctx, "test.flag")
	require.NoError(t, err)
	assert.Equal(t, 75, updated.Rollout)
	assert.True(t, updated.Enabled) // Should be enabled when rollout > 0
}

func TestFeatureFlagService_UpdateRollout_InvalidPercentage(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Create initial flag
	flag := &FeatureFlag{
		Name:    "test.flag",
		Enabled: true,
		Rollout: 50,
	}
	err := service.SetFlag(ctx, flag)
	require.NoError(t, err)

	// Try to set invalid rollout (> 100)
	err = service.UpdateRollout(ctx, "test.flag", 150)
	assert.Error(t, err)

	// Try to set invalid rollout (< 0)
	err = service.UpdateRollout(ctx, "test.flag", -10)
	assert.Error(t, err)
}

func TestFeatureFlagService_ListFlags(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Create multiple flags
	flags := []*FeatureFlag{
		{Name: "flag1", Enabled: true, Rollout: 100},
		{Name: "flag2", Enabled: true, Rollout: 50},
		{Name: "flag3", Enabled: false, Rollout: 0},
	}

	for _, flag := range flags {
		err := service.SetFlag(ctx, flag)
		require.NoError(t, err)
	}

	// List all flags
	retrieved, err := service.ListFlags(ctx)
	require.NoError(t, err)

	// Verify count
	assert.Len(t, retrieved, 3)

	// Verify all flags are present
	flagNames := make(map[string]bool)
	for _, flag := range retrieved {
		flagNames[flag.Name] = true
	}
	assert.True(t, flagNames["flag1"])
	assert.True(t, flagNames["flag2"])
	assert.True(t, flagNames["flag3"])
}

func TestFeatureFlagService_DeleteFlag(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Create a flag
	flag := &FeatureFlag{
		Name:    "test.flag",
		Enabled: true,
		Rollout: 100,
	}
	err := service.SetFlag(ctx, flag)
	require.NoError(t, err)

	// Delete the flag
	err = service.DeleteFlag(ctx, "test.flag")
	require.NoError(t, err)

	// Verify it's deleted
	_, err = service.GetFlag(ctx, "test.flag")
	assert.Error(t, err)
}

func TestFeatureFlagService_InitializeDefaultFlags(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Initialize default flags
	err := service.InitializeDefaultFlags(ctx)
	require.NoError(t, err)

	// Verify some key flags exist
	authLoginFlag, err := service.GetFlag(ctx, FlagAuthLogin)
	require.NoError(t, err)
	assert.Equal(t, FlagAuthLogin, authLoginFlag.Name)
	assert.False(t, authLoginFlag.Enabled) // Should start disabled
	assert.Equal(t, 0, authLoginFlag.Rollout)

	postCreateFlag, err := service.GetFlag(ctx, FlagPostCreate)
	require.NoError(t, err)
	assert.Equal(t, FlagPostCreate, postCreateFlag.Name)

	// List all flags
	flags, err := service.ListFlags(ctx)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(flags), 20) // Should have at least 20 flags
}

func TestFeatureFlagService_IsEnabled_NonExistentFlag(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)
	ctx := context.Background()

	// Check non-existent flag - should default to disabled
	enabled, err := service.IsEnabled(ctx, "non.existent.flag", "user1")
	require.NoError(t, err)
	assert.False(t, enabled, "Non-existent flag should default to disabled")
}

func TestFeatureFlagService_HashConsistency(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	service := NewFeatureFlagService(client)

	// Test that hash function is consistent
	hash1 := service.hashString("user123")
	hash2 := service.hashString("user123")
	assert.Equal(t, hash1, hash2, "Hash should be consistent for same input")

	// Test that different inputs produce different hashes
	hash3 := service.hashString("user456")
	assert.NotEqual(t, hash1, hash3, "Different inputs should produce different hashes")
}
