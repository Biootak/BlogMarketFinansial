package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// Post holds the schema definition for the Post entity.
type Post struct {
	ent.Schema
}

// Fields of the Post.
func (Post) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			MaxLen(30).
			NotEmpty().
			Unique().
			Immutable().
			Comment("Post ID (cuid format)"),
		field.String("title").
			NotEmpty().
			Comment("Post title"),
		field.String("slug").
			Unique().
			NotEmpty().
			Comment("URL-friendly slug"),
		field.Text("content").
			NotEmpty().
			Comment("Post content (HTML/Markdown)"),
		field.Text("excerpt").
			Optional().
			Nillable().
			Comment("Post excerpt/summary"),
		field.String("featured_image").
			Optional().
			Nillable().
			Comment("Featured image URL"),
		field.JSON("gallery_images", []string{}).
			Optional().
			Comment("Gallery images for GALLERY post type"),
		field.Enum("status").
			Values("DRAFT", "PENDING_REVIEW", "PUBLISHED").
			Default("DRAFT").
			Comment("Post publication status"),
		field.Enum("post_type").
			Values("STANDARD", "VIDEO", "GALLERY", "AUDIO").
			Default("STANDARD").
			Comment("Type of post content"),
		field.Bool("is_featured").
			Default(false).
			Comment("Whether post is featured"),
		field.String("video_url").
			Optional().
			Nillable().
			Comment("Video URL for VIDEO post type"),
		field.String("audio_url").
			Optional().
			Nillable().
			Comment("Audio URL for AUDIO post type"),
		field.Int("view_count").
			Default(0).
			NonNegative().
			Comment("Number of views"),
		field.Int("reading_time").
			Default(0).
			NonNegative().
			Comment("Estimated reading time in minutes"),
		field.String("author_id").
			NotEmpty().
			Comment("Author user ID"),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Comment("Timestamp when post was created"),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Comment("Timestamp when post was last updated"),
		field.Time("deleted_at").
			Optional().
			Nillable().
			Comment("Soft delete timestamp"),
	}
}

// Edges of the Post.
func (Post) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("author", User.Type).
			Ref("posts").
			Unique().
			Required().
			Field("author_id").
			Comment("Post author"),
		edge.To("comments", Comment.Type).
			Comment("Comments on this post"),
		edge.To("categories", Category.Type).
			Comment("Categories this post belongs to"),
		edge.To("tags", Tag.Type).
			Comment("Tags associated with this post"),
	}
}

// Indexes of the Post.
func (Post) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("slug").
			Unique(),
		index.Fields("status", "created_at"),
		index.Fields("status", "is_featured"),
		index.Fields("status", "view_count"),
		index.Fields("author_id", "status"),
		index.Fields("deleted_at"),
		index.Fields("status"),
		index.Fields("author_id"),
		index.Fields("created_at"),
		index.Fields("is_featured"),
		index.Fields("view_count"),
		index.Fields("post_type"),
	}
}
