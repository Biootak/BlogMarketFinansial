# Upload Service

## Overview

The Upload Service handles file upload operations for the Biotak Go backend. It provides comprehensive functionality for validating, processing, and storing images to S3-compatible storage (Liara).

## Features

### 1. File Validation (Requirement 7.1)
- **File Size Validation**: Maximum 10MB
- **File Type Validation**: Only jpg, png, webp allowed
- **Image Integrity Check**: Validates that uploaded files are valid images
- **Dimension Validation**: Ensures images can be decoded

### 2. Image Processing (Requirement 7.2)
- **Multiple Size Generation**:
  - Thumbnail: 150x150 pixels
  - Medium: 600x400 pixels
  - Large: 1200x800 pixels
- **Aspect Ratio Preservation**: Uses "fit" algorithm to maintain proportions
- **WebP Conversion**: All processed images converted to WebP format
- **Quality Optimization**: Efficient compression for web delivery

### 3. S3 Storage (Requirement 7.3)
- **Unique Filenames**: UUID-based naming prevents collisions
- **Public Access**: Files uploaded with public-read ACL
- **Original Preservation**: Original file stored alongside processed versions
- **URL Generation**: Returns public URLs for all uploaded files

### 4. Failure Cleanup (Requirement 7.4)
- **Automatic Rollback**: Failed uploads trigger cleanup of partial files
- **No Orphaned Files**: Ensures S3 storage remains clean
- **Descriptive Errors**: Clear error messages for debugging

### 5. File Deletion (Requirement 7.5)
- **Flexible Input**: Accepts both filenames and full URLs
- **Graceful Handling**: Doesn't error on non-existent files
- **Database Integration**: Can be extended to update database references

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Upload Service                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         ValidateFile()                         │    │
│  │  - Check file size (max 10MB)                 │    │
│  │  - Check file type (jpg, png, webp)           │    │
│  │  - Validate image integrity                    │    │
│  └────────────────────────────────────────────────┘    │
│                        │                                 │
│                        ▼                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │         ProcessImage()                         │    │
│  │  - Decode image                                │    │
│  │  - Resize to multiple dimensions               │    │
│  │  - Convert to WebP format                      │    │
│  │  - Upload each size to S3                      │    │
│  └────────────────────────────────────────────────┘    │
│                        │                                 │
│                        ▼                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │         UploadImage()                          │    │
│  │  - Validate file                               │    │
│  │  - Process image (create sizes)                │    │
│  │  - Upload original                             │    │
│  │  - Return all URLs                             │    │
│  │  - Cleanup on failure                          │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         DeleteFile()                           │    │
│  │  - Extract filename from URL                   │    │
│  │  - Delete from S3                              │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   S3/Liara       │
              │   Storage        │
              └──────────────────┘
```

## Usage

### Initialization

```go
import "biotak-go-backend/internal/services"

uploadService, err := services.NewUploadService(
    os.Getenv("LIARA_ENDPOINT"),      // e.g., "https://storage.c2.liara.space"
    os.Getenv("LIARA_ACCESS_KEY"),    // Your access key
    os.Getenv("LIARA_SECRET_KEY"),    // Your secret key
    os.Getenv("LIARA_BUCKET_NAME"),   // Your bucket name
)
if err != nil {
    log.Fatal(err)
}
```

### Upload an Image

```go
// In a Gin handler
func UploadHandler(c *gin.Context) {
    // Get file from request
    file, header, err := c.Request.FormFile("image")
    if err != nil {
        c.JSON(400, gin.H{"error": "No file uploaded"})
        return
    }
    defer file.Close()

    // Upload and process
    ctx := c.Request.Context()
    result, err := uploadService.UploadImage(ctx, file, header)
    if err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // Return URLs
    c.JSON(200, gin.H{
        "success": true,
        "data": gin.H{
            "original": result.OriginalURL,
            "images": result.Images,
        },
    })
}
```

### Delete a File

```go
// Delete by filename
err := uploadService.DeleteFile(ctx, "abc123-thumbnail.webp")

