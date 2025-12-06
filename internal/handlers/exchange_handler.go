package handlers

import (
	"biotak-go-backend/internal/middleware"
	"biotak-go-backend/internal/services"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ExchangeRateHandler handles exchange rate endpoints
type ExchangeRateHandler struct {
	exchangeService *services.ExchangeRateService
}

// NewExchangeRateHandler creates a new exchange rate handler
func NewExchangeRateHandler(exchangeService *services.ExchangeRateService) *ExchangeRateHandler {
	return &ExchangeRateHandler{
		exchangeService: exchangeService,
	}
}

// ExchangeRateResponse represents exchange rate data in API responses
type ExchangeRateResponse struct {
	Symbol      string  `json:"symbol"`
	USDTPrice   float64 `json:"usdtPrice"`
	IRRPrice    float64 `json:"irrPrice"`
	Change      float64 `json:"change"`
	GlobalPrice float64 `json:"globalPrice"`
}

// ExchangeRatesListResponse represents the response for current rates
type ExchangeRatesListResponse struct {
	Rates     []ExchangeRateResponse `json:"rates"`
	Timestamp time.Time              `json:"timestamp"`
	Source    string                 `json:"source"`
}

// HistoricalRatePoint represents a single historical rate data point
type HistoricalRatePoint struct {
	Currency  string    `json:"currency"`
	Rate      float64   `json:"rate"`
	Timestamp time.Time `json:"timestamp"`
}

// HistoricalRatesResponse represents the response for historical rates
type HistoricalRatesResponse struct {
	Currency string                `json:"currency,omitempty"`
	Rates    []HistoricalRatePoint `json:"rates,omitempty"`
	Multiple map[string][]HistoricalRatePoint `json:"multiple,omitempty"`
	From     time.Time             `json:"from"`
	To       time.Time             `json:"to"`
}

// GetRates handles GET /api/v1/exchange-rates
// @Summary Get current exchange rates
// @Description Get current exchange rates for cryptocurrencies
// @Tags exchange-rates
// @Produce json
// @Param currencies query string false "Comma-separated list of currencies (e.g., BTC,ETH,USDT)"
// @Success 200 {object} ExchangeRatesListResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/exchange-rates [get]
func (h *ExchangeRateHandler) GetRates(c *gin.Context) {
	// Parse query parameters
	currenciesParam := c.Query("currencies")
	var currencies []string
	if currenciesParam != "" {
		// Split by comma and trim spaces
		parts := strings.Split(currenciesParam, ",")
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				currencies = append(currencies, trimmed)
			}
		}
	}

	// Get rates from service
	rates, err := h.exchangeService.GetRates(c.Request.Context(), currencies)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.ErrorResponse{
			Error: middleware.ErrorDetail{
				Code:      "EXCHANGE_RATE_ERROR",
				Message:   "Failed to fetch exchange rates",
				Details:   map[string]interface{}{"error": err.Error()},
				Timestamp: time.Now().Format(time.RFC3339),
				RequestID: c.GetString("request_id"),
			},
		})
		return
	}

	// Convert to response format
	responseRates := make([]ExchangeRateResponse, len(rates))
	for i, rate := range rates {
		responseRates[i] = ExchangeRateResponse{
			Symbol:      rate.Symbol,
			USDTPrice:   rate.USDTPrice,
			IRRPrice:    rate.IRRPrice,
			Change:      rate.Change,
			GlobalPrice: rate.GlobalPrice,
		}
	}

	// Return response
	c.JSON(http.StatusOK, ExchangeRatesListResponse{
		Rates:     responseRates,
		Timestamp: time.Now(),
		Source:    "Exir API",
	})
}

