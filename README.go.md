# Biotak Go Backend

High-performance backend service for the Biotak financial markets blog platform, built with Go.

## Overview

This Go backend replaces Next.js API routes to provide:
- ⚡ **10x faster** API response times
- 📊 **Lower resource usage** (RAM and CPU)
- 🔒 **Enhanced security** with type-safety
- 📈 **Better scalability** with goroutines
- 🛠️ **Easier maintenance** with clean architecture

## Tech Stack

- **Go 1.21+** - Programming language
- **Gin** - HTTP web framework
- **Ent** - Type-safe ORM (Facebook's entity framework)
- **PostgreSQL** - Primary database
- **Redis** - Caching and session management
- **JWT** - Authentication (compatible with NextAuth)
- **AWS S3** - File storage (Liara)

## Project Structure

```
biotak-go-backend/
├── cmd/
│   └── server/          # Application entry point
├── ent/
│   └── schema/          # Ent data models
├── internal/
│   ├── config/          # Configuration management
│   ├── handlers/        # HTTP request handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access layer
│   ├── middleware/      # HTTP middleware
│   ├── workers/         # Background jobs
│   ├── utils/           # Utility functions
│   └── database/        # Database connections
├── pkg/
│   ├── logger/          # Structured logging
│   └── errors/          # Custom error types
└── tests/
    ├── integration/     # Integration tests
    └── unit/            # Unit tests
```

## Prerequisites

- **Go 1.21+** - [Install Go](https://golang.org/doc/install)
- **PostgreSQL 14+** - Database
- **Redis 7+** - Cache
- **Docker** (optional) - For containerized development

## Installation

### 1. Install Go

**Windows:**
```bash
# Download from https://golang.org/dl/
# Or use Chocolatey:
choco install golang
```

**macOS:**
```bash
brew install go
```

**Linux:**
```bash
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

### 2. Verify Installation

```bash
go version
# Should output: go version go1.21.x
```

### 3. Install Dependencies

```bash
go mod download
```

### 4. Generate Ent Code

```bash
go generate ./ent
```

## Configuration

Copy the environment file:

```bash
cp .env.go .env
```

Update `.env` with your configuration:

```env
PORT=8080
DATABASE_URL=postgresql://user:pass@localhost:5432/biotak
REDIS_URL=redis://localhost:6379
AUTH_SECRET=your-jwt-secret
```

## Running the Application

### Local Development

```bash
# Run the server
go run cmd/server/main.go

# Or build and run
go build -o biotak-backend cmd/server/main.go
./biotak-backend
```

### Using Docker Compose

```bash
# Start all services (Go backend, PostgreSQL, Redis)
docker-compose -f docker-compose.go.yml up

# Run in background
docker-compose -f docker-compose.go.yml up -d

# View logs
docker-compose -f docker-compose.go.yml logs -f go-backend

# Stop services
docker-compose -f docker-compose.go.yml down
```

## Development

### Running Tests

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package tests
go test ./internal/services/...

# Run with verbose output
go test -v ./...
```

### Code Generation

```bash
# Generate Ent code after schema changes
go generate ./ent
```

### Database Migrations

```bash
# Ent automatically generates migrations
# Run migrations on startup or manually:
go run cmd/server/main.go migrate
```

### Linting

```bash
# Install golangci-lint
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run linter
golangci-lint run
```

## API Endpoints

All endpoints are prefixed with `/api/v1`:

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - User logout

### Posts
- `GET /api/v1/posts` - List posts (with filters)
- `GET /api/v1/posts/:id` - Get post by ID
- `GET /api/v1/posts/slug/:slug` - Get post by slug
- `POST /api/v1/posts` - Create post (auth required)
- `PUT /api/v1/posts/:id` - Update post (auth required)
- `POST /api/v1/posts/:id/publish` - Publish post (auth required)
- `DELETE /api/v1/posts/:id` - Delete post (admin only)

### Comments
- `GET /api/v1/posts/:postId/comments` - Get comments
- `POST /api/v1/comments` - Create comment (auth required)
- `PUT /api/v1/comments/:id/moderate` - Moderate comment (admin only)
- `DELETE /api/v1/comments/:id` - Delete comment (admin only)

### Exchange Rates
- `GET /api/v1/exchange-rates` - Get current rates
- `GET /api/v1/exchange-rates/historical` - Get historical rates

### File Upload
- `POST /api/v1/upload` - Upload file (auth required)
- `DELETE /api/v1/upload/:filename` - Delete file (auth required)

### Reports
- `GET /api/v1/reports/user-activity` - User activity report (admin only)
- `GET /api/v1/reports/content` - Content report (admin only)
- `GET /api/v1/reports/system-health` - System health report (admin only)

### Health Check
- `GET /health` - Service health status

## Compatibility with Next.js

The Go backend maintains **full compatibility** with the Next.js frontend:

- ✅ Same JWT tokens (NextAuth compatible)
- ✅ Same API request/response formats
- ✅ Same database schema (Ent matches Prisma)
- ✅ Same error codes and messages
- ✅ Gradual migration support

## Background Workers

The following workers run automatically:

- **Exchange Rate Worker** - Updates currency rates every 5 minutes
- **Newsletter Worker** - Sends daily newsletters
- **Sitemap Worker** - Generates sitemap hourly
- **Analytics Worker** - Aggregates analytics nightly
- **Cache Warmer** - Pre-populates cache every 10 minutes

## Monitoring

### Metrics Endpoint

Prometheus metrics available at:
```
GET /metrics
```

### Health Check

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2024-12-06T10:30:00Z"
}
```

## Deployment

### Production Build

```bash
# Build optimized binary
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o biotak-backend cmd/server/main.go

# Run
./biotak-backend
```

### Docker Deployment

```bash
# Build image
docker build -f Dockerfile.go -t biotak-backend:latest .

# Run container
docker run -p 8080:8080 --env-file .env biotak-backend:latest
```

## Performance

Expected performance improvements over Next.js:

- **Response Time**: 10-50ms (vs 100-500ms)
- **Throughput**: 10,000+ req/s (vs 1,000 req/s)
- **Memory Usage**: 50-100MB (vs 500MB-1GB)
- **CPU Usage**: 10-20% (vs 50-80%)

## Troubleshooting

### Go Not Installed

```bash
# Windows (PowerShell as Admin)
choco install golang

# Or download from: https://golang.org/dl/
```

### Port Already in Use

```bash
# Change PORT in .env file
PORT=8081
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.go.yml ps

# Check DATABASE_URL in .env
```

### Redis Connection Failed

```bash
# Check Redis is running
docker-compose -f docker-compose.go.yml ps

# Check REDIS_URL in .env
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `go test ./...`
4. Run linter: `golangci-lint run`
5. Submit a pull request

## License

Same as the main Biotak project.

## Support

For issues and questions, please refer to the main project documentation or create an issue in the repository.
