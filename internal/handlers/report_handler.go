package handlers

import (
	"net/http"
	"time"

	"biotak-go-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// ReportHandler handles report-related HTTP requests
type ReportHandler struct {
	reportService *services.ReportService
}

// NewReportHandler creates a new report handler
func NewReportHandler(reportService *services.ReportService) *ReportHandler {
	return &ReportHandler{
		reportService: reportService,
	}
}

// GetUserActivityReport handles GET /api/v1/reports/user-activity
// @Summary Get user activity report
// @Description Generate a report of user activity for a specified time period
// @Tags reports
// @Accept json
// @Produce json
// @Param from query string true "Start date (RFC3339 format)"
// @Param to query string true "End date (RFC3339 format)"
// @Param async query boolean false "Generate report asynchronously"
// @Success 200 {object} services.UserActivityReport
// @Success 202 {object} map[string]string "Async job created"
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/reports/user-activity [get]
func (h *ReportHandler) GetUserActivityReport(c *gin.Context) {
	// Parse query parameters
	fromStr := c.Query("from")
	toStr := c.Query("to")
	async := c.Query("async") == "true"

	if fromStr == "" || toStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "from and to parameters are required",
			},
		})
		return
	}

	// Parse dates
	from, err := time.Parse(time.RFC3339, fromStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "invalid from date format, use RFC3339",
				"details": map[string]string{"field": "from"},
			},
		})
		return
	}

	to, err := time.Parse(time.RFC3339, toStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "invalid to date format, use RFC3339",
				"details": map[string]string{"field": "to"},
			},
		})
		return
	}

	// Validate date range
	if to.Before(from) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "to date must be after from date",
			},
		})
		return
	}

	// Check if async processing is requested
	if async {
		jobID, err := h.reportService.GenerateUserActivityReportAsync(c.Request.Context(), from, to)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": map[string]interface{}{
					"code":    "INTERNAL_ERROR",
					"message": "failed to create async job",
				},
			})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{
			"job_id":  jobID,
			"status":  "pending",
			"message": "Report generation started",
		})
		return
	}

	// Generate report synchronously
	report, err := h.reportService.GenerateUserActivityReport(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "INTERNAL_ERROR",
				"message": "failed to generate report",
			},
		})
		return
	}

	c.JSON(http.StatusOK, report)
}

// GetContentReport handles GET /api/v1/reports/content
// @Summary Get content report
// @Description Generate a report of content statistics for a specified time period
// @Tags reports
// @Accept json
// @Produce json
// @Param from query string true "Start date (RFC3339 format)"
// @Param to query string true "End date (RFC3339 format)"
// @Success 200 {object} services.ContentReport
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/reports/content [get]
func (h *ReportHandler) GetContentReport(c *gin.Context) {
	// Parse query parameters
	fromStr := c.Query("from")
	toStr := c.Query("to")

	if fromStr == "" || toStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "from and to parameters are required",
			},
		})
		return
	}

	// Parse dates
	from, err := time.Parse(time.RFC3339, fromStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "invalid from date format, use RFC3339",
				"details": map[string]string{"field": "from"},
			},
		})
		return
	}

	to, err := time.Parse(time.RFC3339, toStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "invalid to date format, use RFC3339",
				"details": map[string]string{"field": "to"},
			},
		})
		return
	}

	// Validate date range
	if to.Before(from) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "to date must be after from date",
			},
		})
		return
	}

	// Generate report
	report, err := h.reportService.GenerateContentReport(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "INTERNAL_ERROR",
				"message": "failed to generate report",
			},
		})
		return
	}

	c.JSON(http.StatusOK, report)
}

// GetSystemHealthReport handles GET /api/v1/reports/system-health
// @Summary Get system health report
// @Description Generate a report of system health metrics
// @Tags reports
// @Accept json
// @Produce json
// @Success 200 {object} services.SystemHealthReport
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/reports/system-health [get]
func (h *ReportHandler) GetSystemHealthReport(c *gin.Context) {
	// Generate report
	report, err := h.reportService.GenerateSystemHealthReport(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "INTERNAL_ERROR",
				"message": "failed to generate report",
			},
		})
		return
	}

	c.JSON(http.StatusOK, report)
}

// GetJobStatus handles GET /api/v1/reports/jobs/:jobId
// @Summary Get report job status
// @Description Check the status of an async report generation job
// @Tags reports
// @Accept json
// @Produce json
// @Param jobId path string true "Job ID"
// @Success 200 {object} services.ReportJob
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/reports/jobs/{jobId} [get]
func (h *ReportHandler) GetJobStatus(c *gin.Context) {
	jobID := c.Param("jobId")

	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": map[string]interface{}{
				"code":    "VALIDATION_ERROR",
				"message": "job ID is required",
			},
		})
		return
	}

	// Get job status
	job, err := h.reportService.GetJobStatus(c.Request.Context(), jobID)
	if err != nil {
		if err.Error() == "job not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": map[string]interface{}{
					"code":    "NOT_FOUND",
					"message": "job not found",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": map[string]interface{}{
				"code":    "INTERNAL_ERROR",
				"message": "failed to get job status",
			},
		})
		return
	}

	// If job is completed, include result
	if job.Status == "completed" {
		result, err := h.reportService.GetJobResult(c.Request.Context(), jobID)
		if err == nil {
			c.JSON(http.StatusOK, gin.H{
				"job":    job,
				"result": result,
			})
			return
		}
	}

	c.JSON(http.StatusOK, job)
}
