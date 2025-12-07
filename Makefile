.PHONY: help build run test clean docker-up docker-down migrate generate lint migration-up migration-down feature-flags

# Default target
help:
	@echo "Biotak Go Backend - Available Commands:"
	@echo ""
	@echo "Build & Run:"
	@echo "  make build           - Build the application"
	@echo "  make run             - Run the application"
	@echo "  make test            - Run all tests"
	@echo "  make test-cover      - Run tests with coverage"
	@echo "  make clean           - Clean build artifacts"
	@echo ""
	@echo "Docker (Go Backend Only):"
	@echo "  make docker-up       - Start Docker services (Go backend)"
	@echo "  make docker-down     - Stop Docker services"
	@echo "  make docker-logs     - View Docker logs"
	@echo ""
	@echo "Migration Infrastructure:"
	@echo "  make migration-up    - Start full migration stack (Nginx + Next.js + Go)"
	@echo "  make migration-down  - Stop migration stack"
	@echo "  make migration-logs  - View migration stack logs"
	@echo "  make migration-health - Check health of all services"
	@echo ""
	@echo "Feature Flags:"
	@echo "  make feature-flags   - Build feature flags CLI tool"
	@echo "  make flags-init      - Initialize default feature flags"
	@echo "  make flags-list      - List all feature flags"
	@echo ""
	@echo "Database:"
	@echo "  make generate        - Generate Ent code"
	@echo "  make migrate         - Run database migrations"
	@echo ""
	@echo "Development:"
	@echo "  make lint            - Run linter"
	@echo "  make deps            - Install dependencies"
	@echo "  make tools           - Install development tools"
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

# Migration Infrastructure Commands

# Start full migration stack (Nginx + Next.js + Go)
migration-up:
	@echo "Starting migration infrastructure..."
	docker-compose -f docker-compose.migration.yml up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Migration stack started!"
	@echo ""
	@echo "Services:"
	@echo "  - Nginx Proxy:    http://localhost"
	@echo "  - Next.js:        http://localhost:3000 (internal)"
	@echo "  - Go Backend:     http://localhost:8080 (internal)"
	@echo "  - Health Check:   http://localhost/health"
	@echo ""
	@echo "Use 'make migration-health' to check service status"

# Stop migration stack
migration-down:
	@echo "Stopping migration infrastructure..."
	docker-compose -f docker-compose.migration.yml down
	@echo "Migration stack stopped"

# View migration stack logs
migration-logs:
	docker-compose -f docker-compose.migration.yml logs -f

# Check health of all services
migration-health:
	@echo "Checking service health..."
	@echo ""
	@echo "Overall Health:"
	@curl -s http://localhost/health | jq . || echo "Failed to connect"
	@echo ""
	@echo "Next.js Health:"
	@curl -s http://localhost/health/nextjs | jq . || echo "Failed to connect"
	@echo ""
	@echo "Go Backend Health:"
	@curl -s http://localhost/health/go | jq . || echo "Failed to connect"

# Feature Flags Commands

# Build feature flags CLI tool
feature-flags:
	@echo "Building feature flags CLI..."
	go build -o bin/feature-flags cmd/feature-flags/main.go
	@echo "Built: bin/feature-flags"
	@echo ""
	@echo "Usage:"
	@echo "  ./bin/feature-flags list"
	@echo "  ./bin/feature-flags set auth.login 25"
	@echo "  ./bin/feature-flags enable post.create"

# Initialize default feature flags
flags-init:
	@echo "Initializing feature flags..."
	@go run cmd/feature-flags/main.go init

# List all feature flags
flags-list:
	@go run cmd/feature-flags/main.go list

# Get specific flag
flags-get:
	@if [ -z "$(FLAG)" ]; then \
		echo "Usage: make flags-get FLAG=auth.login"; \
		exit 1; \
	fi
	@go run cmd/feature-flags/main.go get $(FLAG)

# Set flag rollout percentage
flags-set:
	@if [ -z "$(FLAG)" ] || [ -z "$(PERCENT)" ]; then \
		echo "Usage: make flags-set FLAG=auth.login PERCENT=25"; \
		exit 1; \
	fi
	@go run cmd/feature-flags/main.go set $(FLAG) $(PERCENT)

# Enable flag (100%)
flags-enable:
	@if [ -z "$(FLAG)" ]; then \
		echo "Usage: make flags-enable FLAG=auth.login"; \
		exit 1; \
	fi
	@go run cmd/feature-flags/main.go enable $(FLAG)

# Disable flag (0%)
flags-disable:
	@if [ -z "$(FLAG)" ]; then \
		echo "Usage: make flags-disable FLAG=auth.login"; \
		exit 1; \
	fi
	@go run cmd/feature-flags/main.go disable $(FLAG)
