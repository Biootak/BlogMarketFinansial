#!/usr/bin/env bash
# start.sh -- mount share + run Trae IDE on Fedora Live
# Usage (first time): sudo mkdir -p /mnt/FinancialMarket && sudo mount -t vboxsf -o uid=$(id -u),gid=$(id -g),fmode=0755,dmode=0755,exec FinancialMarket /mnt/FinancialMarket && bash /mnt/FinancialMarket/start.sh
# Usage (after mount): bash /mnt/FinancialMarket/start.sh

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
# ============================================================================
step "Shared folder"
sudo mkdir -p "$MOUNT_DIR"
if ! mountpoint -q "$MOUNT_DIR" 2>/dev/null; then
    sudo mount -t vboxsf \
        -o uid=$(id -u),gid=$(id -g),fmode=0755,dmode=0755,exec \
        FinancialMarket "$MOUNT_DIR" \
        || fail "Mount failed. Are Guest Additions installed?"
fi
ok "Mounted: $MOUNT_DIR"
[[ -f "$RPM_FILE" ]] || fail "Trae RPM not found: $RPM_FILE"

# ============================================================================
# 2. GPU + GNOME tweaks
#    Fedora 44 kernel (6.19+) has built-in vmwgfx for VMSVGA 3D acceleration.
#    Guest Additions only needed for mouse integration + clipboard.
#    For short sessions (1h), vmwgfx alone is good enough.
# ============================================================================
step "GPU + GNOME tweaks"

# -- GNOME tweaks: always apply (instant, no download needed) --
gsettings set org.gnome.desktop.interface enable-animations false 2>/dev/null || true
gsettings set org.gnome.shell.extensions.dash-to-dock animate-show-apps false 2>/dev/null || true
systemctl --user mask tracker-miner-fs-3.service tracker-extract-3.service tracker-xdg-portal-3.service 2>/dev/null || true
systemctl --user stop tracker-miner-fs-3.service tracker-extract-3.service tracker-xdg-portal-3.service 2>/dev/null || true
if command -v powerprofilesctl &>/dev/null; then
    powerprofilesctl set performance 2>/dev/null || true
fi
ok "Animations off, tracker disabled, power profile set."

# -- GPU check: vmwgfx provides hardware 3D without Guest Additions --
if lsmod | grep -q vmwgfx 2>/dev/null; then
    ok "VMware SVGA (vmwgfx) active -- hardware 3D ready."
else
    warn "No vmwgfx -- trying Guest Additions for GPU..."
    if sudo dnf install -y virtualbox-guest-additions 2>/dev/null; then
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
# 3. tmpfs workspace (2 GB) -- Trae extract goes here, NOT on the overlay
# ============================================================================
step "tmpfs workspace"
if ! mountpoint -q "$WORK_DIR" 2>/dev/null; then
    sudo mkdir -p "$WORK_DIR"
    sudo mount -t tmpfs -o size=2G,uid=$(id -u),gid=$(id -g),mode=0755 \
        tmpfs "$WORK_DIR" || fail "tmpfs mount failed"
fi
ok "Workspace: $WORK_DIR  (2 GB tmpfs)"

# ============================================================================
# 4. Zram swap (doubles effective RAM for Electron)
#    Order: algorithm -> disksize -> mkswap -> swapon
# ============================================================================
step "Zram swap"
if ! swapon --show | grep -q zram 2>/dev/null; then
    ZRAM_MB=$(( $(grep MemTotal /proc/meminfo | awk '{print $2}') / 2 / 1024 ))
    [[ $ZRAM_MB -gt 4096 ]] && ZRAM_MB=4096

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
# ============================================================================
step "Trae cache tmpfs"
for d in "$HOME/.config/Trae/Cache" "$HOME/.cache/Trae"; do
    mkdir -p "$d"
    mountpoint -q "$d" 2>/dev/null && ok "Already tmpfs: $d" && continue
    sudo mount -t tmpfs -o size=512m,uid=$(id -u),gid=$(id -g) tmpfs "$d" \
        && ok "tmpfs: $d" || warn "tmpfs failed for $d"
done

# ============================================================================
# 6. Install missing Electron libs (one-time download, cached for reuse)
# ============================================================================
step "Electron libs"
sudo ldconfig 2>/dev/null || true
NEED=()
ldconfig -p | grep -q libnss3.so    || NEED+=(nss)
ldconfig -p | grep -q libgbm.so.1   || NEED+=(mesa-libgbm)
ldconfig -p | grep -q libpango-1.0  || NEED+=(pango)
ldconfig -p | grep -q libasound.so.2 || NEED+=(alsa-lib)

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

    # Download + cache for future VMs
    if [[ ${#NEED[@]} -gt 0 ]]; then
        info "Downloading libs (one-time, cached for next VM)..."
        sudo dnf install -y \
            --setopt=keepcache=1 \
            --setopt="cachedir=$RPM_CACHE" \
            "${NEED[@]}" 2>&1 | tail -3 || true
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
# 7. Proxy auto-detect (PrivadoVPN / SOCKS5 on host)
# ============================================================================
step "Proxy"
HOST_IP="10.0.2.2"
PROXY_URL=""
for port in 1080 8080 3128; do
    if timeout 1 bash -c "echo > /dev/tcp/$HOST_IP/$port" 2>/dev/null; then
        PROXY_URL="socks5://${HOST_IP}:${port}"
        break
    fi
done

if [[ -n "$PROXY_URL" ]]; then
    export HTTP_PROXY="$PROXY_URL"
    export HTTPS_PROXY="$PROXY_URL"
    export http_proxy="$PROXY_URL"
    export https_proxy="$PROXY_URL"
    export NO_PROXY="localhost,127.0.0.1,10.0.2.2"
    export no_proxy="localhost,127.0.0.1,10.0.2.2"
    ok "Proxy: $PROXY_URL"
else
    info "No proxy detected on host ($HOST_IP). Trae AI features may not connect."
fi

# ============================================================================
# 8. Extract Trae RPM into tmpfs (skip if already done)
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
    cd "$EXTRACT_DIR"
    rpm2cpio "$RPM_FILE" | cpio -idm 2>/dev/null
    TRAE_BIN=$(find "$EXTRACT_DIR" -type f -name "trae" | head -1)
    [[ -n "$TRAE_BIN" ]] || fail "Trae binary not found after extraction."
    chmod +x "$TRAE_BIN"
    ok "Extracted: $TRAE_BIN"
fi

# ============================================================================
# 9. Launch Trae
# ============================================================================
echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  Ready!  Free RAM: $(free -m | awk '/^Mem:/{print $7}') MB"
echo -e "======================================================${NC}"
echo
step "Launching Trae IDE"
exec "$TRAE_BIN" \
    --no-sandbox --disable-gpu-sandbox \
    --enable-gpu-rasterization --enable-zero-copy \
    --disable-software-rasterizer \
    "$MOUNT_DIR"
