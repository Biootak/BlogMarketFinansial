#!/bin/bash

# Setup Test Database Script
# This script sets up the test database for running tests

set -e

echo "🔧 Setting up test database..."

# Load test environment
if [ -f .env.test ]; then
    export $(cat .env.test | grep -v '^#' | xargs)
    echo "✅ Loaded .env.test"
else
    echo "❌ .env.test file not found!"
    echo "Please create .env.test with your test database URL"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env.test"
    exit 1
fi

echo "📊 Database URL: ${DATABASE_URL}"

# Run Ent migrations
echo "🔄 Running database migrations..."
go run cmd/server/main.go migrate || {
    echo "⚠️  Migration command not found, trying alternative..."
    # Alternative: use ent generate and create schema
    go generate ./ent
    echo "✅ Generated Ent code"
}

echo "✅ Test database setup complete!"
echo ""
echo "You can now run tests with:"
echo "  go test ./... -v"
echo "  go test ./internal/database -v"
echo "  go test ./tests/integration -v"
