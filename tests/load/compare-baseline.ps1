# Compare Go Backend Performance with Next.js Baseline
# This script runs load tests against both Next.js and Go backends and compares results

param(
    [string]$NextJsUrl = "http://localhost:3000",
    [string]$GoUrl = "http://localhost:8080",
    [string]$TestFile = "tests/load/auth-load.js"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Performance Comparison: Next.js vs Go" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$RESULTS_DIR = "tests/load/results/comparison"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

# Create results directory
New-Item -ItemType Directory -Force -Path $RESULTS_DIR | Out-Null

Write-Host "Configuration:"
Write-Host "  Next.js URL: $NextJsUrl"
Write-Host "  Go URL: $GoUrl"
Write-Host "  Test File: $TestFile"
Write-Host "  Results Directory: $RESULTS_DIR"
Write-Host ""

# Check if k6 is installed
try {
    $null = Get-Command k6 -ErrorAction Stop
} catch {
    Write-Host "ERROR: k6 is not installed" -ForegroundColor Red
    exit 1
}

# Function to run test against a backend
function Run-BackendTest {
    param(
        [string]$BackendName,
        [string]$BaseUrl,
        [string]$TestFile
    )
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Testing: $BackendName" -ForegroundColor Cyan
    Write-Host "URL: $BaseUrl" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    # Check if backend is running
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "✓ $BackendName is healthy" -ForegroundColor Green
    } catch {
        Write-Host "✗ $BackendName is not responding" -ForegroundColor Red
        return $null
    }
    
    $outputFile = "$RESULTS_DIR/${BackendName}_${TIMESTAMP}.txt"
    $jsonFile = "$RESULTS_DIR/${BackendName}_${TIMESTAMP}.json"
    
    # Run test
    $env:BASE_URL = $BaseUrl
    k6 run --out "json=$jsonFile" $TestFile 2>&1 | Tee-Object -FilePath $outputFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $BackendName test completed" -ForegroundColor Green
    } else {
        Write-Host "✗ $BackendName test failed" -ForegroundColor Red
    }
    
    Write-Host ""
    
    return @{
        OutputFile = $outputFile
        JsonFile = $jsonFile
        ExitCode = $LASTEXITCODE
    }
}

# Run tests
Write-Host "Running performance comparison..." -ForegroundColor Cyan
Write-Host ""

# Test Next.js
Write-Host "Step 1/2: Testing Next.js baseline..." -ForegroundColor Yellow
$nextjsResult = Run-BackendTest -BackendName "nextjs" -BaseUrl $NextJsUrl -TestFile $TestFile
Start-Sleep -Seconds 10

# Test Go
Write-Host "Step 2/2: Testing Go backend..." -ForegroundColor Yellow
$goResult = Run-BackendTest -BackendName "go" -BaseUrl $GoUrl -TestFile $TestFile

# Compare results
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Performance Comparison Results" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($nextjsResult -and $goResult) {
    # Extract key metrics from output files
    function Extract-Metrics {
        param([string]$FilePath)
        
        $content = Get-Content $FilePath -Raw
        
        $metrics = @{}
        
        # Extract http_req_duration p(95)
        if ($content -match 'http_req_duration.*p\(95\)=([0-9.]+)(ms|s)') {
            $value = [double]$matches[1]
            $unit = $matches[2]
            $metrics['p95_duration'] = if ($unit -eq 's') { $value * 1000 } else { $value }
        }
        
        # Extract http_req_failed rate
        if ($content -match 'http_req_failed.*?([0-9.]+)%') {
            $metrics['error_rate'] = [double]$matches[1]
        }
        
        # Extract http_reqs (throughput)
        if ($content -match 'http_reqs.*?([0-9.]+)/s') {
            $metrics['throughput'] = [double]$matches[1]
        }
        
        # Extract checks pass rate
        if ($content -match 'checks.*?([0-9.]+)%') {
            $metrics['checks_pass_rate'] = [double]$matches[1]
        }
        
        return $metrics
    }
    
    $nextjsMetrics = Extract-Metrics -FilePath $nextjsResult.OutputFile
    $goMetrics = Extract-Metrics -FilePath $goResult.OutputFile
    
    Write-Host "Metric                    Next.js         Go Backend      Improvement"
    Write-Host "------------------------------------------------------------------------"
    
    # Compare p95 response time
    if ($nextjsMetrics['p95_duration'] -and $goMetrics['p95_duration']) {
        $improvement = (($nextjsMetrics['p95_duration'] - $goMetrics['p95_duration']) / $nextjsMetrics['p95_duration']) * 100
        $color = if ($improvement -gt 0) { "Green" } else { "Red" }
        Write-Host ("P95 Response Time         {0,8:F2}ms      {1,8:F2}ms      {2,6:F1}%" -f `
            $nextjsMetrics['p95_duration'], $goMetrics['p95_duration'], $improvement) -ForegroundColor $color
    }
    
    # Compare error rate
    if ($nextjsMetrics['error_rate'] -and $goMetrics['error_rate']) {
        $improvement = (($nextjsMetrics['error_rate'] - $goMetrics['error_rate']) / $nextjsMetrics['error_rate']) * 100
        $color = if ($improvement -gt 0) { "Green" } else { "Red" }
        Write-Host ("Error Rate                {0,8:F2}%       {1,8:F2}%       {2,6:F1}%" -f `
            $nextjsMetrics['error_rate'], $goMetrics['error_rate'], $improvement) -ForegroundColor $color
    }
    
    # Compare throughput
    if ($nextjsMetrics['throughput'] -and $goMetrics['throughput']) {
        $improvement = (($goMetrics['throughput'] - $nextjsMetrics['throughput']) / $nextjsMetrics['throughput']) * 100
        $color = if ($improvement -gt 0) { "Green" } else { "Red" }
        Write-Host ("Throughput (req/s)        {0,8:F2}        {1,8:F2}        {2,6:F1}%" -f `
            $nextjsMetrics['throughput'], $goMetrics['throughput'], $improvement) -ForegroundColor $color
    }
    
    # Compare checks pass rate
    if ($nextjsMetrics['checks_pass_rate'] -and $goMetrics['checks_pass_rate']) {
        $improvement = (($goMetrics['checks_pass_rate'] - $nextjsMetrics['checks_pass_rate']) / $nextjsMetrics['checks_pass_rate']) * 100
        $color = if ($improvement -gt 0) { "Green" } else { "Red" }
        Write-Host ("Checks Pass Rate          {0,8:F2}%       {1,8:F2}%       {2,6:F1}%" -f `
            $nextjsMetrics['checks_pass_rate'], $goMetrics['checks_pass_rate'], $improvement) -ForegroundColor $color
    }
    
    Write-Host ""
    Write-Host "Detailed results saved to:"
    Write-Host "  Next.js: $($nextjsResult.OutputFile)"
    Write-Host "  Go:      $($goResult.OutputFile)"
    
} else {
    Write-Host "Could not complete comparison - one or both backends failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Comparison complete!" -ForegroundColor Green
