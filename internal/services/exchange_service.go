package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/ent/exchangerate"

	"github.com/redis/go-redis/v9"
)

// ExirTicker represents a single ticker from Exir API
type ExirTicker struct {
	Time   string  `json:"time"`
	Open   float64 `json:"open"`
	Close  float64 `json:"close"`
	High   float64 `json:"high"`
	Low    float64 `json:"low"`
	Last   float64 `json:"last"`
	Volume float64 `json:"volume"`
	Symbol string  `json:"symbol"`
}

// ExirTickersResponse represents the response from Exir tickers API
type ExirTickersResponse map[string]ExirTicker

// ExchangeRateResult represents a processed exchange rate
type ExchangeRateResult struct {
	Symbol      string  `json:"symbol"`
	USDTPrice   float64 `json:"usdtPrice"`
	IRRPrice    float64 `json:"irrPrice"`
	Change      float64 `json:"change"`
	GlobalPrice float64 `json:"globalPrice"`
}

// ExchangeRateService handles exchange rate operations
type ExchangeRateService struct {
	client      *ent.Client
	redisClient *redis.Client
	httpClient  *http.Client
}

// NewExchangeRateService creates a new exchange rate service
func NewExchangeRateService(client *ent.Client, redisClient *redis.Client) *ExchangeRateService {
	return &ExchangeRateService{
		client:      client,
		redisClient: redisClient,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Supported currencies
var supportedCurrencies = []string{
	"BTC", "ETH", "USDT", "XRP", "LTC", "BCH", "EOS", "XLM", "TRX", "LINK",
	"UNI", "AAVE", "DOT", "ADA", "DOGE", "SHIB", "MATIC", "SOL", "AVAX", "ATOM",
	"FTM", "SAND", "MANA", "AXS",
}

const (
	exirAPIBase     = "https://api.exir.io/v2"
	cacheTTL        = 5 * time.Minute
	cacheKeyPrefix  = "exchange_rates:"
	maxRetries      = 2
	retryDelay      = 500 * time.Millisecond
)

// FetchRates fetches exchange rates from external APIs and stores them
func (s *ExchangeRateService) FetchRates(ctx context.Context) error {
	// Fetch tickers from Exir API
	tickers, err := s.fetchExirTickers(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch tickers: %w", err)
	}

	// Process the tickers into exchange rates
	rates := s.processExirRates(tickers)

	// Store in database
	for _, rate := range rates {
		// Generate a unique ID for the rate
		rateID := fmt.Sprintf("exr_%s_%d", strings.ToLower(rate.Symbol), time.Now().Unix())
		
		// Convert float to string for storage
		singleRate := fmt.Sprintf("%.8f", rate.USDTPrice)
		
		_, err := s.client.ExchangeRate.Create().
			SetID(rateID).
			SetName(fmt.Sprintf("%s Exchange Rate", rate.Symbol)).
			SetCurrency(rate.Symbol).
			SetRateType("SINGLE_BULK").
			SetSingleRate(singleRate).
			Save(ctx)
		if err != nil {
			// Log error but continue with other rates
			fmt.Printf("Failed to store rate for %s: %v\n", rate.Symbol, err)
		}
	}

	// Store in Redis cache
	cacheKey := cacheKeyPrefix + "all"
	ratesJSON, err := json.Marshal(rates)
	if err != nil {
		return fmt.Errorf("failed to marshal rates: %w", err)
	}

	err = s.redisClient.Set(ctx, cacheKey, ratesJSON, cacheTTL).Err()
	if err != nil {
		return fmt.Errorf("failed to cache rates: %w", err)
	}

	return nil
}

// fetchExirTickers fetches all tickers from Exir API with retry logic
func (s *ExchangeRateService) fetchExirTickers(ctx context.Context) (ExirTickersResponse, error) {
	url := exirAPIBase + "/tickers"
	
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Content-Type", "application/json")

		resp, err := s.httpClient.Do(req)
		if err != nil {
			lastErr = err
			if i < maxRetries-1 {
				time.Sleep(retryDelay)
				continue
			}
			return nil, fmt.Errorf("failed to fetch tickers after %d retries: %w", maxRetries, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
			if i < maxRetries-1 {
				time.Sleep(retryDelay)
				continue
			}
			return nil, lastErr
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response body: %w", err)
		}

		var tickers ExirTickersResponse
		err = json.Unmarshal(body, &tickers)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal response: %w", err)
		}

		return tickers, nil
	}

	return nil, lastErr
}

// processExirRates processes raw ticker data into exchange rates
func (s *ExchangeRateService) processExirRates(tickers ExirTickersResponse) []ExchangeRateResult {
	rates := make([]ExchangeRateResult, 0)
	
	// Get USDT-IRT rate for conversion
	usdtIRTRate := 120800.0 // Default fallback
	if ticker, ok := tickers["usdt-irt"]; ok && ticker.Last > 0 {
		usdtIRTRate = ticker.Last
	}

	for _, currency := range supportedCurrencies {
		lowerCurrency := strings.ToLower(currency)
		
		// Pair with USDT
		usdtPair := lowerCurrency + "-usdt"
		// Pair with IRT (Toman)
		irtPair := lowerCurrency + "-irt"

		usdtTicker, hasUSDT := tickers[usdtPair]
		irtTicker, hasIRT := tickers[irtPair]

		// Special handling for USDT
		if currency == "USDT" {
			if ticker, ok := tickers["usdt-irt"]; ok && ticker.Last > 0 {
				rates = append(rates, ExchangeRateResult{
					Symbol:      "USDT",
					USDTPrice:   1.0,
					IRRPrice:    ticker.Last * 10, // Convert Toman to Rial
					Change:      calculateDayChange(ticker.Open, ticker.Close),
					GlobalPrice: 1.0,
				})
			} else {
				// Fallback for USDT
				rates = append(rates, ExchangeRateResult{
					Symbol:      "USDT",
					USDTPrice:   1.0,
					IRRPrice:    1207050, // ~120,705 Toman to Rial
					Change:      0,
					GlobalPrice: 1.0,
				})
			}
			continue
		}

		// For other currencies
		if hasUSDT || hasIRT {
			usdtPrice := 0.0
			if hasUSDT {
				usdtPrice = usdtTicker.Last
			}

			irtPrice := 0.0
			if hasIRT {
				irtPrice = irtTicker.Last
			} else if hasUSDT {
				irtPrice = usdtPrice * usdtIRTRate
			}

			change := 0.0
			if hasUSDT {
				change = calculateDayChange(usdtTicker.Open, usdtTicker.Close)
			} else if hasIRT {
				change = calculateDayChange(irtTicker.Open, irtTicker.Close)
			}

			rates = append(rates, ExchangeRateResult{
				Symbol:      currency,
				USDTPrice:   usdtPrice,
				IRRPrice:    irtPrice * 10, // Convert Toman to Rial
				Change:      change,
				GlobalPrice: usdtPrice,
			})
		}
	}

	// Sort: BTC, ETH first, then USDT, then others
	sortedRates := make([]ExchangeRateResult, 0, len(rates))
	for _, r := range rates {
		if r.Symbol == "BTC" || r.Symbol == "ETH" {
			sortedRates = append(sortedRates, r)
		}
	}
	for _, r := range rates {
		if r.Symbol == "USDT" {
			sortedRates = append(sortedRates, r)
		}
	}
	for _, r := range rates {
		if r.Symbol != "BTC" && r.Symbol != "ETH" && r.Symbol != "USDT" {
			sortedRates = append(sortedRates, r)
		}
	}

	return sortedRates
}

// calculateDayChange calculates the percentage change from open to close
func calculateDayChange(open, close float64) float64 {
	if open == 0 {
		return 0
	}
	return ((close - open) / open) * 100
}

// GetRates retrieves exchange rates with caching
// First checks Redis cache, if not found or expired, fetches from API
func (s *ExchangeRateService) GetRates(ctx context.Context, currencies []string) ([]ExchangeRateResult, error) {
	// Try to get from cache first
	cacheKey := cacheKeyPrefix + "all"
	cachedData, err := s.redisClient.Get(ctx, cacheKey).Result()
	
	if err == nil && cachedData != "" {
		// Cache hit - unmarshal and return
		var rates []ExchangeRateResult
		if err := json.Unmarshal([]byte(cachedData), &rates); err == nil {
			// Filter by requested currencies if specified
			if len(currencies) > 0 {
				filtered := make([]ExchangeRateResult, 0)
				currencyMap := make(map[string]bool)
				for _, c := range currencies {
					currencyMap[strings.ToUpper(c)] = true
				}
				for _, rate := range rates {
					if currencyMap[rate.Symbol] {
						filtered = append(filtered, rate)
					}
				}
				return filtered, nil
			}
			return rates, nil
		}
	}

	// Cache miss or error - fetch fresh data
	if err := s.FetchRates(ctx); err != nil {
		// If fetch fails, try to get last known rates from database
		return s.getLastKnownRates(ctx, currencies)
	}

	// Get the newly cached data
	cachedData, err = s.redisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		// Fallback to database
		return s.getLastKnownRates(ctx, currencies)
	}

	var rates []ExchangeRateResult
	if err := json.Unmarshal([]byte(cachedData), &rates); err != nil {
		return nil, fmt.Errorf("failed to unmarshal cached rates: %w", err)
	}

	// Filter by requested currencies if specified
	if len(currencies) > 0 {
		filtered := make([]ExchangeRateResult, 0)
		currencyMap := make(map[string]bool)
		for _, c := range currencies {
			currencyMap[strings.ToUpper(c)] = true
		}
		for _, rate := range rates {
			if currencyMap[rate.Symbol] {
				filtered = append(filtered, rate)
			}
		}
		return filtered, nil
	}

	return rates, nil
}

