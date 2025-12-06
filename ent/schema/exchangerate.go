package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ExchangeRate holds the schema definition for the ExchangeRate entity.
type ExchangeRate struct {
	ent.Schema
}

// Fields of the ExchangeRate.
func (ExchangeRate) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			MaxLen(30).
			NotEmpty().
			Unique().
			Immutable().
			Comment("Exchange rate ID (cuid format)"),
		field.String("name").
			Unique().
			NotEmpty().
			Comment("Exchange rate name/identifier"),
		field.String("currency").
			NotEmpty().
			Comment("Currency code (e.g., USD, EUR, BTC)"),
		field.Enum("rate_type").
			Values("BUY_SELL", "SINGLE_BULK").
			Default("BUY_SELL").
			Comment("Type of rate structure"),
		field.String("buy_rate").
			Optional().
			Nillable().
			Comment("Buy rate (for BUY_SELL type)"),
		field.String("sell_rate").
			Optional().
			Nillable().
			Comment("Sell rate (for BUY_SELL type)"),
		field.String("single_rate").
			Optional().
			Nillable().
			Comment("Single rate (for SINGLE_BULK type)"),
		field.String("bulk_rate").
			Optional().
			Nillable().
			Comment("Bulk rate (for SINGLE_BULK type)"),
		field.String("description").
			Optional().
			Nillable().
			Comment("Rate description"),
		field.String("image_url").
			Optional().
			Nillable().
			Comment("Currency/crypto icon URL"),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Comment("Timestamp when rate was first created"),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Comment("Timestamp when rate was last updated"),
	}
}

// Indexes of the ExchangeRate.
func (ExchangeRate) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("currency", "updated_at"),
		index.Fields("updated_at"),
		index.Fields("name").
			Unique(),
		index.Fields("currency"),
	}
}
