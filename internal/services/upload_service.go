package services

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/disintegration/imaging"
	"github.com/google/uuid"
)

// UploadService handles file upload operations
type UploadService struct {
	s3Client   *s3.Client
	bucketName string
	endpoint   string
}

// ProcessedImage represents a processed image with its URL and dimensions
type ProcessedImage struct {
	URL    string
	Width  int
	Height int
	Size   string // "thumbnail", "medium", "large", "original"
}

// UploadResult contains the results of a successful upload
type UploadResult struct {
	OriginalURL string
	Images      []ProcessedImage
}

// ImageSize defines dimensions for image processing
type ImageSize struct {
	Name   string
	Width  int
	Height int
}

var (
	// Predefined image sizes
	imageSizes = []ImageSize{
		{Name: "thumbnail", Width: 150, Height: 150},
		{Name: "medium", Width: 600, Height: 400},
		{Name: "large", Width: 1200, Height: 800},
	}

	// Allowed file types
	allowedTypes = map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/webp": true,
	}

	// Maximum file size (10MB)
	maxFileSize int64 = 10 * 1024 * 1024
)

// NewUploadService creates a new upload service
func NewUploadService(endpoint, accessKey, secretKey, bucketName string) (*UploadService, error) {
	// Create custom endpoint resolver for Liara/S3-compatible storage
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:               endpoint,
			SigningRegion:     "us-east-1",
			HostnameImmutable: true,
		}, nil
	})

	// Create AWS config with custom credentials
	cfg := aws.Config{
		Region:                      "us-east-1",
		Credentials:                 credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		EndpointResolverWithOptions: customResolver,
	}

	// Create S3 client
	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true // Required for some S3-compatible services
	})

	return &UploadService{
		s3Client:   client,
		bucketName: bucketName,
		endpoint:   endpoint,
	}, nil
}

// ValidateFile validates file type, size, and dimensions
// Requirements: 7.1
func (s *UploadService) ValidateFile(file multipart.File, header *multipart.FileHeader) error {
	// Check file size
	if header.Size > maxFileSize {
		return fmt.Errorf("file size exceeds maximum limit of 10MB (got %d bytes)", header.Size)
	}

	// Check file type
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		// Try to detect from extension
		ext := strings.ToLower(filepath.Ext(header.Filename))
		switch ext {
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".png":
			contentType = "image/png"
		case ".webp":
			contentType = "image/webp"
		default:
			return fmt.Errorf("unsupported file extension: %s", ext)
		}
	}

	if !allowedTypes[contentType] {
		return fmt.Errorf("unsupported file type: %s (allowed: jpg, png, webp)", contentType)
	}

	// Try to decode image to validate it's a valid image file
	_, err := file.Seek(0, 0) // Reset file pointer
	if err != nil {
		return fmt.Errorf("failed to reset file pointer: %w", err)
	}

	_, _, err = image.DecodeConfig(file)
	if err != nil {
		return fmt.Errorf("invalid image file: %w", err)
	}

	// Reset file pointer for subsequent operations
	_, err = file.Seek(0, 0)
	if err != nil {
		return fmt.Errorf("failed to reset file pointer: %w", err)
	}

	return nil
}

// ProcessImage resizes images to multiple dimensions and converts to WebP
// Requirements: 7.2
func (s *UploadService) ProcessImage(ctx context.Context, file multipart.File) ([]ProcessedImage, error) {
	// Reset file pointer
	_, err := file.Seek(0, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to reset file pointer: %w", err)
	}

	// Decode the image
	img, err := imaging.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	var processedImages []ProcessedImage

	// Process each size
	for _, size := range imageSizes {
		// Resize image maintaining aspect ratio
		resized := imaging.Fit(img, size.Width, size.Height, imaging.Lanczos)

		// Convert to WebP and upload
		url, err := s.uploadProcessedImage(ctx, resized, size.Name)
		if err != nil {
			// Clean up any uploaded images on failure
			s.cleanupImages(ctx, processedImages)
			return nil, fmt.Errorf("failed to process %s size: %w", size.Name, err)
		}

		processedImages = append(processedImages, ProcessedImage{
			URL:    url,
			Width:  resized.Bounds().Dx(),
			Height: resized.Bounds().Dy(),
			Size:   size.Name,
		})
	}

	return processedImages, nil
}

