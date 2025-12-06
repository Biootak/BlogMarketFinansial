package repositories

import (
	"biotak-go-backend/ent/enttest"
	"context"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCommentRepository_Create(t *testing.T) {
	// Create test database
	client := enttest.Open(t, "sqlite3", "file:ent?mode=memory&cache=shared&_fk=1")
	defer client.Close()

	ctx := context.Background()

	// Create a test user
	user, err := client.User.Create().
		SetID("test-user-1").
		SetEmail("test@example.com").
		SetName("Test User").
		SetRole("USER").
		Save(ctx)
	require.NoError(t, err)

	// Create a test post
	post, err := client.Post.Create().
		SetID("test-post-1").
		SetTitle("Test Post").
		SetSlug("test-post").
		SetContent("Test content").
		SetStatus("PUBLISHED").
		SetPostType("STANDARD").
		SetReadingTime(1).
		SetAuthorID(user.ID).
		Save(ctx)
	require.NoError(t, err)

	// Test creating a comment
	t.Run("Create comment successfully", func(t *testing.T) {
		// Create comment directly using client for testing
		comment, err := client.Comment.Create().
			SetID("test-comment-1").
			SetContent("Test comment content").
			SetApproved(true).
			SetPostID(post.ID).
			SetAuthorID(user.ID).
			Save(ctx)

		require.NoError(t, err)
		assert.NotNil(t, comment)
		assert.Equal(t, "Test comment content", comment.Content)
		assert.True(t, comment.Approved)
		assert.Equal(t, post.ID, comment.PostID)
		assert.Equal(t, user.ID, comment.AuthorID)
	})
}

func TestCommentRepository_FindByPostID(t *testing.T) {
	// Create test database
	client := enttest.Open(t, "sqlite3", "file:ent?mode=memory&cache=shared&_fk=1")
	defer client.Close()

	ctx := context.Background()
	repo := NewCommentRepository(client)

	// Create test user
	user, err := client.User.Create().
		SetID("test-user-2").
		SetEmail("test2@example.com").
		SetName("Test User 2").
		SetRole("USER").
		Save(ctx)
	require.NoError(t, err)

	// Create test post
	post, err := client.Post.Create().
		SetID("test-post-2").
		SetTitle("Test Post 2").
		SetSlug("test-post-2").
		SetContent("Test content 2").
		SetStatus("PUBLISHED").
		SetPostType("STANDARD").
		SetReadingTime(1).
		SetAuthorID(user.ID).
		Save(ctx)
	require.NoError(t, err)

	// Create approved comment
	_, err = client.Comment.Create().
		SetID("test-comment-2").
		SetContent("Approved comment").
		SetApproved(true).
		SetPostID(post.ID).
		SetAuthorID(user.ID).
		Save(ctx)
	require.NoError(t, err)

	// Create unapproved comment
	_, err = client.Comment.Create().
		SetID("test-comment-3").
		SetContent("Unapproved comment").
		SetApproved(false).
		SetPostID(post.ID).
		SetAuthorID(user.ID).
		Save(ctx)
	require.NoError(t, err)

	t.Run("Find only approved comments", func(t *testing.T) {
		comments, err := repo.FindByPostID(ctx, post.ID, false)
		require.NoError(t, err)
		assert.Len(t, comments, 1)
		assert.Equal(t, "Approved comment", comments[0].Content)
	})

	t.Run("Find all comments including unapproved", func(t *testing.T) {
		comments, err := repo.FindByPostID(ctx, post.ID, true)
		require.NoError(t, err)
		assert.Len(t, comments, 2)
	})
}
