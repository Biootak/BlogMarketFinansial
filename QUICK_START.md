# Quick Start Guide - Biotak Go Backend

## 🚀 Get Started in 5 Minutes

### Prerequisites Check

Before starting, you need:
- [ ] Go 1.21+ installed
- [ ] Docker installed (optional but recommended)
- [ ] PostgreSQL running (or use Docker)
- [ ] Redis running (or use Docker)

### Step 1: Install Go (if not installed)

**Windows:**
```powershell
# Using Chocolatey (run as Administrator)
choco install golang

# Verify
go version
```

**macOS:**
```bash
brew install go
go version
```

**Linux:**
```bash
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
go version
```

### Step 2: Setup Project

```bash
# Download dependencies
go mod download

# Install development tools
go install entgo.io/ent/cmd/ent@latest
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.go .env

# The .env file is already configured with your current credentials
# No changes needed unless you want to use different services
```

### Step 4: Start Services

**Option A: Using Docker (Recommended)**
```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.go.yml up -d postgres redis

# Check services are running
docker-compose -f docker-compose.go.yml ps
```

**Option B: Use Existing Services**
```bash
# If you already have PostgreSQL and Redis running,
# just make sure the URLs in .env are correct
```

### Step 5: Generate Ent Code (After schemas are defined)

```bash
# This will be done in Phase 2
go generate ./ent
```

### Step 6: Run the Application

```bash
# Run in development mode
go run cmd/server/main.go

# Or use Make
make run
```

### Step 7: Verify It Works

```bash
# Check health endpoint
curl http://localhost:8080/health

# Expected: {"status":"healthy",...}
```

## 📋 Common Commands

```bash
# Development
make run              # Run the server
make test             # Run tests
make test-cover       # Run tests with coverage

# Docker
make docker-up        # Start all services
make docker-down      # Stop all services
make docker-logs      # View logs

# Code Generation
make generate         # Generate Ent code

# Build
make build            # Build binary
make clean            # Clean build artifacts

# Quality
make lint             # Run linter

# Help
make help             # Show all commands
```

## 🔧 Troubleshooting

### "go: command not found"
→ Go is not installed. See Step 1 above.

### "cannot find package"
```bash
go mod download
go mod tidy
```

### "port 8080 already in use"
```bash
# Change PORT in .env
PORT=8081
```

### "database connection failed"
```bash
# Start PostgreSQL with Docker
docker-compose -f docker-compose.go.yml up -d postgres

# Or check your DATABASE_URL in .env
```

## 📚 Documentation

- **README.go.md** - Complete project documentation
- **SETUP.md** - Detailed setup instructions
- **PROJECT_STRUCTURE.md** - Project structure overview
- **.kiro/specs/go-backend-migration/** - Full specification

## ✅ What's Next?

You've completed **Task 1: Initialize Go project and setup development environment**

Next tasks:
1. ✅ Task 1: Project setup (DONE)
2. ⏭️ Task 2: Install and configure core dependencies
3. ⏭️ Task 3: Setup database connections and health checks
4. ⏭️ Task 4: Define Ent schemas for all data models

To start the next task, open `.kiro/specs/go-backend-migration/tasks.md` and click "Start task" next to Task 2.

## 🎯 Current Status

**Phase 1: Project Setup & Infrastructure** - In Progress

- ✅ Go module initialized
- ✅ Project directory structure created
- ✅ Environment configuration ready
- ✅ Docker setup complete
- ✅ Documentation created
- ⏳ Dependencies to be installed (Task 2)
- ⏳ Database connections to be implemented (Task 3)

## 💡 Tips

1. **Use Docker** for the easiest development experience
2. **Read SETUP.md** for detailed platform-specific instructions
3. **Check README.go.md** for API documentation
4. **Use Make commands** for common tasks
5. **Follow the task list** in `.kiro/specs/go-backend-migration/tasks.md`

## 🆘 Need Help?

- Check **SETUP.md** for detailed instructions
- Review **PROJECT_STRUCTURE.md** for file organization
- Read the specs in **.kiro/specs/go-backend-migration/**
- Look at **Makefile** for available commands

---

**Ready to continue?** Open the tasks file and start Task 2! 🚀
