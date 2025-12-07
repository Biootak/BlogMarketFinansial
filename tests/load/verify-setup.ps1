# Verify Load Testing Setup
$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Load Testing Setup Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: k6 installation
Write-Host "Checking k6 installation..." -NoNewline
try {
    $k6Version = k6 version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "  Version: $k6Version" -ForegroundColor Gray
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Host "  k6 is not installed" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "  k6 is not installed" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# Check 2: Test files
Write-Host "Checking test files..." -NoNewline
$testFiles = @(
    "tests/load/auth-load.js",
    "tests/load/post-listing-load.js",
    "tests/load/rate-limit-test.js",
    "tests/load/cache-performance.js",
    "tests/load/full-system-load.js"
)

$missingFiles = @()
foreach ($file in $testFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# Check 3: Results directory
Write-Host "Checking results directory..." -NoNewline
if (Test-Path "tests/load/results") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " CREATING" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "tests/load/results" | Out-Null
    Write-Host "  Created" -ForegroundColor Green
}

Write-Host ""

# Check 4: Go backend
Write-Host "Checking Go backend..." -NoNewline
$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:8080" }
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "  Backend not running at $BASE_URL" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# Check 5: Makefile
Write-Host "Checking Makefile..." -NoNewline
if (Test-Path "Makefile") {
    $makefileContent = Get-Content "Makefile" -Raw
    if ($makefileContent -match "load-test:") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run: make load-test-smoke" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "Some checks failed" -ForegroundColor Red
    exit 1
}
