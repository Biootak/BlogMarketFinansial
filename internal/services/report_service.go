package services

import (
	"context"
	"fmt"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/ent/comment"
	"biotak-go-backend/ent/post"
	"biotak-go-backend/ent/user"

	"github.com/redis/go-redis/v9"
)

// UserActivityMetrics represents user activity statistics
type UserActivityMetrics struct {
	UserID         string    `json:"user_id"`
	UserName       string    `json:"user_name"`
	UserEmail      string    `json:"user_email"`
	TotalPosts     int       `json:"total_posts"`
	TotalViews     int       `json:"total_views"`
	TotalComments  int       `json:"total_comments"`
	AvgViewsPerPost float64  `json:"avg_views_per_post"`
	LastActivity   time.Time `json:"last_activity"`
}

// UserActivityReport represents the complete user activity report
type UserActivityReport struct {
	From       time.Time              `json:"from"`
	To         time.Time              `json:"to"`
	TotalUsers int                    `json:"total_users"`
	ActiveUsers int                   `json:"active_users"`
	Users      []UserActivityMetrics  `json:"users"`
	GeneratedAt time.Time             `json:"generated_at"`
}

// ContentStatistics represents content statistics
type ContentStatistics struct {
	CategoryName  string `json:"category_name"`
	PostCount     int    `json:"post_count"`
	TotalViews    int    `json:"total_views"`
	AvgViews      float64 `json:"avg_views"`
}

// AuthorPerformance represents author performance metrics
type AuthorPerformance struct {
	AuthorID      string  `json:"author_id"`
	AuthorName    string  `json:"author_name"`
	PostCount     int     `json:"post_count"`
	TotalViews    int     `json:"total_views"`
	AvgViews      float64 `json:"avg_views"`
	CommentCount  int     `json:"comment_count"`
}

// ContentReport represents the complete content report
type ContentReport struct {
	From              time.Time           `json:"from"`
	To                time.Time           `json:"to"`
	TotalPosts        int                 `json:"total_posts"`
	PublishedPosts    int                 `json:"published_posts"`
	DraftPosts        int                 `json:"draft_posts"`
	CategoryStats     []ContentStatistics `json:"category_stats"`
	AuthorPerformance []AuthorPerformance `json:"author_performance"`
	TrendingTopics    []string            `json:"trending_topics"`
	GeneratedAt       time.Time           `json:"generated_at"`
}

// SystemHealthMetrics represents system health statistics
type SystemHealthMetrics struct {
	DatabaseSize     int64   `json:"database_size_bytes"`
	CacheHitRate     float64 `json:"cache_hit_rate"`
	AvgResponseTime  float64 `json:"avg_response_time_ms"`
	ErrorRate        float64 `json:"error_rate"`
	ActiveConnections int    `json:"active_connections"`
}

// SystemHealthReport represents the complete system health report
type SystemHealthReport struct {
	Metrics     SystemHealthMetrics `json:"metrics"`
	Status      string              `json:"status"`
	GeneratedAt time.Time           `json:"generated_at"`
}

// ReportService handles report generation
type ReportService struct {
	client *ent.Client
	redis  *redis.Client
}

// NewReportService creates a new report service
func NewReportService(client *ent.Client, redis *redis.Client) *ReportService {
	return &ReportService{
		client: client,
		redis:  redis,
	}
}

