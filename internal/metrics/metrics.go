package metrics

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// HTTP metrics
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	// Database metrics
	dbQueryTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "db_queries_total",
			Help: "Total number of database queries",
		},
		[]string{"operation"},
	)

	dbQueryDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "db_query_duration_seconds",
			Help:    "Database query duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation"},
	)

	// Cache metrics
	cacheHitsTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		},
	)

	cacheMissesTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		},
	)

	// Background job metrics
	backgroundJobsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "background_jobs_total",
			Help: "Total number of background jobs executed",
		},
		[]string{"job_name", "status"},
	)

	backgroundJobDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "background_job_duration_seconds",
			Help:    "Background job execution duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"job_name"},
	)
)

func init() {
	// Register all metrics
	prometheus.MustRegister(httpRequestsTotal)
	prometheus.MustRegister(httpRequestDuration)
	prometheus.MustRegister(dbQueryTotal)
	prometheus.MustRegister(dbQueryDuration)
	prometheus.MustRegister(cacheHitsTotal)
	prometheus.MustRegister(cacheMissesTotal)
	prometheus.MustRegister(backgroundJobsTotal)
	prometheus.MustRegister(backgroundJobDuration)
}

// PrometheusMiddleware creates a middleware for collecting HTTP metrics
func PrometheusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Record metrics
		duration := time.Since(start).Seconds()
		status := c.Writer.Status()
		method := c.Request.Method
		path := c.FullPath()

		// Use route pattern instead of actual path to avoid high cardinality
		if path == "" {
			path = "unknown"
		}

		statusStr := fmt.Sprintf("%d", status)
		httpRequestsTotal.WithLabelValues(method, path, statusStr).Inc()
		httpRequestDuration.WithLabelValues(method, path, statusStr).Observe(duration)
	}
}

// PrometheusHandler returns a Gin handler for the /metrics endpoint
func PrometheusHandler() gin.HandlerFunc {
	h := promhttp.Handler()
	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
}

// RecordDBQuery records a database query metric
func RecordDBQuery(operation string, duration time.Duration) {
	dbQueryTotal.WithLabelValues(operation).Inc()
	dbQueryDuration.WithLabelValues(operation).Observe(duration.Seconds())
}

// RecordCacheHit records a cache hit
func RecordCacheHit() {
	cacheHitsTotal.Inc()
}

// RecordCacheMiss records a cache miss
func RecordCacheMiss() {
	cacheMissesTotal.Inc()
}

// RecordBackgroundJob records a background job execution
func RecordBackgroundJob(jobName string, duration time.Duration, success bool) {
	status := "success"
	if !success {
		status = "failure"
	}

	backgroundJobsTotal.WithLabelValues(jobName, status).Inc()
	backgroundJobDuration.WithLabelValues(jobName).Observe(duration.Seconds())
}