// getLastKnownRates retrieves the most recent rates from PostgreSQL as fallback
func (s *ExchangeRateService) getLastKnownRates(ctx context.Context, currencies []string) ([]ExchangeRateResult, error) {
	// Log that we're using fallback
	fmt.Println("[ExchangeRateService] Using fallback: fetching last known rates from database")

	// Build query
	query := s.client.ExchangeRate.Query().
		Order(ent.Desc(exchangerate.FieldCreatedAt))

	// Filter by currencies if specified
	if len(currencies) > 0 {
		upperCurrencies := make([]string, len(currencies))
		for i, c := range currencies {
			upperCurrencies[i] = strings.ToUpper(c)
		}
		query = query.Where(exchangerate.CurrencyIn(upperCurrencies...))
	}

	// Get all matching rates
	dbRates, err := query.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch rates from database: %w", err)
	}

	// Group by currency and get the most recent for each
	rateMap := make(map[string]*ent.ExchangeRate)
	for _, rate := range dbRates {
		if _, exists := rateMap[rate.Currency]; !exists {
			rateMap[rate.Currency] = rate
		}
	}

	// Convert to ExchangeRateResult format
	results := make([]ExchangeRateResult, 0, len(rateMap))
	for _, rate := range rateMap {
		// Parse the rate from string
		var rateValue float64
		if rate.SingleRate != nil {
			fmt.Sscanf(*rate.SingleRate, "%f", &rateValue)
		} else if rate.BuyRate != nil {
			fmt.Sscanf(*rate.BuyRate, "%f", &rateValue)
		}
		
		results = append(results, ExchangeRateResult{
			Symbol:      rate.Currency,
			USDTPrice:   rateValue,
			IRRPrice:    0, // Not stored in DB, would need calculation
			Change:      0, // Not available from single record
			GlobalPrice: rateValue,
		})
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no rates found in database")
	}

	return results, nil
}

