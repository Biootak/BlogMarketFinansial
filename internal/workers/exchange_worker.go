package workers

import (
	"context"
	"log"
	"time"

	"biotak-go-backend/internal/services"
)

// ExchangeRateWorker handles periodic fetching of exchange rates
type ExchangeRateWorker struct {
	service  *services.ExchangeRateService
	interval time.Duration
	stopChan chan struct{}
	doneChan chan struct{}
}

// NewExchangeRateWorker creates a new exchange rate worker
func NewExchangeRateWorker(service *services.ExchangeRateService, interval time.Duration) *ExchangeRateWorker {
	return &ExchangeRateWorker{
		service:  service,
		interval: interval,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}
}

// Start begins the worker's periodic execution
func (w *ExchangeRateWorker) Start() {
	log.Printf("[ExchangeRateWorker] Starting worker with interval: %v", w.interval)
	
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
				log.Println("[ExchangeRateWorker] Stopping worker")
				return
			}
		}
	}()
}

// Stop gracefully stops the worker
func (w *ExchangeRateWorker) Stop() {
	log.Println("[ExchangeRateWorker] Stop signal received")
	close(w.stopChan)
	<-w.doneChan
	log.Println("[ExchangeRateWorker] Worker stopped")
}

// runWithRetry executes the fetch operation with retry logic
func (w *ExchangeRateWorker) runWithRetry() {
	const maxRetries = 3
	const retryDelay = 10 * time.Second
	
	ctx := context.Background()
	startTime := time.Now()
	
	log.Println("[ExchangeRateWorker] Starting exchange rate fetch")
	
	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		err := w.service.FetchRates(ctx)
		if err == nil {
			duration := time.Since(startTime)
			log.Printf("[ExchangeRateWorker] Successfully fetched exchange rates (took %v)", duration)
			return
		}
		
		lastErr = err
		log.Printf("[ExchangeRateWorker] Attempt %d/%d failed: %v", attempt, maxRetries, err)
		
		// Don't sleep after the last attempt
		if attempt < maxRetries {
			log.Printf("[ExchangeRateWorker] Retrying in %v...", retryDelay)
			time.Sleep(retryDelay)
		}
	}
	
	// All retries failed
	duration := time.Since(startTime)
	log.Printf("[ExchangeRateWorker] Failed to fetch exchange rates after %d attempts (took %v): %v", 
		maxRetries, duration, lastErr)
}

// StartExchangeRateWorker is a convenience function to start the worker
// This function blocks until the worker is stopped
func StartExchangeRateWorker(service *services.ExchangeRateService, interval time.Duration) *ExchangeRateWorker {
	worker := NewExchangeRateWorker(service, interval)
	worker.Start()
	return worker
}
