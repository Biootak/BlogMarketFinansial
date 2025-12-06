# PowerShell Script to Install Go on Windows
# Run as Administrator: powershell -ExecutionPolicy Bypass -File install-go-windows.ps1

Write-Host "Installing Go for Biotak Backend..." -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Go version to install
$goVersion = "1.21.5"
$goUrl = "https://go.dev/dl/go$goVersion.windows-amd64.msi"
$installerPath = "$env:TEMP\go-installer.msi"

Write-Host "Downloading Go $goVersion..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $goUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "Download complete!" -ForegroundColor Green
} catch {
    Write-Host "Failed to download Go: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing Go..." -ForegroundColor Yellow
try {
    Start-Process msiexec.exe -ArgumentList "/i", $installerPath, "/quiet", "/norestart" -Wait
    Write-Host "Go installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to install Go: $_" -ForegroundColor Red
    exit 1
}

# Clean up installer
Remove-Item $installerPath -Force

Write-Host ""
Write-Host "Configuring environment..." -ForegroundColor Yellow

# Add Go to PATH if not already there
$goPath = "C:\Program Files\Go\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$goPath*") {
    $newPath = $currentPath + ";" + $goPath
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "Added Go to system PATH" -ForegroundColor Green
} else {
    Write-Host "Go already in system PATH" -ForegroundColor Green
}

# Set GOPATH
$goPathDir = "$env:USERPROFILE\go"
[Environment]::SetEnvironmentVariable("GOPATH", $goPathDir, "User")
Write-Host "Set GOPATH to $goPathDir" -ForegroundColor Green

# Refresh environment variables
$machinePath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
$env:Path = $machinePath + ";" + $userPath

Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Verify Go installation
try {
    $goVersionOutput = & "C:\Program Files\Go\bin\go.exe" version
    Write-Host "SUCCESS: $goVersionOutput" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Go installed but not yet in PATH. Please restart PowerShell." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing Make for Windows..." -ForegroundColor Yellow

# Check if Chocolatey is installed
$chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
if (-not $chocoInstalled) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Host "Chocolatey installed!" -ForegroundColor Green
}

# Install Make
Write-Host "Installing Make..." -ForegroundColor Yellow
choco install make -y
Write-Host "Make installed!" -ForegroundColor Green

Write-Host ""
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Close and reopen PowerShell (or restart your terminal)" -ForegroundColor White
Write-Host "2. Verify installation: go version" -ForegroundColor White
Write-Host "3. Download dependencies: go mod download" -ForegroundColor White
Write-Host "4. Install dev tools: make tools" -ForegroundColor White
Write-Host "5. Start Docker services: make docker-up" -ForegroundColor White
Write-Host "6. Run the server: go run cmd/server/main.go" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Restart your terminal for changes to take effect!" -ForegroundColor Yellow
