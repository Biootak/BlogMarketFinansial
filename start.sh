#!/usr/bin/env bash
# start.sh -- mount share + run Trae IDE on Fedora Live
# Usage (first time): sudo mkdir -p /mnt/FinancialMarket && sudo mount -t vboxsf -o uid=$(id -u),gid=$(id -g),fmode=0755,dmode=0755,exec FinancialMarket /mnt/FinancialMarket && bash /mnt/FinancialMarket/start.sh
# Usage (after mount): bash /mnt/FinancialMarket/start.sh
#
# Project access strategy:
#   vboxsf shared folder is slow (3-layer: Trae→vboxsf→VirtualBox→NTFS).
#   Instead, the project is rsynced once into a tmpfs RAM disk so Trae AI
#   reads and writes at RAM speed. A background loop syncs changes back to
#   the shared folder every 30 s so Windows always has the latest files.

# NOTE: set -euo pipefail is INTENTIONAL -- fail fast on real errors.
# Every fallible command uses || true or explicit error handling.
set -euo pipefail

MOUNT_DIR="/mnt/FinancialMarket"
RPM_FILE="$MOUNT_DIR/Trae-linux-x64.rpm"
WORK_DIR="/run/live-work"
TRAE_BIN=""

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

# ============================================================================
# 1. Mount shared folder
#    Handles both automount (appears automatically) and manual mount cases.
#    If automounted, remounts with correct liveuser permissions.
#    NOTE: vboxsf "remount" is unreliable on some kernels — unmount + remount
#    is more portable and always applies correct uid/gid/fmode.
# ============================================================================
step "Shared folder"
sudo mkdir -p "$MOUNT_DIR"

# Load vboxsf kernel module if available (harmless if built-in)
sudo modprobe vboxsf 2>/dev/null || true

if mountpoint -q "$MOUNT_DIR" 2>/dev/null; then
    # Already mounted — do a proper unmount + remount to guarantee correct
    # uid/gid/fmode. "remount" on vboxsf is not guaranteed to re-apply options.
    sudo umount "$MOUNT_DIR" 2>/dev/null || true
fi

sudo mount -t vboxsf \
    -o uid=$(id -u),gid=$(id -g),fmode=0755,dmode=0755,exec \
    FinancialMarket "$MOUNT_DIR" \
    || fail "Mount failed. Did you create the VM with new-fedora-vm.ps1?"

ok "Mounted: $MOUNT_DIR"
[[ -f "$RPM_FILE" ]] || fail "Trae RPM not found: $RPM_FILE"

# ============================================================================
# 2. GPU + GNOME tweaks
#    Fedora 44 kernel (6.19+) has built-in vmwgfx for VMSVGA 3D acceleration.
#    Guest Additions only needed for mouse integration + clipboard.
# ============================================================================
step "GPU + GNOME tweaks"

# -- GNOME tweaks: only apply if we have a display session --
if [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]; then
    gsettings set org.gnome.desktop.interface enable-animations false 2>/dev/null || true
    gsettings set org.gnome.shell.extensions.dash-to-dock animate-show-apps false 2>/dev/null || true
    systemctl --user mask tracker-miner-fs-3.service tracker-extract-3.service 2>/dev/null || true
    systemctl --user stop tracker-miner-fs-3.service tracker-extract-3.service 2>/dev/null || true
    if command -v powerprofilesctl &>/dev/null; then
        powerprofilesctl set performance 2>/dev/null || true
    fi
    ok "Animations off, tracker disabled."
else
    info "No display session -- skipping GNOME tweaks."
fi

# -- GPU check: vmwgfx provides hardware 3D without Guest Additions --
if lsmod | grep -q vmwgfx 2>/dev/null; then
    ok "VMware SVGA (vmwgfx) active -- hardware 3D ready."
else
    warn "No vmwgfx -- trying Guest Additions for GPU..."
    # 90s timeout — Iranian internet can be slow
    if timeout 90 sudo dnf install -y virtualbox-guest-additions 2>/dev/null; then
        sudo modprobe vboxguest 2>/dev/null || true
        ok "Guest Additions installed."
    elif [[ -b /dev/sr1 ]]; then
        info "Installing from VBoxGuestAdditions.iso..."
        sudo mkdir -p /mnt/cdrom
        if sudo mount /dev/sr1 /mnt/cdrom 2>/dev/null; then
            sudo /mnt/cdrom/VBoxLinuxAdditions.run --nox11 --quiet 2>/dev/null && \
                ok "Guest Additions installed." || warn "Guest Additions had warnings."
            sudo umount /mnt/cdrom 2>/dev/null || true
        fi
    else
        warn "Software rendering fallback -- performance will suffer."
    fi
fi

# ============================================================================
# 3. tmpfs workspace (4 GB) -- Trae extract goes here, NOT on the overlay
#    Increased from 2 GB so Electron + AI model cache fit without eviction.
# ============================================================================
step "tmpfs workspace"
if ! mountpoint -q "$WORK_DIR" 2>/dev/null; then
    sudo mkdir -p "$WORK_DIR"
    sudo mount -t tmpfs -o size=4G,uid=$(id -u),gid=$(id -g),mode=0755 \
        tmpfs "$WORK_DIR" || fail "tmpfs mount failed"
