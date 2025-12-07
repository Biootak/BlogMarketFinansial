package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// DailyAnalytics holds the schema definition for the DailyAnalytics entity.
type DailyAnalytics struct {
	ent.Schema
}

// Fields of the DailyAnalytics.
func (DailyAnalytics) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.Time("date").
			Comment("Date for this analytics record"),
		field.Int("total_views").
			Default(0).
			NonNegative().
			Comment("Total post views for the day"),
		field.Int("total_comments").
			Default(0).
			NonNegative().
			Comment("Total comments created for the day"),
		field.Int("new_users").
			Default(0).
			NonNegative().
			Comment("New users registered for the day"),
		field.Int("new_posts").
			Default(0).
			NonNegative().
			Comment("New posts created for the day"),
		field.Int("published_posts").
			Default(0).
			NonNegative().
			Comment("Posts published for the day"),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Comment("Timestamp when record was created"),
	}
}

// Indexes of the DailyAnalytics.
func (DailyAnalytics) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("date").
			Unique(),
		index.Fields("created_at"),
	}
}
