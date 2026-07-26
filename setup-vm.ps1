param(
    [string]$VMName   = "",
    [int]$RAM_MB      = 8192,
    [int]$CPU_Count   = 4,
    [int]$VRAM_MB     = 128,
    [switch]$DryRun
)

# Project root — works even when run from a Desktop shortcut
$PROJECT_ROOT = if ($PSScriptRoot -and (Test-Path "$PSScriptRoot\fedora-live-setup.sh")) {
    $PSScriptRoot
} elseif (Test-Path "E:\FinancialMarket\fedora-live-setup.sh") {
    "E:\FinancialMarket"
} else {
    $found = @("E:\FinancialMarket","D:\FinancialMarket","C:\FinancialMarket") |
             Where-Object { Test-Path "$_\fedora-live-setup.sh" } | Select-Object -First 1
    if ($found) { $found } else {
        Write-Host "[FAIL] Project folder not found. Make sure E:\FinancialMarket exists." -ForegroundColor Red
        exit 1
    }
}

function info($m)  { Write-Host "[INFO]  $m" -ForegroundColor Cyan }
function ok($m)    { Write-Host "[OK]    $m" -ForegroundColor Green }
function warn($m)  { Write-Host "[WARN]  $m" -ForegroundColor Yellow }
function fail($m)  { Write-Host "[FAIL]  $m" -ForegroundColor Red; exit 1 }
function step($m)  { Write-Host "`n==> $m" -ForegroundColor Blue }

# ---------- Find VBoxManage ----------
step "Finding VirtualBox"
$vbm = @(
    "$env:ProgramFiles\Oracle\VirtualBox\VBoxManage.exe",
    "${env:ProgramFiles(x86)}\Oracle\VirtualBox\VBoxManage.exe",
    "VBoxManage"
) | Where-Object { Test-Path $_ -ErrorAction SilentlyContinue } | Select-Object -First 1

if (-not $vbm) { fail "VBoxManage not found. Is VirtualBox installed?" }
ok "VBoxManage: $vbm"

# ---------- Select VM ----------
step "Selecting VM"
$allVMs = & $vbm list vms 2>&1 |
    Select-String '"(.+)"' |
    ForEach-Object { $_.Matches[0].Groups[1].Value }

if ($allVMs.Count -eq 0) { fail "No VMs found." }

if ($VMName -eq "") {
    $found = $allVMs | Where-Object { $_ -imatch "(fedora|live|linux|dev)" }
    if ($found.Count -eq 1) {
        $VMName = $found[0]
        info "Auto-selected VM: $VMName"
    } elseif ($found.Count -gt 1) {
        $found | ForEach-Object { Write-Host "  - $_" }
        $VMName = $found[0]
        warn "Multiple VMs found. Using: $VMName  (use -VMName to specify)"
    } else {
        $allVMs | ForEach-Object { Write-Host "  - $_" }
        $VMName = $allVMs[0]
        warn "No Fedora VM found. Using first: $VMName  (use -VMName to specify)"
    }
}

if ($allVMs -notcontains $VMName) { fail "VM '$VMName' not found." }
ok "VM: $VMName"

# ---------- Check not running ----------
$running = & $vbm list runningvms 2>&1 | Select-String ([regex]::Escape('"' + $VMName + '"'))
if ($running) { fail "VM is running. Shut it down first: Machine > ACPI Shutdown" }

# ---------- Apply settings ----------
step "Applying optimized settings"

$cmds = [ordered]@{
    "RAM ${RAM_MB}MB"            = "--memory $RAM_MB"
    "CPU $CPU_Count cores"       = "--cpus $CPU_Count"
    "CPU cap 100pct"             = "--cpuexecutioncap 100"
    "PAE on"                     = "--pae on"
    "nested paging on"           = "--nestedpaging on"
    "large pages on"             = "--largepages on"
    "CPU hotplug off"            = "--cpuhotplug off"
    "VRAM ${VRAM_MB}MB"          = "--vram $VRAM_MB"
    "graphics VMSVGA"            = "--graphicscontroller vmsvga"
    "3D accel on"                = "--accelerate3d on"
    "2D accel on"                = "--accelerate2dvideo on"
    "IO APIC on"                 = "--ioapic on"
    "HPET on"                    = "--hpet on"
    "RTC UTC on"                 = "--rtcuseutc on"
    "audio off"                  = "--audio none"
    "clipboard bidir"            = "--clipboard bidirectional"
    "drag-drop bidir"            = "--draganddrop bidirectional"
    "USB 3.0 on"                 = "--usbxhci on"
    "boot1 dvd"                  = "--boot1 dvd"
    "boot2 disk"                 = "--boot2 disk"
    "boot3 none"                 = "--boot3 none"
    "boot4 none"                 = "--boot4 none"
}

$applied = 0; $skipped = 0
foreach ($entry in $cmds.GetEnumerator()) {
    $label = $entry.Key
    $args  = $entry.Value -split " "

    if ($DryRun) { info "[DRY] $label"; continue }

    & $vbm modifyvm $VMName @args 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { ok "$label"; $applied++ }
    else                     { warn "$label skipped"; $skipped++ }
}

# ---------- Shared Folder ----------
step "Shared Folder"
info "Project path: $PROJECT_ROOT"

& $vbm sharedfolder remove $VMName --name "FinancialMarket" 2>&1 | Out-Null

& $vbm sharedfolder add $VMName `
    --name "FinancialMarket" `
    --hostpath $PROJECT_ROOT `
    --automount `
    --auto-mount-point "/mnt/FinancialMarket" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    ok "Shared Folder: $PROJECT_ROOT -> /mnt/FinancialMarket (automount)"
} else {
    warn "Shared Folder could not be set. Set it manually in VirtualBox settings."
}

# ---------- Summary ----------
step "Done"
Write-Host ""
Write-Host "  VM      : $VMName"
Write-Host "  RAM     : ${RAM_MB}MB"
Write-Host "  CPU     : $CPU_Count cores"
Write-Host "  VRAM    : ${VRAM_MB}MB + 3D"
Write-Host "  Share   : $PROJECT_ROOT -> /mnt/FinancialMarket"
Write-Host ""

if (-not $DryRun) {
    ok "Done. $applied settings applied, $skipped skipped."
    Write-Host ""
    Write-Host "  Next steps after booting Fedora Live:" -ForegroundColor Yellow
    Write-Host "  1. Open terminal" -ForegroundColor Yellow
    Write-Host "  2. Run: sudo umount /mnt/FinancialMarket" -ForegroundColor Yellow
    Write-Host "  3. Run: sudo mount -t vboxsf -o uid=1000,gid=1000,fmode=0755,dmode=0755 FinancialMarket /mnt/FinancialMarket" -ForegroundColor Yellow
    Write-Host "  4. Run: bash /mnt/FinancialMarket/start.sh" -ForegroundColor Yellow
} else {
    warn "DryRun -- no changes made."
}
