package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/ent/comment"
	"biotak-go-backend/ent/dailyanalytics"
	"biotak-go-backend/ent/post"
	"biotak-go-backend/ent/user"
)

// AnalyticsService handles analytics aggregation operations
type AnalyticsService struct {
	client *ent.Client
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService(client *ent.Client) *AnalyticsService {
	return &AnalyticsService{
		client: client,
	}
}

// CalculateDailyStatistics calculates and stores daily statistics
func (s *AnalyticsService) CalculateDailyStatistics(ctx context.Context, date time.Time) error {
	// Normalize date to start of day
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	
	log.Printf("[AnalyticsService] Calculating statistics for %s", startOfDay.Format("2006-01-02"))
	
	// Calculate total views (sum of view_count for posts created on this day)
	// Note: In a real system, you'd track views separately
	totalViews, err := s.calculateTotalViews(ctx, startOfDay, endOfDay)
	if err != nil {
		return fmt.Errorf("failed to calculate total views: %w", err)
	}
	
	// Calculate total comments
	totalComments, err := s.client.Comment.
		Query().
		Where(
			comment.CreatedAtGTE(startOfDay),
			comment.CreatedAtLT(endOfDay),
		).
		Count(ctx)
	
	if err != nil {
		return fmt.Errorf("failed to count comments: %w", err)
	}
	
	// Calculate new users
	newUsers, err := s.client.User.
		Query().
		Where(
			user.CreatedAtGTE(startOfDay),
			user.CreatedAtLT(endOfDay),
		).
		Count(ctx)
	
	if err != nil {
		return fmt.Errorf("failed to count new users: %w", err)
	}
	
	// Calculate new posts
	newPosts, err := s.client.Post.
		Query().
		Where(
			post.CreatedAtGTE(startOfDay),
			post.CreatedAtLT(endOfDay),
		).
		Count(ctx)
	
	if err != nil {
		return fmt.Errorf("failed to count new posts: %w", err)
	}
	
	// Calculate published posts
	publishedPosts, err := s.client.Post.
		Query().
		Where(
			post.StatusEQ(post.StatusPUBLISHED),
			post.CreatedAtGTE(startOfDay),
			post.CreatedAtLT(endOfDay),
		).
		Count(ctx)
	
	if err != nil {
		return fmt.Errorf("failed to count published posts: %w", err)
	}
	
	// Store aggregated data
	_, err = s.client.DailyAnalytics.
		Create().
		SetDate(startOfDay).
		SetTotalViews(totalViews).
		SetTotalComments(totalComments).
		SetNewUsers(newUsers).
		SetNewPosts(newPosts).
		SetPublishedPosts(publishedPosts).
		Save(ctx)
	
	if err != nil {
		// If record already exists, update it
		_, err = s.client.DailyAnalytics.
			Update().
			Where(dailyanalytics.DateEQ(startOfDay)).
			SetTotalViews(totalViews).
			SetTotalComments(totalComments).
			SetNewUsers(newUsers).
			SetNewPosts(newPosts).
			SetPublishedPosts(publishedPosts).
			Save(ctx)
		
		if err != nil {
			return fmt.Errorf("failed to save daily analytics: %w", err)
		}
	}
	
	log.Printf("[AnalyticsService] Stored statistics for %s: views=%d, comments=%d, users=%d, posts=%d, published=%d",
		startOfDay.Format("2006-01-02"), totalViews, totalComments, newUsers, newPosts, publishedPosts)
	
	return nil
}

// calculateTotalViews calculates total views for a given day
// In a real system, this would query a separate views tracking table
func (s *AnalyticsService) calculateTotalViews(ctx context.Context, startOfDay, endOfDay time.Time) (int, error) {
	// For now, we'll sum the view_count of posts created on this day
	// In production, you'd have a separate views table with timestamps
	posts, err := s.client.Post.
		Query().
		Where(
			post.CreatedAtGTE(startOfDay),
			post.CreatedAtLT(endOfDay),
		).
		All(ctx)
	
	if err != nil {
		return 0, err
	}
	
	totalViews := 0
	for _, p := range posts {
		totalViews += p.ViewCount
	}
	
	return totalViews, nil
}

// ClearOldRawData removes raw data older than the specified number of days
func (s *AnalyticsService) ClearOldRawData(ctx context.Context, daysToKeep int) error {
	cutoffDate := time.Now().AddDate(0, 0, -daysToKeep)
	
	log.Printf("[AnalyticsService] Clearing raw data older than %s", cutoffDate.Format("2006-01-02"))
	
	// In a real system, you would delete old records from tracking tables
	// For now, we'll just log that we would do this
	
	// Example: Delete old view tracking records
	// deletedViews, err := s.client.ViewTracking.
	// 	Delete().
	// 	Where(viewtracking.CreatedAtLT(cutoffDate)).
	// 	Exec(ctx)
	
	log.Printf("[AnalyticsService] Would clear raw data older than %d days", daysToKeep)
	
	return nil
}

// GetDailyStatistics retrieves daily statistics for a date range
func (s *AnalyticsService) GetDailyStatistics(ctx context.Context, startDate, endDate time.Time) ([]*ent.DailyAnalytics, error) {
	stats, err := s.client.DailyAnalytics.
		Query().
		Where(
			dailyanalytics.DateGTE(startDate),
			dailyanalytics.DateLTE(endDate),
		).
		Order(ent.Asc(dailyanalytics.FieldDate)).
		All(ctx)
	
	if err != nil {
		return nil, fmt.Errorf("failed to fetch daily statistics: %w", err)
	}
	
	return stats, nil
}
