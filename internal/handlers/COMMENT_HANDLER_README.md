# Comment Handler

The CommentHandler provides HTTP endpoints for managing comments in the Biotak platform.

## Endpoints

### 1. Create Comment
**POST** `/api/v1/comments`

Creates a new comment on a post. Requires authentication.

**Request Body:**
```json
{
  "content": "This is a comment",
  "post_id": "post-uuid",
  "parent_id": "parent-comment-uuid" // optional, for nested comments
}
```

**Response (201 Created):**
```json
{
  "id": "comment-uuid",
  "content": "This is a comment",
  "approved": true,
  "postId": "post-uuid",
  "parentId": null,
  "createdAt": "2024-12-07T10:00:00Z",
  "updatedAt": "2024-12-07T10:00:00Z",
  "author": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "image": "https://example.com/avatar.jpg"
  },
  "replies": []
}
```

**Features:**
- Automatic spam detection (excessive links, banned keywords, excessive caps)
- Comments flagged as spam are set to `approved: false` for moderation
- Validates user is not banned before allowing comment creation
- Supports nested comments via `parent_id`

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - User is banned from commenting
- `404 Not Found` - Post or parent comment not found
- `500 Internal Server Error` - Server error

---

### 2. Get Comments by Post
**GET** `/api/v1/posts/:postId/comments`

Retrieves all comments for a specific post.

**Query Parameters:**
- None

**Response (200 OK):**
```json
{
  "comments": [
    {
      "id": "comment-uuid",
      "content": "This is a comment",
      "approved": true,
      "postId": "post-uuid",
      "parentId": null,
      "createdAt": "2024-12-07T10:00:00Z",
      "updatedAt": "2024-12-07T10:00:00Z",
      "author": {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "image": "https://example.com/avatar.jpg"
      },
      "replies": [
        {
          "id": "reply-uuid",
          "content": "This is a reply",
          "approved": true,
          "postId": "post-uuid",
          "parentId": "comment-uuid",
          "createdAt": "2024-12-07T10:05:00Z",
          "updatedAt": "2024-12-07T10:05:00Z",
          "author": {
            "id": "user2-uuid",
            "name": "Jane Doe",
            "email": "jane@example.com"
          },
          "replies": []
        }
      ]
    }
  ],
  "total": 1
}
```

**Features:**
- Regular users only see approved comments (`approved: true`)
- Admins and moderators see both approved and pending comments
- Includes nested replies in the response
- Authentication is optional (affects visibility)

**Error Responses:**
- `500 Internal Server Error` - Server error

---

### 3. Moderate Comment
**PUT** `/api/v1/comments/:id/moderate`

Approves, rejects, or deletes a comment. Requires admin or moderator role.

**Request Body:**
```json
{
  "action": "approve" // or "reject" or "delete"
}
```

**Response (200 OK):**
```json
{
  "id": "comment-uuid",
  "content": "This is a comment",
  "approved": true,
  "postId": "post-uuid",
  "parentId": null,
  "createdAt": "2024-12-07T10:00:00Z",
  "updatedAt": "2024-12-07T10:00:00Z",
  "author": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "replies": []
}
```

**For delete action:**
```json
{
  "message": "Comment deleted successfully"
}
```

**Features:**
- `approve` - Sets `approved: true`
- `reject` - Sets `approved: false`
- `delete` - Soft deletes the comment (sets `deleted_at`)
- Only admins and super admins can moderate

**Error Responses:**
- `400 Bad Request` - Invalid action
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Comment not found
- `500 Internal Server Error` - Server error

---

### 4. Delete Comment
**DELETE** `/api/v1/comments/:id`

Deletes a comment. User can delete their own comments, admins can delete any comment.

**Response (200 OK):**
```json
{
  "message": "Comment deleted successfully"
}
```

**Features:**
- Soft delete (sets `deleted_at` timestamp)
- Automatically deletes all nested replies
- Author can delete their own comments
- Admins and super admins can delete any comment

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Not the author and not an admin
- `404 Not Found` - Comment not found
- `500 Internal Server Error` - Server error

---

## Authentication & Authorization

### Authentication
All endpoints except `GET /api/v1/posts/:postId/comments` require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Authorization Rules

| Endpoint | Required Role | Notes |
|----------|--------------|-------|
| POST /api/v1/comments | Any authenticated user | User must not be banned |
| GET /api/v1/posts/:postId/comments | None (optional) | Affects comment visibility |
| PUT /api/v1/comments/:id/moderate | ADMIN, SUPER_ADMIN | Moderation actions |
| DELETE /api/v1/comments/:id | Author, ADMIN, SUPER_ADMIN | Author can delete own comments |

---

## Spam Detection

The comment handler includes automatic spam detection that checks for:

1. **Excessive Links**: More than 3 HTTP/HTTPS links
2. **Banned Keywords**: Common spam terms (viagra, casino, etc.)
3. **Excessive Capitalization**: More than 50% uppercase letters
4. **Repeated Characters**: More than 5 identical characters in a row

Comments flagged as spam are automatically set to `approved: false` and require manual moderation.

---

## Integration with Router

To integrate the CommentHandler with your Gin router:

```go
// Create dependencies
commentRepo := repositories.NewCommentRepository(entClient)
commentService := services.NewCommentService(commentRepo, entClient, redisClient)
commentHandler := handlers.NewCommentHandler(commentService)

// Setup routes
api := router.Group("/api/v1")
{
    // Public endpoint (optional auth)
    api.GET("/posts/:postId/comments", commentHandler.GetCommentsByPost)
    
    // Authenticated endpoints
    authenticated := api.Group("")
    authenticated.Use(middleware.AuthMiddleware(jwtSecret))
    {
        authenticated.POST("/comments", commentHandler.CreateComment)
        authenticated.DELETE("/comments/:id", commentHandler.DeleteComment)
    }
    
    // Admin/moderator endpoints
    moderation := api.Group("")
    moderation.Use(middleware.AuthMiddleware(jwtSecret))
    moderation.Use(middleware.RequireRole("ADMIN", "SUPER_ADMIN"))
    {
        moderation.PUT("/comments/:id/moderate", commentHandler.ModerateComment)
    }
}
```

---

## Testing

See `comment_handler_test.go` for comprehensive test coverage including:
- Creating valid comments
- Spam detection
- Comment visibility by role
- Moderation actions
- Authorization checks
- Soft delete behavior

---

## Requirements Validation

This handler implements the following requirements:

- **Requirement 4.1**: Comment creation with spam detection
- **Requirement 4.2**: Comment retrieval with role-based visibility
- **Requirement 4.3**: Comment moderation (approve, reject, delete)
- **Requirement 4.5**: Banned user prevention

---

## API Compatibility

The CommentHandler maintains full compatibility with the Next.js frontend:
- Uses camelCase for JSON fields (postId, parentId, createdAt, etc.)
- Returns consistent error format
- Supports nested comment structure
- Maintains same authentication flow
