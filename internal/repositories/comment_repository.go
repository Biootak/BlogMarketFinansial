package repositories

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/ent/comment"
	"biotak-go-backend/ent/post"
	"biotak-go-backend/ent/user"
	"context"
	"fmt"
)

// CommentRepository wraps Ent Comment queries
type CommentRepository struct {
	client *ent.Client
}

// NewCommentRepository creates a new comment repository
func NewCommentRepository(client *ent.Client) *CommentRepository {
	return &CommentRepository{
		client: client,
	}
}

// CommentStatus represents the approval status of a comment
type CommentStatus string

const (
	CommentStatusPending  CommentStatus = "PENDING"
	CommentStatusApproved CommentStatus = "APPROVED"
	CommentStatusRejected CommentStatus = "REJECTED"
)

// Create creates a new comment
func (r *CommentRepository) Create(ctx context.Context, c *ent.Comment) (*ent.Comment, error) {
	builder := r.client.Comment.Create().
		SetContent(c.Content).
		SetApproved(c.Approved).
		SetPostID(c.PostID).
		SetAuthorID(c.AuthorID)

	// Set optional parent_id for nested comments
	if c.ParentID != nil {
		builder.SetParentID(*c.ParentID)
	}

	return builder.Save(ctx)
}

// FindByID retrieves a comment by ID with relations
func (r *CommentRepository) FindByID(ctx context.Context, id string) (*ent.Comment, error) {
	return r.client.Comment.Query().
		Where(comment.ID(id)).
		Where(comment.DeletedAtIsNil()).
		WithAuthor().
		WithPost().
		WithReplies().
		Only(ctx)
}

// FindByPostID retrieves comments for a specific post
func (r *CommentRepository) FindByPostID(ctx context.Context, postID string, includeUnapproved bool) ([]*ent.Comment, error) {
	query := r.client.Comment.Query().
		Where(comment.HasPostWith(post.ID(postID))).
		Where(comment.DeletedAtIsNil())

	// Filter by approval status if needed
	if !includeUnapproved {
		query = query.Where(comment.ApprovedEQ(true))
	}

	return query.
		WithAuthor().
		WithPost().
		WithReplies(func(q *ent.CommentQuery) {
			q.WithAuthor()
		}).
		Order(ent.Asc(comment.FieldCreatedAt)).
		All(ctx)
}

// FindByStatus retrieves comments by approval status
func (r *CommentRepository) FindByStatus(ctx context.Context, approved bool, limit, offset int) ([]*ent.Comment, error) {
	return r.client.Comment.Query().
		Where(comment.ApprovedEQ(approved)).
		Where(comment.DeletedAtIsNil()).
		WithAuthor().
		WithPost().
		Order(ent.Desc(comment.FieldCreatedAt)).
		Limit(limit).
		Offset(offset).
		All(ctx)
}

// Update updates a comment
func (r *CommentRepository) Update(ctx context.Context, id string, updates map[string]interface{}) (*ent.Comment, error) {
	builder := r.client.Comment.UpdateOneID(id)

	// Apply updates
	for key, value := range updates {
		switch key {
		case "content":
			if v, ok := value.(string); ok {
				builder.SetContent(v)
			}
		case "approved":
			if v, ok := value.(bool); ok {
				builder.SetApproved(v)
			}
		}
	}

	return builder.Save(ctx)
}

// Delete performs soft delete on a comment
func (r *CommentRepository) Delete(ctx context.Context, id string) error {
	// Get the comment first to check if it has replies
	c, err := r.client.Comment.Query().
		Where(comment.ID(id)).
		WithReplies().
		Only(ctx)

	if err != nil {
		return fmt.Errorf("failed to get comment: %w", err)
	}

	// Soft delete the comment
	if err := r.client.Comment.UpdateOneID(id).
		SetDeletedAt(c.UpdatedAt).
		Exec(ctx); err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}

	// Also soft delete all replies
	if len(c.Edges.Replies) > 0 {
		for _, reply := range c.Edges.Replies {
			if err := r.Delete(ctx, reply.ID); err != nil {
				return fmt.Errorf("failed to delete reply: %w", err)
			}
		}
	}

	return nil
}

// CountByPost counts comments for a specific post
func (r *CommentRepository) CountByPost(ctx context.Context, postID string, includeUnapproved bool) (int, error) {
	query := r.client.Comment.Query().
		Where(comment.HasPostWith(post.ID(postID))).
		Where(comment.DeletedAtIsNil())

	if !includeUnapproved {
		query = query.Where(comment.ApprovedEQ(true))
	}

	return query.Count(ctx)
}

// CountByAuthor counts comments by a specific author
func (r *CommentRepository) CountByAuthor(ctx context.Context, authorID string) (int, error) {
	return r.client.Comment.Query().
		Where(comment.HasAuthorWith(user.ID(authorID))).
		Where(comment.DeletedAtIsNil()).
		Count(ctx)
}

// FindReplies retrieves replies for a specific comment
func (r *CommentRepository) FindReplies(ctx context.Context, parentID string, includeUnapproved bool) ([]*ent.Comment, error) {
	query := r.client.Comment.Query().
		Where(comment.ParentIDEQ(parentID)).
		Where(comment.DeletedAtIsNil())

	if !includeUnapproved {
		query = query.Where(comment.ApprovedEQ(true))
	}

	return query.
		WithAuthor().
		Order(ent.Asc(comment.FieldCreatedAt)).
		All(ctx)
}

// FindPendingComments retrieves all pending comments for moderation
func (r *CommentRepository) FindPendingComments(ctx context.Context, limit, offset int) ([]*ent.Comment, int, error) {
	query := r.client.Comment.Query().
		Where(comment.ApprovedEQ(false)).
		Where(comment.DeletedAtIsNil())

	// Get total count
	total, err := query.Count(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count pending comments: %w", err)
	}

	// Get comments with pagination
	comments, err := query.
		WithAuthor().
		WithPost().
		Order(ent.Desc(comment.FieldCreatedAt)).
		Limit(limit).
		Offset(offset).
		All(ctx)

	if err != nil {
		return nil, 0, fmt.Errorf("failed to query pending comments: %w", err)
	}

	return comments, total, nil
}
