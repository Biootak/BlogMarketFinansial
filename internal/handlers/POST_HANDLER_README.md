# Post Handler Implementation

## Overview

The PostHandler implements all post-related HTTP endpoints for the Biotak Go backend, providing full CRUD operations and filtering capabilities.

## Implemented Endpoints

### Public Endpoints (No Authentication Required)

1. **GET /api/v1/posts/:id** - Get post by ID
   - Returns a single post with all relations (author, categories, tags)
   - Returns 404 if post not found

2. **GET /api/v1/posts/slug/:slug** - Get post by slug
   - Returns a single post by its URL-friendly slug
   - Automatically increments view count
   - Returns 404 if post not found

3. **GET /api/v1/posts** - List posts with filters
   - Supports pagination (page, pageSize)
   - Supports filtering by:
     - categoryId
     - tagId
     - authorId
     - status (DRAFT, PENDING_REVIEW, PUBLISHED)
     - postType (STANDARD, VIDEO, GALLERY, AUDIO)
     - dateFrom/dateTo (RFC3339 format)
     - search (searches in title, content, excerpt)
   - Returns paginated response with total count

### Protected Endpoints (Authentication Required)

4. **POST /api/v1/posts** - Create a new post
   - Requires valid JWT token
   - Creates post with DRAFT status
   - Automatically generates unique slug
   - Calculates reading time
   - Supports categories and tags
   - Returns 201 with created post

5. **PUT /api/v1/posts/:id** - Update a post
   - Requires valid JWT token
   - Only author or admin can update
   - Supports partial updates
   - Invalidates cache
   - Returns 403 if unauthorized

6. **POST /api/v1/posts/:id/publish** - Publish a post
   - Requires valid JWT token
   - Only author or admin can publish
   - Changes status to PUBLISHED
   - Clears caches
   - Returns 403 if unauthorized

### Admin-Only Endpoints

7. **DELETE /api/v1/posts/:id** - Delete a post
   - Requires admin role (ADMIN or SUPER_ADMIN)
   - Performs soft delete
   - Removes from cache
   - Returns 403 if not admin

## Request/Response Formats

### Create Post Request
```json
{
  "title": "Post Title",
  "content": "Post content...",
  "excerpt": "Optional excerpt",
  "featured_image": "https://example.com/image.jpg",
  "post_type": "STANDARD",
  "category_ids": ["cat-id-1", "cat-id-2"],
  "tag_ids": ["tag-id-1", "tag-id-2"],
  "video_url": "https://youtube.com/...",
  "audio_url": "https://soundcloud.com/...",
  "gallery_images": ["url1", "url2"]
}
```

### Post Response
```json
{
  "id": "post-123",
  "title": "Post Title",
  "slug": "post-title",
  "content": "Post content...",
  "excerpt": "Optional excerpt",
  "featuredImage": "https://example.com/image.jpg",
  "status": "PUBLISHED",
  "postType": "STANDARD",
  "viewCount": 100,
  "readingTime": 5,
  "publishedAt": "2024-12-06T10:00:00Z",
  "createdAt": "2024-12-06T09:00:00Z",
  "updatedAt": "2024-12-06T10:00:00Z",
  "author": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "image": "https://example.com/avatar.jpg"
  },
  "categories": [
    {
      "id": "cat-123",
      "name": "Technology",
      "slug": "technology",
      "description": "Tech posts",
      "image": "https://example.com/cat.jpg"
    }
  ],
  "tags": [
    {
      "id": "tag-123",
      "name": "Bitcoin",
      "slug": "bitcoin"
    }
  ]
}
```

### List Posts Response
```json
{
  "posts": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

## Error Responses

All errors follow the standard format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "timestamp": "2024-12-06T10:00:00Z",
    "request_id": "uuid"
  }
}
```

Common error codes:
- `VALIDATION_ERROR` (400) - Invalid input data
- `UNAUTHORIZED` (401) - Missing or invalid JWT token
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Post not found
- `CONFLICT` (409) - Slug already exists
- `INTERNAL_SERVER_ERROR` (500) - Server error

## Authentication & Authorization

### Authentication
- All protected endpoints require a valid JWT token in the Authorization header
- Format: `Authorization: Bearer <token>`
- Token is validated by the AuthMiddleware

### Authorization Rules
- **Create Post**: Any authenticated user
- **Update Post**: Post author OR admin
- **Publish Post**: Post author OR admin
- **Delete Post**: Admin only (ADMIN or SUPER_ADMIN role)

## Features

### Automatic Slug Generation
- Slugs are automatically generated from post titles
- Ensures URL-safe characters
- Handles Persian/Arabic characters
- Adds timestamp suffix if slug already exists

### Reading Time Calculation
- Automatically calculated based on content length
- Assumes 200 words per minute
- Minimum 1 minute

### View Count Tracking
- Automatically incremented when post is viewed by slug
- Runs asynchronously to not block response

### Cache Management
- Post data is cached in Redis (if available)
- Cache is invalidated on updates, publishes, and deletes
- List caches are also invalidated appropriately

### Eager Loading
- All post queries use eager loading for relations
- Prevents N+1 query problems
- Loads author, categories, and tags in single query

## Usage Example

See `examples/post-handler-usage.go` for a complete example of how to:
1. Initialize the handler
2. Register routes
3. Apply middleware
4. Make API calls

## Testing

Basic unit tests are provided in `post_handler_test.go`:
- Structure validation
- JSON serialization tests
- Response format tests

Full integration tests with database will be added in `tests/integration/`.

## Requirements Validation

This implementation satisfies the following requirements from the design document:

- **Requirement 3.1**: Post creation with unique slug generation ✅
- **Requirement 3.2**: Post updates with authorization ✅
- **Requirement 3.3**: Post publishing with status transition ✅
- **Requirement 3.4**: Post listing with filters and pagination ✅
- **Requirement 3.5**: Post deletion (soft delete) with admin authorization ✅
- **Requirement 11.1**: API format compatibility with Next.js ✅

## Next Steps

1. Add integration tests with actual database
2. Add property-based tests for correctness properties
3. Implement related posts endpoint
4. Add post statistics endpoint
5. Implement post scheduling feature
