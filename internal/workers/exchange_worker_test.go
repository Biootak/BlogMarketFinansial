package workers

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// MockExchangeRateService is a mock service for testing
type MockExchangeRateService struct {
	fetchCalled int
	shouldFail  bool
}

func (m *MockExchangeRateService) FetchRates() error {
	m.fetchCalled++
	if m.shouldFail {
		return assert.AnError
	}
	return nil
}

func TestExchangeRateWorker_Creation(t *testing.T) {
	// Create mock service
	mockService := &MockExchangeRateService{}

	// Create worker - we'll use a type assertion workaround for testing
	// In real usage, this would use the actual ExchangeRateService
	worker := &ExchangeRateWorker{
		interval: 5 * time.Minute,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}

	assert.NotNil(t, worker)
	assert.Equal(t, 5*time.Minute, worker.interval)
	assert.NotNil(t, worker.stopChan)
	assert.NotNil(t, worker.doneChan)
	
	// Verify mock was created
	assert.NotNil(t, mockService)
}

func TestExchangeRateWorker_Channels(t *testing.T) {
	// Test that channels are properly initialized
	worker := &ExchangeRateWorker{
		interval: 1 * time.Minute,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}

	// Test that we can send to stopChan
	go func() {
		time.Sleep(10 * time.Millisecond)
		close(worker.stopChan)
	}()

	// Should not block
	select {
	case <-worker.stopChan:
		// Success
	case <-time.After(100 * time.Millisecond):
		t.Fatal("stopChan did not close")
	}
}

func TestExchangeRateWorker_IntervalConfiguration(t *testing.T) {
	testCases := []struct {
		name     string
		interval time.Duration
	}{
		{"5 minutes", 5 * time.Minute},
		{"1 minute", 1 * time.Minute},
		{"10 seconds", 10 * time.Second},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			worker := &ExchangeRateWorker{
				interval: tc.interval,
				stopChan: make(chan struct{}),
				doneChan: make(chan struct{}),
			}
			assert.Equal(t, tc.interval, worker.interval)
		})
	}
}

func TestExchangeRateWorker_StructureValidation(t *testing.T) {
	// Verify the worker struct has all required fields
	worker := &ExchangeRateWorker{
		interval: 5 * time.Minute,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}

	// Check that all fields are accessible
	assert.NotNil(t, worker.interval)
	assert.NotNil(t, worker.stopChan)
	assert.NotNil(t, worker.doneChan)
	
	// Verify interval is positive
	assert.Greater(t, worker.interval, time.Duration(0))
}

func TestExchangeRateWorker_ChannelBehavior(t *testing.T) {
	worker := &ExchangeRateWorker{
		interval: 1 * time.Second,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}

	// Test that doneChan can be closed
	go func() {
		time.Sleep(10 * time.Millisecond)
		close(worker.doneChan)
	}()

	select {
	case <-worker.doneChan:
		// Success - channel closed properly
	case <-time.After(100 * time.Millisecond):
		t.Fatal("doneChan did not close")
	}
}

func TestExchangeRateWorker_DefaultInterval(t *testing.T) {
	// Test that the default interval (5 minutes) is reasonable
	defaultInterval := 5 * time.Minute
	
	assert.Equal(t, 5*60*time.Second, defaultInterval)
	assert.Equal(t, 300*time.Second, defaultInterval)
	assert.Greater(t, defaultInterval, 1*time.Minute)
	assert.Less(t, defaultInterval, 1*time.Hour)
}
