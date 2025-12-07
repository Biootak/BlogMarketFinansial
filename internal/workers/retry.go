package workers

import (
	"fmt"
	"log"
	"time"
)

// RetryConfig holds configuration for retry logic
type RetryConfig struct {
	MaxRetries      int
	InitialDelay    time.Duration
	MaxDelay        time.Duration
	BackoffFactor   float64
	WorkerName      string
	OperationName   string
}

// DefaultRetryConfig returns a default retry configuration
func DefaultRetryConfig(workerName, operationName string) RetryConfig {
	return RetryConfig{
		MaxRetries:      5,
		InitialDelay:    1 * time.Second,
		MaxDelay:        16 * time.Second,
		BackoffFactor:   2.0,
		WorkerName:      workerName,
		OperationName:   operationName,
	}
}

// RetryWithExponentialBackoff executes a function with exponential backoff retry logic
func RetryWithExponentialBackoff(config RetryConfig, operation func() error) error {
	var lastErr error
	delay := config.InitialDelay
	
	for attempt := 1; attempt <= config.MaxRetries; attempt++ {
		// Execute the operation
		err := operation()
		if err == nil {
			// Success
			if attempt > 1 {
				log.Printf("[%s] Operation '%s' succeeded on attempt %d/%d", 
					config.WorkerName, config.OperationName, attempt, config.MaxRetries)
			}
			return nil
		}
		
		lastErr = err
		log.Printf("[%s] Attempt %d/%d failed for operation '%s': %v", 
			config.WorkerName, attempt, config.MaxRetries, config.OperationName, err)
		
		// Don't sleep after the last attempt
		if attempt < config.MaxRetries {
			log.Printf("[%s] Retrying in %v...", config.WorkerName, delay)
			time.Sleep(delay)
			
			// Calculate next delay with exponential backoff
			delay = time.Duration(float64(delay) * config.BackoffFactor)
			if delay > config.MaxDelay {
				delay = config.MaxDelay
			}
		}
	}
	
	// All retries failed - alert
	alertMessage := fmt.Sprintf("[%s] ALERT: Operation '%s' failed after %d attempts: %v", 
		config.WorkerName, config.OperationName, config.MaxRetries, lastErr)
	log.Println(alertMessage)
	
	// TODO: Send alert to monitoring system (e.g., Sentry, PagerDuty, email, etc.)
	sendAlert(config.WorkerName, config.OperationName, lastErr)
	
	return fmt.Errorf("operation failed after %d attempts: %w", config.MaxRetries, lastErr)
}

// sendAlert sends an alert for a failed operation
// In production, this would integrate with monitoring/alerting systems
func sendAlert(workerName, operationName string, err error) {
	// TODO: Implement actual alerting
	// Examples:
	// - Send email to ops team
	// - Post to Slack channel
	// - Create PagerDuty incident
	// - Send to Sentry
	// - Log to external monitoring service
	
	log.Printf("[ALERT] Worker: %s, Operation: %s, Error: %v", workerName, operationName, err)
}

// CalculateBackoffDelay calculates the delay for a given attempt number
func CalculateBackoffDelay(attempt int, initialDelay time.Duration, backoffFactor float64, maxDelay time.Duration) time.Duration {
	if attempt <= 1 {
		return initialDelay
	}
	
	delay := initialDelay
	for i := 1; i < attempt; i++ {
		delay = time.Duration(float64(delay) * backoffFactor)
		if delay > maxDelay {
			return maxDelay
		}
	}
	
	return delay
}
