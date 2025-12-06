package handlers

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/services"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// CommentHandler handles comment-related endpoints
type CommentHandler struct {
	commentService *services.CommentService
}

// NewCommentHandler creates a new comment handler
func NewCommentHandler(commentService *services.CommentService) *CommentHandler {
	return &CommentHandler{
		commentService: commentService,
	}
}

// CommentResponse represents comment data in API responses (compatible with Next.js format)
type CommentResponse struct {
	ID        string            `json:"id"`
	Content   string            `json:"content"`
	Approved  bool              `json:"approved"`
	PostID    string            `json:"postId"`
	ParentID  *string           `json:"parentId,omitempty"`
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
	Author    *CommentAuthor    `json:"author,omitempty"`
	Replies   []CommentResponse `json:"replies,omitempty"`
}

// CommentAuthor represents author data in comment responses
type CommentAuthor struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Email string  `json:"email"`
	Image *string `json:"image,omitempty"`
}

// CommentListResponse represents paginated comment list response
type CommentListResponse struct {
	Comments []CommentResponse `json:"comments"`
	Total    int               `json:"total"`
}

// CreateComment handles POST /api/v1/comments
// @Summary Create a new comment
// @Description Create a new comment on a post (requires authentication)
// @Tags comments
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param body body services.CreateCommentRequest true "Comment data"
// @Success 201 {object} CommentResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 403 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/comments [post]
func (h *CommentHandler) CreateComment(c *gin.Context) {
	var req services.CreateCommentRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, "Invalid request data", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		middleware.Unauthorized(c, "Authentication required")
		return
	}

	// Create comment
	comment, err := h.commentService.CreateComment(c.Request.Context(), req, userID)
	if err != nil {
		if err == services.ErrUserBanned {
			middleware.Forbidden(c, "You are banned from commenting")
			return
		}
		if err == services.ErrInvalidComment {
			middleware.ValidationError(c, "Invalid comment content", nil)
			return
		}
		if err == services.ErrUserNotFound {
			middleware.NotFound(c, "User not found")
			return
		}
		middleware.InternalServerError(c, "Failed to create comment")
		return
	}

	// Build response
	response := h.buildCommentResponse(comment)
	c.JSON(http.StatusCreated, response)
}

// GetCommentsByPost handles GET /api/v1/posts/:postId/comments
// @Summary Get comments for a post
// @Description Retrieve all comments for a specific post
// @Tags comments
// @Produce json
// @Param postId path string true "Post ID"
// @Param Authorization header string false "Bearer token (optional, affects visibility)"
// @Success 200 {object} CommentListResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/posts/{postId}/comments [get]
func (h *CommentHandler) GetCommentsByPost(c *gin.Context) {
	postID := c.Param("postId")

	// Get user role from context (if authenticated)
	userRole := "USER" // Default to USER role
	if role, exists := middleware.GetUserRole(c); exists {
		userRole = role
	}

	// Get comments
	comments, err := h.commentService.GetComments(c.Request.Context(), postID, userRole)
	if err != nil {
		middleware.InternalServerError(c, "Failed to get comments")
		return
	}

	// Build response
	commentResponses := make([]CommentResponse, len(comments))
	for i, comment := range comments {
		commentResponses[i] = h.buildCommentResponse(comment)
	}

	response := CommentListResponse{
		Comments: commentResponses,
		Total:    len(commentResponses),
	}

	c.JSON(http.StatusOK, response)
}

// ModerateComment handles PUT /api/v1/comments/:id/moderate
// @Summary Moderate a comment
// @Description Approve, reject, or delete a comment (requires admin/moderator role)
// @Tags comments
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path string true "Comment ID"
// @Param body body ModerateCommentRequest true "Moderation action"
// @Success 200 {object} CommentResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 403 {object} middleware.ErrorResponse
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/comments/{id}/moderate [put]
func (h *CommentHandler) ModerateComment(c *gin.Context) {
	commentID := c.Param("id")

	var req ModerateCommentRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ValidationError(c, "Invalid request data", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	// Get user info from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		middleware.Unauthorized(c, "Authentication required")
		return
	}

	userRole, _ := middleware.GetUserRole(c)

	// Validate action
	var action services.ModerationAction
	switch req.Action {
	case "approve":
		action = services.ModerationActionApprove
	case "reject":
		action = services.ModerationActionReject
	case "delete":
		action = services.ModerationActionDelete
	default:
		middleware.ValidationError(c, "Invalid moderation action", map[string]interface{}{
			"field": "action",
			"value": req.Action,
		})
		return
	}

	// Moderate comment
	comment, err := h.commentService.ModerateComment(c.Request.Context(), commentID, action, userID, userRole)
	if err != nil {
		if err == services.ErrCommentNotFound {
			middleware.NotFound(c, "Comment not found")
			return
		}
		if err == services.ErrUnauthorized {
			middleware.Forbidden(c, "You do not have permission to moderate comments")
			return
		}
		middleware.InternalServerError(c, "Failed to moderate comment")
		return
	}

	// For delete action, return success message
	if action == services.ModerationActionDelete {
		c.JSON(http.StatusOK, gin.H{
			"message": "Comment deleted successfully",
		})
		return
	}

	// Build response
	response := h.buildCommentResponse(comment)
	c.JSON(http.StatusOK, response)
}

// DeleteComment handles DELETE /api/v1/comments/:id
// @Summary Delete a comment
// @Description Delete a comment (requires authentication and authorization)
// @Tags comments
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path string true "Comment ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 403 {object} middleware.ErrorResponse
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/comments/{id} [delete]
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	commentID := c.Param("id")

	// Get user info from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		middleware.Unauthorized(c, "Authentication required")
		return
	}

	userRole, _ := middleware.GetUserRole(c)

	// Delete comment
	err := h.commentService.DeleteComment(c.Request.Context(), commentID, userID, userRole)
	if err != nil {
		if err == services.ErrCommentNotFound {
			middleware.NotFound(c, "Comment not found")
			return
		}
		if err == services.ErrUnauthorized {
			middleware.Forbidden(c, "You do not have permission to delete this comment")
			return
		}
		middleware.InternalServerError(c, "Failed to delete comment")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Comment deleted successfully",
	})
}

// ModerateCommentRequest represents the request body for comment moderation
type ModerateCommentRequest struct {
	Action string `json:"action" binding:"required,oneof=approve reject delete"`
}

// buildCommentResponse converts an Ent comment to API response format
func (h *CommentHandler) buildCommentResponse(comment *ent.Comment) CommentResponse {
	response := CommentResponse{
		ID:        comment.ID,
		Content:   comment.Content,
		Approved:  comment.Approved,
		PostID:    comment.PostID,
		ParentID:  comment.ParentID,
		CreatedAt: comment.CreatedAt,
		UpdatedAt: comment.UpdatedAt,
	}

	// Add author if loaded
	if comment.Edges.Author != nil {
		author := comment.Edges.Author
		authorName := author.Email
		if author.Name != nil && *author.Name != "" {
			authorName = *author.Name
		}
		response.Author = &CommentAuthor{
			ID:    author.ID,
			Name:  authorName,
			Email: author.Email,
			Image: author.Image,
		}
	}

	// Add replies if loaded
	if comment.Edges.Replies != nil && len(comment.Edges.Replies) > 0 {
		replies := make([]CommentResponse, len(comment.Edges.Replies))
		for i, reply := range comment.Edges.Replies {
			replies[i] = h.buildCommentResponse(reply)
		}
		response.Replies = replies
	}

	return response
}
