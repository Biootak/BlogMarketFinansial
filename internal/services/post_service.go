package services

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/ent/post"
	"biotak-go-backend/ent/user"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/repositories"
	"biotak-go-backend/internal/utils"
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	// ErrPostNotFound is returned when post is not found
	ErrPostNotFound = errors.New("post not found")
	// ErrUnauthorized is returned when user doesn't have permission
	ErrUnauthorized = errors.New("unauthorized")
	// ErrSlugExists is returned when slug already exists
	ErrSlugExists = errors.New("slug already exists")
)

// PostService handles post operations
type PostService struct {
	postRepo    *repositories.PostRepository
	entClient   *ent.Client
	redisClient *database.RedisClient
}

// NewPostService creates a new post service
func NewPostService(postRepo *repositories.PostRepository, entClient *ent.Client, redisClient *database.RedisClient) *PostService {
	return &PostService{
		postRepo:    postRepo,
		entClient:   entClient,
		redisClient: redisClient,
	}
}

// CreatePostRequest represents post creation request
type CreatePostRequest struct {
	Title          string   `json:"title" binding:"required,min=3"`
	Content        string   `json:"content" binding:"required,min=10"`
	Excerpt        *string  `json:"excerpt"`
	FeaturedImage  *string  `json:"featured_image"`
	PostType       string   `json:"post_type"`
	CategoryIDs    []string `json:"category_ids"`
	TagIDs         []string `json:"tag_ids"`
	VideoURL       *string  `json:"video_url"`
	AudioURL       *string  `json:"audio_url"`
	GalleryImages  []string `json:"gallery_images"`
}

// UpdatePostRequest represents post update request
type UpdatePostRequest struct {
	Title          *string  `json:"title"`
	Content        *string  `json:"content"`
	Excerpt        *string  `json:"excerpt"`
	FeaturedImage  *string  `json:"featured_image"`
	PostType       *string  `json:"post_type"`
	CategoryIDs    []string `json:"category_ids"`
	TagIDs         []string `json:"tag_ids"`
	VideoURL       *string  `json:"video_url"`
	AudioURL       *string  `json:"audio_url"`
	GalleryImages  []string `json:"gallery_images"`
}

// CreatePost creates a new post
func (s *PostService) CreatePost(ctx context.Context, req CreatePostRequest, authorID string) (*ent.Post, error) {
	// Generate unique slug from title
	slug := utils.GenerateSlug(req.Title)

	// Check if slug exists
	existing, _ := s.postRepo.FindBySlug(ctx, slug)
	if existing != nil {
		// Add timestamp to make it unique
		slug = fmt.Sprintf("%s-%d", slug, time.Now().Unix())
	}

	// Calculate reading time (average 200 words per minute)
	wordCount := len(strings.Fields(req.Content))
	readingTime := wordCount / 200
	if readingTime == 0 {
		readingTime = 1
	}

	// Get author
	author, err := s.entClient.User.Get(ctx, authorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get author: %w", err)
	}

	// Determine post type
	postType := post.PostTypeSTANDARD
	if req.PostType != "" {
		postType = post.PostType(req.PostType)
	}

	// Create post
	builder := s.entClient.Post.Create().
		SetTitle(req.Title).
		SetSlug(slug).
		SetContent(req.Content).
		SetStatus(post.StatusDRAFT).
		SetPostType(postType).
		SetReadingTime(readingTime).
		SetAuthor(author)

	// Set optional fields
	if req.Excerpt != nil {
		builder.SetExcerpt(*req.Excerpt)
	}
	if req.FeaturedImage != nil {
		builder.SetFeaturedImage(*req.FeaturedImage)
	}
	if req.VideoURL != nil {
		builder.SetVideoURL(*req.VideoURL)
	}
	if req.AudioURL != nil {
		builder.SetAudioURL(*req.AudioURL)
	}
	if len(req.GalleryImages) > 0 {
		builder.SetGalleryImages(req.GalleryImages)
	}

	// Save post
	p, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create post: %w", err)
	}

	// Add categories
	if len(req.CategoryIDs) > 0 {
		if err := s.postRepo.AddCategories(ctx, p.ID, req.CategoryIDs); err != nil {
			return nil, fmt.Errorf("failed to add categories: %w", err)
		}
	}

	// Add tags
	if len(req.TagIDs) > 0 {
		if err := s.postRepo.AddTags(ctx, p.ID, req.TagIDs); err != nil {
			return nil, fmt.Errorf("failed to add tags: %w", err)
		}
	}

	// Reload post with relations
	return s.postRepo.FindByID(ctx, p.ID)
}

