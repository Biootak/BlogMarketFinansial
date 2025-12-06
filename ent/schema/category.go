package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// Category holds the schema definition for the Category entity.
type Category struct {
	ent.Schema
}

// Fields of the Category.
func (Category) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			MaxLen(30).
			NotEmpty().
			Unique().
			Immutable().
			Comment("Category ID (cuid format)"),
		field.String("name").
			NotEmpty().
			Comment("Category name"),
		field.String("slug").
			Unique().
			NotEmpty().
			Comment("URL-friendly slug"),
		field.Text("description").
			Optional().
			Nillable().
			Comment("Category description"),
		field.String("thumbnail").
			Optional().
			Nillable().
			Comment("Category thumbnail image URL"),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Comment("Timestamp when category was created"),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Comment("Timestamp when category was last updated"),
	}
}

// Edges of the Category.
func (Category) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("posts", Post.Type).
			Ref("categories").
			Comment("Posts in this category"),
		edge.To("child_categories", Category.Type).
			From("parent_categories").
			Comment("Parent-child category relationships"),
	}
}

// Indexes of the Category.
func (Category) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("slug").
			Unique(),
		index.Fields("name"),
	}
}
