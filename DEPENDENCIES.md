# Dependencies Guide - Biotak Go Backend

## Overview

This document lists all core dependencies required for the Biotak Go backend and provides installation instructions.

## Core Dependencies

### 1. Gin Web Framework
**Package:** `github.com/gin-gonic/gin`  
**Version:** v1.9.1  
**Purpose:** HTTP web framework for building REST APIs  
**Features:**
- Fast HTTP router
- Middleware support
- JSON validation
- Error management
- Group routing

**Installation:**
```bash
go get github.com/gin-gonic/gin@v1.9.1
```

**Documentation:** https://gin-gonic.com/docs/

---

### 2. Ent ORM
**Package:** `entgo.io/ent`  
**Version:** v0.12.5  
**Purpose:** Type-safe ORM for database operations  
**Features:**
- Schema-as-code
- Type-safe queries
- Automatic migrations
- Graph traversal
- Eager loading

**Installation:**
```bash
go get entgo.io/ent/cmd/ent@v0.12.5
```

**Documentation:** https://entgo.io/docs/getting-started

---

### 3. JWT Library
**Package:** `github.com/golang-jwt/jwt/v5`  
**Version:** v5.2.0  
**Purpose:** JSON Web Token implementation for authentication  
**Features:**
- Token generation
- Token validation
- Claims management
- Multiple signing methods

**Installation:**
```bash
go get github.com/golang-jwt/jwt/v5@v5.2.0
```

**Documentation:** https://github.com/golang-jwt/jwt

---

### 4. Redis Client
**Package:** `github.com/redis/go-redis/v9`  
**Version:** v9.3.1  
**Purpose:** Redis client for caching and session management  
**Features:**
- Connection pooling
- Pub/Sub support
- Pipeline support
- Cluster support

**Installation:**
```bash
go get github.com/redis/go-redis/v9@v9.3.1
```

**Documentation:** https://redis.uptrace.dev/

---

### 5. Bcrypt (Password Hashing)
**Package:** `golang.org/x/crypto/bcrypt`  
**Version:** v0.17.0  
**Purpose:** Secure password hashing  
**Features:**
- Adaptive hashing
- Salt generation
- Cost factor configuration

**Installation:**
```bash
go get golang.org/x/crypto@v0.17.0
```

**Documentation:** https://pkg.go.dev/golang.org/x/crypto/bcrypt

---

### 6. UUID Library
**Package:** `github.com/google/uuid`  
**Version:** v1.5.0  
**Purpose:** UUID generation for unique identifiers  
**Features:**
- UUID v4 generation
- UUID parsing
- UUID validation

**Installation:**
```bash
go get github.com/google/uuid@v1.5.0
```

**Documentation:** https://github.com/google/uuid

---

### 7. AWS S3 SDK
**Packages:**
- `github.com/aws/aws-sdk-go-v2` v1.24.0
- `github.com/aws/aws-sdk-go-v2/config` v1.26.1
- `github.com/aws/aws-sdk-go-v2/credentials` v1.16.12
- `github.com/aws/aws-sdk-go-v2/service/s3` v1.47.5

**Purpose:** S3-compatible storage (Liara) for file uploads  
**Features:**
- File upload/download
- Bucket operations
- Presigned URLs
- Multipart uploads

**Installation:**
```bash
go get github.com/aws/aws-sdk-go-v2@v1.24.0
go get github.com/aws/aws-sdk-go-v2/config@v1.26.1
go get github.com/aws/aws-sdk-go-v2/credentials@v1.16.12
go get github.com/aws/aws-sdk-go-v2/service/s3@v1.47.5
```

**Documentation:** https://aws.github.io/aws-sdk-go-v2/docs/

---

### 8. Validator
**Package:** `github.com/go-playground/validator/v10`  
**Version:** v10.16.0  
**Purpose:** Struct and field validation  
**Features:**
- Tag-based validation
- Custom validators
- Cross-field validation
- Localization support

**Installation:**
```bash
go get github.com/go-playground/validator/v10@v10.16.0
```

