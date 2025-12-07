package integration

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/ent/user"
	"biotak-go-backend/internal/database"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDatabaseSchemaCompatibility tests that Ent migrations match Prisma schema
// and that data can be read by both systems

const testDatabaseURL = "postgresql://postgres:postgres@localhost:5432/biotak_test?sslmode=disable"

func TestEntPrismaSchemaCompatibility(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Connect to database using both Ent and raw SQL
	entClient, err := setupEntClient(t)
	require.NoError(t, err)
	defer entClient.Close()

	db, err := sql.Open("postgres", testDatabaseURL)
	require.NoError(t, err)
	defer db.Close()

	ctx := context.Background()

	// Test User table
	t.Run("User table compatibility", func(t *testing.T) {
		testUserTableCompatibility(t, ctx, entClient, db)
	})

	// Test Post table
	t.Run("Post table compatibility", func(t *testing.T) {
		testPostTableCompatibility(t, ctx, entClient, db)
	})

	// Test Comment table
	t.Run("Comment table compatibility", func(t *testing.T) {
		testCommentTableCompatibility(t, ctx, entClient, db)
	})

	// Test Category table
	t.Run("Category table compatibility", func(t *testing.T) {
		testCategoryTableCompatibility(t, ctx, entClient, db)
	})

	// Test Tag table
	t.Run("Tag table compatibility", func(t *testing.T) {
		testTagTableCompatibility(t, ctx, entClient, db)
	})

	// Test ExchangeRate table
	t.Run("ExchangeRate table compatibility", func(t *testing.T) {
		testExchangeRateTableCompatibility(t, ctx, entClient, db)
	})
}

func testUserTableCompatibility(t *testing.T, ctx context.Context, entClient *ent.Client, db *sql.DB) {
	// Create a user using Ent
	email := fmt.Sprintf("test-%d@example.com", time.Now().Unix())
	password := "hashedpassword123"
	name := "Test User"

	entUser, err := entClient.User.Create().
		SetEmail(email).
		SetPassword(password).
		SetName(&name).
		SetRole(user.RoleUSER).
		SetEmailVerified(false).
		Save(ctx)
	require.NoError(t, err)

	// Read the user using raw SQL (simulating Prisma)
	var (
		id            string
		dbEmail       string
		dbPassword    string
		dbName        sql.NullString
		dbRole        string
		emailVerified bool
		createdAt     time.Time
		updatedAt     time.Time
	)

	query := `SELECT id, email, password, name, role, email_verified, created_at, updated_at 
	          FROM users WHERE id = $1`
	err = db.QueryRow(query, entUser.ID).Scan(
		&id, &dbEmail, &dbPassword, &dbName, &dbRole, &emailVerified, &createdAt, &updatedAt,
	)
	require.NoError(t, err)

	// Verify data matches
	assert.Equal(t, entUser.ID, id)
	assert.Equal(t, entUser.Email, dbEmail)
	assert.Equal(t, entUser.Password, dbPassword)
	if dbName.Valid {
		assert.Equal(t, *entUser.Name, dbName.String)
	}
	assert.Equal(t, string(entUser.Role), dbRole)
	assert.Equal(t, entUser.EmailVerified, emailVerified)

	// Clean up
	err = entClient.User.DeleteOneID(entUser.ID).Exec(ctx)
	require.NoError(t, err)
}

func testPostTableCompatibility(t *testing.T, ctx context.Context, entClient *ent.Client, db *sql.DB) {
	// First create a user (author)
	email := fmt.Sprintf("author-%d@example.com", time.Now().Unix())
	author, err := entClient.User.Create().
		SetEmail(email).
		SetPassword("password").
		SetRole(user.RoleAUTHOR).
		Save(ctx)
	require.NoError(t, err)
	defer entClient.User.DeleteOneID(author.ID).Exec(ctx)

	// Create a post using Ent
	title := fmt.Sprintf("Test Post %d", time.Now().Unix())
	slug := fmt.Sprintf("test-post-%d", time.Now().Unix())
	content := "Test content"

	entPost, err := entClient.Post.Create().
		SetTitle(title).
		SetSlug(slug).
		SetContent(content).
		SetAuthorID(author.ID).
		SetStatus("DRAFT").
		SetPostType("STANDARD").
		SetViewCount(0).
		SetReadingTime(1).
		Save(ctx)
	require.NoError(t, err)

	// Read the post using raw SQL
	var (
		id          string
		dbTitle     string
		dbSlug      string
		dbContent   string
		dbAuthorID  string
		dbStatus    string
		dbPostType  string
		viewCount   int
		readingTime int
		createdAt   time.Time
		updatedAt   time.Time
	)

	query := `SELECT id, title, slug, content, author_id, status, post_type, view_count, reading_time, created_at, updated_at 
	          FROM posts WHERE id = $1`
	err = db.QueryRow(query, entPost.ID).Scan(
		&id, &dbTitle, &dbSlug, &dbContent, &dbAuthorID, &dbStatus, &dbPostType, 
		&viewCount, &readingTime, &createdAt, &updatedAt,
	)
	require.NoError(t, err)

	// Verify data matches
	assert.Equal(t, entPost.ID, id)
	assert.Equal(t, entPost.Title, dbTitle)
	assert.Equal(t, entPost.Slug, dbSlug)
	assert.Equal(t, entPost.Content, dbContent)
	assert.Equal(t, entPost.AuthorID, dbAuthorID)
	assert.Equal(t, string(entPost.Status), dbStatus)
	assert.Equal(t, string(entPost.PostType), dbPostType)
	assert.Equal(t, entPost.ViewCount, viewCount)
	assert.Equal(t, entPost.ReadingTime, readingTime)

	// Clean up
	err = entClient.Post.DeleteOneID(entPost.ID).Exec(ctx)
	require.NoError(t, err)
}

