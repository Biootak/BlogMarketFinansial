package main

import (
	"fmt"
	"log"
	"mime/multipart"
	"os"

	"biotak-go-backend/internal/services"
)

func main() {
	fmt.Println("=== Upload Service Usage Examples ===\n")

	// Initialize upload service
	uploadService, err := services.NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	if err != nil {
		log.Fatalf("Failed to create upload service: %v", err)
	}

	// Example 1: Validate a file
	fmt.Println("Example 1: File Validation")
	fmt.Println("---------------------------")
	
	// Open a test file
	file, err := os.Open("test-image.jpg")
	if err != nil {
		fmt.Printf("Note: test-image.jpg not found. Create one to test.\n")
	} else {
		defer file.Close()

		// Get file info
		fileInfo, _ := file.Stat()
		
		// Create multipart header
		header := &multipart.FileHeader{
			Filename: "test-image.jpg",
			Size:     fileInfo.Size(),
		}
		header.Header.Set("Content-Type", "image/jpeg")

		// Validate file
		err = uploadService.ValidateFile(file, header)
		if err != nil {
			fmt.Printf("❌ Validation failed: %v\n", err)
		} else {
			fmt.Printf("✅ File validation passed\n")
		}
	}
	fmt.Println()

	// Example 2: Upload an image with processing
	fmt.Println("Example 2: Upload Image with Processing")
	fmt.Println("----------------------------------------")
	fmt.Println("This example would:")
	fmt.Println("1. Validate the file (type, size, dimensions)")
	fmt.Println("2. Process the image:")
	fmt.Println("   - Create thumbnail (150x150)")
	fmt.Println("   - Create medium size (600x400)")
	fmt.Println("   - Create large size (1200x800)")
	fmt.Println("   - Convert all to WebP format")
	fmt.Println("3. Upload original file to S3")
	fmt.Println("4. Upload all processed versions to S3")
	fmt.Println("5. Return URLs for all versions")
	fmt.Println()
	
	// Pseudo-code for actual usage:
	fmt.Println("Code example:")
	fmt.Println(`
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	result, err := uploadService.UploadImage(ctx, file, header)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"original": result.OriginalURL,
		"images": result.Images,
	})
	`)
	fmt.Println()

	// Example 3: Delete a file
	fmt.Println("Example 3: Delete File")
	fmt.Println("----------------------")
	fmt.Println("Delete by filename:")
	fmt.Println(`  err := uploadService.DeleteFile(ctx, "abc123-thumbnail.webp")`)
	fmt.Println()
	fmt.Println("Delete by full URL:")
	fmt.Println(`  err := uploadService.DeleteFile(ctx, "https://storage.example.com/bucket/abc123-thumbnail.webp")`)
	fmt.Println()

	// Example 4: Error handling
	fmt.Println("Example 4: Error Handling")
	fmt.Println("-------------------------")
	fmt.Println("The service handles various error scenarios:")
	fmt.Println()
	fmt.Println("1. File too large (>10MB):")
	fmt.Println(`   Error: "file size exceeds maximum limit of 10MB"`)
	fmt.Println()
	fmt.Println("2. Invalid file type:")
	fmt.Println(`   Error: "unsupported file type: image/gif (allowed: jpg, png, webp)"`)
	fmt.Println()
	fmt.Println("3. Invalid image data:")
	fmt.Println(`   Error: "invalid image file: ..."`)
	fmt.Println()
	fmt.Println("4. Upload failure with automatic cleanup:")
	fmt.Println("   - If any step fails, all uploaded files are automatically deleted")
	fmt.Println("   - No orphaned files remain in S3")
	fmt.Println()

	// Example 5: Integration with Gin handler
	fmt.Println("Example 5: Gin Handler Integration")
	fmt.Println("-----------------------------------")
	fmt.Println(`
func UploadHandler(uploadService *services.UploadService) gin.HandlerFunc {
	return func(c *gin.Context) {
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
				"thumbnail": findImageBySize(result.Images, "thumbnail"),
				"medium": findImageBySize(result.Images, "medium"),
				"large": findImageBySize(result.Images, "large"),
			},
		})
	}
}

func findImageBySize(images []services.ProcessedImage, size string) string {
	for _, img := range images {
		if img.Size == size {
			return img.URL
		}
	}
	return ""
}
	`)
	fmt.Println()

	// Example 6: Configuration
	fmt.Println("Example 6: Configuration")
	fmt.Println("------------------------")
	fmt.Println("Required environment variables:")
	fmt.Println("  LIARA_ENDPOINT      - S3 endpoint URL (e.g., https://storage.c2.liara.space)")
	fmt.Println("  LIARA_ACCESS_KEY    - S3 access key")
	fmt.Println("  LIARA_SECRET_KEY    - S3 secret key")
	fmt.Println("  LIARA_BUCKET_NAME   - S3 bucket name")
	fmt.Println()

	// Example 7: Validation rules
	fmt.Println("Example 7: Validation Rules")
	fmt.Println("---------------------------")
	fmt.Println("File size limits:")
	fmt.Println("  - Maximum: 10MB")
	fmt.Println()
	fmt.Println("Allowed file types:")
	fmt.Println("  - image/jpeg (.jpg, .jpeg)")
	fmt.Println("  - image/png (.png)")
	fmt.Println("  - image/webp (.webp)")
	fmt.Println()
	fmt.Println("Image processing sizes:")
	fmt.Println("  - Thumbnail: 150x150 (fit)")
	fmt.Println("  - Medium: 600x400 (fit)")
	fmt.Println("  - Large: 1200x800 (fit)")
	fmt.Println("  - Original: preserved as-is")
	fmt.Println()
	fmt.Println("Note: 'fit' means the image is resized to fit within the dimensions")
	fmt.Println("      while maintaining aspect ratio")
	fmt.Println()

	fmt.Println("=== End of Examples ===")
}
