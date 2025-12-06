package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// Tag holds the schema definition for the Tag entity.
type Tag struct {
	ent.Schema
}

// Fields of the Tag.
func (Tag) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			MaxLen(30).
			NotEmpty().
			Unique().
			Immutable().
			Comment("Tag ID (cuid format)"),
		field.String("name").
			Unique().
			NotEmpty().
			Comment("Tag name"),
		field.String("slug").
			Unique().
			NotEmpty().
			Comment("URL-friendly slug"),
		field.String("thumbnail").
			Optional().
			Nillable().
			Comment("Tag thumbnail image URL"),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Comment("Timestamp when tag was created"),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Comment("Timestamp when tag was last updated"),
	}
}

// Edges of the Tag.
func (Tag) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("posts", Post.Type).
			Ref("tags").
			Comment("Posts with this tag"),
	}
}

// Indexes of the Tag.
func (Tag) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("name").
			Unique(),
		index.Fields("slug").
			Unique(),
	}
}
