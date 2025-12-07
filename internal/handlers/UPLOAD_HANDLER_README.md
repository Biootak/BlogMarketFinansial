# Upload Handler

The Upload Handler provides endpoints for file upload and deletion with automatic image processing, validation, and S3 storage integration.

## Features

- ✅ File validation (type, size, dimensions)
- ✅ Image processing (resize to multiple sizes)
- ✅ WebP conversion for optimization
- ✅ S3/Liara storage integration
- ✅ Automatic cleanup on upload failure
- ✅ Authentication required (JWT)
- ✅ Rate limiting (10 uploads per hour)

## Requirements

This handler implements the following requirements from the design document:

- **Requirement 7.1**: File validation (type, size, dimensions)
- **Requirement 7.2**: Image processing (resize, convert to WebP)
- **Requirement 7.3**: S3 storage with unique filenames
- **Requirement 7.4**: Cleanup on upload failure
- **Requirement 7.5**: File deletion from storage

## API Endpoints

### 1. Upload File

**Endpoint**: `POST /api/v1/upload`

**Authentication**: Required (JWT Bearer token)

**Rate Limit**: 10 uploads per hour

**Request**:
```http
POST /api/v1/upload HTTP/1.1
Host: localhost:8080
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

file: <binary-image-data>
```

**Response** (Success - 200 OK):
```json
{
  "success": true,
  "originalUrl": "https://storage.example.com/bucket/uuid-original.jpg",
  "images": [
    {
      "url": "https://storage.example.com/bucket/uuid-thumbnail.webp",
      "width": 150,
      "height": 150,
      "size": "thumbnail"
    },
    {
      "url": "https://storage.example.com/bucket/uuid-medium.webp",
      "width": 600,
      "height": 400,
      "size": "medium"
    },
    {
      "url": "https://storage.example.com/bucket/uuid-large.webp",
      "width": 1200,
      "height": 800,
      "size": "large"
    }
  ],
  "message": "File uploaded successfully"
}
```

**Response** (Validation Error - 400 Bad Request):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "file size exceeds maximum limit of 10MB (got 15728640 bytes)",
    "details": {
      "field": "file"
    },
    "timestamp": "2024-12-07T10:30:00Z",
    "request_id": "uuid"
  }
}
```

**Response** (Unauthorized - 401):
```json
{
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Authorization header is required"
  }
}
```

**Response** (Rate Limit Exceeded - 429):
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 10,
      "window": "1h0m0s",
      "retry_after": 3600,
      "reset_at": "2024-12-07T11:30:00Z"
    }
  }
}
```

### 2. Delete File

**Endpoint**: `DELETE /api/v1/upload/:filename`

**Authentication**: Required (JWT Bearer token)

**Request**:
```http
DELETE /api/v1/upload/uuid-original.jpg HTTP/1.1
Host: localhost:8080
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response** (Success - 200 OK):
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Response** (Bad Request - 400):
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Filename is required",
    "details": {
      "field": "filename"
    },
    "timestamp": "2024-12-07T10:30:00Z",
    "request_id": "uuid"
  }
}
```

## Validation Rules

### File Size
- Maximum: 10MB (10,485,760 bytes)
- Files exceeding this limit will be rejected with a validation error

### File Types
Allowed MIME types:
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`

Allowed extensions:
- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

### Image Validation
- File must be a valid image that can be decoded
- Corrupted or invalid image files will be rejected

## Image Processing

### Generated Sizes

The upload service automatically generates multiple sizes:

1. **Thumbnail**: 150x150 pixels
2. **Medium**: 600x400 pixels
3. **Large**: 1200x800 pixels
4. **Original**: Preserved as-is

### Processing Steps

1. **Validation**: Check file size, type, and validity
2. **Decode**: Decode the image to verify it's valid
3. **Resize**: Generate thumbnail, medium, and large versions
4. **Convert**: Convert processed images to WebP format
5. **Upload**: Upload all versions to S3 storage
6. **Cleanup**: If any step fails, delete all uploaded files

### Aspect Ratio

Images are resized using the "Fit" algorithm, which:
- Maintains the original aspect ratio
- Fits the image within the target dimensions
- Uses Lanczos resampling for high quality

## Storage

### S3/Liara Integration

Files are stored in S3-compatible storage (Liara) with:
- Unique filenames using UUID
- Public read access (ACL: public-read)
- Appropriate content types

### Filename Format

- Original: `{uuid}-original.{ext}`
- Processed: `{uuid}-{size}.webp`

Example:
- `a1b2c3d4-e5f6-7890-abcd-ef1234567890-original.jpg`
- `a1b2c3d4-e5f6-7890-abcd-ef1234567890-thumbnail.webp`
- `a1b2c3d4-e5f6-7890-abcd-ef1234567890-medium.webp`
- `a1b2c3d4-e5f6-7890-abcd-ef1234567890-large.webp`

### Public URLs

Files are accessible via public URLs:
```
{S3_ENDPOINT}/{BUCKET_NAME}/{FILENAME}
```

Example:
```
https://storage.liara.space/biotak-uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890-original.jpg
```

## Error Handling

### Upload Failure Cleanup

If any step of the upload process fails:
1. All previously uploaded files are deleted from S3
2. No orphaned files remain in storage
3. An error response is returned to the client

### Common Errors

| Error | Status | Description |
|-------|--------|-------------|
| No file provided | 400 | Request doesn't include a file |
| File too large | 400 | File exceeds 10MB limit |
| Invalid file type | 400 | File type not in allowed list |
| Invalid image | 400 | File is not a valid image |
| Upload failed | 500 | S3 upload or processing error |
| Delete failed | 500 | S3 deletion error |

## Usage Example

### Go Code

```go
package main

