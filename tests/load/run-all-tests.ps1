# Run All Load Tests (PowerShell version for Windows)
# This script runs all load tests in sequence and generates a summary report

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Biotak Go Backend - Load Testing Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:8080" }
$RESULTS_DIR = "tests/load/results"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

# Create results directory
New-Item -ItemType Directory -Force -Path $RESULTS_DIR | Out-Null

Write-Host "Configuration:"
Write-Host "  Base URL: $BASE_URL"
Write-Host "  Results Directory: $RESULTS_DIR"
Write-Host "  Timestamp: $TIMESTAMP"
Write-Host ""

# Check if k6 is installed
try {
    $null = Get-Command k6 -ErrorAction Stop
} catch {
    Write-Host "ERROR: k6 is not installed" -ForegroundColor Red
    Write-Host "Please install k6: https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
    Write-Host "  Windows (Chocolatey): choco install k6" -ForegroundColor Yellow
    Write-Host "  Windows (Scoop): scoop install k6" -ForegroundColor Yellow
    exit 1
}

# Check if server is running
Write-Host "Checking server health..."
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Server is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "ERROR: Server is not responding at $BASE_URL" -ForegroundColor Red
    Write-Host "Please start the server first: make run" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Function to run a test
function Run-Test {
    param(
        [string]$TestName,
        [string]$TestFile,
        [string]$Duration
    )
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Running: $TestName" -ForegroundColor Cyan
    Write-Host "Duration: ~$Duration" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    $outputFile = "$RESULTS_DIR/${TestName}_${TIMESTAMP}.txt"
    $jsonFile = "$RESULTS_DIR/${TestName}_${TIMESTAMP}.json"
    
    # Run test with both text and JSON output
    $env:BASE_URL = $BASE_URL
    k6 run --out "json=$jsonFile" $TestFile 2>&1 | Tee-Object -FilePath $outputFile
    
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "✓ $TestName PASSED" -ForegroundColor Green
    } else {
        Write-Host "✗ $TestName FAILED (exit code: $exitCode)" -ForegroundColor Red
    }
    
    Write-Host ""
    Start-Sleep -Seconds 5  # Cool down between tests
    
    return $exitCode
}

# Track results
$testResults = @()

# Run tests
Write-Host "Starting load tests..." -ForegroundColor Cyan
Write-Host ""

# 1. Authentication Load Test
$testResults += Run-Test -TestName "auth-load" -TestFile "tests/load/auth-load.js" -Duration "5 minutes"

# 2. Post Listing Load Test
$testResults += Run-Test -TestName "post-listing-load" -TestFile "tests/load/post-listing-load.js" -Duration "8 minutes"

# 3. Rate Limiting Test
$testResults += Run-Test -TestName "rate-limit-test" -TestFile "tests/load/rate-limit-test.js" -Duration "1 minute"

# 4. Cache Performance Test
$testResults += Run-Test -TestName "cache-performance" -TestFile "tests/load/cache-performance.js" -Duration "5 minutes"

# 5. Full System Load Test
$testResults += Run-Test -TestName "full-system-load" -TestFile "tests/load/full-system-load.js" -Duration "12 minutes"

# Generate summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Load Testing Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$testNames = @("auth-load", "post-listing-load", "rate-limit-test", "cache-performance", "full-system-load")
$passed = 0
$failed = 0

for ($i = 0; $i -lt $testResults.Count; $i++) {
    if ($testResults[$i] -eq 0) {
        Write-Host "✓ $($testNames[$i]): PASSED" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "✗ $($testNames[$i]): FAILED" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "Total: $($passed + $failed) tests"
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "Results saved to: $RESULTS_DIR"
Write-Host ""

# Exit with failure if any test failed
if ($failed -gt 0) {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ All tests passed" -ForegroundColor Green
    exit 0
}
