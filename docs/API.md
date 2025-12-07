# Biotak Go Backend API Documentation

## Overview

This document provides comprehensive documentation for the Biotak Go Backend REST API. The API follows RESTful principles and uses JSON for request and response payloads.

## Base URL

- **Development**: `http://localhost:8080`
- **Production**: `https://api.biotak.ir`

## Authentication

Most endpoints require authentication using JWT (JSON Web Tokens). Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

1. **Register**: `POST /api/v1/auth/register`
2. **Login**: `POST /api/v1/auth/login`

Both endpoints return an access token that expires in 3 days.

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Global**: 100 requests per minute
- **Authentication endpoints**: 5 requests per minute  
- **Upload endpoints**: 10 requests per hour

When rate limited, you'll receive a `429 Too Many Requests` response with a `Retry-After` header.

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "additional context"
    },
    "timestamp": "2024-12-07T10:00:00Z",
    "requestId": "uuid"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid request data
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

## API Endpoints

### Health Check

#### GET /health
Basic health check endpoint.

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-12-07T10:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "version": "1.0.0"
}
```

#### GET /health/ready
Kubernetes readiness probe.

#### GET /health/live
Kubernetes liveness probe.

### Authentication

#### POST /api/v1/auth/register
Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response**: `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "emailVerified": false
  },
  "accessToken": "jwt_token",
  "expiresIn": 259200
}
```

#### POST /api/v1/auth/login
Authenticate with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response**: `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "emailVerified": false
  },
  "accessToken": "jwt_token",
  "expiresIn": 259200
}
```

#### POST /api/v1/auth/refresh
Refresh an access token.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`
```json
{
  "accessToken": "new_jwt_token",
  "expiresIn": 259200
}
```

#### POST /api/v1/auth/logout
Invalidate the current token.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/v1/auth/me
Get current user information.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "image": "https://example.com/avatar.jpg",
  "role": "USER",
  "emailVerified": false
}
```

### Posts

#### GET /api/v1/posts
List posts with optional filters and pagination.

**Query Parameters**:
- `page` (integer, default: 1)
- `pageSize` (integer, default: 10, max: 100)
- `categoryId` (uuid)
- `tagId` (uuid)
- `authorId` (uuid)
- `status` (DRAFT, PENDING_REVIEW, PUBLISHED)
- `postType` (STANDARD, VIDEO, GALLERY, AUDIO)
- `dateFrom` (RFC3339 date)
- `dateTo` (RFC3339 date)
- `search` (string)

**Response**: `200 OK`
```json
{
  "posts": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

#### POST /api/v1/posts
Create a new post (requires AUTHOR, ADMIN, or SUPER_ADMIN role).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "title": "Post Title",
  "content": "Post content...",
  "excerpt": "Brief summary",
  "featuredImage": "https://example.com/image.jpg",
  "postType": "STANDARD",
  "categoryIds": ["uuid1", "uuid2"],
  "tagIds": ["uuid1", "uuid2"]
}
```

**Response**: `201 Created`

#### GET /api/v1/posts/:id
Get a post by ID.

**Response**: `200 OK`

#### GET /api/v1/posts/slug/:slug
Get a post by slug. Automatically increments view count.

**Response**: `200 OK`

#### PUT /api/v1/posts/:id
Update a post (requires author or admin).

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

#### POST /api/v1/posts/:id/publish
Publish a post (change status to PUBLISHED).

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

#### DELETE /api/v1/posts/:id
Soft delete a post (requires ADMIN or SUPER_ADMIN role).

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

### Comments

#### GET /api/v1/posts/:postId/comments
Get all comments for a post. Regular users see only approved comments; admins see all.

**Response**: `200 OK`
```json
{
  "comments": [...],
  "total": 10
}
```

#### POST /api/v1/comments
Create a new comment.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "postId": "uuid",
  "content": "Comment text",
  "parentId": "uuid" // optional, for replies
}
```

**Response**: `201 Created`

