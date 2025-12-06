package handlers

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/ent/post"
	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/repositories"
	"biotak-go-backend/internal/services"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// PostHandler handles post-related endpoints
type PostHandler struct {
	postService *services.PostService
}

// NewPostHandler creates a new post handler
func NewPostHandler(postService *services.PostService) *PostHandler {
	return &PostHandler{
		postService: postService,
	}
}

// PostResponse represents post data in API responses (compatible with Next.js format)
type PostResponse struct {
	ID             string            `json:"id"`
	Title          string            `json:"title"`
	Slug           string            `json:"slug"`
	Content        string            `json:"content"`
	Excerpt        *string           `json:"excerpt,omitempty"`
	FeaturedImage  *string           `json:"featuredImage,omitempty"`
	Status         string            `json:"status"`
	PostType       string            `json:"postType"`
	ViewCount      int               `json:"viewCount"`
	ReadingTime    int               `json:"readingTime"`
	PublishedAt    *time.Time        `json:"publishedAt,omitempty"`
	CreatedAt      time.Time         `json:"createdAt"`
	UpdatedAt      time.Time         `json:"updatedAt"`
	Author         *AuthorResponse   `json:"author,omitempty"`
	Categories     []CategoryResponse `json:"categories,omitempty"`
	Tags           []TagResponse      `json:"tags,omitempty"`
	VideoURL       *string           `json:"videoUrl,omitempty"`
	AudioURL       *string           `json:"audioUrl,omitempty"`
	GalleryImages  []string          `json:"galleryImages,omitempty"`
}

// AuthorResponse represents author data in post responses
type AuthorResponse struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Email string  `json:"email"`
	Image *string `json:"image,omitempty"`
}

// CategoryResponse represents category data in post responses
type CategoryResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	Description *string `json:"description,omitempty"`
	Image       *string `json:"image,omitempty"`
}

// TagResponse represents tag data in post responses
type TagResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// PostListResponse represents paginated post list response
type PostListResponse struct {
	Posts      []PostResponse `json:"posts"`
	Total      int            `json:"total"`
	Page       int            `json:"page"`
	PageSize   int            `json:"pageSize"`
	TotalPages int            `json:"totalPages"`
}

// CreatePost handles POST /api/v1/posts
// @Summary Create a new post
// @Description Create a new post (requires authentication)
// @Tags posts
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param body body services.CreatePostRequest true "Post data"
// @Success 201 {object} PostResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/posts [post]
func (h *PostHandler) CreatePost(c *gin.Context) {
	var req services.CreatePostRequest

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

	// Create post
	p, err := h.postService.CreatePost(c.Request.Context(), req, userID)
	if err != nil {
		if err == services.ErrSlugExists {
			middleware.Conflict(c, "A post with this slug already exists", map[string]interface{}{
				"field": "slug",
			})
			return
		}
		middleware.InternalServerError(c, "Failed to create post")
		return
	}

	// Build response
	response := h.buildPostResponse(p)
	c.JSON(http.StatusCreated, response)
}

// GetPost handles GET /api/v1/posts/:id
// @Summary Get post by ID
// @Description Retrieve a post by its ID
// @Tags posts
// @Produce json
// @Param id path string true "Post ID"
// @Success 200 {object} PostResponse
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/posts/{id} [get]
func (h *PostHandler) GetPost(c *gin.Context) {
	postID := c.Param("id")

	// Get post
	p, err := h.postService.GetPostByID(c.Request.Context(), postID)
	if err != nil {
		if err == services.ErrPostNotFound {
			middleware.NotFound(c, "Post not found")
			return
		}
		middleware.InternalServerError(c, "Failed to get post")
		return
	}

	// Build response
	response := h.buildPostResponse(p)
	c.JSON(http.StatusOK, response)
}

