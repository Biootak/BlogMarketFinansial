# Go Backend Setup Guide

This guide will help you set up the Go backend for the Biotak project.

## Step 1: Install Go

### Windows

**Option 1: Using Chocolatey (Recommended)**
```powershell
# Run PowerShell as Administrator
choco install golang
```

**Option 2: Manual Installation**
1. Download Go from: https://golang.org/dl/
2. Run the installer (e.g., `go1.21.5.windows-amd64.msi`)
3. Follow the installation wizard
4. Verify installation:
   ```powershell
   go version
   ```

### macOS

**Option 1: Using Homebrew (Recommended)**
```bash
brew install go
```

**Option 2: Manual Installation**
1. Download Go from: https://golang.org/dl/
2. Open the package file and follow instructions
3. Verify installation:
   ```bash
   go version
   ```

### Linux

**Ubuntu/Debian:**
```bash
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
go version
```

**Fedora/RHEL:**
```bash
sudo dnf install golang
go version
```

## Step 2: Verify Go Installation

```bash
go version
# Expected output: go version go1.21.x ...

go env
# Should show Go environment variables
```

## Step 3: Initialize the Project

```bash
# Navigate to the project directory
cd /path/to/biotak-go-backend

# Download dependencies
go mod download

# Verify dependencies
go mod verify
```

## Step 4: Install Development Tools

```bash
# Install Ent CLI (for code generation)
go install entgo.io/ent/cmd/ent@latest

# Install golangci-lint (for linting)
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Verify installations
ent version
golangci-lint version
```

## Step 5: Setup Environment Variables

```bash
# Copy the environment template
cp .env.go .env

# Edit .env with your configuration
# Update DATABASE_URL, REDIS_URL, etc.
```

## Step 6: Setup Local Development Environment

### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.go.yml up -d postgres redis

# Verify services are running
docker-compose -f docker-compose.go.yml ps
```

### Option B: Manual Setup

**Install PostgreSQL:**
- Windows: https://www.postgresql.org/download/windows/
- macOS: `brew install postgresql`
- Linux: `sudo apt install postgresql`

**Install Redis:**
- Windows: https://github.com/microsoftarchive/redis/releases
- macOS: `brew install redis`
- Linux: `sudo apt install redis-server`

**Start Services:**
```bash
# PostgreSQL
sudo service postgresql start

# Redis
sudo service redis-server start
```

## Step 7: Generate Ent Code

```bash
# Generate Ent schemas and code
go generate ./ent

# This will create type-safe database models
```

## Step 8: Run Database Migrations

```bash
# Run migrations (once Ent schemas are defined)
go run cmd/server/main.go migrate
```

## Step 9: Run the Application

```bash
# Run in development mode
go run cmd/server/main.go

# Or build and run
go build -o biotak-backend cmd/server/main.go
./biotak-backend
```

## Step 10: Verify Installation

```bash
# Check health endpoint
curl http://localhost:8080/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "redis": "connected"
# }
```

## Common Issues and Solutions

### Issue: "go: command not found"

**Solution:** Go is not installed or not in PATH
```bash
# Windows: Add to PATH
# C:\Go\bin

# Linux/macOS: Add to ~/.bashrc or ~/.zshrc
export PATH=$PATH:/usr/local/go/bin
```

### Issue: "cannot find package"

**Solution:** Dependencies not downloaded
```bash
go mod download
go mod tidy
```

### Issue: "database connection failed"

**Solution:** Check PostgreSQL is running and DATABASE_URL is correct
```bash
# Test PostgreSQL connection
psql -h localhost -U biotak -d biotak

# Check .env file has correct DATABASE_URL
```

### Issue: "redis connection failed"

**Solution:** Check Redis is running
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check .env file has correct REDIS_URL
```

### Issue: Port 8080 already in use

**Solution:** Change port in .env
```env
PORT=8081
```

## Next Steps

1. ✅ Go installed and verified
2. ✅ Dependencies downloaded
3. ✅ Development tools installed
4. ✅ Environment configured
5. ✅ Database and Redis running
6. ✅ Application running

Now you're ready to start implementing the backend features!

Refer to `README.go.md` for detailed API documentation and development guidelines.

## Useful Commands

```bash
# Run tests
make test

# Run with coverage
make test-cover

# Generate Ent code
make generate

# Start Docker services
make docker-up

# Stop Docker services
make docker-down

# Build application
make build

# Run linter
make lint

# View all commands
make help
```

## Resources

- Go Documentation: https://golang.org/doc/
- Gin Framework: https://gin-gonic.com/docs/
- Ent ORM: https://entgo.io/docs/getting-started
- Go by Example: https://gobyexample.com/