// UpdatePost updates a post
func (s *PostService) UpdatePost(ctx context.Context, postID string, req UpdatePostRequest, userID string, userRole string) (*ent.Post, error) {
	// Get existing post
	p, err := s.postRepo.FindByID(ctx, postID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrPostNotFound
		}
		return nil, fmt.Errorf("failed to get post: %w", err)
	}

	// Check permission (author or admin)
	if p.Edges.Author.ID != userID && userRole != string(user.RoleADMIN) && userRole != string(user.RoleSUPER_ADMIN) {
		return nil, ErrUnauthorized
	}

	// Build updates map
	updates := make(map[string]interface{})

	if req.Title != nil {
		updates["title"] = *req.Title
		// Regenerate slug if title changed
		slug := utils.GenerateSlug(*req.Title)
		updates["slug"] = slug
	}
	if req.Content != nil {
		updates["content"] = *req.Content
		// Recalculate reading time
		wordCount := len(strings.Fields(*req.Content))
		readingTime := wordCount / 200
		if readingTime == 0 {
			readingTime = 1
		}
		updates["reading_time"] = readingTime
	}
	if req.Excerpt != nil {
		updates["excerpt"] = *req.Excerpt
	}
	if req.FeaturedImage != nil {
		updates["featured_image"] = *req.FeaturedImage
	}
	if req.PostType != nil {
		updates["post_type"] = post.PostType(*req.PostType)
	}

	// Update post
	if len(updates) > 0 {
		_, err = s.postRepo.Update(ctx, postID, updates)
		if err != nil {
			return nil, fmt.Errorf("failed to update post: %w", err)
		}
	}

	// Update categories
	if req.CategoryIDs != nil {
		if err := s.postRepo.SetCategories(ctx, postID, req.CategoryIDs); err != nil {
			return nil, fmt.Errorf("failed to update categories: %w", err)
		}
	}

	// Update tags
	if req.TagIDs != nil {
		if err := s.postRepo.SetTags(ctx, postID, req.TagIDs); err != nil {
			return nil, fmt.Errorf("failed to update tags: %w", err)
		}
	}

	// Invalidate cache
	s.invalidatePostCache(ctx, postID)

	// Reload post with relations
	return s.postRepo.FindByID(ctx, postID)
}

// PublishPost publishes a post
func (s *PostService) PublishPost(ctx context.Context, postID string, userID string, userRole string) (*ent.Post, error) {
	// Get existing post
	p, err := s.postRepo.FindByID(ctx, postID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrPostNotFound
		}
		return nil, fmt.Errorf("failed to get post: %w", err)
	}

	// Check permission (author or admin)
	if p.Edges.Author.ID != userID && userRole != string(user.RoleADMIN) && userRole != string(user.RoleSUPER_ADMIN) {
		return nil, ErrUnauthorized
	}

	// Update status to PUBLISHED
	updates := map[string]interface{}{
		"status": post.StatusPUBLISHED,
	}

	_, err = s.postRepo.Update(ctx, postID, updates)
	if err != nil {
		return nil, fmt.Errorf("failed to publish post: %w", err)
	}

	// Clear caches
	s.invalidatePostCache(ctx, postID)
	s.invalidatePostListCache(ctx)

	// TODO: Trigger sitemap regeneration (async)

	// Reload post with relations
	return s.postRepo.FindByID(ctx, postID)
}

// ListPosts lists posts with filters and pagination
func (s *PostService) ListPosts(ctx context.Context, filters repositories.PostFilters, limit, offset int) ([]*ent.Post, int, error) {
	// Try to get from cache for published posts
	// (skipped for simplicity - implement if needed)

	// Query from database
	posts, total, err := s.postRepo.FindByFilters(ctx, filters, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list posts: %w", err)
	}

	return posts, total, nil
}

// DeletePost soft deletes a post
func (s *PostService) DeletePost(ctx context.Context, postID string, userRole string) error {
	// Only admins can delete posts
	if userRole != string(user.RoleADMIN) && userRole != string(user.RoleSUPER_ADMIN) {
		return ErrUnauthorized
	}

	// Perform soft delete
	if err := s.postRepo.SoftDelete(ctx, postID); err != nil {
		return fmt.Errorf("failed to delete post: %w", err)
	}

	// Remove from cache
	s.invalidatePostCache(ctx, postID)
	s.invalidatePostListCache(ctx)

	return nil
}

// GetPostByID retrieves a post by ID
func (s *PostService) GetPostByID(ctx context.Context, postID string) (*ent.Post, error) {
	p, err := s.postRepo.FindByID(ctx, postID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrPostNotFound
		}
		return nil, fmt.Errorf("failed to get post: %w", err)
	}
	return p, nil
}

// GetPostBySlug retrieves a post by slug
func (s *PostService) GetPostBySlug(ctx context.Context, slug string) (*ent.Post, error) {
	p, err := s.postRepo.FindBySlug(ctx, slug)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrPostNotFound
		}
		return nil, fmt.Errorf("failed to get post: %w", err)
	}
	return p, nil
}

// IncrementViewCount increments the view count of a post
func (s *PostService) IncrementViewCount(ctx context.Context, postID string) error {
	return s.postRepo.IncrementViewCount(ctx, postID)
}

// invalidatePostCache invalidates cache for a specific post
func (s *PostService) invalidatePostCache(ctx context.Context, postID string) {
	if s.redisClient == nil {
		return
	}

	keys := []string{
		fmt.Sprintf("post:%s", postID),
		fmt.Sprintf("post:slug:*"), // Invalidate all slug caches
	}

	for _, key := range keys {
		_ = s.redisClient.Delete(ctx, key)
	}
}

// invalidatePostListCache invalidates post list caches
func (s *PostService) invalidatePostListCache(ctx context.Context) {
	if s.redisClient == nil {
		return
	}

	// Invalidate common list caches
	keys := []string{
		"posts:published:*",
		"posts:featured:*",
		"posts:latest:*",
	}

	for _, key := range keys {
		_ = s.redisClient.Delete(ctx, key)
	}
}
