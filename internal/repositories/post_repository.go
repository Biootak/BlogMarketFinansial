package repositories

import (
	"biotak-go-backend/ent"
	"biotak-go-backend/ent/category"
	"biotak-go-backend/ent/post"
	"biotak-go-backend/ent/tag"
	"biotak-go-backend/ent/user"
	"context"
	"fmt"
	"time"
)

// PostRepository wraps Ent Post queries
type PostRepository struct {
	client *ent.Client
}

// NewPostRepository creates a new post repository
func NewPostRepository(client *ent.Client) *PostRepository {
	return &PostRepository{
		client: client,
	}
}

// PostFilters represents filters for querying posts
type PostFilters struct {
	CategoryID  *string
	TagID       *string
	AuthorID    *string
	Status      *post.Status
	PostType    *post.PostType
	DateFrom    *time.Time
	DateTo      *time.Time
	SearchQuery *string
}

// Create creates a new post
func (r *PostRepository) Create(ctx context.Context, p *ent.Post) (*ent.Post, error) {
	builder := r.client.Post.Create().
		SetTitle(p.Title).
		SetSlug(p.Slug).
		SetContent(p.Content).
		SetStatus(p.Status).
		SetPostType(p.PostType).
		SetReadingTime(p.ReadingTime)

	// Set optional fields
	if p.Excerpt != nil {
		builder.SetExcerpt(*p.Excerpt)
	}
	if p.FeaturedImage != nil {
		builder.SetFeaturedImage(*p.FeaturedImage)
	}

	// Set author
	if p.Edges.Author != nil {
		builder.SetAuthorID(p.Edges.Author.ID)
	}

	return builder.Save(ctx)
}

// FindByID retrieves a post by ID with all relations
func (r *PostRepository) FindByID(ctx context.Context, id string) (*ent.Post, error) {
	return r.client.Post.Query().
		Where(post.ID(id)).
		Where(post.DeletedAtIsNil()).
		WithAuthor().
		WithCategories().
		WithTags().
		WithComments().
		Only(ctx)
}

// FindBySlug retrieves a post by slug with all relations
func (r *PostRepository) FindBySlug(ctx context.Context, slug string) (*ent.Post, error) {
	return r.client.Post.Query().
		Where(post.Slug(slug)).
		Where(post.DeletedAtIsNil()).
		WithAuthor().
		WithCategories().
		WithTags().
		WithComments().
		Only(ctx)
}

// FindPublished retrieves published posts with pagination
func (r *PostRepository) FindPublished(ctx context.Context, limit, offset int) ([]*ent.Post, error) {
	return r.client.Post.Query().
		Where(post.StatusEQ(post.StatusPUBLISHED)).
		Where(post.DeletedAtIsNil()).
		Order(ent.Desc(post.FieldCreatedAt)).
		Limit(limit).
		Offset(offset).
		WithAuthor().
		WithCategories().
		WithTags().
		All(ctx)
}

// FindByFilters retrieves posts based on filters with pagination
func (r *PostRepository) FindByFilters(ctx context.Context, filters PostFilters, limit, offset int) ([]*ent.Post, int, error) {
	query := r.client.Post.Query().
		Where(post.DeletedAtIsNil())

	// Apply filters
	if filters.CategoryID != nil {
		query = query.Where(post.HasCategoriesWith(category.ID(*filters.CategoryID)))
	}

	if filters.TagID != nil {
		query = query.Where(post.HasTagsWith(tag.ID(*filters.TagID)))
	}

	if filters.AuthorID != nil {
		query = query.Where(post.HasAuthorWith(user.ID(*filters.AuthorID)))
	}

	if filters.Status != nil {
		query = query.Where(post.StatusEQ(*filters.Status))
	}

	if filters.PostType != nil {
		query = query.Where(post.PostTypeEQ(*filters.PostType))
	}

	if filters.DateFrom != nil {
		query = query.Where(post.CreatedAtGTE(*filters.DateFrom))
	}

	if filters.DateTo != nil {
		query = query.Where(post.CreatedAtLTE(*filters.DateTo))
	}

	if filters.SearchQuery != nil && *filters.SearchQuery != "" {
		searchTerm := fmt.Sprintf("%%%s%%", *filters.SearchQuery)
		query = query.Where(
			post.Or(
				post.TitleContains(*filters.SearchQuery),
				post.ContentContains(*filters.SearchQuery),
				post.ExcerptContains(*filters.SearchQuery),
			),
		)
		_ = searchTerm // Use searchTerm if needed for more advanced search
	}

	// Get total count
	total, err := query.Count(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count posts: %w", err)
	}

	// Get posts with pagination
	posts, err := query.
		Order(ent.Desc(post.FieldCreatedAt)).
		Limit(limit).
		Offset(offset).
		WithAuthor().
		WithCategories().
		WithTags().
		All(ctx)

	if err != nil {
		return nil, 0, fmt.Errorf("failed to query posts: %w", err)
	}

	return posts, total, nil
}

// Update updates a post
func (r *PostRepository) Update(ctx context.Context, id string, updates map[string]interface{}) (*ent.Post, error) {
	builder := r.client.Post.UpdateOneID(id)

	// Apply updates
	for key, value := range updates {
		switch key {
		case "title":
			if v, ok := value.(string); ok {
				builder.SetTitle(v)
			}
		case "slug":
			if v, ok := value.(string); ok {
				builder.SetSlug(v)
			}
		case "content":
			if v, ok := value.(string); ok {
				builder.SetContent(v)
			}
		case "excerpt":
			if v, ok := value.(string); ok {
				builder.SetExcerpt(v)
			}
		case "featured_image":
			if v, ok := value.(string); ok {
				builder.SetFeaturedImage(v)
			}
		case "status":
			if v, ok := value.(post.Status); ok {
				builder.SetStatus(v)
			}
		case "post_type":
			if v, ok := value.(post.PostType); ok {
				builder.SetPostType(v)
			}
		case "reading_time":
			if v, ok := value.(int); ok {
				builder.SetReadingTime(v)
			}
		// Note: published_at is not in schema, using created_at for ordering
		}
	}

	return builder.Save(ctx)
}

