package handlers

import (
	"biotak-go-backend/ent/post"
	"biotak-go-backend/ent/user"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/repositories"
	"biotak-go-backend/internal/services"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Integration tests for handlers using real PostgreSQL database

func TestHandlersIntegration(t *testing.T) {
	// Setup test database
	client, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()

	// Create test data
	testUser, err := client.User.Create().
		SetID(generateTestID("user")).
		SetEmail(generateTestEmail()).
		SetPassword("hashed").
		SetName("Test User").
		SetRole(user.RoleUSER).
		SetStatus("Active").
		Save(ctx)
	require.NoError(t, err)

	testPost, err := client.Post.Create().
		SetID(generateTestID("post")).
		SetTitle("Test Post").
		SetSlug(generateTestID("slug")).
		SetContent("Test content").
		SetStatus(post.StatusPUBLISHED).
		SetPostType(post.PostTypeSTANDARD).
		SetAuthorID(testUser.ID).
		Save(ctx)
	require.NoError(t, err)

	// Setup services
	redisClient := &database.RedisClient{}
	commentRepo := repositories.NewCommentRepository(client)
	commentService := services.NewCommentService(commentRepo, client, redisClient)
	commentHandler := NewCommentHandler(commentService)

	gin.SetMode(gin.TestMode)

	t.Run("Comment Handler - Create Comment", func(t *testing.T) {
		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_id", testUser.ID)
			c.Set("user_role", string(testUser.Role))
			c.Next()
		})
		router.POST("/api/v1/comments", commentHandler.CreateComment)

		reqBody := services.CreateCommentRequest{
			Content: "This is a test comment",
			PostID:  testPost.ID,
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/comments", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response CommentResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "This is a test comment", response.Content)
	})

	t.Run("Comment Handler - Get Comments", func(t *testing.T) {
		// Create a comment first
		_, err := client.Comment.Create().
			SetID(generateTestID("comment")).
			SetContent("Test comment for listing").
			SetApproved(true).
			SetPostID(testPost.ID).
			SetAuthorID(testUser.ID).
			Save(ctx)
		require.NoError(t, err)

		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_role", string(testUser.Role))
			c.Next()
		})
		router.GET("/api/v1/posts/:postId/comments", commentHandler.GetCommentsByPost)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/posts/"+testPost.ID+"/comments", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response CommentListResponse
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Greater(t, response.Total, 0)
	})
}