**Documentation:** https://github.com/go-playground/validator

---

## Installation Methods

### Method 1: Install All at Once (Recommended)

```bash
# Download all dependencies from go.mod
go mod download

# Verify dependencies
go mod verify

# Tidy up (remove unused, add missing)
go mod tidy
```

### Method 2: Install Individually

```bash
# Install each package
go get github.com/gin-gonic/gin@v1.9.1
go get entgo.io/ent/cmd/ent@v0.12.5
go get github.com/golang-jwt/jwt/v5@v5.2.0
go get github.com/redis/go-redis/v9@v9.3.1
go get golang.org/x/crypto@v0.17.0
go get github.com/google/uuid@v1.5.0
go get github.com/aws/aws-sdk-go-v2@v1.24.0
go get github.com/aws/aws-sdk-go-v2/config@v1.26.1
go get github.com/aws/aws-sdk-go-v2/credentials@v1.16.12
go get github.com/aws/aws-sdk-go-v2/service/s3@v1.47.5
go get github.com/go-playground/validator/v10@v10.16.0
```

### Method 3: Using Make

```bash
# Use the Makefile command
make deps
```

---

## Verification

After installation, verify all dependencies are correctly installed:

```bash
# List all dependencies
go list -m all

# Check for any issues
go mod verify

# View dependency graph
go mod graph
```

---

## Development Tools

In addition to core dependencies, install these development tools:

### Ent CLI (Code Generation)
```bash
go install entgo.io/ent/cmd/ent@latest
```

### golangci-lint (Linting)
```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

### Air (Hot Reload - Optional)
```bash
go install github.com/cosmtrek/air@latest
```

---

## Dependency Tree

```
biotak-go-backend
├── Gin (HTTP Framework)
│   ├── HTTP routing
│   ├── Middleware
│   └── JSON handling
│
├── Ent (ORM)
│   ├── Schema definition
│   ├── Code generation
│   └── Database operations
│
├── JWT (Authentication)
│   ├── Token generation
│   └── Token validation
│
├── Redis (Caching)
│   ├── Cache operations
│   └── Session management
│
├── Bcrypt (Security)
│   └── Password hashing
│
├── UUID (Identifiers)
│   └── Unique ID generation
│
├── AWS SDK (Storage)
│   ├── S3 operations
│   └── File management
│
└── Validator (Validation)
    ├── Input validation
    └── Struct validation
```

---

## Common Issues

### Issue: "go: command not found"
**Solution:** Install Go first (see SETUP.md)

### Issue: "cannot find package"
**Solution:**
```bash
go mod download
go mod tidy
```

### Issue: "version conflict"
**Solution:**
```bash
# Update to latest compatible versions
go get -u ./...
go mod tidy
```

### Issue: "checksum mismatch"
**Solution:**
```bash
# Clear module cache
go clean -modcache
go mod download
```

---

## Updating Dependencies

### Update All Dependencies
```bash
# Update to latest minor/patch versions
go get -u ./...
go mod tidy
```

### Update Specific Package
```bash
# Update specific package
go get -u github.com/gin-gonic/gin
go mod tidy
```

### Check for Updates
```bash
# List available updates
go list -u -m all
```

---

## Production Considerations

### Vendor Dependencies (Optional)
```bash
# Create vendor directory
go mod vendor

# Build using vendor
go build -mod=vendor
```

### Minimal Dependencies
The current dependency list is minimal and production-ready:
- No unnecessary packages
- Well-maintained libraries
- Active community support
- Security updates available

---

## Next Steps

After installing dependencies:

1. ✅ Dependencies installed
2. ⏭️ Setup database connections (Task 3)
3. ⏭️ Define Ent schemas (Task 4)
4. ⏭️ Implement utilities and middleware (Tasks 5-6)

---

## Resources

- **Go Modules:** https://go.dev/ref/mod
- **Dependency Management:** https://go.dev/doc/modules/managing-dependencies
- **Best Practices:** https://go.dev/doc/effective_go

---

**Status:** All core dependencies configured ✅

**Last Updated:** December 6, 2024