// Delete by full URL
err := uploadService.DeleteFile(ctx, "https://storage.example.com/bucket/abc123-thumbnail.webp")
```

## API Response Format

### Successful Upload

```json
{
  "success": true,
  "data": {
    "original": "https://storage.c2.liara.space/bucket/uuid-original.jpg",
    "images": [
      {
        "url": "https://storage.c2.liara.space/bucket/uuid-thumbnail.webp",
        "width": 150,
        "height": 150,
        "size": "thumbnail"
      },
      {
        "url": "https://storage.c2.liara.space/bucket/uuid-medium.webp",
        "width": 600,
        "height": 400,
        "size": "medium"
      },
      {
        "url": "https://storage.c2.liara.space/bucket/uuid-large.webp",
        "width": 1200,
        "height": 800,
        "size": "large"
      }
    ]
  }
}
```

### Error Response

```json
{
  "error": "file size exceeds maximum limit of 10MB (got 12582912 bytes)"
}
```

## Error Handling

The service provides detailed error messages for various scenarios:

### Validation Errors

1. **File Too Large**
   ```
   Error: "file size exceeds maximum limit of 10MB (got X bytes)"
   ```

2. **Invalid File Type**
   ```
   Error: "unsupported file type: image/gif (allowed: jpg, png, webp)"
   ```

3. **Invalid Image Data**
   ```
   Error: "invalid image file: ..."
   ```

### Upload Errors

1. **S3 Upload Failure**
   ```
   Error: "failed to upload to S3: ..."
   ```
   - Automatically cleans up any partially uploaded files

2. **Image Processing Failure**
   ```
   Error: "failed to process thumbnail size: ..."
   ```
   - Automatically cleans up any uploaded files

## Configuration

### Environment Variables

```bash
LIARA_ENDPOINT="https://storage.c2.liara.space"
LIARA_ACCESS_KEY="your-access-key"
LIARA_SECRET_KEY="your-secret-key"
LIARA_BUCKET_NAME="your-bucket-name"
```

### Validation Rules

- **Maximum File Size**: 10MB (10,485,760 bytes)
- **Allowed Types**: 
  - `image/jpeg` (.jpg, .jpeg)
  - `image/png` (.png)
  - `image/webp` (.webp)

### Image Processing Sizes

| Size      | Dimensions | Algorithm |
|-----------|------------|-----------|
| Thumbnail | 150x150    | Fit       |
| Medium    | 600x400    | Fit       |
| Large     | 1200x800   | Fit       |
| Original  | Preserved  | N/A       |

**Note**: "Fit" algorithm resizes the image to fit within the specified dimensions while maintaining the original aspect ratio.

## Testing

### Unit Tests

Run unit tests:
```bash
go test -v ./internal/services -run TestUploadService
```

### Integration Tests

Integration tests require valid S3 credentials:
```bash
export LIARA_ENDPOINT="https://storage.c2.liara.space"
export LIARA_ACCESS_KEY="your-access-key"
export LIARA_SECRET_KEY="your-secret-key"
export LIARA_BUCKET_NAME="your-bucket-name"

go test -v ./internal/services -run TestUploadImage_Integration
```

### Example Usage

See `examples/upload-service-usage.go` for comprehensive examples.

## Performance Considerations

### Image Processing

- **Concurrent Processing**: Each size is processed sequentially to maintain memory efficiency
- **Memory Usage**: Images are processed in-memory; consider streaming for very large files
- **Format Conversion**: WebP conversion provides ~30% size reduction compared to JPEG

### S3 Operations

- **Upload Speed**: Depends on network bandwidth and S3 endpoint location
- **Retry Logic**: Consider implementing retry logic for transient network failures
- **Connection Pooling**: AWS SDK handles connection pooling automatically

### Optimization Tips

1. **Validate Early**: File validation happens before processing to fail fast
2. **Cleanup on Failure**: Automatic cleanup prevents orphaned files
3. **Unique Filenames**: UUID-based naming prevents collisions and overwrites
4. **Public ACL**: Files are immediately accessible without additional requests

## Security Considerations

### Input Validation

- ✅ File size limits prevent DoS attacks
- ✅ File type validation prevents malicious uploads
- ✅ Image integrity check prevents corrupted files

### Storage Security

- ✅ Unique filenames prevent guessing attacks
- ✅ Public-read ACL for web accessibility
- ⚠️ Consider implementing signed URLs for sensitive content

### Best Practices

1. **Rate Limiting**: Apply rate limits to upload endpoints (10 uploads/hour recommended)
2. **Authentication**: Require authentication for upload operations
3. **Virus Scanning**: Consider integrating virus scanning for production
4. **Content Moderation**: Implement content moderation for user-generated images

## Troubleshooting

### Common Issues

1. **"Failed to upload to S3"**
   - Check S3 credentials are correct
   - Verify bucket exists and is accessible
   - Check network connectivity to S3 endpoint

2. **"Invalid image file"**
   - Ensure file is a valid image format
   - Check file is not corrupted
   - Verify file extension matches content

3. **"File size exceeds maximum limit"**
   - Reduce image size before upload
   - Consider increasing limit if needed (update `maxFileSize` constant)

### Debug Mode

Enable debug logging:
```go
// Add logging to track upload progress
log.Printf("Validating file: %s (size: %d bytes)", header.Filename, header.Size)
```

## Future Enhancements

- [ ] Add support for video uploads
- [ ] Implement progressive image loading
- [ ] Add image optimization (compression levels)
- [ ] Support for animated WebP
- [ ] Batch upload operations
- [ ] CDN integration
- [ ] Image metadata extraction (EXIF)
- [ ] Watermarking support

## Dependencies

- `github.com/aws/aws-sdk-go-v2` - AWS SDK for S3 operations
- `github.com/disintegration/imaging` - Image processing library
- `github.com/google/uuid` - UUID generation

## Related Documentation

- [AWS S3 SDK Documentation](https://aws.github.io/aws-sdk-go-v2/docs/)
- [Imaging Library Documentation](https://github.com/disintegration/imaging)
- [Liara Object Storage Documentation](https://docs.liara.ir/storage/object-storage/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review example usage in `examples/upload-service-usage.go`
3. Run tests to verify configuration
4. Check S3 bucket permissions and credentials