// GetPostBySlug handles GET /api/v1/posts/slug/:slug
// @Summary Get post by slug
// @Description Retrieve a post by its slug
// @Tags posts
// @Produce json
// @Param slug path string true "Post slug"
// @Success 200 {object} PostResponse
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/posts/slug/{slug} [get]
func (h *PostHandler) GetPostBySlug(c *gin.Context) {
	slug := c.Param("slug")

	// Get post
	p, err := h.postService.GetPostBySlug(c.Request.Context(), slug)
	if err != nil {
		if err == services.ErrPostNotFound {
			middleware.NotFound(c, "Post not found")
			return
		}
		middleware.InternalServerError(c, "Failed to get post")
		return
	}

	// Increment view count (async, ignore errors)
	go func() {
		_ = h.postService.IncrementViewCount(c.Request.Context(), p.ID)
	}()

	// Build response
	response := h.buildPostResponse(p)
	c.JSON(http.StatusOK, response)
}

// ListPosts handles GET /api/v1/posts
// @Summary List posts with filters
// @Description Retrieve a paginated list of posts with optional filters
// @Tags posts
// @Produce json
// @Param page query int false "Page number (default: 1)"
// @Param pageSize query int false "Page size (default: 10, max: 100)"
// @Param categoryId query string false "Filter by category ID"
// @Param tagId query string false "Filter by tag ID"
// @Param authorId query string false "Filter by author ID"
// @Param status query string false "Filter by status (DRAFT, PENDING_REVIEW, PUBLISHED)"
// @Param postType query string false "Filter by post type (STANDARD, VIDEO, GALLERY, AUDIO)"
// @Param dateFrom query string false "Filter by date from (RFC3339 format)"
// @Param dateTo query string false "Filter by date to (RFC3339 format)"
// @Param search query string false "Search in title, content, excerpt"
// @Success 200 {object} PostListResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/posts [get]
func (h *PostHandler) ListPosts(c *gin.Context) {
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	// Calculate offset
	offset := (page - 1) * pageSize

	// Build filters
	filters := repositories.PostFilters{}

	if categoryID := c.Query("categoryId"); categoryID != "" {
		filters.CategoryID = &categoryID
	}

	if tagID := c.Query("tagId"); tagID != "" {
		filters.TagID = &tagID
	}

	if authorID := c.Query("authorId"); authorID != "" {
		filters.AuthorID = &authorID
	}

	if statusStr := c.Query("status"); statusStr != "" {
		status := post.Status(statusStr)
		filters.Status = &status
	}

	if postTypeStr := c.Query("postType"); postTypeStr != "" {
		postType := post.PostType(postTypeStr)
		filters.PostType = &postType
	}

	if dateFromStr := c.Query("dateFrom"); dateFromStr != "" {
		dateFrom, err := time.Parse(time.RFC3339, dateFromStr)
		if err == nil {
			filters.DateFrom = &dateFrom
		}
	}

	if dateToStr := c.Query("dateTo"); dateToStr != "" {
		dateTo, err := time.Parse(time.RFC3339, dateToStr)
		if err == nil {
			filters.DateTo = &dateTo
		}
	}

	if search := c.Query("search"); search != "" {
		filters.SearchQuery = &search
	}

	// Get posts
	posts, total, err := h.postService.ListPosts(c.Request.Context(), filters, pageSize, offset)
	if err != nil {
		middleware.InternalServerError(c, "Failed to list posts")
		return
	}

	// Build response
	postResponses := make([]PostResponse, len(posts))
	for i, p := range posts {
		postResponses[i] = h.buildPostResponse(p)
	}

	// Calculate total pages
	totalPages := (total + pageSize - 1) / pageSize

	response := PostListResponse{
		Posts:      postResponses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}

	c.JSON(http.StatusOK, response)
}

// UpdatePost handles PUT /api/v1/posts/:id
// @Summary Update a post
// @Description Update a post (requires authentication and authorization)
// @Tags posts
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path string true "Post ID"
// @Param body body services.UpdatePostRequest true "Post updates"
// @Success 200 {object} PostResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 403 {object} middleware.ErrorResponse
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/posts/{id} [put]
func (h *PostHandler) UpdatePost(c *gin.Context) {
	postID := c.Param("id")

	var req services.UpdatePostRequest

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

	// Update post
	p, err := h.postService.UpdatePost(c.Request.Context(), postID, req, userID, userRole)
	if err != nil {
		if err == services.ErrPostNotFound {
			middleware.NotFound(c, "Post not found")
			return
		}
		if err == services.ErrUnauthorized {
			middleware.Forbidden(c, "You do not have permission to update this post")
			return
		}
		middleware.InternalServerError(c, "Failed to update post")
		return
	}

	// Build response
	response := h.buildPostResponse(p)
	c.JSON(http.StatusOK, response)
}

