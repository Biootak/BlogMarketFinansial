package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// Comment holds the schema definition for the Comment entity.
type Comment struct {
	ent.Schema
}

// Fields of the Comment.
func (Comment) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			MaxLen(30).
			NotEmpty().
			Unique().
			Immutable().
			Comment("Comment ID (cuid format)"),
		field.Text("content").
			NotEmpty().
			Comment("Comment content"),
		field.Bool("approved").
			Default(false).
			Comment("Whether comment is approved (maps to status)"),
		field.String("post_id").
			NotEmpty().
			Comment("Post this comment belongs to"),
		field.String("author_id").
			NotEmpty().
			Comment("User who wrote this comment"),
		field.String("parent_id").
			Optional().
			Nillable().
			Comment("Parent comment ID for nested comments"),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Comment("Timestamp when comment was created"),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Comment("Timestamp when comment was last updated"),
		field.Time("deleted_at").
			Optional().
			Nillable().
			Comment("Soft delete timestamp"),
	}
}

// Edges of the Comment.
func (Comment) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("post", Post.Type).
			Ref("comments").
			Unique().
			Required().
			Field("post_id").
			Comment("Post this comment belongs to"),
		edge.From("author", User.Type).
			Ref("comments").
			Unique().
			Required().
			Field("author_id").
			Comment("User who wrote this comment"),
		edge.To("replies", Comment.Type).
			From("parent").
			Unique().
			Field("parent_id").
			Comment("Parent comment for nested replies"),
	}
}

// Indexes of the Comment.
func (Comment) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("approved"),
		index.Fields("parent_id"),
		index.Fields("deleted_at"),
		index.Fields("post_id"),
		index.Fields("author_id"),
		index.Fields("post_id", "approved"),
		index.Fields("post_id", "approved", "created_at"),
	}
}
