package workers

import (
	"context"
	"log"
	"time"

	"biotak-go-backend/internal/services"
)

// NewsletterWorker handles periodic newsletter sending
type NewsletterWorker struct {
	service  *services.NewsletterService
	schedule string // Cron schedule (e.g., "0 9 * * *" for 9 AM daily)
	stopChan chan struct{}
	doneChan chan struct{}
}

// NewNewsletterWorker creates a new newsletter worker
func NewNewsletterWorker(service *services.NewsletterService, schedule string) *NewsletterWorker {
	return &NewsletterWorker{
		service:  service,
		schedule: schedule,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}
}

// Start begins the worker's periodic execution
func (w *NewsletterWorker) Start() {
	log.Printf("[NewsletterWorker] Starting worker with schedule: %s", w.schedule)
	
	go func() {
		defer close(w.doneChan)
		
		// Calculate next run time
		nextRun := w.calculateNextRun()
		log.Printf("[NewsletterWorker] Next run scheduled for: %s", nextRun.Format("2006-01-02 15:04:05"))
		
		for {
			// Wait until next run time or stop signal
			waitDuration := time.Until(nextRun)
			
			select {
			case <-time.After(waitDuration):
				// Execute the newsletter sending
				w.runWithRetry()
				
				// Calculate next run time
				nextRun = w.calculateNextRun()
				log.Printf("[NewsletterWorker] Next run scheduled for: %s", nextRun.Format("2006-01-02 15:04:05"))
				
			case <-w.stopChan:
				log.Println("[NewsletterWorker] Stopping worker")
				return
			}
		}
	}()
}

// Stop gracefully stops the worker
func (w *NewsletterWorker) Stop() {
	log.Println("[NewsletterWorker] Stop signal received")
	close(w.stopChan)
	<-w.doneChan
	log.Println("[NewsletterWorker] Worker stopped")
}

// calculateNextRun calculates the next execution time based on schedule
// For simplicity, this implementation runs daily at 9 AM
// A production implementation would use a proper cron parser
func (w *NewsletterWorker) calculateNextRun() time.Time {
	now := time.Now()
	
	// Schedule for 9 AM today
	nextRun := time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, now.Location())
	
	// If 9 AM has already passed today, schedule for tomorrow
	if nextRun.Before(now) {
		nextRun = nextRun.Add(24 * time.Hour)
	}
	
	return nextRun
}

// runWithRetry executes the newsletter sending with retry logic
func (w *NewsletterWorker) runWithRetry() {
	const batchSize = 100
	
	ctx := context.Background()
	startTime := time.Now()
	
	log.Println("[NewsletterWorker] Starting newsletter sending")
	
	config := DefaultRetryConfig("NewsletterWorker", "SendNewsletters")
	
	var successCount, failureCount, totalCount int
	
	err := RetryWithExponentialBackoff(config, func() error {
		// Fetch active subscribers
		subscribers, err := w.service.GetActiveSubscribers(ctx)
		if err != nil {
			return err
		}
		
		if len(subscribers) == 0 {
			log.Println("[NewsletterWorker] No active subscribers found")
			return nil
		}
		
		totalCount = len(subscribers)
		
		// Send newsletters in batches
		successCount, failureCount, err = w.service.SendNewsletterBatch(ctx, subscribers, batchSize)
		return err
	})
	
	if err == nil {
		duration := time.Since(startTime)
		log.Printf("[NewsletterWorker] Newsletter sending completed successfully (took %v)", duration)
		log.Printf("[NewsletterWorker] Results: %d sent, %d failed out of %d total subscribers", 
			successCount, failureCount, totalCount)
		
		// Track delivery status
		w.trackDeliveryStatus(successCount, failureCount, totalCount)
	} else {
		duration := time.Since(startTime)
		log.Printf("[NewsletterWorker] Failed to send newsletters (took %v): %v", duration, err)
	}
}

// trackDeliveryStatus logs delivery statistics
// In a production system, this would store metrics in a database or monitoring system
func (w *NewsletterWorker) trackDeliveryStatus(successCount, failureCount, totalCount int) {
	successRate := float64(successCount) / float64(totalCount) * 100
	
	log.Printf("[NewsletterWorker] Delivery Statistics:")
	log.Printf("  - Total Subscribers: %d", totalCount)
	log.Printf("  - Successfully Sent: %d", successCount)
	log.Printf("  - Failed: %d", failureCount)
	log.Printf("  - Success Rate: %.2f%%", successRate)
	
	// TODO: Store these metrics in a database or send to monitoring system
}

// StartNewsletterWorker is a convenience function to start the worker
func StartNewsletterWorker(service *services.NewsletterService, schedule string) *NewsletterWorker {
	worker := NewNewsletterWorker(service, schedule)
	worker.Start()
	return worker
}
