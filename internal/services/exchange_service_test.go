package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestExchangeRateService_ProcessExirRates(t *testing.T) {
	service := &ExchangeRateService{}

	// Test data
	tickers := ExirTickersResponse{
		"btc-usdt": ExirTicker{
			Open:  95000.0,
			Close: 97500.0,
			Last:  97500.0,
		},
		"eth-usdt": ExirTicker{
			Open:  3600.0,
			Close: 3650.0,
			Last:  3650.0,
		},
		"usdt-irt": ExirTicker{
			Open:  120000.0,
			Close: 120800.0,
			Last:  120800.0,
		},
	}

	// Process rates
	rates := service.processExirRates(tickers)

	// Verify results
	assert.NotEmpty(t, rates)
	
	// Check BTC is first
	assert.Equal(t, "BTC", rates[0].Symbol)
	assert.Equal(t, 97500.0, rates[0].USDTPrice)
	
	// Check ETH is second
	assert.Equal(t, "ETH", rates[1].Symbol)
	assert.Equal(t, 3650.0, rates[1].USDTPrice)
	
	// Check USDT is third
	assert.Equal(t, "USDT", rates[2].Symbol)
	assert.Equal(t, 1.0, rates[2].USDTPrice)
}

func TestExchangeRateService_CalculateDayChange(t *testing.T) {
	tests := []struct {
		name     string
		open     float64
		close    float64
		expected float64
	}{
		{
			name:     "positive change",
			open:     100.0,
			close:    110.0,
			expected: 10.0,
		},
		{
			name:     "negative change",
			open:     100.0,
			close:    90.0,
			expected: -10.0,
		},
		{
			name:     "no change",
			open:     100.0,
			close:    100.0,
			expected: 0.0,
		},
		{
			name:     "zero open",
			open:     0.0,
			close:    100.0,
			expected: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateDayChange(tt.open, tt.close)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Note: Integration tests with actual database connection
// should be in tests/integration/ directory
