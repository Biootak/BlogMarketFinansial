package workers

import (
	"context"
	"fmt"
	"log"
	"time"

	"biotak-go-backend/internal/services"
)

// SitemapWorker handles periodic sitemap generation
type SitemapWorker struct {
	service  *services.SitemapService
	interval time.Duration
	stopChan chan struct{}
	doneChan chan struct{}
}

// NewSitemapWorker creates a new sitemap worker
func NewSitemapWorker(service *services.SitemapService, interval time.Duration) *SitemapWorker {
	return &SitemapWorker{
		service:  service,
		interval: interval,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}
}

// Start begins the worker's periodic execution
func (w *SitemapWorker) Start() {
	log.Printf("[SitemapWorker] Starting worker with interval: %v", w.interval)
	
	// Run immediately on start
	w.runWithRetry()
	
	// Create ticker for periodic execution
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	
	go func() {
		defer close(w.doneChan)
		
		for {
			select {
			case <-ticker.C:
				w.runWithRetry()
			case <-w.stopChan:
				log.Println("[SitemapWorker] Stopping worker")
				return
			}
		}
	}()
}

// Stop gracefully stops the worker
func (w *SitemapWorker) Stop() {
	log.Println("[SitemapWorker] Stop signal received")
	close(w.stopChan)
	<-w.doneChan
	log.Println("[SitemapWorker] Worker stopped")
}

// runWithRetry executes the sitemap generation with retry logic
func (w *SitemapWorker) runWithRetry() {
	ctx := context.Background()
	startTime := time.Now()
	
	log.Println("[SitemapWorker] Starting sitemap generation")
	
	config := DefaultRetryConfig("SitemapWorker", "GenerateSitemap")
	
	var sitemapSize int
	
	err := RetryWithExponentialBackoff(config, func() error {
		// Generate sitemap
		sitemapData, err := w.service.GenerateSitemap(ctx)
		if err != nil {
			return err
		}
		
		sitemapSize = len(sitemapData)
		
		// Upload sitemap to S3
		filename := fmt.Sprintf("sitemap-%s.xml", time.Now().Format("2006-01-02"))
		return w.service.SaveSitemapToFile(ctx, sitemapData, filename)
	})
	
	if err == nil {
		duration := time.Since(startTime)
		log.Printf("[SitemapWorker] Successfully generated and uploaded sitemap (took %v)", duration)
		log.Printf("[SitemapWorker] Sitemap size: %d bytes", sitemapSize)
	} else {
		duration := time.Since(startTime)
		log.Printf("[SitemapWorker] Failed to generate sitemap (took %v): %v", duration, err)
	}
}

// StartSitemapWorker is a convenience function to start the worker
func StartSitemapWorker(service *services.SitemapService, interval time.Duration) *SitemapWorker {
	worker := NewSitemapWorker(service, interval)
	worker.Start()
	return worker
}