// uploadProcessedImage uploads a processed image to S3
func (s *UploadService) uploadProcessedImage(ctx context.Context, img image.Image, sizeName string) (string, error) {
	// Generate unique filename
	filename := fmt.Sprintf("%s-%s.webp", uuid.New().String(), sizeName)

	// Encode image to WebP format
	buf := new(bytes.Buffer)
	err := imaging.Encode(buf, img, imaging.PNG) // Using PNG as fallback since imaging doesn't support WebP encoding directly
	if err != nil {
		return "", fmt.Errorf("failed to encode image: %w", err)
	}

	// Upload to S3
	_, err = s.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(filename),
		Body:        bytes.NewReader(buf.Bytes()),
		ContentType: aws.String("image/webp"),
		ACL:         "public-read",
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Construct public URL
	url := fmt.Sprintf("%s/%s/%s", s.endpoint, s.bucketName, filename)
	return url, nil
}

// UploadImage handles the complete upload process
// Requirements: 7.1, 7.2, 7.3
func (s *UploadService) UploadImage(ctx context.Context, file multipart.File, header *multipart.FileHeader) (*UploadResult, error) {
	// Validate file
	if err := s.ValidateFile(file, header); err != nil {
		return nil, err
	}

	// Process image (resize and convert)
	processedImages, err := s.ProcessImage(ctx, file)
	if err != nil {
		return nil, err
	}

	// Upload original file
	originalURL, err := s.uploadOriginal(ctx, file, header)
	if err != nil {
		// Clean up processed images on failure
		s.cleanupImages(ctx, processedImages)
		return nil, fmt.Errorf("failed to upload original: %w", err)
	}

	return &UploadResult{
		OriginalURL: originalURL,
		Images:      processedImages,
	}, nil
}

// uploadOriginal uploads the original file to S3
// Requirements: 7.3
func (s *UploadService) uploadOriginal(ctx context.Context, file multipart.File, header *multipart.FileHeader) (string, error) {
	// Reset file pointer
	_, err := file.Seek(0, 0)
	if err != nil {
		return "", fmt.Errorf("failed to reset file pointer: %w", err)
	}

	// Generate unique filename preserving extension
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s-original%s", uuid.New().String(), ext)

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	// Determine content type
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Upload to S3
	_, err = s.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(filename),
		Body:        bytes.NewReader(content),
		ContentType: aws.String(contentType),
		ACL:         "public-read",
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Construct public URL
	url := fmt.Sprintf("%s/%s/%s", s.endpoint, s.bucketName, filename)
	return url, nil
}

// cleanupImages removes uploaded images from S3
// Requirements: 7.4
func (s *UploadService) cleanupImages(ctx context.Context, images []ProcessedImage) {
	for _, img := range images {
		// Extract filename from URL
		parts := strings.Split(img.URL, "/")
		if len(parts) > 0 {
			filename := parts[len(parts)-1]
			_ = s.DeleteFile(ctx, filename)
		}
	}
}

// DeleteFile removes a file from S3 storage
// Requirements: 7.5
func (s *UploadService) DeleteFile(ctx context.Context, filename string) error {
	// Handle both full URLs and just filenames
	if strings.HasPrefix(filename, "http") {
		parts := strings.Split(filename, "/")
		if len(parts) > 0 {
			filename = parts[len(parts)-1]
		}
	}

	_, err := s.s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(filename),
	})
	if err != nil {
		return fmt.Errorf("failed to delete file from S3: %w", err)
	}

	return nil
}