func testCommentTableCompatibility(t *testing.T, ctx context.Context, entClient *ent.Client, db *sql.DB) {
	// Create user and post first
	email := fmt.Sprintf("commenter-%d@example.com", time.Now().Unix())
	user, err := entClient.User.Create().
		SetEmail(email).
		SetPassword("password").
		SetRole("USER").
		Save(ctx)
	require.NoError(t, err)
	defer entClient.User.DeleteOneID(user.ID).Exec(ctx)

	post, err := entClient.Post.Create().
		SetTitle("Test Post").
		SetSlug(fmt.Sprintf("test-%d", time.Now().Unix())).
		SetContent("Content").
		SetAuthorID(user.ID).
		SetStatus("PUBLISHED").
		SetPostType("STANDARD").
		Save(ctx)
	require.NoError(t, err)
	defer entClient.Post.DeleteOneID(post.ID).Exec(ctx)

	// Create a comment using Ent
	content := "Test comment"
	entComment, err := entClient.Comment.Create().
		SetContent(content).
		SetPostID(post.ID).
		SetAuthorID(user.ID).
		SetApproved(true).
		Save(ctx)
	require.NoError(t, err)

	// Read the comment using raw SQL
	var (
		id        string
		dbContent string
		postID    string
		authorID  string
		approved  bool
		createdAt time.Time
		updatedAt time.Time
	)

	query := `SELECT id, content, post_id, author_id, approved, created_at, updated_at 
	          FROM comments WHERE id = $1`
	err = db.QueryRow(query, entComment.ID).Scan(
		&id, &dbContent, &postID, &authorID, &approved, &createdAt, &updatedAt,
	)
	require.NoError(t, err)

	// Verify data matches
	assert.Equal(t, entComment.ID, id)
	assert.Equal(t, entComment.Content, dbContent)
	assert.Equal(t, entComment.PostID, postID)
	assert.Equal(t, entComment.AuthorID, authorID)
	assert.Equal(t, entComment.Approved, approved)

	// Clean up
	err = entClient.Comment.DeleteOneID(entComment.ID).Exec(ctx)
	require.NoError(t, err)
}

func testCategoryTableCompatibility(t *testing.T, ctx context.Context, entClient *ent.Client, db *sql.DB) {
	// Create a category using Ent
	name := fmt.Sprintf("Test Category %d", time.Now().Unix())
	slug := fmt.Sprintf("test-category-%d", time.Now().Unix())

	entCategory, err := entClient.Category.Create().
		SetName(name).
		SetSlug(slug).
		Save(ctx)
	require.NoError(t, err)

	// Read the category using raw SQL
	var (
		id        string
		dbName    string
		dbSlug    string
		createdAt time.Time
		updatedAt time.Time
	)

	query := `SELECT id, name, slug, created_at, updated_at FROM categories WHERE id = $1`
	err = db.QueryRow(query, entCategory.ID).Scan(&id, &dbName, &dbSlug, &createdAt, &updatedAt)
	require.NoError(t, err)

	// Verify data matches
	assert.Equal(t, entCategory.ID, id)
	assert.Equal(t, entCategory.Name, dbName)
	assert.Equal(t, entCategory.Slug, dbSlug)

	// Clean up
	err = entClient.Category.DeleteOneID(entCategory.ID).Exec(ctx)
	require.NoError(t, err)
}

