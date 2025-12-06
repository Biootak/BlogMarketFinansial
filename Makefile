.PHONY: help build run test clean docker-up docker-down migrate generate lint

# Default target
help:
	@echo "Biotak Go Backend - Available Commands:"
	@echo ""
	@echo "  make build        - Build the application"
	@echo "  make run          - Run the application"
	@echo "  make test         - Run all tests"
	@echo "  make test-cover   - Run tests with coverage"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-up    - Start Docker services"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make generate     - Generate Ent code"
	@echo "  make migrate      - Run database migrations"
	@echo "  make lint         - Run linter"
	@echo ""

# Build the application
build:
	@echo "Building Biotak Go Backend..."
	go build -o bin/biotak-backend cmd/server/main.go
	@echo "Build complete: bin/biotak-backend"

# Run the application
run:
	@echo "Starting Biotak Go Backend..."
	go run cmd/server/main.go

# Run all tests
test:
	@echo "Running tests..."
	go test -v ./...

# Run tests with coverage
test-cover:
	@echo "Running tests with coverage..."
	go test -cover -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/
	rm -f coverage.out coverage.html
	@echo "Clean complete"

# Start Docker services
docker-up:
	@echo "Starting Docker services..."
	docker-compose -f docker-compose.go.yml up -d
	@echo "Services started. Use 'make docker-logs' to view logs"

# Stop Docker services
docker-down:
	@echo "Stopping Docker services..."
	docker-compose -f docker-compose.go.yml down
	@echo "Services stopped"

# View Docker logs
docker-logs:
	docker-compose -f docker-compose.go.yml logs -f

# Generate Ent code
generate:
	@echo "Generating Ent code..."
	go generate ./ent
	@echo "Code generation complete"

# Run database migrations
migrate:
	@echo "Running database migrations..."
	go run cmd/server/main.go migrate
	@echo "Migrations complete"

# Run linter
lint:
	@echo "Running linter..."
	golangci-lint run
	@echo "Linting complete"

# Install dependencies
deps:
	@echo "Installing dependencies..."
	go mod download
	go mod tidy
	@echo "Dependencies installed"

# Install development tools
tools:
	@echo "Installing development tools..."
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install entgo.io/ent/cmd/ent@latest
	@echo "Tools installed"
