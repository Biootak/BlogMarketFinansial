package services

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/ent/user"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/repositories"
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var (
	// ErrCommentNotFound is returned when comment is not found
	ErrCommentNotFound = errors.New("comment not found")
	// ErrUserBanned is returned when user is banned
	ErrUserBanned = errors.New("user is banned from commenting")
	// ErrInvalidComment is returned when comment content is invalid
	ErrInvalidComment = errors.New("invalid comment content")
)

// CommentService handles comment operations
type CommentService struct {
	commentRepo *repositories.CommentRepository
	entClient   *ent.Client
	redisClient *database.RedisClient
}

// NewCommentService creates a new comment service
func NewCommentService(commentRepo *repositories.CommentRepository, entClient *ent.Client, redisClient *database.RedisClient) *CommentService {
	return &CommentService{
		commentRepo: commentRepo,
		entClient:   entClient,
		redisClient: redisClient,
	}
}

// CreateCommentRequest represents comment creation request
type CreateCommentRequest struct {
	Content  string  `json:"content" binding:"required,min=1,max=5000"`
	PostID   string  `json:"post_id" binding:"required"`
	ParentID *string `json:"parent_id"`
}

// ModerationAction represents the action to take on a comment
type ModerationAction string

const (
	ModerationActionApprove ModerationAction = "approve"
	ModerationActionReject  ModerationAction = "reject"
	ModerationActionDelete  ModerationAction = "delete"
)

// Spam detection patterns
var (
	// Excessive links pattern (more than 3 links)
	linkPattern = regexp.MustCompile(`https?://[^\s]+`)
	
	// Banned keywords (common spam patterns)
	bannedKeywords = []string{
		"viagra", "cialis", "casino", "poker", "lottery",
		"click here", "buy now", "limited offer", "act now",
		"free money", "make money fast", "work from home",
	}
)

// CreateComment creates a new comment with spam detection
func (s *CommentService) CreateComment(ctx context.Context, req CreateCommentRequest, authorID string) (*ent.Comment, error) {
	// Check if user is banned
	author, err := s.entClient.User.Get(ctx, authorID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Check if user is banned (status != "Active")
	if author.Status != "Active" {
		return nil, ErrUserBanned
	}

	// Validate content
	content := strings.TrimSpace(req.Content)
	if content == "" {
		return nil, ErrInvalidComment
	}

	// Check for spam patterns
	isSpam := s.CheckSpam(content)

	// Set approval status based on spam detection
	approved := !isSpam

	// Verify post exists
	_, err = s.entClient.Post.Get(ctx, req.PostID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, errors.New("post not found")
		}
		return nil, fmt.Errorf("failed to verify post: %w", err)
	}

	// Verify parent comment exists if provided
	if req.ParentID != nil {
		parentExists, err := s.commentRepo.FindByID(ctx, *req.ParentID)
		if err != nil {
			if ent.IsNotFound(err) {
				return nil, errors.New("parent comment not found")
			}
			return nil, fmt.Errorf("failed to verify parent comment: %w", err)
		}
		if parentExists == nil {
			return nil, errors.New("parent comment not found")
		}
	}

	// Create comment
	comment := &ent.Comment{
		Content:  content,
		Approved: approved,
		PostID:   req.PostID,
		AuthorID: authorID,
		ParentID: req.ParentID,
	}

	createdComment, err := s.commentRepo.Create(ctx, comment)
	if err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}

	// Reload with relations
	return s.commentRepo.FindByID(ctx, createdComment.ID)
}

// CheckSpam checks if comment content contains spam patterns
func (s *CommentService) CheckSpam(content string) bool {
	contentLower := strings.ToLower(content)

	// Check for excessive links (more than 3)
	links := linkPattern.FindAllString(content, -1)
	if len(links) > 3 {
		return true
	}

	// Check for banned keywords
	for _, keyword := range bannedKeywords {
		if strings.Contains(contentLower, keyword) {
			return true
		}
	}

	// Check for excessive capitalization (more than 50% uppercase)
	upperCount := 0
	letterCount := 0
	for _, char := range content {
		if (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') {
			letterCount++
			if char >= 'A' && char <= 'Z' {
				upperCount++
			}
		}
	}

	if letterCount > 0 && float64(upperCount)/float64(letterCount) > 0.5 {
		return true
	}

	// Check for repeated characters (more than 5 in a row)
	repeatedPattern := regexp.MustCompile(`(.)\1{5,}`)
	if repeatedPattern.MatchString(content) {
		return true
	}

	return false
}

