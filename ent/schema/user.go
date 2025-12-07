package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// User holds the schema definition for the User entity.
type User struct {
	ent.Schema
}

// Fields of the User.
func (User) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			MaxLen(30).
			NotEmpty().
			Unique().
			Immutable().
			Comment("User ID (cuid format)"),
		field.String("email").
			Unique().
			NotEmpty().
			Comment("User email address"),
		field.String("password").
			Sensitive().
			Optional().
			Nillable().
			Comment("Hashed password (optional for OAuth users)"),
		field.String("name").
			Optional().
			Nillable().
			Comment("User display name"),
		field.String("image").
			Optional().
			Nillable().
			Comment("User avatar/profile image URL"),
		field.Enum("role").
			Values("USER", "AUTHOR", "ADMIN", "SUPER_ADMIN").
			Default("USER").
			Comment("User role for authorization"),
		field.String("status").
			Default("Active").
			Comment("User account status"),
		field.Bool("email_verified").
			Default(false).
			Comment("Whether email has been verified"),
		field.String("phone_number").
			Optional().
			Nillable().
			Comment("User phone number"),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Comment("Timestamp when user was created"),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Comment("Timestamp when user was last updated"),
		field.Time("deleted_at").
			Optional().
			Nillable().
			Comment("Soft delete timestamp"),
		field.Int("version").
			Default(1).
			NonNegative().
			Comment("Version number for optimistic locking"),
	}
}

// Edges of the User.
func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("posts", Post.Type).
			Comment("Posts authored by this user"),
		edge.To("comments", Comment.Type).
			Comment("Comments made by this user"),
		edge.To("profile", Profile.Type).
			Unique().
			Comment("User profile information"),
	}
}

// Indexes of the User.
func (User) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("email").
			Unique(),
		index.Fields("deleted_at"),
		index.Fields("role"),
		index.Fields("status"),
	}
}