#### PUT /api/v1/comments/:id/moderate
Moderate a comment (requires ADMIN or SUPER_ADMIN role).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "action": "approve" // or "reject", "delete"
}
```

**Response**: `200 OK`

#### DELETE /api/v1/comments/:id
Delete a comment (author or admin).

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

### Exchange Rates

#### GET /api/v1/exchange-rates
Get current exchange rates for cryptocurrencies.

**Query Parameters**:
- `currencies` (string) - Comma-separated list (e.g., "BTC,ETH,USDT")

**Response**: `200 OK`
```json
{
  "rates": [
    {
      "symbol": "BTC",
      "usdtPrice": 45000.00,
      "irrPrice": 1890000000.00,
      "change": 2.5,
      "globalPrice": 45000.00
    }
  ],
  "timestamp": "2024-12-07T10:00:00Z",
  "source": "Exir API"
}
```

#### GET /api/v1/exchange-rates/historical
Get historical exchange rates.

**Query Parameters**:
- `currency` (string) - Single currency code
- `currencies` (string) - Comma-separated list
- `from` (RFC3339 date, required)
- `to` (RFC3339 date, required)

**Response**: `200 OK`

### File Upload

#### POST /api/v1/upload
Upload an image file. Automatically processes and resizes to multiple dimensions.

**Headers**: `Authorization: Bearer <token>`

**Request**: `multipart/form-data`
- `file` - Image file (max 10MB, jpg/png/webp)

**Response**: `200 OK`
```json
{
  "success": true,
  "originalUrl": "https://storage.example.com/original.jpg",
  "images": [
    {
      "size": "thumbnail",
      "url": "https://storage.example.com/thumb.webp",
      "width": 150,
      "height": 150
    },
    {
      "size": "medium",
      "url": "https://storage.example.com/medium.webp",
      "width": 600,
      "height": 400
    },
    {
      "size": "large",
      "url": "https://storage.example.com/large.webp",
      "width": 1200,
      "height": 800
    }
  ],
  "message": "File uploaded successfully"
}
```

#### DELETE /api/v1/upload/:filename
Delete a file from storage.

**Headers**: `Authorization: Bearer <token>`

**Response**: `200 OK`

### Reports (Admin Only)

#### GET /api/v1/reports/user-activity
Generate user activity report.

**Headers**: `Authorization: Bearer <token>` (ADMIN or SUPER_ADMIN)

**Query Parameters**:
- `from` (RFC3339 date, required)
- `to` (RFC3339 date, required)
- `async` (boolean) - Generate asynchronously

**Response**: `200 OK` or `202 Accepted` (if async)

#### GET /api/v1/reports/content
Generate content statistics report.

**Headers**: `Authorization: Bearer <token>` (ADMIN or SUPER_ADMIN)

**Query Parameters**:
- `from` (RFC3339 date, required)
- `to` (RFC3339 date, required)

**Response**: `200 OK`

#### GET /api/v1/reports/system-health
Generate system health report.

**Headers**: `Authorization: Bearer <token>` (ADMIN or SUPER_ADMIN)

**Response**: `200 OK`

#### GET /api/v1/reports/jobs/:jobId
Check status of an async report job.

**Headers**: `Authorization: Bearer <token>` (ADMIN or SUPER_ADMIN)

**Response**: `200 OK`

## Pagination

List endpoints support pagination with the following parameters:

- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 10, max: 100)

Response includes:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

## Filtering

Many list endpoints support filtering. Filters are applied as query parameters:

```
GET /api/v1/posts?status=PUBLISHED&categoryId=uuid&dateFrom=2024-01-01T00:00:00Z
```

## Sorting

Currently, posts are sorted by:
- Published posts: `published_at DESC`
- Draft posts: `created_at DESC`

## Caching

The API uses Redis for caching:

- Exchange rates: 5 minutes TTL
- Popular posts: 10 minutes TTL
- Report results: 1 hour TTL

Cache headers are included in responses where applicable.

## CORS

CORS is configured to allow requests from the Next.js frontend. The following headers are set:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Credentials`

## Security Headers

All responses include security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (production only)

## Versioning

The API is versioned using URL path versioning (`/api/v1/`). Breaking changes will result in a new version (`/api/v2/`).

## Support

For API support, contact: support@biotak.ir

## Interactive Documentation

View the interactive Swagger/OpenAPI documentation:
- Development: `http://localhost:8080/swagger`
- Production: `https://api.biotak.ir/swagger`