// GetComments retrieves comments for a post based on user role
func (s *CommentService) GetComments(ctx context.Context, postID string, userRole string) ([]*ent.Comment, error) {
	// Determine if user can see pending comments
	includePending := userRole == string(user.RoleADMIN) || 
		userRole == string(user.RoleSUPER_ADMIN) || 
		userRole == "MODERATOR"

	comments, err := s.commentRepo.FindByPostID(ctx, postID, includePending)
	if err != nil {
		return nil, fmt.Errorf("failed to get comments: %w", err)
	}

	return comments, nil
}

// GetCommentByID retrieves a comment by ID
func (s *CommentService) GetCommentByID(ctx context.Context, commentID string) (*ent.Comment, error) {
	comment, err := s.commentRepo.FindByID(ctx, commentID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrCommentNotFound
		}
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}
	return comment, nil
}

// ModerateComment performs moderation action on a comment
func (s *CommentService) ModerateComment(ctx context.Context, commentID string, action ModerationAction, moderatorID string, moderatorRole string) (*ent.Comment, error) {
	// Verify moderator has permission (admin or super_admin)
	if moderatorRole != string(user.RoleADMIN) && moderatorRole != string(user.RoleSUPER_ADMIN) {
		return nil, ErrUnauthorized
	}

	// Get existing comment
	comment, err := s.commentRepo.FindByID(ctx, commentID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrCommentNotFound
		}
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}

	// Perform action
	switch action {
	case ModerationActionApprove:
		// Approve comment
		updates := map[string]interface{}{
			"approved": true,
		}
		_, err = s.commentRepo.Update(ctx, commentID, updates)
		if err != nil {
			return nil, fmt.Errorf("failed to approve comment: %w", err)
		}

	case ModerationActionReject:
		// Reject comment (set approved to false)
		updates := map[string]interface{}{
			"approved": false,
		}
		_, err = s.commentRepo.Update(ctx, commentID, updates)
		if err != nil {
			return nil, fmt.Errorf("failed to reject comment: %w", err)
		}

	case ModerationActionDelete:
		// Delete comment
		err = s.commentRepo.Delete(ctx, commentID)
		if err != nil {
			return nil, fmt.Errorf("failed to delete comment: %w", err)
		}
		return comment, nil

	default:
		return nil, errors.New("invalid moderation action")
	}

	// Reload comment with relations
	return s.commentRepo.FindByID(ctx, commentID)
}

// DeleteComment deletes a comment (soft delete)
func (s *CommentService) DeleteComment(ctx context.Context, commentID string, userID string, userRole string) error {
	// Get existing comment
	comment, err := s.commentRepo.FindByID(ctx, commentID)
	if err != nil {
		if ent.IsNotFound(err) {
			return ErrCommentNotFound
		}
		return fmt.Errorf("failed to get comment: %w", err)
	}

	// Check permission (author, admin, or super_admin)
	if comment.AuthorID != userID && 
		userRole != string(user.RoleADMIN) && 
		userRole != string(user.RoleSUPER_ADMIN) {
		return ErrUnauthorized
	}

	// Perform soft delete
	if err := s.commentRepo.Delete(ctx, commentID); err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}

	return nil
}

// GetPendingComments retrieves pending comments for moderation
func (s *CommentService) GetPendingComments(ctx context.Context, limit, offset int) ([]*ent.Comment, int, error) {
	comments, total, err := s.commentRepo.FindPendingComments(ctx, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get pending comments: %w", err)
	}

	return comments, total, nil
}

// CountCommentsByPost counts comments for a specific post
func (s *CommentService) CountCommentsByPost(ctx context.Context, postID string, includeUnapproved bool) (int, error) {
	count, err := s.commentRepo.CountByPost(ctx, postID, includeUnapproved)
	if err != nil {
		return 0, fmt.Errorf("failed to count comments: %w", err)
	}
	return count, nil
}
