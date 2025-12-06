package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

// Profile holds the schema definition for the Profile entity.
type Profile struct {
	ent.Schema
}

// Fields of the Profile.
func (Profile) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			MaxLen(30).
			NotEmpty().
			Unique().
			Immutable().
			Comment("Profile ID (cuid format)"),
		field.String("bio").
			Optional().
			Nillable().
			Comment("User biography"),
		field.String("avatar").
			Optional().
			Nillable().
			Comment("Avatar image URL"),
		field.String("bg_image").
			Optional().
			Nillable().
			Comment("Background image URL"),
		field.String("job_name").
			Optional().
			Nillable().
			Comment("Job title"),
		field.String("company").
			Optional().
			Nillable().
			Comment("Company name"),
		field.String("user_id").
			Unique().
			NotEmpty().
			Comment("Associated user ID"),
	}
}

// Edges of the Profile.
func (Profile) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("profile").
			Unique().
			Required().
			Field("user_id").
			Comment("User that owns this profile"),
	}
}
