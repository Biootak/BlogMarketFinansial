package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"biotak-go-backend/ent"
	"biotak-go-backend/internal/database"
	"biotak-go-backend/internal/handlers"
	"biotak-go-backend/internal/services"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

// This example demonstrates how to use the ExchangeRateHandler
func main() {
	// Initialize database connection
	client, err := ent.Open("postgres", "postgresql://user:password@localhost:5432/biotak?sslmode=disable")
	if err != nil {
		log.Fatalf("failed opening connection to postgres: %v", err)
	}
	defer client.Close()

	// Run migrations
	if err := client.Schema.Create(context.Background()); err != nil {
		log.Fatalf("failed creating schema resources: %v", err)
	}

	// Initialize Redis connection
	redisConfig := database.DefaultRedisConfig("redis://localhost:6379/0")
	redisWrapper, err := database.NewRedisClient(redisConfig)
	if err != nil {
		log.Fatalf("failed connecting to redis: %v", err)
	}
	defer redisWrapper.Close()

	// Create exchange rate service
	exchangeService := services.NewExchangeRateService(client, redisWrapper.Client)

	// Create exchange rate handler
	exchangeHandler := handlers.NewExchangeRateHandler(exchangeService)

	// Setup Gin router
	router := gin.Default()

	// Register exchange rate routes
	v1 := router.Group("/api/v1")
	{
		v1.GET("/exchange-rates", exchangeHandler.GetRates)
		v1.GET("/exchange-rates/historical", exchangeHandler.GetHistoricalRates)
	}

	// Example 1: Fetch and cache rates
	fmt.Println("Example 1: Fetching exchange rates...")
	ctx := context.Background()
	if err := exchangeService.FetchRates(ctx); err != nil {
		log.Printf("Warning: Failed to fetch rates: %v", err)
	} else {
		fmt.Println("✅ Exchange rates fetched and cached successfully")
	}

	// Example 2: Get all current rates
	fmt.Println("\nExample 2: Getting all current rates...")
	allRates, err := exchangeService.GetRates(ctx, nil)
	if err != nil {
		log.Printf("Error getting rates: %v", err)
	} else {
		fmt.Printf("✅ Retrieved %d exchange rates\n", len(allRates))
		for i, rate := range allRates {
			if i < 3 { // Show first 3
				fmt.Printf("   %s: $%.2f (Change: %.2f%%)\n", rate.Symbol, rate.USDTPrice, rate.Change)
			}
		}
		if len(allRates) > 3 {
			fmt.Printf("   ... and %d more\n", len(allRates)-3)
		}
	}

	// Example 3: Get specific currencies
	fmt.Println("\nExample 3: Getting specific currencies (BTC, ETH, USDT)...")
	specificRates, err := exchangeService.GetRates(ctx, []string{"BTC", "ETH", "USDT"})
	if err != nil {
		log.Printf("Error getting specific rates: %v", err)
	} else {
		fmt.Printf("✅ Retrieved %d specific rates\n", len(specificRates))
		for _, rate := range specificRates {
			fmt.Printf("   %s: $%.2f (IRR: %.0f, Change: %.2f%%)\n",
				rate.Symbol, rate.USDTPrice, rate.IRRPrice, rate.Change)
		}
	}

	// Example 4: Get historical rates
	fmt.Println("\nExample 4: Getting historical rates for BTC...")
	to := time.Now()
	from := to.Add(-7 * 24 * time.Hour) // Last 7 days
	historicalRates, err := exchangeService.GetHistoricalRates(ctx, "BTC", from, to)
	if err != nil {
		log.Printf("Error getting historical rates: %v", err)
	} else {
		fmt.Printf("✅ Retrieved %d historical data points for BTC\n", len(historicalRates))
		if len(historicalRates) > 0 {
			fmt.Printf("   First: $%.2f at %s\n",
				historicalRates[0].Rate,
				historicalRates[0].Timestamp.Format("2006-01-02 15:04"))
			if len(historicalRates) > 1 {
				last := historicalRates[len(historicalRates)-1]
				fmt.Printf("   Last:  $%.2f at %s\n",
					last.Rate,
					last.Timestamp.Format("2006-01-02 15:04"))
			}
		}
	}

	// Example 5: Get historical rates for multiple currencies
	fmt.Println("\nExample 5: Getting historical rates for multiple currencies...")
	multiHistorical, err := exchangeService.GetHistoricalRatesMultiple(
		ctx,
		[]string{"BTC", "ETH", "USDT"},
		from,
		to,
	)
	if err != nil {
		log.Printf("Error getting multi-currency historical rates: %v", err)
	} else {
		fmt.Printf("✅ Retrieved historical data for %d currencies\n", len(multiHistorical))
		for currency, rates := range multiHistorical {
			fmt.Printf("   %s: %d data points\n", currency, len(rates))
		}
	}

	// Example 6: Test API endpoints
	fmt.Println("\nExample 6: Starting HTTP server...")
	fmt.Println("Server will be available at http://localhost:8080")
	fmt.Println("\nTest endpoints:")
	fmt.Println("  GET http://localhost:8080/api/v1/exchange-rates")
	fmt.Println("  GET http://localhost:8080/api/v1/exchange-rates?currencies=BTC,ETH")
	fmt.Println("  GET http://localhost:8080/api/v1/exchange-rates/historical?currency=BTC&from=2024-12-01T00:00:00Z&to=2024-12-07T23:59:59Z")

	// Start server
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