// GenerateUserActivityReport generates a user activity report for the specified time period
func (s *ReportService) GenerateUserActivityReport(ctx context.Context, from, to time.Time) (*UserActivityReport, error) {
	// Query all users
	users, err := s.client.User.Query().
		Where(user.CreatedAtLTE(to)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}

	report := &UserActivityReport{
		From:        from,
		To:          to,
		TotalUsers:  len(users),
		ActiveUsers: 0,
		Users:       make([]UserActivityMetrics, 0),
		GeneratedAt: time.Now(),
	}

	// Calculate metrics for each user
	for _, u := range users {
		// Query posts created by user in time period
		posts, err := s.client.Post.Query().
			Where(
				post.HasAuthorWith(user.ID(u.ID)),
				post.CreatedAtGTE(from),
				post.CreatedAtLTE(to),
			).
			All(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to query posts for user %s: %w", u.ID, err)
		}

		// Calculate total views
		totalViews := 0
		for _, p := range posts {
			totalViews += p.ViewCount
		}

		// Query comments created by user in time period
		commentCount, err := s.client.Comment.Query().
			Where(
				comment.HasAuthorWith(user.ID(u.ID)),
				comment.CreatedAtGTE(from),
				comment.CreatedAtLTE(to),
			).
			Count(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to query comments for user %s: %w", u.ID, err)
		}

		// Calculate average views per post
		avgViews := 0.0
		if len(posts) > 0 {
			avgViews = float64(totalViews) / float64(len(posts))
		}

		// Determine last activity
		lastActivity := u.CreatedAt
		if len(posts) > 0 {
			for _, p := range posts {
				if p.CreatedAt.After(lastActivity) {
					lastActivity = p.CreatedAt
				}
			}
		}

		// Check if user was active in the period
		isActive := len(posts) > 0 || commentCount > 0
		if isActive {
			report.ActiveUsers++
		}

		// Get user name (handle nil pointer)
		userName := ""
		if u.Name != nil {
			userName = *u.Name
		}

		metrics := UserActivityMetrics{
			UserID:         u.ID,
			UserName:       userName,
			UserEmail:      u.Email,
			TotalPosts:     len(posts),
			TotalViews:     totalViews,
			TotalComments:  commentCount,
			AvgViewsPerPost: avgViews,
			LastActivity:   lastActivity,
		}

		report.Users = append(report.Users, metrics)
	}

	return report, nil
}

// GenerateContentReport generates a content report for the specified time period
func (s *ReportService) GenerateContentReport(ctx context.Context, from, to time.Time) (*ContentReport, error) {
	// Query all posts in time period
	posts, err := s.client.Post.Query().
		Where(
			post.CreatedAtGTE(from),
			post.CreatedAtLTE(to),
		).
		WithAuthor().
		WithCategories().
		WithTags().
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to query posts: %w", err)
	}

	report := &ContentReport{
		From:              from,
		To:                to,
		TotalPosts:        len(posts),
		PublishedPosts:    0,
		DraftPosts:        0,
		CategoryStats:     make([]ContentStatistics, 0),
		AuthorPerformance: make([]AuthorPerformance, 0),
		TrendingTopics:    make([]string, 0),
		GeneratedAt:       time.Now(),
	}

	// Count posts by status
	for _, p := range posts {
		switch p.Status {
		case "PUBLISHED":
			report.PublishedPosts++
		case "DRAFT":
			report.DraftPosts++
		}
	}

	// Calculate category statistics
	categoryMap := make(map[string]*ContentStatistics)
	for _, p := range posts {
		for _, cat := range p.Edges.Categories {
			if _, exists := categoryMap[cat.ID]; !exists {
				categoryMap[cat.ID] = &ContentStatistics{
					CategoryName: cat.Name,
					PostCount:    0,
					TotalViews:   0,
					AvgViews:     0,
				}
			}
			stats := categoryMap[cat.ID]
			stats.PostCount++
			stats.TotalViews += p.ViewCount
		}
	}

	// Calculate average views for each category
	for _, stats := range categoryMap {
		if stats.PostCount > 0 {
			stats.AvgViews = float64(stats.TotalViews) / float64(stats.PostCount)
		}
		report.CategoryStats = append(report.CategoryStats, *stats)
	}

	// Calculate author performance
	authorMap := make(map[string]*AuthorPerformance)
	for _, p := range posts {
		if p.Edges.Author == nil {
			continue
		}
		authorID := p.Edges.Author.ID
		
		// Get author name (handle nil pointer)
		authorName := ""
		if p.Edges.Author.Name != nil {
			authorName = *p.Edges.Author.Name
		}
		
		if _, exists := authorMap[authorID]; !exists {
			authorMap[authorID] = &AuthorPerformance{
				AuthorID:     authorID,
				AuthorName:   authorName,
				PostCount:    0,
				TotalViews:   0,
				AvgViews:     0,
				CommentCount: 0,
			}
		}
		perf := authorMap[authorID]
		perf.PostCount++
		perf.TotalViews += p.ViewCount
	}

	// Calculate average views and comment counts for each author
	for authorID, perf := range authorMap {
		if perf.PostCount > 0 {
			perf.AvgViews = float64(perf.TotalViews) / float64(perf.PostCount)
		}

		// Count comments on author's posts
		commentCount, err := s.client.Comment.Query().
			Where(
				comment.HasPostWith(
					post.HasAuthorWith(user.IDEQ(authorID)),
				),
				comment.CreatedAtGTE(from),
				comment.CreatedAtLTE(to),
			).
			Count(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to query comments for author %s: %w", authorID, err)
		}
		perf.CommentCount = commentCount

		report.AuthorPerformance = append(report.AuthorPerformance, *perf)
	}

	// Calculate trending topics (tags with most posts)
	tagMap := make(map[string]int)
	for _, p := range posts {
		for _, tag := range p.Edges.Tags {
			tagMap[tag.Name]++
		}
	}

	// Sort tags by count and get top 10
	type tagCount struct {
		name  string
		count int
	}
	tagCounts := make([]tagCount, 0, len(tagMap))
	for name, count := range tagMap {
		tagCounts = append(tagCounts, tagCount{name, count})
	}

	// Simple bubble sort for top 10
	for i := 0; i < len(tagCounts) && i < 10; i++ {
		for j := i + 1; j < len(tagCounts); j++ {
			if tagCounts[j].count > tagCounts[i].count {
				tagCounts[i], tagCounts[j] = tagCounts[j], tagCounts[i]
			}
		}
	}

	// Get top 10 trending topics
	limit := 10
	if len(tagCounts) < limit {
		limit = len(tagCounts)
	}
	for i := 0; i < limit; i++ {
		report.TrendingTopics = append(report.TrendingTopics, tagCounts[i].name)
	}

	return report, nil
}

