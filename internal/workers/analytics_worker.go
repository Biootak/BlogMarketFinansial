package workers

import (
	"context"
	"log"
	"time"

	"biotak-go-backend/internal/services"
)

// AnalyticsWorker handles periodic analytics aggregation
type AnalyticsWorker struct {
	service  *services.AnalyticsService
	schedule string // Cron schedule (e.g., "0 2 * * *" for 2 AM daily)
	stopChan chan struct{}
	doneChan chan struct{}
}

// NewAnalyticsWorker creates a new analytics worker
func NewAnalyticsWorker(service *services.AnalyticsService, schedule string) *AnalyticsWorker {
	return &AnalyticsWorker{
		service:  service,
		schedule: schedule,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}
}

// Start begins the worker's periodic execution
func (w *AnalyticsWorker) Start() {
	log.Printf("[AnalyticsWorker] Starting worker with schedule: %s", w.schedule)
	
	go func() {
		defer close(w.doneChan)
		
		// Calculate next run time (2 AM)
		nextRun := w.calculateNextRun()
		log.Printf("[AnalyticsWorker] Next run scheduled for: %s", nextRun.Format("2006-01-02 15:04:05"))
		
		for {
			// Wait until next run time or stop signal
			waitDuration := time.Until(nextRun)
			
			select {
			case <-time.After(waitDuration):
				// Execute the analytics aggregation
				w.runWithRetry()
				
				// Calculate next run time
				nextRun = w.calculateNextRun()
				log.Printf("[AnalyticsWorker] Next run scheduled for: %s", nextRun.Format("2006-01-02 15:04:05"))
				
			case <-w.stopChan:
				log.Println("[AnalyticsWorker] Stopping worker")
				return
			}
		}
	}()
}

// Stop gracefully stops the worker
func (w *AnalyticsWorker) Stop() {
	log.Println("[AnalyticsWorker] Stop signal received")
	close(w.stopChan)
	<-w.doneChan
	log.Println("[AnalyticsWorker] Worker stopped")
}

// calculateNextRun calculates the next execution time
// Runs daily at 2 AM
func (w *AnalyticsWorker) calculateNextRun() time.Time {
	now := time.Now()
	
	// Schedule for 2 AM today
	nextRun := time.Date(now.Year(), now.Month(), now.Day(), 2, 0, 0, 0, now.Location())
	
	// If 2 AM has already passed today, schedule for tomorrow
	if nextRun.Before(now) {
		nextRun = nextRun.Add(24 * time.Hour)
	}
	
	return nextRun
}

// runWithRetry executes the analytics aggregation with retry logic
func (w *AnalyticsWorker) runWithRetry() {
	const daysToKeep = 90
	
	ctx := context.Background()
	startTime := time.Now()
	
	// Calculate statistics for yesterday
	yesterday := time.Now().AddDate(0, 0, -1)
	
	log.Printf("[AnalyticsWorker] Starting analytics aggregation for %s", yesterday.Format("2006-01-02"))
	
	config := DefaultRetryConfig("AnalyticsWorker", "AggregateStatistics")
	
	err := RetryWithExponentialBackoff(config, func() error {
		// Calculate daily statistics
		err := w.service.CalculateDailyStatistics(ctx, yesterday)
		if err != nil {
			return err
		}
		
		// Clear old raw data
		err = w.service.ClearOldRawData(ctx, daysToKeep)
		if err != nil {
			// Log error but don't fail the entire operation
			log.Printf("[AnalyticsWorker] Warning: Failed to clear old raw data: %v", err)
		}
		
		return nil
	})
	
	if err == nil {
		duration := time.Since(startTime)
		log.Printf("[AnalyticsWorker] Successfully completed analytics aggregation (took %v)", duration)
	} else {
		duration := time.Since(startTime)
		log.Printf("[AnalyticsWorker] Failed to aggregate analytics (took %v): %v", duration, err)
	}
}

// StartAnalyticsWorker is a convenience function to start the worker
func StartAnalyticsWorker(service *services.AnalyticsService, schedule string) *AnalyticsWorker {
	worker := NewAnalyticsWorker(service, schedule)
	worker.Start()
	return worker
}
