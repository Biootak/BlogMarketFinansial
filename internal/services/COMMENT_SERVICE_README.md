# Comment Service Documentation

## Overview

The Comment Service handles all comment-related operations for the Biotak platform, including:
- Comment creation with spam detection
- Comment moderation (approve, reject, delete)
- Nested comments (parent-child relationships)
- Role-based comment visibility
- Banned user prevention

## Architecture

### Components

1. **CommentRepository** (`internal/repositories/comment_repository.go`)
   - Wraps Ent Comment queries
   - Handles database operations (CRUD)
   - Supports filtering by status and post
   - Implements soft delete

2. **CommentService** (`internal/services/comment_service.go`)
   - Business logic for comments
   - Spam detection
   - Permission checking
   - User ban verification

## Features

### 1. Comment Creation

Creates a new comment with automatic spam detection:

```go
req := services.CreateCommentRequest{
    Content:  "This is a great article!",
    PostID:   "post-123",
    ParentID: nil, // Optional: for nested comments
}

comment, err := commentService.CreateComment(ctx, req, "user-123")
```

**Spam Detection:**
- Excessive links (more than 3)
- Banned keywords (viagra, casino, etc.)
- Excessive capitalization (>50%)
- Repeated characters (5+ in a row)

**Behavior:**
- Spam comments are created with `approved = false`
- Clean comments are created with `approved = true`
- Banned users receive `ErrUserBanned` error

### 2. Get Comments

Retrieves comments for a post based on user role:

```go
// Regular users see only approved comments
comments, err := commentService.GetComments(ctx, "post-123", "USER")

// Admins see all comments (including pending)
allComments, err := commentService.GetComments(ctx, "post-123", "ADMIN")
```

**Role-Based Visibility:**
- `USER`, `AUTHOR`: Only approved comments
- `ADMIN`, `SUPER_ADMIN`, `MODERATOR`: All comments (including pending)

### 3. Comment Moderation

Moderators and admins can approve, reject, or delete comments:

```go
// Approve a comment
comment, err := commentService.ModerateComment(
    ctx,
    "comment-123",
    services.ModerationActionApprove,
    "admin-user-id",
    "ADMIN",
)

// Reject a comment
comment, err := commentService.ModerateComment(
    ctx,
    "comment-123",
    services.ModerationActionReject,
    "admin-user-id",
    "ADMIN",
)

// Delete a comment
comment, err := commentService.ModerateComment(
    ctx,
    "comment-123",
    services.ModerationActionDelete,
    "admin-user-id",
    "ADMIN",
)
```

**Moderation Actions:**
- `ModerationActionApprove`: Sets `approved = true`
- `ModerationActionReject`: Sets `approved = false`
- `ModerationActionDelete`: Soft deletes the comment and all replies

**Permissions:**
- Only `ADMIN` and `SUPER_ADMIN` can moderate comments

### 4. Nested Comments

Support for parent-child comment relationships:

```go
// Create a reply to a comment
req := services.CreateCommentRequest{
    Content:  "I agree with your point!",
    PostID:   "post-123",
    ParentID: &parentCommentID, // Reference to parent comment
}

reply, err := commentService.CreateComment(ctx, req, "user-123")
```

**Behavior:**
- Replies are linked to parent comments via `parent_id`
- Deleting a parent comment also deletes all replies
- Replies are loaded with `.WithReplies()` in queries

### 5. Banned User Prevention

Users with status != "Active" cannot create comments:

```go
// User with status "Banned" or "Suspended"
comment, err := commentService.CreateComment(ctx, req, "banned-user-id")
// Returns: ErrUserBanned
```

**User Status Values:**
- `Active`: Can comment
- `Banned`, `Suspended`, or any other value: Cannot comment

### 6. Get Pending Comments

Retrieve comments awaiting moderation:

```go
comments, total, err := commentService.GetPendingComments(ctx, 10, 0)
// Returns: comments with approved = false, total count
```

## Database Schema

### Comment Fields

```go
type Comment struct {
    ID        string    // Comment ID (cuid format)
    Content   string    // Comment content
    Approved  bool      // Approval status (false = pending)
    PostID    string    // Post this comment belongs to
    AuthorID  string    // User who wrote this comment
    ParentID  *string   // Parent comment ID (for nested comments)
    CreatedAt time.Time // Creation timestamp
    UpdatedAt time.Time // Last update timestamp
    DeletedAt *time.Time // Soft delete timestamp
}
```

