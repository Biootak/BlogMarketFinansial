# PowerShell Script to Install Go on Windows
# Run as Administrator: powershell -ExecutionPolicy Bypass -File install-go-windows.ps1

Write-Host "🚀 Installing Go for Biotak Backend Development" -ForegroundColor Green
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if Chocolatey is installed
Write-Host "📦 Checking for Chocolatey package manager..." -ForegroundColor Cyan
$chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue

if (-not $chocoInstalled) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "✅ Chocolatey installed successfully" -ForegroundColor Green
} else {
    Write-Host "✅ Chocolatey is already installed" -ForegroundColor Green
}

# Install Go
Write-Host ""
Write-Host "📦 Installing Go..." -ForegroundColor Cyan
choco install golang -y

# Install Make
Write-Host ""
Write-Host "📦 Installing Make..." -ForegroundColor Cyan
choco install make -y

# Refresh environment variables
Write-Host ""
Write-Host "🔄 Refreshing environment variables..." -ForegroundColor Cyan
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify installations
Write-Host ""
Write-Host "✅ Verifying installations..." -ForegroundColor Cyan

try {
    $goVersion = go version
    Write-Host "✅ Go installed: $goVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Go installation failed" -ForegroundColor Red
}

try {
    $makeVersion = make --version | Select-Object -First 1
    Write-Host "✅ Make installed: $makeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Make installation failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen PowerShell/Terminal" -ForegroundColor White
Write-Host "2. Run: go mod download" -ForegroundColor White
Write-Host "3. Run: make docker-up" -ForegroundColor White
Write-Host "4. Run: go run cmd/server/main.go" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