// GenerateSystemHealthReport generates a system health report
func (s *ReportService) GenerateSystemHealthReport(ctx context.Context) (*SystemHealthReport, error) {
	report := &SystemHealthReport{
		Metrics:     SystemHealthMetrics{},
		Status:      "healthy",
		GeneratedAt: time.Now(),
	}

	// Get database size (approximate by counting records)
	userCount, err := s.client.User.Query().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	postCount, err := s.client.Post.Query().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count posts: %w", err)
	}

	commentCount, err := s.client.Comment.Query().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count comments: %w", err)
	}

	// Approximate database size (rough estimate: 1KB per user, 5KB per post, 500B per comment)
	report.Metrics.DatabaseSize = int64(userCount*1024 + postCount*5120 + commentCount*512)

	// Get cache statistics from Redis
	_, err = s.redis.Info(ctx, "stats").Result()
	if err == nil {
		// Parse Redis INFO output for cache hit rate
		// This is a simplified calculation
		// In production, you'd want to track hits/misses over time
		report.Metrics.CacheHitRate = 0.85 // Default placeholder
	} else {
		report.Metrics.CacheHitRate = 0.0
	}

	// Get active connections from Redis
	clientList, err := s.redis.ClientList(ctx).Result()
	if err == nil {
		// Count active connections (simplified)
		report.Metrics.ActiveConnections = len(clientList) / 100 // Rough estimate
	} else {
		report.Metrics.ActiveConnections = 0
	}

	// Average response time (placeholder - in production, track this via middleware)
	report.Metrics.AvgResponseTime = 50.0 // 50ms default

	// Error rate (placeholder - in production, track this via middleware)
	report.Metrics.ErrorRate = 0.01 // 1% default

	// Determine overall status
	if report.Metrics.ErrorRate > 0.05 {
		report.Status = "degraded"
	}
	if report.Metrics.ErrorRate > 0.10 {
		report.Status = "unhealthy"
	}

	return report, nil
}