// SoftDelete performs soft delete on a post
func (r *PostRepository) SoftDelete(ctx context.Context, id string) error {
	return r.client.Post.UpdateOneID(id).
		SetDeletedAt(time.Now()).
		Exec(ctx)
}

// IncrementViewCount increments the view count of a post
func (r *PostRepository) IncrementViewCount(ctx context.Context, id string) error {
	p, err := r.client.Post.Get(ctx, id)
	if err != nil {
		return err
	}

	return r.client.Post.UpdateOneID(id).
		SetViewCount(p.ViewCount + 1).
		Exec(ctx)
}

// AddCategories adds categories to a post
func (r *PostRepository) AddCategories(ctx context.Context, postID string, categoryIDs []string) error {
	return r.client.Post.UpdateOneID(postID).
		AddCategoryIDs(categoryIDs...).
		Exec(ctx)
}

// RemoveCategories removes categories from a post
func (r *PostRepository) RemoveCategories(ctx context.Context, postID string, categoryIDs []string) error {
	return r.client.Post.UpdateOneID(postID).
		RemoveCategoryIDs(categoryIDs...).
		Exec(ctx)
}

// SetCategories sets the categories of a post (replaces existing)
func (r *PostRepository) SetCategories(ctx context.Context, postID string, categoryIDs []string) error {
	return r.client.Post.UpdateOneID(postID).
		ClearCategories().
		AddCategoryIDs(categoryIDs...).
		Exec(ctx)
}

// AddTags adds tags to a post
func (r *PostRepository) AddTags(ctx context.Context, postID string, tagIDs []string) error {
	return r.client.Post.UpdateOneID(postID).
		AddTagIDs(tagIDs...).
		Exec(ctx)
}

// RemoveTags removes tags from a post
func (r *PostRepository) RemoveTags(ctx context.Context, postID string, tagIDs []string) error {
	return r.client.Post.UpdateOneID(postID).
		RemoveTagIDs(tagIDs...).
		Exec(ctx)
}

// SetTags sets the tags of a post (replaces existing)
func (r *PostRepository) SetTags(ctx context.Context, postID string, tagIDs []string) error {
	return r.client.Post.UpdateOneID(postID).
		ClearTags().
		AddTagIDs(tagIDs...).
		Exec(ctx)
}

// CountByAuthor counts posts by author
func (r *PostRepository) CountByAuthor(ctx context.Context, authorID string) (int, error) {
	return r.client.Post.Query().
		Where(post.HasAuthorWith(user.ID(authorID))).
		Where(post.DeletedAtIsNil()).
		Count(ctx)
}

// CountByStatus counts posts by status
func (r *PostRepository) CountByStatus(ctx context.Context, status post.Status) (int, error) {
	return r.client.Post.Query().
		Where(post.StatusEQ(status)).
		Where(post.DeletedAtIsNil()).
		Count(ctx)
}

// FindRecentByAuthor retrieves recent posts by author
func (r *PostRepository) FindRecentByAuthor(ctx context.Context, authorID string, limit int) ([]*ent.Post, error) {
	return r.client.Post.Query().
		Where(post.HasAuthorWith(user.ID(authorID))).
		Where(post.DeletedAtIsNil()).
		Order(ent.Desc(post.FieldCreatedAt)).
		Limit(limit).
		WithAuthor().
		WithCategories().
		WithTags().
		All(ctx)
}

// FindRelated finds related posts based on categories and tags
func (r *PostRepository) FindRelated(ctx context.Context, postID string, limit int) ([]*ent.Post, error) {
	// Get the original post to find its categories and tags
	originalPost, err := r.client.Post.Query().
		Where(post.ID(postID)).
		WithCategories().
		WithTags().
		Only(ctx)

	if err != nil {
		return nil, err
	}

	// Build query for related posts
	query := r.client.Post.Query().
		Where(post.IDNEQ(postID)).
		Where(post.StatusEQ(post.StatusPUBLISHED)).
		Where(post.DeletedAtIsNil())

	// Find posts with same categories or tags
	categoryIDs := make([]string, len(originalPost.Edges.Categories))
	for i, cat := range originalPost.Edges.Categories {
		categoryIDs[i] = cat.ID
	}

	tagIDs := make([]string, len(originalPost.Edges.Tags))
	for i, t := range originalPost.Edges.Tags {
		tagIDs[i] = t.ID
	}

	if len(categoryIDs) > 0 || len(tagIDs) > 0 {
		predicates := []func(*ent.PostQuery){}
		if len(categoryIDs) > 0 {
			predicates = append(predicates, func(q *ent.PostQuery) {
				q.Where(post.HasCategoriesWith(category.IDIn(categoryIDs...)))
			})
		}
		if len(tagIDs) > 0 {
			predicates = append(predicates, func(q *ent.PostQuery) {
				q.Where(post.HasTagsWith(tag.IDIn(tagIDs...)))
			})
		}

		// Apply OR condition
		if len(predicates) > 0 {
			query = query.Where(post.Or(
				post.HasCategoriesWith(category.IDIn(categoryIDs...)),
				post.HasTagsWith(tag.IDIn(tagIDs...)),
			))
		}
	}

	return query.
		Order(ent.Desc(post.FieldCreatedAt)).
		Limit(limit).
		WithAuthor().
		WithCategories().
		WithTags().
		All(ctx)
}