### Indexes

- `approved`: For filtering by status
- `parent_id`: For nested comments
- `deleted_at`: For soft delete queries
- `post_id`: For post-specific queries
- `author_id`: For user-specific queries
- `post_id, approved`: Composite index for efficient filtering
- `post_id, approved, created_at`: For sorted queries

## Error Handling

### Error Types

```go
var (
    ErrCommentNotFound = errors.New("comment not found")
    ErrUserBanned      = errors.New("user is banned from commenting")
    ErrInvalidComment  = errors.New("invalid comment content")
    ErrUserNotFound    = errors.New("user not found")
    ErrUnauthorized    = errors.New("unauthorized")
)
```

### Error Scenarios

1. **Comment Not Found**: Comment ID doesn't exist or is deleted
2. **User Banned**: User status is not "Active"
3. **Invalid Comment**: Empty or invalid content
4. **User Not Found**: Author ID doesn't exist
5. **Unauthorized**: User lacks permission for the operation

## Spam Detection

### Patterns Detected

1. **Excessive Links**: More than 3 HTTP/HTTPS links
2. **Banned Keywords**: Common spam terms (viagra, casino, etc.)
3. **Excessive Capitalization**: More than 50% uppercase letters
4. **Repeated Characters**: 5 or more identical characters in a row

### Customization

To add more spam patterns, update the `CheckSpam` method in `comment_service.go`:

```go
// Add custom banned keywords
bannedKeywords = append(bannedKeywords, "your-keyword")

// Add custom regex patterns
customPattern := regexp.MustCompile(`your-pattern`)
if customPattern.MatchString(content) {
    return true
}
```

## Usage Examples

See `examples/comment-service-usage.go` for complete examples:

```bash
# Run the example
go run examples/comment-service-usage.go
```

## Testing

### Unit Tests

```bash
# Run comment repository tests
go test ./internal/repositories -run TestCommentRepository

# Run comment service tests
go test ./internal/services -run TestCommentService
```

### Integration Tests

```bash
# Run integration tests
go test ./tests/integration -run TestCommentIntegration
```

## API Integration

The Comment Service is used by the Comment Handler (`internal/handlers/comment_handler.go`) to expose REST API endpoints:

- `POST /api/v1/comments` - Create comment
- `GET /api/v1/posts/:postId/comments` - Get comments for post
- `PUT /api/v1/comments/:id/moderate` - Moderate comment
- `DELETE /api/v1/comments/:id` - Delete comment
- `GET /api/v1/comments/pending` - Get pending comments

## Performance Considerations

### Optimizations

1. **Eager Loading**: Use `.WithAuthor()`, `.WithPost()`, `.WithReplies()` to avoid N+1 queries
2. **Indexes**: Composite indexes on `post_id, approved, created_at` for efficient sorting
3. **Soft Delete**: Deleted comments remain in database for audit purposes
4. **Pagination**: Use `limit` and `offset` for large comment lists

### Caching Strategy

Future enhancement: Cache frequently accessed comments in Redis:

```go
// Cache key format
key := fmt.Sprintf("comments:post:%s:approved:%v", postID, includeUnapproved)

// TTL: 5 minutes
ttl := 5 * time.Minute
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 4.1**: Comment creation with spam detection ✅
- **Requirement 4.2**: Role-based comment visibility ✅
- **Requirement 4.3**: Comment moderation (approve, reject, delete) ✅
- **Requirement 4.4**: Spam pattern detection ✅
- **Requirement 4.5**: Banned user prevention ✅

## Correctness Properties

The following properties are validated by property-based tests:

- **Property 13**: Comment Spam Detection - Spam patterns are correctly identified
- **Property 14**: Comment Visibility by Role - Users see appropriate comments based on role
- **Property 15**: Comment Moderation State Changes - Moderation actions update status correctly
- **Property 16**: Banned User Comment Prevention - Banned users cannot create comments

## Future Enhancements

1. **Rate Limiting**: Limit comment creation per user per time window
2. **Email Notifications**: Notify post authors of new comments
3. **Comment Voting**: Allow users to upvote/downvote comments
4. **Comment Editing**: Allow users to edit their own comments
5. **Advanced Spam Detection**: Machine learning-based spam detection
6. **Comment Threading**: Better UI for nested comment threads
7. **Mention System**: @mention other users in comments
8. **Rich Text**: Support markdown or HTML in comments