// RatePoint represents a single historical rate data point
type RatePoint struct {
	Currency  string    `json:"currency"`
	Rate      float64   `json:"rate"`
	Timestamp time.Time `json:"timestamp"`
}

// GetHistoricalRates retrieves historical exchange rates for a currency within a date range
func (s *ExchangeRateService) GetHistoricalRates(ctx context.Context, currency string, from, to time.Time) ([]RatePoint, error) {
	// Validate inputs
	if currency == "" {
		return nil, fmt.Errorf("currency is required")
	}
	if from.After(to) {
		return nil, fmt.Errorf("from date must be before to date")
	}

	// Query database for historical rates
	rates, err := s.client.ExchangeRate.Query().
		Where(
			exchangerate.Currency(strings.ToUpper(currency)),
			exchangerate.CreatedAtGTE(from),
			exchangerate.CreatedAtLTE(to),
		).
		Order(ent.Asc(exchangerate.FieldCreatedAt)).
		All(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to query historical rates: %w", err)
	}

	// Convert to RatePoint format
	points := make([]RatePoint, 0, len(rates))
	for _, rate := range rates {
		// Parse the rate from string
		var rateValue float64
		if rate.SingleRate != nil {
			fmt.Sscanf(*rate.SingleRate, "%f", &rateValue)
		} else if rate.BuyRate != nil {
			fmt.Sscanf(*rate.BuyRate, "%f", &rateValue)
		}
		
		points = append(points, RatePoint{
			Currency:  rate.Currency,
			Rate:      rateValue,
			Timestamp: rate.CreatedAt,
		})
	}

	return points, nil
}

// GetHistoricalRatesMultiple retrieves historical rates for multiple currencies
func (s *ExchangeRateService) GetHistoricalRatesMultiple(ctx context.Context, currencies []string, from, to time.Time) (map[string][]RatePoint, error) {
	// Validate inputs
	if len(currencies) == 0 {
		return nil, fmt.Errorf("at least one currency is required")
	}
	if from.After(to) {
		return nil, fmt.Errorf("from date must be before to date")
	}

	// Normalize currency names
	upperCurrencies := make([]string, len(currencies))
	for i, c := range currencies {
		upperCurrencies[i] = strings.ToUpper(c)
	}

	// Query database for historical rates
	rates, err := s.client.ExchangeRate.Query().
		Where(
			exchangerate.CurrencyIn(upperCurrencies...),
			exchangerate.CreatedAtGTE(from),
			exchangerate.CreatedAtLTE(to),
		).
		Order(ent.Asc(exchangerate.FieldCreatedAt)).
		All(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to query historical rates: %w", err)
	}

	// Group by currency
	result := make(map[string][]RatePoint)
	for _, rate := range rates {
		// Parse the rate from string
		var rateValue float64
		if rate.SingleRate != nil {
			fmt.Sscanf(*rate.SingleRate, "%f", &rateValue)
		} else if rate.BuyRate != nil {
			fmt.Sscanf(*rate.BuyRate, "%f", &rateValue)
		}
		
		point := RatePoint{
			Currency:  rate.Currency,
			Rate:      rateValue,
			Timestamp: rate.CreatedAt,
		}
		result[rate.Currency] = append(result[rate.Currency], point)
	}

	return result, nil
}
