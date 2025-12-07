# Testing Setup Guide

این راهنما نحوه راه‌اندازی محیط تست برای Go backend را توضیح می‌دهد.

## پیش‌نیازها

1. **PostgreSQL Database** - یک دیتابیس تست در Neon یا PostgreSQL محلی
2. **Redis** (اختیاری) - برای تست‌های cache
3. **Go 1.21+** - نصب شده باشد

## مراحل Setup

### 1. ایجاد دیتابیس تست در Neon

1. به [Neon Console](https://console.neon.tech) بروید
2. یک Project جدید بسازید یا از project موجود استفاده کنید
3. دو Database بسازید:
   - `biotak_go` - برای development
   - `biotak_go_test` - برای تست‌ها
4. Connection string ها را کپی کنید

### 2. پیکربندی فایل .env.test

فایل `.env.test` را ویرایش کنید و connection string دیتابیس تست را وارد کنید:

```bash
# Test Database Configuration
DATABASE_URL="postgresql://user:password@host/biotak_go_test?sslmode=require"

# Redis Configuration (use different DB for tests)
REDIS_URL="redis://localhost:6379/1"

# Authentication (same as production for compatibility)
AUTH_SECRET="oe7gMAB/LNi6qqMMXimQsgNssvS2tw5YUMmgqd5eDOY="
```

### 3. اجرای اسکریپت Setup

**Windows (PowerShell):**
```powershell
.\scripts\setup-test-db.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup-test-db.sh
./scripts/setup-test-db.sh
```

### 4. اجرای تست‌ها

**تمام تست‌ها:**
```bash
go test ./... -v
```

**فقط تست‌های سریع (بدون database):**
```bash
go test ./... -v -short
```

**تست‌های یک package خاص:**
```bash
go test ./internal/database -v
go test ./internal/handlers -v
go test ./tests/integration -v
```

**با coverage:**
```bash
go test ./... -v -cover
go test ./... -v -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## ساختار تست‌ها

```
tests/
├── integration/          # تست‌های integration
│   ├── api_compatibility_test.go
│   ├── jwt_compatibility_test.go
│   └── schema_compatibility_test.go
├── load/                 # تست‌های load (k6)
└── unit/                 # تست‌های unit (در کنار کد)

internal/
├── database/
│   ├── transaction_test.go
│   ├── redis_test.go
│   └── ...
├── handlers/
│   ├── auth_handler_test.go
│   └── ...
├── services/
│   └── ...
└── utils/
    ├── jwt_test.go
    ├── hash_test.go
    └── ...
```

## انواع تست‌ها

### Unit Tests
تست‌های سریع که dependencies خارجی ندارند:
- JWT utilities
- Password hashing
- Slug generation
- Input validation

### Integration Tests
تست‌هایی که به database یا سرویس‌های خارجی نیاز دارند:
- API compatibility
- Database operations
- Transaction management
- JWT cross-compatibility

### Load Tests
تست‌های performance با k6:
- Authentication load
- Post listing performance
- Rate limiting
- Cache performance

## Troubleshooting

### خطای "cannot connect to database"

1. مطمئن شوید دیتابیس تست در Neon ساخته شده
2. Connection string را در `.env.test` چک کنید
3. مطمئن شوید `sslmode=require` برای Neon استفاده شده

### خطای "CGO_ENABLED=0"

اگر از SQLite استفاده می‌کنید، باید CGO را فعال کنید:
```bash
$env:CGO_ENABLED=1  # Windows
export CGO_ENABLED=1  # Linux/Mac
```

**توصیه:** از PostgreSQL برای تست‌ها استفاده کنید (مثل production).

### تست‌ها خیلی کند هستند

1. از `-short` flag استفاده کنید تا تست‌های database skip شوند
2. از connection pooling استفاده کنید
3. تست‌ها را parallel اجرا کنید:
   ```bash
   go test ./... -v -parallel 4
   ```

### خطای "table already exists"

Schema قبلی را پاک کنید:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

یا از یک دیتابیس جدید استفاده کنید.

## CI/CD Integration

برای GitHub Actions یا GitLab CI:

```yaml
- name: Setup test database
  run: |
    echo "DATABASE_URL=${{ secrets.TEST_DATABASE_URL }}" > .env.test
    go generate ./ent
    
- name: Run tests
  run: go test ./... -v -cover
```

## Best Practices

1. **همیشه cleanup کنید**: تست‌ها باید data خود را پاک کنند
2. **از transaction استفاده کنید**: برای rollback خودکار
3. **تست‌ها را isolated نگه دارید**: هر تست باید مستقل باشد
4. **از test fixtures استفاده کنید**: برای data تکراری
5. **Mock کردن محدود**: فقط برای external services

## مثال تست

```go
func TestCreateUser(t *testing.T) {
    // Setup
    client, cleanup := setupTestClient(t)
    defer cleanup()
    
    ctx := context.Background()
    
    // Test
    user, err := client.User.Create().
        SetEmail("test@example.com").
        SetPassword("hashed").
        SetName("Test").
        Save(ctx)
    
    // Assert
    require.NoError(t, err)
    assert.Equal(t, "test@example.com", user.Email)
}
```

## منابع

- [Ent Testing Guide](https://entgo.io/docs/testing/)
- [Go Testing Package](https://pkg.go.dev/testing)
- [Testify Documentation](https://github.com/stretchr/testify)
