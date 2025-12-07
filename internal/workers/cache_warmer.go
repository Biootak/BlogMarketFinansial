package workers

import (
	"context"
	"log"
	"time"

	"biotak-go-backend/internal/services"
)

// CacheWarmerWorker handles periodic cache warming
type CacheWarmerWorker struct {
	cacheService    *services.CacheWarmerService
	exchangeService *services.ExchangeRateService
	interval        time.Duration
	stopChan        chan struct{}
	doneChan        chan struct{}
}

// NewCacheWarmerWorker creates a new cache warmer worker
func NewCacheWarmerWorker(
	cacheService *services.CacheWarmerService,
	exchangeService *services.ExchangeRateService,
	interval time.Duration,
) *CacheWarmerWorker {
	return &CacheWarmerWorker{
		cacheService:    cacheService,
		exchangeService: exchangeService,
		interval:        interval,
		stopChan:        make(chan struct{}),
		doneChan:        make(chan struct{}),
	}
}

// Start begins the worker's periodic execution
func (w *CacheWarmerWorker) Start() {
	log.Printf("[CacheWarmerWorker] Starting worker with interval: %v", w.interval)
	
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
				log.Println("[CacheWarmerWorker] Stopping worker")
				return
			}
		}
	}()
}

// Stop gracefully stops the worker
func (w *CacheWarmerWorker) Stop() {
	log.Println("[CacheWarmerWorker] Stop signal received")
	close(w.stopChan)
	<-w.doneChan
	log.Println("[CacheWarmerWorker] Worker stopped")
}

// runWithRetry executes the cache warming with retry logic
func (w *CacheWarmerWorker) runWithRetry() {
	ctx := context.Background()
	startTime := time.Now()
	
	log.Println("[CacheWarmerWorker] Starting cache warming")
	
	config := DefaultRetryConfig("CacheWarmerWorker", "WarmCaches")
	
	err := RetryWithExponentialBackoff(config, func() error {
		return w.warmAllCaches(ctx)
	})
	
	if err == nil {
		duration := time.Since(startTime)
		log.Printf("[CacheWarmerWorker] Successfully warmed all caches (took %v)", duration)
		
		// Verify cache data
		w.cacheService.VerifyCacheData(ctx)
	} else {
		duration := time.Since(startTime)
		log.Printf("[CacheWarmerWorker] Failed to warm caches (took %v): %v", duration, err)
	}
}

// warmAllCaches warms all cache types
func (w *CacheWarmerWorker) warmAllCaches(ctx context.Context) error {
	// Warm popular posts (top 100)
	if err := w.cacheService.WarmPopularPosts(ctx, 100); err != nil {
		return err
	}
	
	// Warm categories
	if err := w.cacheService.WarmCategories(ctx); err != nil {
		return err
	}
	
	// Warm tags
	if err := w.cacheService.WarmTags(ctx); err != nil {
		return err
	}
	
	// Warm exchange rates
	if err := w.cacheService.WarmExchangeRates(ctx, w.exchangeService); err != nil {
		return err
	}
	
	return nil
}

// StartCacheWarmerWorker is a convenience function to start the worker
func StartCacheWarmerWorker(
	cacheService *services.CacheWarmerService,
	exchangeService *services.ExchangeRateService,
	interval time.Duration,
) *CacheWarmerWorker {
	worker := NewCacheWarmerWorker(cacheService, exchangeService, interval)
	worker.Start()
	return worker
}