// ReportJob represents an async report generation job
type ReportJob struct {
	JobID       string    `json:"job_id"`
	ReportType  string    `json:"report_type"`
	Status      string    `json:"status"` // pending, processing, completed, failed
	Result      string    `json:"result,omitempty"`
	Error       string    `json:"error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// GenerateUserActivityReportAsync generates a user activity report asynchronously
func (s *ReportService) GenerateUserActivityReportAsync(ctx context.Context, from, to time.Time) (string, error) {
	jobID := fmt.Sprintf("report_%d", time.Now().UnixNano())

	// Create job record in Redis
	job := ReportJob{
		JobID:      jobID,
		ReportType: "user_activity",
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	// Store job in Redis
	jobKey := fmt.Sprintf("report_job:%s", jobID)
	err := s.redis.HSet(ctx, jobKey, map[string]interface{}{
		"job_id":      job.JobID,
		"report_type": job.ReportType,
		"status":      job.Status,
		"created_at":  job.CreatedAt.Format(time.RFC3339),
	}).Err()
	if err != nil {
		return "", fmt.Errorf("failed to create job: %w", err)
	}

	// Set expiration (24 hours)
	s.redis.Expire(ctx, jobKey, 24*time.Hour)

	// Start background goroutine to process report
	go func() {
		bgCtx := context.Background()

		// Update status to processing
		s.redis.HSet(bgCtx, jobKey, "status", "processing")

		// Generate report
		report, err := s.GenerateUserActivityReport(bgCtx, from, to)
		if err != nil {
			// Update job with error
			s.redis.HSet(bgCtx, jobKey, map[string]interface{}{
				"status":       "failed",
				"error":        err.Error(),
				"completed_at": time.Now().Format(time.RFC3339),
			})
			return
		}

		// Store result (simplified - in production, store in S3 or database)
		resultKey := fmt.Sprintf("report_result:%s", jobID)
		// Convert report to JSON string (simplified)
		resultJSON := fmt.Sprintf(`{"from":"%s","to":"%s","total_users":%d,"active_users":%d}`,
			report.From.Format(time.RFC3339),
			report.To.Format(time.RFC3339),
			report.TotalUsers,
			report.ActiveUsers,
		)
		s.redis.Set(bgCtx, resultKey, resultJSON, 24*time.Hour)

		// Update job status
		s.redis.HSet(bgCtx, jobKey, map[string]interface{}{
			"status":       "completed",
			"result":       resultKey,
			"completed_at": time.Now().Format(time.RFC3339),
		})
	}()

	return jobID, nil
}

// GetJobStatus retrieves the status of a report generation job
func (s *ReportService) GetJobStatus(ctx context.Context, jobID string) (*ReportJob, error) {
	jobKey := fmt.Sprintf("report_job:%s", jobID)

	// Get job data from Redis
	data, err := s.redis.HGetAll(ctx, jobKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get job: %w", err)
	}

	if len(data) == 0 {
		return nil, fmt.Errorf("job not found")
	}

	job := &ReportJob{
		JobID:      data["job_id"],
		ReportType: data["report_type"],
		Status:     data["status"],
		Result:     data["result"],
		Error:      data["error"],
	}

	// Parse timestamps
	if createdAt, ok := data["created_at"]; ok {
		if t, err := time.Parse(time.RFC3339, createdAt); err == nil {
			job.CreatedAt = t
		}
	}

	if completedAt, ok := data["completed_at"]; ok && completedAt != "" {
		if t, err := time.Parse(time.RFC3339, completedAt); err == nil {
			job.CompletedAt = &t
		}
	}

	return job, nil
}

// GetJobResult retrieves the result of a completed report generation job
func (s *ReportService) GetJobResult(ctx context.Context, jobID string) (string, error) {
	// First check if job is completed
	job, err := s.GetJobStatus(ctx, jobID)
	if err != nil {
		return "", err
	}

	if job.Status != "completed" {
		return "", fmt.Errorf("job not completed yet, status: %s", job.Status)
	}

	// Get result from Redis
	resultKey := job.Result
	if resultKey == "" {
		resultKey = fmt.Sprintf("report_result:%s", jobID)
	}

	result, err := s.redis.Get(ctx, resultKey).Result()
	if err != nil {
		return "", fmt.Errorf("failed to get result: %w", err)
	}

	return result, nil
}