// PublishPost handles POST /api/v1/posts/:id/publish
// @Summary Publish a post
// @Description Change post status to PUBLISHED (requires authentication and authorization)
// @Tags posts
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path string true "Post ID"
// @Success 200 {object} PostResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 403 {object} middleware.ErrorResponse
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/posts/{id}/publish [post]
func (h *PostHandler) PublishPost(c *gin.Context) {
	postID := c.Param("id")

	// Get user info from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		middleware.Unauthorized(c, "Authentication required")
		return
	}

	userRole, _ := middleware.GetUserRole(c)

	// Publish post
	p, err := h.postService.PublishPost(c.Request.Context(), postID, userID, userRole)
	if err != nil {
		if err == services.ErrPostNotFound {
			middleware.NotFound(c, "Post not found")
			return
		}
		if err == services.ErrUnauthorized {
			middleware.Forbidden(c, "You do not have permission to publish this post")
			return
		}
		middleware.InternalServerError(c, "Failed to publish post")
		return
	}

	// Build response
	response := h.buildPostResponse(p)
	c.JSON(http.StatusOK, response)
}

// DeletePost handles DELETE /api/v1/posts/:id
// @Summary Delete a post
// @Description Soft delete a post (requires admin role)
// @Tags posts
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path string true "Post ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 403 {object} middleware.ErrorResponse
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/posts/{id} [delete]
func (h *PostHandler) DeletePost(c *gin.Context) {
	postID := c.Param("id")

	// Get user role from context
	userRole, exists := middleware.GetUserRole(c)
	if !exists {
		middleware.Unauthorized(c, "Authentication required")
		return
	}

	// Delete post
	err := h.postService.DeletePost(c.Request.Context(), postID, userRole)
	if err != nil {
		if err == services.ErrPostNotFound {
			middleware.NotFound(c, "Post not found")
			return
		}
		if err == services.ErrUnauthorized {
			middleware.Forbidden(c, "You do not have permission to delete posts")
			return
		}
		middleware.InternalServerError(c, "Failed to delete post")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Post deleted successfully",
	})
}

// buildPostResponse converts an Ent post to API response format
func (h *PostHandler) buildPostResponse(p *ent.Post) PostResponse {
	response := PostResponse{
		ID:            p.ID,
		Title:         p.Title,
		Slug:          p.Slug,
		Content:       p.Content,
		Excerpt:       p.Excerpt,
		FeaturedImage: p.FeaturedImage,
		Status:        string(p.Status),
		PostType:      string(p.PostType),
		ViewCount:     p.ViewCount,
		ReadingTime:   p.ReadingTime,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
		VideoURL:      p.VideoURL,
		AudioURL:      p.AudioURL,
		GalleryImages: p.GalleryImages,
	}

	// Add author if loaded
	if p.Edges.Author != nil {
		author := p.Edges.Author
		authorName := author.Email
		if author.Name != nil && *author.Name != "" {
			authorName = *author.Name
		}
		response.Author = &AuthorResponse{
			ID:    author.ID,
			Name:  authorName,
			Email: author.Email,
			Image: author.Image,
		}
	}

	// Add categories if loaded
	if p.Edges.Categories != nil {
		categories := make([]CategoryResponse, len(p.Edges.Categories))
		for i, cat := range p.Edges.Categories {
			categories[i] = CategoryResponse{
				ID:          cat.ID,
				Name:        cat.Name,
				Slug:        cat.Slug,
				Description: cat.Description,
				Image:       cat.Thumbnail,
			}
		}
		response.Categories = categories
	}

	// Add tags if loaded
	if p.Edges.Tags != nil {
		tags := make([]TagResponse, len(p.Edges.Tags))
		for i, tag := range p.Edges.Tags {
			tags[i] = TagResponse{
				ID:   tag.ID,
				Name: tag.Name,
				Slug: tag.Slug,
			}
		}
		response.Tags = tags
	}

	return response
}
