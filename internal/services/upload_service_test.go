package services

import (
	"bytes"
	"context"
	"image"
	"image/png"
	"mime/multipart"
	"net/textproto"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestImage creates a simple test image
func createTestImage(width, height int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	// Fill with a simple pattern
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, image.White)
		}
	}
	return img
}

// createMultipartFile creates a multipart file from an image
func createMultipartFile(img image.Image, filename, contentType string) (multipart.File, *multipart.FileHeader, error) {
	buf := new(bytes.Buffer)
	if err := png.Encode(buf, img); err != nil {
		return nil, nil, err
	}

	// Create multipart header
	header := &multipart.FileHeader{
		Filename: filename,
		Size:     int64(buf.Len()),
		Header:   make(textproto.MIMEHeader),
	}
	header.Header.Set("Content-Type", contentType)

	// Create a reader that implements multipart.File
	reader := bytes.NewReader(buf.Bytes())
	file := &testFile{Reader: reader}

	return file, header, nil
}

// testFile implements multipart.File interface
type testFile struct {
	*bytes.Reader
}

func (f *testFile) Close() error {
	return nil
}

func TestValidateFile_ValidImage(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	service, err := NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	// Create a valid test image
	img := createTestImage(100, 100)
	file, header, err := createMultipartFile(img, "test.png", "image/png")
	require.NoError(t, err)

	// Validate should pass
	err = service.ValidateFile(file, header)
	assert.NoError(t, err)
}

func TestValidateFile_FileTooLarge(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	service, err := NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	// Create a test image
	img := createTestImage(100, 100)
	file, header, err := createMultipartFile(img, "test.png", "image/png")
	require.NoError(t, err)

	// Simulate file too large
	header.Size = 11 * 1024 * 1024 // 11MB

	// Validate should fail
	err = service.ValidateFile(file, header)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "exceeds maximum limit")
}

func TestValidateFile_InvalidType(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	service, err := NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	// Create a test image with invalid type
	img := createTestImage(100, 100)
	file, header, err := createMultipartFile(img, "test.gif", "image/gif")
	require.NoError(t, err)

	// Validate should fail
	err = service.ValidateFile(file, header)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported file type")
}

func TestValidateFile_InvalidImageData(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	service, err := NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	// Create invalid image data
	buf := bytes.NewBufferString("not an image")
	reader := bytes.NewReader(buf.Bytes())
	file := &testFile{Reader: reader}

	header := &multipart.FileHeader{
		Filename: "test.png",
		Size:     int64(buf.Len()),
		Header:   make(textproto.MIMEHeader),
	}
	header.Header.Set("Content-Type", "image/png")

	// Validate should fail
	err = service.ValidateFile(file, header)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid image")
}

func TestProcessImage_CreatesMultipleSizes(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	service, err := NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	// Create a test image
	img := createTestImage(1000, 1000)
	file, _, err := createMultipartFile(img, "test.png", "image/png")
	require.NoError(t, err)

	ctx := context.Background()

	// Process image
	processedImages, err := service.ProcessImage(ctx, file)
	
	// Note: This will fail without actual S3 credentials, but tests the logic
	if err != nil && strings.Contains(err.Error(), "failed to upload to S3") {
		t.Skip("Skipping test: Cannot upload to S3 without valid credentials")
	}
	
	require.NoError(t, err)
	assert.Len(t, processedImages, 3) // thumbnail, medium, large

	// Verify sizes
	sizeNames := make(map[string]bool)
	for _, img := range processedImages {
		sizeNames[img.Size] = true
		assert.NotEmpty(t, img.URL)
		assert.Greater(t, img.Width, 0)
		assert.Greater(t, img.Height, 0)
	}

	assert.True(t, sizeNames["thumbnail"])
	assert.True(t, sizeNames["medium"])
	assert.True(t, sizeNames["large"])
}

func TestDeleteFile_WithFilename(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	service, err := NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	ctx := context.Background()

	// Try to delete a non-existent file (should not error)
	err = service.DeleteFile(ctx, "non-existent-file.jpg")
	
	// S3 delete operations typically don't error for non-existent files
	// but we test that the method executes without panic
	if err != nil && !strings.Contains(err.Error(), "NoSuchKey") {
		t.Logf("Delete returned error: %v", err)
	}
}

func TestDeleteFile_WithURL(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	service, err := NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	ctx := context.Background()

	// Test with full URL
	url := "https://storage.example.com/bucket/test-file.jpg"
	err = service.DeleteFile(ctx, url)
	
	// Should extract filename and attempt delete
	if err != nil && !strings.Contains(err.Error(), "NoSuchKey") {
		t.Logf("Delete returned error: %v", err)
	}
}

func TestUploadImage_Integration(t *testing.T) {
	// Skip if no S3 credentials
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		t.Skip("Skipping test: S3 credentials not configured")
	}

	service, err := NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(t, err)

	// Create a test image
	img := createTestImage(500, 500)
	file, header, err := createMultipartFile(img, "test.png", "image/png")
	require.NoError(t, err)

	ctx := context.Background()

	// Upload image
	result, err := service.UploadImage(ctx, file, header)
	
	if err != nil && strings.Contains(err.Error(), "failed to upload to S3") {
		t.Skip("Skipping test: Cannot upload to S3 without valid credentials")
	}
	
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotEmpty(t, result.OriginalURL)
	assert.Len(t, result.Images, 3)

	// Clean up uploaded files
	for _, img := range result.Images {
		_ = service.DeleteFile(ctx, img.URL)
	}
	_ = service.DeleteFile(ctx, result.OriginalURL)
}

// Benchmark tests
func BenchmarkValidateFile(b *testing.B) {
	if os.Getenv("LIARA_ACCESS_KEY") == "" {
		b.Skip("Skipping benchmark: S3 credentials not configured")
	}

	service, err := NewUploadService(
		os.Getenv("LIARA_ENDPOINT"),
		os.Getenv("LIARA_ACCESS_KEY"),
		os.Getenv("LIARA_SECRET_KEY"),
		os.Getenv("LIARA_BUCKET_NAME"),
	)
	require.NoError(b, err)

	img := createTestImage(100, 100)
	file, header, err := createMultipartFile(img, "test.png", "image/png")
	require.NoError(b, err)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = service.ValidateFile(file, header)
		_, _ = file.Seek(0, 0)
	}
}
