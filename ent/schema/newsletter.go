package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// Newsletter holds the schema definition for the Newsletter entity.
type Newsletter struct {
	ent.Schema
}

// Fields of the Newsletter.
func (Newsletter) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("email").
			Unique().
			NotEmpty(),
		field.Bool("is_active").
			Default(true),
		field.String("user_id").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the Newsletter.
func (Newsletter) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("user", User.Type).
			Unique().
			Field("user_id"),
	}
}

// Indexes of the Newsletter.
func (Newsletter) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("email").
			Unique(),
		index.Fields("is_active"),
		index.Fields("created_at"),
	}
}
