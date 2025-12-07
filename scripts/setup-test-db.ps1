# Setup Test Database Script (PowerShell)
# This script sets up the test database for running tests

Write-Host "🔧 Setting up test database..." -ForegroundColor Cyan

# Load test environment
if (Test-Path .env.test) {
    Get-Content .env.test | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✅ Loaded .env.test" -ForegroundColor Green
} else {
    Write-Host "❌ .env.test file not found!" -ForegroundColor Red
    Write-Host "Please create .env.test with your test database URL" -ForegroundColor Yellow
    exit 1
}

# Check if DATABASE_URL is set
$dbUrl = $env:DATABASE_URL
if ([string]::IsNullOrEmpty($dbUrl)) {
    Write-Host "❌ DATABASE_URL not set in .env.test" -ForegroundColor Red
    exit 1
}

Write-Host "📊 Database URL: $dbUrl" -ForegroundColor Cyan

# Generate Ent code
Write-Host "🔄 Generating Ent code..." -ForegroundColor Cyan
go generate ./ent
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Generated Ent code" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to generate Ent code" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Test database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run tests with:" -ForegroundColor Cyan
Write-Host "  go test ./... -v" -ForegroundColor White
Write-Host "  go test ./internal/database -v" -ForegroundColor White
Write-Host "  go test ./tests/integration -v" -ForegroundColor White