// GetHistoricalRates handles GET /api/v1/exchange-rates/historical
// @Summary Get historical exchange rates
// @Description Get historical exchange rates for one or more currencies within a date range
// @Tags exchange-rates
// @Produce json
// @Param currency query string false "Single currency code (e.g., BTC)"
// @Param currencies query string false "Comma-separated list of currencies (e.g., BTC,ETH,USDT)"
// @Param from query string true "Start date (RFC3339 format, e.g., 2024-01-01T00:00:00Z)"
// @Param to query string true "End date (RFC3339 format, e.g., 2024-12-31T23:59:59Z)"
// @Success 200 {object} HistoricalRatesResponse
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /api/v1/exchange-rates/historical [get]
func (h *ExchangeRateHandler) GetHistoricalRates(c *gin.Context) {
	// Parse query parameters
	currency := c.Query("currency")
	currenciesParam := c.Query("currencies")
	fromParam := c.Query("from")
	toParam := c.Query("to")

	// Validate required parameters
	if fromParam == "" || toParam == "" {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{
			Error: middleware.ErrorDetail{
				Code:      "VALIDATION_ERROR",
				Message:   "Both 'from' and 'to' date parameters are required",
				Details:   map[string]interface{}{"fields": []string{"from", "to"}},
				Timestamp: time.Now().Format(time.RFC3339),
				RequestID: c.GetString("request_id"),
			},
		})
		return
	}

	// Parse dates
	from, err := time.Parse(time.RFC3339, fromParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{
			Error: middleware.ErrorDetail{
				Code:      "VALIDATION_ERROR",
				Message:   "Invalid 'from' date format. Use RFC3339 format (e.g., 2024-01-01T00:00:00Z)",
				Details:   map[string]interface{}{"field": "from", "error": err.Error()},
				Timestamp: time.Now().Format(time.RFC3339),
				RequestID: c.GetString("request_id"),
			},
		})
		return
	}

	to, err := time.Parse(time.RFC3339, toParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{
			Error: middleware.ErrorDetail{
				Code:      "VALIDATION_ERROR",
				Message:   "Invalid 'to' date format. Use RFC3339 format (e.g., 2024-12-31T23:59:59Z)",
				Details:   map[string]interface{}{"field": "to", "error": err.Error()},
				Timestamp: time.Now().Format(time.RFC3339),
				RequestID: c.GetString("request_id"),
			},
		})
		return
	}

	// Validate date range
	if from.After(to) {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{
			Error: middleware.ErrorDetail{
				Code:      "VALIDATION_ERROR",
				Message:   "The 'from' date must be before the 'to' date",
				Details:   map[string]interface{}{"from": from, "to": to},
				Timestamp: time.Now().Format(time.RFC3339),
				RequestID: c.GetString("request_id"),
			},
		})
		return
	}

	// Determine if single or multiple currencies
	if currency != "" {
		// Single currency request
		rates, err := h.exchangeService.GetHistoricalRates(c.Request.Context(), currency, from, to)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.ErrorResponse{
				Error: middleware.ErrorDetail{
					Code:      "EXCHANGE_RATE_ERROR",
					Message:   "Failed to fetch historical exchange rates",
					Details:   map[string]interface{}{"error": err.Error()},
					Timestamp: time.Now().Format(time.RFC3339),
					RequestID: c.GetString("request_id"),
				},
			})
			return
		}

		// Convert to response format
		responseRates := make([]HistoricalRatePoint, len(rates))
		for i, rate := range rates {
			responseRates[i] = HistoricalRatePoint{
				Currency:  rate.Currency,
				Rate:      rate.Rate,
				Timestamp: rate.Timestamp,
			}
		}

		c.JSON(http.StatusOK, HistoricalRatesResponse{
			Currency: currency,
			Rates:    responseRates,
			From:     from,
			To:       to,
		})
		return
	}

	if currenciesParam != "" {
		// Multiple currencies request
		parts := strings.Split(currenciesParam, ",")
		currencies := make([]string, 0)
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				currencies = append(currencies, trimmed)
			}
		}

		if len(currencies) == 0 {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{
				Error: middleware.ErrorDetail{
					Code:      "VALIDATION_ERROR",
					Message:   "At least one currency is required",
					Details:   map[string]interface{}{"field": "currencies"},
					Timestamp: time.Now().Format(time.RFC3339),
					RequestID: c.GetString("request_id"),
				},
			})
			return
		}

		ratesMap, err := h.exchangeService.GetHistoricalRatesMultiple(c.Request.Context(), currencies, from, to)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.ErrorResponse{
				Error: middleware.ErrorDetail{
					Code:      "EXCHANGE_RATE_ERROR",
					Message:   "Failed to fetch historical exchange rates",
					Details:   map[string]interface{}{"error": err.Error()},
					Timestamp: time.Now().Format(time.RFC3339),
					RequestID: c.GetString("request_id"),
				},
			})
			return
		}

		// Convert to response format
		responseMap := make(map[string][]HistoricalRatePoint)
		for curr, rates := range ratesMap {
			responseRates := make([]HistoricalRatePoint, len(rates))
			for i, rate := range rates {
				responseRates[i] = HistoricalRatePoint{
					Currency:  rate.Currency,
					Rate:      rate.Rate,
					Timestamp: rate.Timestamp,
				}
			}
			responseMap[curr] = responseRates
		}

		c.JSON(http.StatusOK, HistoricalRatesResponse{
			Multiple: responseMap,
			From:     from,
			To:       to,
		})
		return
	}

	// Neither currency nor currencies provided
	c.JSON(http.StatusBadRequest, middleware.ErrorResponse{
		Error: middleware.ErrorDetail{
			Code:      "VALIDATION_ERROR",
			Message:   "Either 'currency' or 'currencies' parameter is required",
			Details:   map[string]interface{}{"fields": []string{"currency", "currencies"}},
			Timestamp: time.Now().Format(time.RFC3339),
			RequestID: c.GetString("request_id"),
		},
	})
}