import (
    "biotak-go-backend/internal/handlers"
    "biotak-go-backend/internal/middleware"
    "biotak-go-backend/internal/services"
    
    "github.com/gin-gonic/gin"
)

func main() {
    // Initialize upload service
    uploadService, _ := services.NewUploadService(
        "https://storage.liara.space",
        "access-key",
        "secret-key",
        "biotak-uploads",
    )
    
    // Initialize handler
    uploadHandler := handlers.NewUploadHandler(uploadService)
    
    // Setup routes
    router := gin.Default()
    upload := router.Group("/api/v1/upload")
    upload.Use(middleware.AuthMiddleware())
    upload.Use(middleware.UploadRateLimit(redisClient))
    {
        upload.POST("/", uploadHandler.UploadFile)
        upload.DELETE("/:filename", uploadHandler.DeleteFile)
    }
    
    router.Run(":8080")
}
```

### cURL Examples

**Upload a file**:
```bash
curl -X POST http://localhost:8080/api/v1/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Delete a file**:
```bash
curl -X DELETE http://localhost:8080/api/v1/upload/uuid-original.jpg \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Delete using full URL**:
```bash
curl -X DELETE "http://localhost:8080/api/v1/upload/https://storage.liara.space/bucket/uuid-original.jpg" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/TypeScript Example

```typescript
// Upload a file
async function uploadFile(file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:8080/api/v1/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
}

// Delete a file
async function deleteFile(filename: string, token: string) {
  const response = await fetch(`http://localhost:8080/api/v1/upload/${filename}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
}

// Usage
const file = document.querySelector('input[type="file"]').files[0];
const token = 'your-jwt-token';

try {
  const result = await uploadFile(file, token);
  console.log('Upload successful:', result);
  console.log('Original URL:', result.originalUrl);
  console.log('Thumbnail URL:', result.images[0].url);
  
  // Later, delete the file
  await deleteFile(result.originalUrl, token);
  console.log('File deleted successfully');
} catch (error) {
  console.error('Error:', error.message);
}
```

## Configuration

### Environment Variables

Required environment variables:

```env
# S3/Liara Storage Configuration
S3_ENDPOINT=https://storage.liara.space
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET_NAME=biotak-uploads

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# JWT (for authentication)
JWT_SECRET=your-jwt-secret
```

## Testing

### Unit Tests

Test the upload service methods:
- File validation
- Image processing
- S3 upload
- Cleanup on failure
- File deletion

### Integration Tests

Test the complete upload flow:
1. Upload a valid image
2. Verify all sizes are generated
3. Verify files exist in S3
4. Delete the files
5. Verify files are removed from S3

### Property-Based Tests

Test universal properties:
- **Property 22**: File validation rejects invalid files
- **Property 23**: Image processing generates all sizes
- **Property 24**: Filenames are always unique
- **Property 25**: Failed uploads leave no orphaned files
- **Property 26**: File deletion removes all references

## Security Considerations

### Authentication
- All endpoints require valid JWT token
- Tokens are validated by AuthMiddleware
- Unauthorized requests receive 401 status

### Rate Limiting
- 10 uploads per hour per user/IP
- Prevents abuse and excessive storage usage
- Enforced by UploadRateLimit middleware

### File Validation
- Strict file type checking
- Size limits prevent DoS attacks
- Image validation prevents malicious files

### Storage Security
- Files stored with public-read ACL
- Unique filenames prevent overwrites
- No sensitive data in filenames

## Performance Considerations

### Image Processing
- Uses efficient Lanczos resampling
- Processes images in memory
- Parallel processing possible for multiple sizes

### Storage
- Direct upload to S3 (no local storage)
- Streaming upload for large files
- Automatic cleanup reduces storage waste

### Caching
- Consider CDN for serving images
- Cache processed images at edge locations
- Reduce bandwidth and improve load times

## Troubleshooting

### Upload Fails with "Invalid Image"
- Verify file is a valid image
- Check file is not corrupted
- Ensure file extension matches content

### Upload Fails with "Failed to Upload to S3"
- Verify S3 credentials are correct
- Check S3 endpoint is accessible
- Ensure bucket exists and has correct permissions

### Rate Limit Exceeded
- Wait for the rate limit window to reset
- Check X-RateLimit-Reset header for reset time
- Consider increasing limit for specific users

### Files Not Deleted
- Verify filename or URL is correct
- Check S3 credentials have delete permissions
- Ensure file exists in the bucket

## Related Files

- `internal/services/upload_service.go` - Upload service implementation
- `internal/middleware/auth.go` - Authentication middleware
- `internal/middleware/rate_limit.go` - Rate limiting middleware
- `examples/upload-handler-usage.go` - Complete usage example

## API Compatibility

This handler maintains compatibility with the Next.js frontend:
- Same request/response format
- Same error codes and messages
- Same validation rules
- Same file processing behavior

## Future Enhancements

Potential improvements:
- [ ] Support for video uploads
- [ ] Support for PDF documents
- [ ] Image optimization (compression)
- [ ] Metadata extraction (EXIF data)
- [ ] Virus scanning integration
- [ ] Progress tracking for large uploads
- [ ] Batch upload support
- [ ] Image cropping and editing
- [ ] Watermark support
- [ ] CDN integration