func testTagTableCompatibility(t *testing.T, ctx context.Context, entClient *ent.Client, db *sql.DB) {
	// Create a tag using Ent
	name := fmt.Sprintf("Test Tag %d", time.Now().Unix())
	slug := fmt.Sprintf("test-tag-%d", time.Now().Unix())

	entTag, err := entClient.Tag.Create().
		SetName(name).
		SetSlug(slug).
		Save(ctx)
	require.NoError(t, err)

	// Read the tag using raw SQL
	var (
		id        string
		dbName    string
		dbSlug    string
		createdAt time.Time
		updatedAt time.Time
	)

	query := `SELECT id, name, slug, created_at, updated_at FROM tags WHERE id = $1`
	err = db.QueryRow(query, entTag.ID).Scan(&id, &dbName, &dbSlug, &createdAt, &updatedAt)
	require.NoError(t, err)

	// Verify data matches
	assert.Equal(t, entTag.ID, id)
	assert.Equal(t, entTag.Name, dbName)
	assert.Equal(t, entTag.Slug, dbSlug)

	// Clean up
	err = entClient.Tag.DeleteOneID(entTag.ID).Exec(ctx)
	require.NoError(t, err)
}

func testExchangeRateTableCompatibility(t *testing.T, ctx context.Context, entClient *ent.Client, db *sql.DB) {
	// Create an exchange rate using Ent
	currency := "BTC"
	rate := 45000.50
	baseCurrency := "USD"
	source := "test"

	entRate, err := entClient.ExchangeRate.Create().
		SetCurrency(currency).
		SetRate(rate).
		SetBaseCurrency(baseCurrency).
		SetSource(source).
		Save(ctx)
	require.NoError(t, err)

	// Read the exchange rate using raw SQL
	var (
		id             string
		dbCurrency     string
		dbRate         float64
		dbBaseCurrency string
		dbSource       string
		createdAt      time.Time
	)

	query := `SELECT id, currency, rate, base_currency, source, created_at 
	          FROM exchange_rates WHERE id = $1`
	err = db.QueryRow(query, entRate.ID).Scan(
		&id, &dbCurrency, &dbRate, &dbBaseCurrency, &dbSource, &createdAt,
	)
	require.NoError(t, err)

	// Verify data matches
	assert.Equal(t, entRate.ID, id)
	assert.Equal(t, entRate.Currency, dbCurrency)
	assert.InDelta(t, entRate.Rate, dbRate, 0.01)
	assert.Equal(t, entRate.BaseCurrency, dbBaseCurrency)
	assert.Equal(t, entRate.Source, dbSource)

	// Clean up
	err = entClient.ExchangeRate.DeleteOneID(entRate.ID).Exec(ctx)
	require.NoError(t, err)
}

func TestForeignKeyRelationships(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	entClient, err := setupEntClient(t)
	require.NoError(t, err)
	defer entClient.Close()

	ctx := context.Background()

	// Create user
	user, err := entClient.User.Create().
		SetEmail(fmt.Sprintf("fk-test-%d@example.com", time.Now().Unix())).
		SetPassword("password").
		SetRole("AUTHOR").
		Save(ctx)
	require.NoError(t, err)
	defer entClient.User.DeleteOneID(user.ID).Exec(ctx)

	// Create post
	post, err := entClient.Post.Create().
		SetTitle("FK Test Post").
		SetSlug(fmt.Sprintf("fk-test-%d", time.Now().Unix())).
		SetContent("Content").
		SetAuthor(user).
		SetStatus("PUBLISHED").
		SetPostType("STANDARD").
		Save(ctx)
	require.NoError(t, err)
	defer entClient.Post.DeleteOneID(post.ID).Exec(ctx)

	// Create comment
	comment, err := entClient.Comment.Create().
		SetContent("FK Test Comment").
		SetPost(post).
		SetAuthor(user).
		SetApproved(true).
		Save(ctx)
	require.NoError(t, err)
	defer entClient.Comment.DeleteOneID(comment.ID).Exec(ctx)

	// Test eager loading relationships
	loadedPost, err := entClient.Post.Query().
		Where(post.ID(post.ID)).
		WithAuthor().
		WithComments().
		Only(ctx)
	require.NoError(t, err)

	// Verify relationships
	assert.NotNil(t, loadedPost.Edges.Author)
	assert.Equal(t, user.ID, loadedPost.Edges.Author.ID)
	assert.Len(t, loadedPost.Edges.Comments, 1)
	assert.Equal(t, comment.ID, loadedPost.Edges.Comments[0].ID)
}

func setupEntClient(t *testing.T) (*ent.Client, error) {
	config := database.DefaultConfig(testDatabaseURL)
	entClient, err := database.NewEntClient(config)
	if err != nil {
		return nil, err
	}

	// Run migrations
	ctx := context.Background()
	if err := entClient.Client.Schema.Create(ctx); err != nil {
		entClient.Close()
		return nil, err
	}

	return entClient.Client, nil
}
