package workers

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/internal/services"

	"github.com/redis/go-redis/v9"
)

// WorkerManager manages all background workers
type WorkerManager struct {
	exchangeWorker    *ExchangeRateWorker
	newsletterWorker  *NewsletterWorker
	sitemapWorker     *SitemapWorker
	cacheWarmerWorker *CacheWarmerWorker
	analyticsWorker   *AnalyticsWorker
	
	stopChan chan struct{}
	wg       sync.WaitGroup
}

// WorkerConfig holds configuration for all workers
type WorkerConfig struct {
	ExchangeRateInterval time.Duration
	NewsletterSchedule   string
	SitemapInterval      time.Duration
	CacheWarmerInterval  time.Duration
	AnalyticsSchedule    string
}

// DefaultWorkerConfig returns default worker configuration
func DefaultWorkerConfig() WorkerConfig {
	return WorkerConfig{
		ExchangeRateInterval: 5 * time.Minute,
		NewsletterSchedule:   "0 9 * * *",  // 9 AM daily
		SitemapInterval:      1 * time.Hour,
		CacheWarmerInterval:  10 * time.Minute,
		AnalyticsSchedule:    "0 2 * * *",  // 2 AM daily
	}
}

// NewWorkerManager creates a new worker manager
func NewWorkerManager(
	client *ent.Client,
	redisClient *redis.Client,
	config WorkerConfig,
) *WorkerManager {
	// Initialize services
	exchangeService := services.NewExchangeRateService(client, redisClient)
	newsletterService := services.NewNewsletterService(client)
	sitemapService := services.NewSitemapService(client)
	cacheWarmerService := services.NewCacheWarmerService(client, redisClient)
	analyticsService := services.NewAnalyticsService(client)
	
	// Initialize workers
	exchangeWorker := NewExchangeRateWorker(exchangeService, config.ExchangeRateInterval)
	newsletterWorker := NewNewsletterWorker(newsletterService, config.NewsletterSchedule)
	sitemapWorker := NewSitemapWorker(sitemapService, config.SitemapInterval)
	cacheWarmerWorker := NewCacheWarmerWorker(cacheWarmerService, exchangeService, config.CacheWarmerInterval)
	analyticsWorker := NewAnalyticsWorker(analyticsService, config.AnalyticsSchedule)
	
	return &WorkerManager{
		exchangeWorker:    exchangeWorker,
		newsletterWorker:  newsletterWorker,
		sitemapWorker:     sitemapWorker,
		cacheWarmerWorker: cacheWarmerWorker,
		analyticsWorker:   analyticsWorker,
		stopChan:          make(chan struct{}),
	}
}

// Start starts all workers
func (m *WorkerManager) Start() {
	log.Println("[WorkerManager] Starting all background workers")
	
	// Start exchange rate worker
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		m.exchangeWorker.Start()
	}()
	
	// Start newsletter worker
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		m.newsletterWorker.Start()
	}()
	
	// Start sitemap worker
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		m.sitemapWorker.Start()
	}()
	
	// Start cache warmer worker
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		m.cacheWarmerWorker.Start()
	}()
	
	// Start analytics worker
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		m.analyticsWorker.Start()
	}()
	
	log.Println("[WorkerManager] All background workers started successfully")
}

// Stop gracefully stops all workers
func (m *WorkerManager) Stop() {
	log.Println("[WorkerManager] Stopping all background workers")
	
	// Stop all workers
	m.exchangeWorker.Stop()
	m.newsletterWorker.Stop()
	m.sitemapWorker.Stop()
	m.cacheWarmerWorker.Stop()
	m.analyticsWorker.Stop()
	
	// Wait for all workers to finish
	m.wg.Wait()
	
	log.Println("[WorkerManager] All background workers stopped successfully")
}

// HealthCheck returns the health status of all workers
func (m *WorkerManager) HealthCheck() map[string]string {
	// In a real implementation, each worker would report its status
	// For now, we'll return a simple status map
	return map[string]string{
		"exchange_rate_worker": "running",
		"newsletter_worker":    "running",
		"sitemap_worker":       "running",
		"cache_warmer_worker":  "running",
		"analytics_worker":     "running",
	}
}

// WaitForShutdownSignal waits for SIGTERM or SIGINT and gracefully shuts down
func (m *WorkerManager) WaitForShutdownSignal() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)
	
	sig := <-sigChan
	log.Printf("[WorkerManager] Received signal: %v", sig)
	
	m.Stop()
}

// StartWithGracefulShutdown starts all workers and waits for shutdown signal
func StartWithGracefulShutdown(
	client *ent.Client,
	redisClient *redis.Client,
	config WorkerConfig,
) {
	manager := NewWorkerManager(client, redisClient, config)
	manager.Start()
	
	log.Println("[WorkerManager] Workers are running. Press Ctrl+C to stop.")
	
	manager.WaitForShutdownSignal()
	
	log.Println("[WorkerManager] Shutdown complete")
}

// StartWorkersInBackground starts all workers in the background
// This is useful when workers are part of a larger application
func StartWorkersInBackground(
	ctx context.Context,
	client *ent.Client,
	redisClient *redis.Client,
	config WorkerConfig,
) *WorkerManager {
	manager := NewWorkerManager(client, redisClient, config)
	manager.Start()
	
	// Monitor context for cancellation
	go func() {
		<-ctx.Done()
		log.Println("[WorkerManager] Context cancelled, stopping workers")
		manager.Stop()
	}()
	
	return manager
}