fi
ok "Workspace: $WORK_DIR  (4 GB tmpfs)"

# ============================================================================
# 4. Zram swap (doubles effective RAM for Electron)
#    Order: modprobe -> algorithm -> disksize -> mkswap -> swapon
# ============================================================================
step "Zram swap"
if ! swapon --show | grep -q zram 2>/dev/null; then
    # Use up to 8 GB of zram so AI inference doesn't OOM under load.
    ZRAM_MB=$(( $(grep MemTotal /proc/meminfo | awk '{print $2}') / 2 / 1024 )) || ZRAM_MB=2048
    [[ $ZRAM_MB -gt 8192 ]] && ZRAM_MB=8192

    sudo modprobe zram 2>/dev/null || true
    # Set compression algorithm BEFORE disksize (kernel requirement)
    echo zstd | sudo tee /sys/block/zram0/comp_algorithm >/dev/null 2>/dev/null || true
    echo "${ZRAM_MB}M" | sudo tee /sys/block/zram0/disksize >/dev/null 2>/dev/null || true
    sudo mkswap /dev/zram0 >/dev/null 2>/dev/null || true
    sudo swapon -p 100 /dev/zram0 2>/dev/null || true

    if swapon --show | grep -q zram; then
        ok "Zram ${ZRAM_MB} MB active (zstd)."
    else
        warn "Zram skipped."
    fi
else
    ok "Zram already active."
fi

# ============================================================================
# 5. Trae cache on tmpfs (keeps Electron writes off the overlay)
#    Each cache dir gets 1 GB so the AI extension cache is not evicted.
# ============================================================================
step "Trae cache tmpfs"
for d in "$HOME/.config/Trae/Cache" "$HOME/.cache/Trae"; do
    mkdir -p "$d"
    mountpoint -q "$d" 2>/dev/null && ok "Already tmpfs: $d" && continue
    sudo mount -t tmpfs -o size=1G,uid=$(id -u),gid=$(id -g) tmpfs "$d" \
        && ok "tmpfs: $d" || warn "tmpfs failed for $d"
done

# ============================================================================
# 6. Install missing Electron libs (one-time download, cached for reuse)
#    Full set of libs Trae/Electron needs — same as a normal Linux desktop.
# ============================================================================
step "Electron libs"
sudo ldconfig 2>/dev/null || true
NEED=()
ldconfig -p | grep -q libnss3.so       || NEED+=(nss)
ldconfig -p | grep -q libgbm.so.1      || NEED+=(mesa-libgbm)
ldconfig -p | grep -q libpango-1.0     || NEED+=(pango)
ldconfig -p | grep -q libasound.so.2   || NEED+=(alsa-lib)
ldconfig -p | grep -q libxkbcommon.so  || NEED+=(libxkbcommon)
ldconfig -p | grep -q libdrm.so.2      || NEED+=(libdrm)
ldconfig -p | grep -q libXcomposite.so || NEED+=(libXcomposite)
ldconfig -p | grep -q libXdamage.so    || NEED+=(libXdamage)
ldconfig -p | grep -q libXrandr.so     || NEED+=(libXrandr)
ldconfig -p | grep -q libcups.so       || NEED+=(cups-libs)

