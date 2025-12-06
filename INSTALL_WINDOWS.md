# نصب Go و Make در Windows

## روش 1: نصب خودکار (توصیه می‌شود) ⚡

### مرحله 1: اجرای اسکریپت نصب

1. **PowerShell را به عنوان Administrator باز کنید:**
   - کلید Windows را فشار دهید
   - تایپ کنید: `PowerShell`
   - روی "Windows PowerShell" راست کلیک کنید
   - "Run as administrator" را انتخاب کنید

2. **به پوشه پروژه بروید:**
   ```powershell
   cd C:\Users\Fatemehkh\Desktop\BlogMarketFinansial1
   ```

3. **اسکریپت نصب را اجرا کنید:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File install-go-windows.ps1
   ```

4. **منتظر بمانید تا نصب کامل شود** (حدود 2-5 دقیقه)

5. **PowerShell را ببندید و دوباره باز کنید** (برای بارگذاری متغیرهای محیطی)

6. **تست کنید:**
   ```powershell
   go version
   make --version
   ```

---

## روش 2: نصب دستی 🔧

### نصب Go

#### گزینه A: استفاده از Chocolatey

1. **نصب Chocolatey** (اگر نصب نیست):
   ```powershell
   # PowerShell را به عنوان Administrator باز کنید
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **نصب Go:**
   ```powershell
   choco install golang -y
   ```

#### گزینه B: نصب دستی

1. به سایت Go بروید: https://go.dev/dl/
2. فایل `go1.21.x.windows-amd64.msi` را دانلود کنید
3. فایل را اجرا کنید و مراحل نصب را دنبال کنید
4. پس از نصب، PowerShell را ببندید و دوباره باز کنید

### نصب Make

#### گزینه A: استفاده از Chocolatey

```powershell
choco install make -y
```

#### گزینه B: استفاده از Scoop

1. **نصب Scoop:**
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   ```

2. **نصب Make:**
   ```powershell
   scoop install make
   ```

#### گزینه C: استفاده از Git Bash

اگر Git for Windows نصب دارید، می‌توانید از Git Bash استفاده کنید که Make را به صورت پیش‌فرض دارد.

---

## تست نصب ✅

پس از نصب، PowerShell جدید باز کنید و تست کنید:

```powershell
# تست Go
go version
# خروجی باید باشد: go version go1.21.x windows/amd64

# تست Make
make --version
# خروجی باید باشد: GNU Make x.x
```

---

## مراحل بعدی 🚀

پس از نصب موفق Go و Make:

### 1. دانلود Dependencies

```powershell
cd C:\Users\Fatemehkh\Desktop\BlogMarketFinansial1
go mod download
```

### 2. نصب ابزارهای توسعه

```powershell
# نصب Ent CLI
go install entgo.io/ent/cmd/ent@latest

# نصب golangci-lint
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

### 3. راه‌اندازی Docker (اختیاری)

اگر Docker Desktop نصب دارید:

```powershell
docker-compose -f docker-compose.go.yml up -d postgres redis
```

### 4. اجرای سرور

```powershell
go run cmd/server/main.go
```

یا با استفاده از Make:

```powershell
make run
```

### 5. تست Health Check

در مرورگر یا با curl:

```powershell
curl http://localhost:8080/health
```

یا در مرورگر: http://localhost:8080/health

---

## عیب‌یابی 🔍

### مشکل: "go: command not found"

**راه‌حل:**
1. PowerShell را ببندید و دوباره باز کنید
2. اگر هنوز کار نکرد، سیستم را Restart کنید
3. بررسی کنید که Go در PATH باشد:
   ```powershell
   $env:Path
   ```

### مشکل: "make: command not found"

**راه‌حل:**
1. از Git Bash استفاده کنید به جای PowerShell
2. یا دستورات را مستقیماً اجرا کنید:
   ```powershell
   # به جای: make run
   go run cmd/server/main.go
   
   # به جای: make test
   go test ./...
   
   # به جای: make docker-up
   docker-compose -f docker-compose.go.yml up -d
   ```

### مشکل: "execution policy" error

**راه‌حل:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## دستورات مفید 📝

```powershell
# دانلود dependencies
go mod download

# اجرای سرور
go run cmd/server/main.go

# اجرای تست‌ها
go test ./...

# Build کردن
go build -o biotak-backend.exe cmd/server/main.go

# اجرای با Docker
docker-compose -f docker-compose.go.yml up -d

# مشاهده logs
docker-compose -f docker-compose.go.yml logs -f

# توقف Docker
docker-compose -f docker-compose.go.yml down
```

---

## منابع 📚

- **Go Documentation:** https://go.dev/doc/
- **Chocolatey:** https://chocolatey.org/
- **Make for Windows:** https://gnuwin32.sourceforge.net/packages/make.htm
- **Git for Windows:** https://gitforwindows.org/

---

## کمک بیشتر 💬

اگر مشکلی داشتید:
1. فایل `SETUP.md` را بخوانید
2. فایل `README.go.md` را بررسی کنید
3. فایل `QUICK_START.md` را مطالعه کنید

---

**موفق باشید! 🎉**
