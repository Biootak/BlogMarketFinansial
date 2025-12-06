# Exchange Rate Handler

This handler provides HTTP endpoints for retrieving cryptocurrency exchange rates.

## Endpoints

### GET /api/v1/exchange-rates

Get current exchange rates for cryptocurrencies.

**Query Parameters:**
- `currencies` (optional): Comma-separated list of currency codes (e.g., `BTC,ETH,USDT`)

**Response:**
```json
{
  "rates": [
    {
      "symbol": "BTC",
      "usdtPrice": 97500.0,
      "irrPrice": 11750000000,
      "change": 2.63,
      "globalPrice": 97500.0
    },
    {
      "symbol": "ETH",
      "usdtPrice": 3650.0,
      "irrPrice": 440520000,
      "change": 1.39,
      "globalPrice": 3650.0
    }
  ],
  "timestamp": "2024-12-07T10:30:00Z",
  "source": "Exir API"
}
```

**Example Requests:**
```bash
# Get all rates
curl http://localhost:8080/api/v1/exchange-rates

# Get specific currencies
curl http://localhost:8080/api/v1/exchange-rates?currencies=BTC,ETH,USDT
```

### GET /api/v1/exchange-rates/historical

Get historical exchange rates for one or more currencies within a date range.

**Query Parameters:**
- `currency` (optional): Single currency code (e.g., `BTC`)
- `currencies` (optional): Comma-separated list of currency codes (e.g., `BTC,ETH,USDT`)
- `from` (required): Start date in RFC3339 format (e.g., `2024-01-01T00:00:00Z`)
- `to` (required): End date in RFC3339 format (e.g., `2024-12-31T23:59:59Z`)

**Note:** Either `currency` or `currencies` must be provided, but not both.

**Response (Single Currency):**
```json
{
  "currency": "BTC",
  "rates": [
    {
      "currency": "BTC",
      "rate": 95000.0,
      "timestamp": "2024-12-05T10:00:00Z"
    },
    {
      "currency": "BTC",
      "rate": 96500.0,
      "timestamp": "2024-12-06T10:00:00Z"
    },
    {
      "currency": "BTC",
      "rate": 97500.0,
      "timestamp": "2024-12-07T10:00:00Z"
    }
  ],
  "from": "2024-12-05T00:00:00Z",
  "to": "2024-12-07T23:59:59Z"
}
```

**Response (Multiple Currencies):**
```json
{
  "multiple": {
    "BTC": [
      {
        "currency": "BTC",
        "rate": 95000.0,
        "timestamp": "2024-12-05T10:00:00Z"
      },
      {
        "currency": "BTC",
        "rate": 97500.0,
        "timestamp": "2024-12-07T10:00:00Z"
      }
    ],
    "ETH": [
      {
        "currency": "ETH",
        "rate": 3600.0,
        "timestamp": "2024-12-05T10:00:00Z"
      },
      {
        "currency": "ETH",
        "rate": 3650.0,
        "timestamp": "2024-12-07T10:00:00Z"
      }
    ]
  },
  "from": "2024-12-05T00:00:00Z",
  "to": "2024-12-07T23:59:59Z"
}
```

**Example Requests:**
```bash
# Get historical rates for single currency
curl "http://localhost:8080/api/v1/exchange-rates/historical?currency=BTC&from=2024-12-01T00:00:00Z&to=2024-12-07T23:59:59Z"

# Get historical rates for multiple currencies
curl "http://localhost:8080/api/v1/exchange-rates/historical?currencies=BTC,ETH,USDT&from=2024-12-01T00:00:00Z&to=2024-12-07T23:59:59Z"
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific field that caused error"
    },
    "timestamp": "2024-12-07T10:30:00Z",
    "request_id": "uuid-for-tracking"
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` (400): Invalid input parameters
- `EXCHANGE_RATE_ERROR` (500): Failed to fetch exchange rates

## Features

### Caching
- Exchange rates are cached in Redis with a 5-minute TTL
- Subsequent requests within the cache window return cached data
- Reduces load on external APIs and improves response times

### Fallback Mechanism
- If external API fails, the system returns the last known rates from PostgreSQL
- Ensures service availability even when external APIs are down
- Errors are logged for monitoring

### Currency Filtering
- Supports filtering by specific currencies
- Comma-separated list for multiple currencies
- Returns all supported currencies if no filter is provided

### Historical Data
- Stores all rate updates in PostgreSQL for historical analysis
- Supports date range queries
- Can query single or multiple currencies simultaneously

## Supported Currencies

The following cryptocurrencies are supported:
- BTC (Bitcoin)
- ETH (Ethereum)
- USDT (Tether)
- XRP (Ripple)
- LTC (Litecoin)
- BCH (Bitcoin Cash)
- EOS
- XLM (Stellar)
- TRX (Tron)
- LINK (Chainlink)
- UNI (Uniswap)
- AAVE
- DOT (Polkadot)
- ADA (Cardano)
- DOGE (Dogecoin)
- SHIB (Shiba Inu)
- MATIC (Polygon)
- SOL (Solana)
- AVAX (Avalanche)
- ATOM (Cosmos)
- FTM (Fantom)
- SAND (The Sandbox)
- MANA (Decentraland)
- AXS (Axie Infinity)

## Integration

To use this handler in your router:

```go
import (
    "biotak-go-backend/internal/handlers"
    "biotak-go-backend/internal/services"
    "github.com/gin-gonic/gin"
)

func SetupRouter(
    entClient *ent.Client,
    redisClient *redis.Client,
) *gin.Engine {
    router := gin.Default()

    // Create service
    exchangeService := services.NewExchangeRateService(entClient, redisClient)

    // Create handler
    exchangeHandler := handlers.NewExchangeRateHandler(exchangeService)

    // Register routes
    v1 := router.Group("/api/v1")
    {
        v1.GET("/exchange-rates", exchangeHandler.GetRates)
        v1.GET("/exchange-rates/historical", exchangeHandler.GetHistoricalRates)
    }

    return router
}
```

## Requirements Validation

This handler implements the following requirements:

- **Requirement 5.1**: Fetches current rates from external APIs (Exir API)
- **Requirement 5.2**: Stores rates in Redis with 5-minute TTL
- **Requirement 5.3**: Returns cached data when available
- **Requirement 5.4**: Falls back to PostgreSQL when API fails
- **Requirement 5.5**: Stores and retrieves historical rate data

## Testing

To test the endpoints manually:

```bash
# Start the server
go run cmd/server/main.go

# Test current rates
curl http://localhost:8080/api/v1/exchange-rates

# Test filtered rates
curl http://localhost:8080/api/v1/exchange-rates?currencies=BTC,ETH

# Test historical rates
curl "http://localhost:8080/api/v1/exchange-rates/historical?currency=BTC&from=2024-12-01T00:00:00Z&to=2024-12-07T23:59:59Z"
```

## Performance Considerations

- **Caching**: 5-minute Redis cache significantly reduces API calls
- **Batch Queries**: Historical endpoint supports multiple currencies in one request
- **Database Indexing**: Indexes on `currency` and `created_at` fields optimize queries
- **Connection Pooling**: Reuses database and Redis connections

## Security

- No authentication required for read-only endpoints
- Rate limiting should be applied at the middleware level
- Input validation prevents injection attacks
- Error messages are sanitized to avoid information disclosure