if [[ ${#NEED[@]} -gt 0 ]]; then
    RPM_CACHE="$MOUNT_DIR/.cache/rpms"
    sudo mkdir -p "$RPM_CACHE"

    # Try installing from persistent cache (offline)
    CACHE_PKG_DIR="$RPM_CACHE/packages"
    if [[ -d "$CACHE_PKG_DIR" ]]; then
        CACHE_FILES=("$CACHE_PKG_DIR"/*.rpm)
        if [[ -f "${CACHE_FILES[0]}" ]]; then
            info "Found cached RPMs -- installing offline..."
            if sudo dnf install -y "${CACHE_FILES[@]}" 2>/dev/null; then
                sudo ldconfig 2>/dev/null || true
                ok "Libs installed from cache (no download)."
                NEED=()
            else
                warn "Cache install failed, re-downloading..."
            fi
        fi
    fi

    # Download + cache for future VMs (120s timeout — enough for slow connections)
    if [[ ${#NEED[@]} -gt 0 ]]; then
        info "Downloading libs: ${NEED[*]}"
        timeout 120 sudo dnf install -y \
            --setopt=keepcache=1 \
            --setopt="cachedir=$RPM_CACHE" \
            "${NEED[@]}" 2>&1 | tail -5 || true
        sudo ldconfig 2>/dev/null || true
        if ldconfig -p | grep -q libnss3.so 2>/dev/null; then
            ok "Libs installed + cached in shared folder."
        else
            warn "Some libs missing -- Trae may still launch."
        fi
    fi
else
    ok "All libs present."
fi

# ============================================================================
# 7. Proxy
#    The VM uses VirtualBox NAT (10.0.2.2 = Windows host).
#    Any VPN / filter-breaker running on Windows already covers all traffic
#    that leaves the host — no extra proxy config needed inside the VM.
# ============================================================================
step "Proxy"
ok "Using host network via VirtualBox NAT — Windows VPN covers this VM automatically."

# ============================================================================
# 8. Project on RAM disk (tmpfs)
#    vboxsf is slow: every file read/write crosses 3 layers
#    (Trae → vboxsf → VirtualBox → Windows NTFS).
#    Solution: rsync the project once into tmpfs (RAM), open Trae there,
#    and run a background loop that syncs changes back to the shared folder
#    every 30 s so Windows always has the latest files.
# ============================================================================
step "Project RAM disk"
PROJECT_RAM="$WORK_DIR/project"
mkdir -p "$PROJECT_RAM"

# Make sure rsync is available (Fedora Live has it, but just in case)
if ! command -v rsync &>/dev/null; then
    info "Installing rsync..."
    timeout 60 sudo dnf install -y rsync 2>/dev/null || true
fi

if command -v rsync &>/dev/null; then
    info "Syncing project to RAM disk (first time may take a moment)..."
    rsync -a --delete \
        --exclude='.git/' \
        --exclude='node_modules/' \
        --exclude='.next/' \
        --exclude='__pycache__/' \
        --exclude='.cache/' \
        "$MOUNT_DIR/" "$PROJECT_RAM/" \
        && ok "Project on RAM disk: $PROJECT_RAM" \
        || warn "rsync failed — falling back to shared folder."

    # Background sync loop: RAM → shared folder every 30 s
    # Runs in a detached subshell; killed automatically when the VM shuts down.
    (
        while true; do
            sleep 30
            rsync -a --delete \
                --exclude='.git/' \
                --exclude='node_modules/' \
                --exclude='.next/' \
                --exclude='__pycache__/' \
                --exclude='.cache/' \
                "$PROJECT_RAM/" "$MOUNT_DIR/" 2>/dev/null || true
        done
    ) &
    SYNC_PID=$!
    ok "Background sync started (PID $SYNC_PID) — saves to Windows every 30 s."
    TRAE_PROJECT="$PROJECT_RAM"
else
    warn "rsync not available — opening project directly from shared folder (slower)."
    TRAE_PROJECT="$MOUNT_DIR"
fi

# ============================================================================
# 9. Extract Trae RPM into tmpfs (skip if already done)
#    Uses a subshell for `cd` so the working directory of this script
#    is never changed — avoids confusing errors if `cd` fails.
# ============================================================================
step "Trae IDE"
EXTRACT_DIR="$WORK_DIR/trae-app"
EXISTING=$(find "$EXTRACT_DIR" -type f -name "trae" 2>/dev/null | head -1 || true)
if [[ -n "$EXISTING" && -x "$EXISTING" ]]; then
    TRAE_BIN="$EXISTING"
    ok "Already extracted: $TRAE_BIN"
else
    info "Extracting Trae RPM..."
    rm -rf "$EXTRACT_DIR" && mkdir -p "$EXTRACT_DIR"
    # Run extraction in a subshell so `cd` doesn't affect the parent script
    (cd "$EXTRACT_DIR" && rpm2cpio "$RPM_FILE" | cpio -idm 2>/dev/null) \
        || fail "RPM extraction failed."
    TRAE_BIN=$(find "$EXTRACT_DIR" -type f -name "trae" | head -1)
    [[ -n "$TRAE_BIN" ]] || fail "Trae binary not found after extraction."
    chmod +x "$TRAE_BIN"
    ok "Extracted: $TRAE_BIN"
fi

# ============================================================================
# 10. Launch Trae
#     --ozone-platform is set dynamically:
#       - Wayland session  → wayland  (Fedora 44 default, better performance)
#       - X11 / no session → x11      (fallback, always works)
#     --disable-dev-shm-usage : /dev/shm is tiny on Live — use /tmp instead
#     --ignore-gpu-blocklist  : allow GPU accel even if GPU is on blocklist
#     --enable-gpu-rasterization : GPU-accelerated 2D paint (faster UI)
#     --enable-zero-copy      : skip extra CPU copy for GPU textures
# ============================================================================
if [[ -n "${WAYLAND_DISPLAY:-}" ]]; then
    OZONE_FLAG="--ozone-platform=wayland"
    info "Display: Wayland"
else
    OZONE_FLAG="--ozone-platform=x11"
    info "Display: X11 (Wayland not detected)"
fi

echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  Ready!  Free RAM: $(free -m | awk '/^Mem:/{print $7}') MB"
echo "  Project: $TRAE_PROJECT"
echo -e "======================================================${NC}"
echo
step "Launching Trae IDE"
exec "$TRAE_BIN" \
    --no-sandbox --disable-gpu-sandbox \
    $OZONE_FLAG \
    --enable-gpu-rasterization --enable-zero-copy \
    --ignore-gpu-blocklist \
    --disable-dev-shm-usage \
    "$TRAE_PROJECT"
