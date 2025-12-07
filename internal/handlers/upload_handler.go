package handlers

import (
	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

// UploadHandler handles file upload endpoints
type UploadHandler struct {
	uploadService *services.UploadService
}

// NewUploadHandler creates a new upload handler
func NewUploadHandler(uploadService *services.UploadService) *UploadHandler {
	return &UploadHandler{
		uploadService: uploadService,
	}
}

// UploadResponse represents the upload API response (compatible with Next.js format)
type UploadResponse struct {
	Success     bool                          `json:"success"`
	OriginalURL string                        `json:"originalUrl"`
	Images      []services.ProcessedImage     `json:"images"`
	Message     string                        `json:"message"`
}

// DeleteResponse represents the delete API response
type DeleteResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// UploadFile handles POST /api/v1/upload
// @Summary Upload a file
// @Description Upload an image file with automatic processing and resizing
// @Tags upload
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "Image file to upload"
// @Param Authorization header string true "Bearer token"
// @Success 200 {object} UploadResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 413 {object} middleware.ErrorResponse
// @Failure 429 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/upload [post]
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
func (h *UploadHandler) UploadFile(c *gin.Context) {
	// Get file from form data
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		middleware.BadRequest(c, "No file provided", map[string]interface{}{
			"error": err.Error(),
			"field": "file",
		})
		return
	}
	defer file.Close()

	// Upload and process the image
	result, err := h.uploadService.UploadImage(c.Request.Context(), file, header)
	if err != nil {
		errMsg := err.Error()
		
		// Check if it's a validation error
		isValidationError := false
		if len(errMsg) >= len("file size exceeds") && errMsg[:len("file size exceeds")] == "file size exceeds" {
			isValidationError = true
		} else if len(errMsg) >= len("unsupported file") && errMsg[:len("unsupported file")] == "unsupported file" {
			isValidationError = true
		} else if len(errMsg) >= len("invalid image") && errMsg[:len("invalid image")] == "invalid image" {
			isValidationError = true
		}
		
		if isValidationError {
			middleware.ValidationError(c, errMsg, map[string]interface{}{
				"field": "file",
			})
			return
		}

		// Otherwise it's a server error
		middleware.InternalServerError(c, "Failed to upload file")
		return
	}

	// Build response (compatible with Next.js format)
	response := UploadResponse{
		Success:     true,
		OriginalURL: result.OriginalURL,
		Images:      result.Images,
		Message:     "File uploaded successfully",
	}

	c.JSON(http.StatusOK, response)
}

// DeleteFile handles DELETE /api/v1/upload/:filename
// @Summary Delete a file
// @Description Delete a file from storage
// @Tags upload
// @Produce json
// @Param filename path string true "Filename or URL to delete"
// @Param Authorization header string true "Bearer token"
// @Success 200 {object} DeleteResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/upload/{filename} [delete]
// Requirements: 7.5
func (h *UploadHandler) DeleteFile(c *gin.Context) {
	// Get filename from URL parameter
	filename := c.Param("filename")
	if filename == "" {
		middleware.BadRequest(c, "Filename is required", map[string]interface{}{
			"field": "filename",
		})
		return
	}

	// Delete the file
	err := h.uploadService.DeleteFile(c.Request.Context(), filename)
	if err != nil {
		middleware.InternalServerError(c, "Failed to delete file")
		return
	}

	// Build response
	response := DeleteResponse{
		Success: true,
		Message: "File deleted successfully",
	}

	c.JSON(http.StatusOK, response)
}
