#!/usr/bin/env bash
# start-vmware.sh -- mount VMware shared folder + run Trae IDE on Fedora Live
# ============================================================
#  This is the VMware Workstation Pro counterpart of start.sh (VirtualBox).
#  Differences from the VirtualBox version:
#    - Uses open-vm-tools + vmhgfs-fuse instead of vboxsf
#    - Mount point: /mnt/hgfs/FinancialMarket (not /mnt/FinancialMarket)
#    - GPU acceleration uses vmwgfx (built into Fedora 44 kernel, no GA needed)
#    - Persistent disk at /dev/nvme0n1 for Trae config + dnf cache
#    - open-vm-tools provides clipboard, drag-drop, shared folders
# ============================================================

set -euo pipefail

MOUNT_DIR="/mnt/hgfs/FinancialMarket"
RPM_FILE="$MOUNT_DIR/Trae-linux-x64.rpm"
WORK_DIR="/run/live-work"
PERSIST_DEV="/dev/nvme0n1"
PERSIST_DIR="/mnt/persist"
TRAE_BIN=""

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

# ============================================================================
# 1. Verify open-vm-tools and mount shared folder
#    vmhgfs-fuse requires open-vm-tools installed and vmtoolD running.
# ============================================================================
step "Shared folder (VMware vmhgfs-fuse)"
sudo mkdir -p "$MOUNT_DIR"

# Ensure open-vm-tools is installed and running
if ! rpm -q open-vm-tools &>/dev/null; then
    info "Installing open-vm-tools..."
    timeout 120 sudo dnf install -y open-vm-tools || fail "open-vm-tools install failed"
fi
sudo systemctl enable --now vmtoolD 2>/dev/null || \
    sudo systemctl enable --now vmtoolsd 2>/dev/null || true

# Give vmtoolD a moment to initialize shared folder support
sleep 2

# Try mounting with vmhgfs-fuse (the modern VMware way)
if mountpoint -q "$MOUNT_DIR" 2>/dev/null; then
    sudo umount "$MOUNT_DIR" 2>/dev/null || true
fi

# Mount with vmhgfs-fuse (the modern VMware way).
# vmhgfs-fuse does NOT support vboxsf-style fmode=/dmode=; it uses umask/fmask/dmask.
# allow_other only works when /etc/fuse.conf contains user_allow_other, otherwise
# non-root users hit "Permission denied" on every path inside the share.
if ! grep -qs '^[[:space:]]*user_allow_other' /etc/fuse.conf 2>/dev/null; then
    echo 'user_allow_other' | sudo tee -a /etc/fuse.conf >/dev/null
fi

sudo /usr/bin/vmhgfs-fuse .host:/FinancialMarket "$MOUNT_DIR" \
    -o allow_other,uid=$(id -u),gid=$(id -g),umask=022 \
    || sudo /usr/bin/vmhgfs-fuse .host:/FinancialMarket "$MOUNT_DIR" -o allow_other \
    || fail "Mount failed. Is open-vm-tools running? Try: sudo systemctl restart vmtoolsd"

ok "Mounted: $MOUNT_DIR"
[[ -f "$RPM_FILE" ]] || fail "Trae RPM not found: $RPM_FILE"

# ============================================================================
# 2. Mount persistent NVMe disk (survives reboots)
#    Used for: Trae config cache, dnf package cache, Electron RPM cache
#    This is what makes "live" usable across reboots without installing.
# ============================================================================
step "Persistent disk (NVMe)"
sudo mkdir -p "$PERSIST_DIR"

if [[ -b "$PERSIST_DEV" ]]; then
    # Check if already formatted; format ext4 if not
    if ! sudo blkid "$PERSIST_DEV" &>/dev/null; then
        info "Formatting persistent disk as ext4..."
        echo -e "o\nn\np\n1\n\n\nw" | sudo fdisk "$PERSIST_DEV" 2>/dev/null || true
        sudo mkfs.ext4 -F -L persist "${PERSIST_DEV}p1" 2>/dev/null || \
            sudo mkfs.ext4 -F -L persist "$PERSIST_DEV" 2>/dev/null || true
        PERSIST_PART="${PERSIST_DEV}p1"
    else
        PERSIST_PART="$PERSIST_DEV"
        # Try partition if it exists
        [[ -b "${PERSIST_DEV}p1" ]] && PERSIST_PART="${PERSIST_DEV}p1"
    fi

    if ! mountpoint -q "$PERSIST_DIR" 2>/dev/null; then
        sudo mount -o noatime,data=writeback "$PERSIST_PART" "$PERSIST_DIR" 2>/dev/null || \
            sudo mount -o noatime,data=writeback "$PERSIST_DEV" "$PERSIST_DIR" || \
            warn "Persistent disk mount failed -- using Live only."
    fi

    if mountpoint -q "$PERSIST_DIR" 2>/dev/null; then
        sudo chown -R $(id -u):$(id -g) "$PERSIST_DIR" 2>/dev/null || true
        ok "Persistent disk: $PERSIST_DIR ($(df -h "$PERSIST_DIR" | awk 'NR==2{print $2}'))"
        # Create subdirs for Trae + dnf cache
        mkdir -p "$PERSIST_DIR/trae-config" "$PERSIST_DIR/dnf-cache" "$PERSIST_DIR/rpms"
        # Symlink dnf cache so packages persist across reboots
        sudo mkdir -p /var/cache/dnf
        sudo mount --bind "$PERSIST_DIR/dnf-cache" /var/cache/dnf 2>/dev/null || true
    else
        warn "Persistent disk not mounted -- Live-only mode."
    fi
else
    warn "Persistent disk $PERSIST_DEV not found -- Live-only mode."
fi

# ============================================================================
# 3. GPU + GNOME tweaks (vmwgfx is built into Fedora 44 kernel)
# ============================================================================
step "GPU + GNOME tweaks"

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

# -- GPU: vmwgfx provides hardware 3D via open-vm-tools --
if lsmod | grep -q vmwgfx 2>/dev/null; then
    ok "VMware SVGA (vmwgfx) active -- hardware 3D ready."
else
    warn "vmwgfx not loaded -- software rendering fallback (slower)."
fi

# ============================================================================
# 4. tmpfs workspace (4 GB) -- Trae extract + AI cache on RAM
# ============================================================================
step "tmpfs workspace"
if ! mountpoint -q "$WORK_DIR" 2>/dev/null; then
    sudo mkdir -p "$WORK_DIR"
    sudo mount -t tmpfs -o size=4G,uid=$(id -u),gid=$(id -g),mode=0755 \
        tmpfs "$WORK_DIR" || fail "tmpfs mount failed"
fi
ok "Workspace: $WORK_DIR (4 GB tmpfs)"

# ============================================================================
# 5. Zram swap (doubles effective RAM for Electron + AI)
# ============================================================================
step "Zram swap"
if ! swapon --show | grep -q zram 2>/dev/null; then
    ZRAM_MB=$(( $(grep MemTotal /proc/meminfo | awk '{print $2}') / 2 / 1024 )) || ZRAM_MB=2048
    [[ $ZRAM_MB -gt 8192 ]] && ZRAM_MB=8192

    sudo modprobe zram 2>/dev/null || true
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
# 6. Trae cache on tmpfs (or persistent disk if available)
# ============================================================================
step "Trae cache"
CACHE_BASE="/run/live-work"  # tmpfs default
[[ -d "$PERSIST_DIR/trae-config" ]] && CACHE_BASE="$PERSIST_DIR/trae-config"

for d in "$HOME/.config/Trae" "$HOME/.cache/Trae"; do
    mkdir -p "$d"
    mountpoint -q "$d" 2>/dev/null && ok "Already mounted: $d" && continue
    if [[ "$CACHE_BASE" == "$PERSIST_DIR/trae-config" ]]; then
        # Use persistent disk -- Trae config survives reboot
        persist_target="${d/$HOME/$CACHE_BASE}"
        mkdir -p "$persist_target"
        sudo mount --bind "$persist_target" "$d" \
            && ok "Persist: $d -> $persist_target" \
            || warn "Persist mount failed for $d"
    else
        # Use tmpfs -- fast but ephemeral
        sudo mount -t tmpfs -o size=1G,uid=$(id -u),gid=$(id -g) tmpfs "$d" \
            && ok "tmpfs: $d" || warn "tmpfs failed for $d"
    fi
done

# ============================================================================
# 7. Install missing Electron libs (with persistent cache)
# ============================================================================
step "Electron libs"
sudo ldconfig 2>/dev/null || true
NEED=()
ldconfig -p | grep -q libnss3.so        || NEED+=(nss)
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
    # Use persistent cache if available, else shared folder cache
    RPM_CACHE="$MOUNT_DIR/.cache/rpms"
    [[ -d "$PERSIST_DIR/rpms" ]] && RPM_CACHE="$PERSIST_DIR/rpms"
    sudo mkdir -p "$RPM_CACHE/packages"

    CACHE_PKG_DIR="$RPM_CACHE/packages"
    if [[ -d "$CACHE_PKG_DIR" ]]; then
        CACHE_FILES=("$CACHE_PKG_DIR"/*.rpm)
        if [[ -f "${CACHE_FILES[0]:-}" ]]; then
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

    if [[ ${#NEED[@]} -gt 0 ]]; then
        info "Downloading libs: ${NEED[*]}"
        timeout 120 sudo dnf install -y \
            --setopt=keepcache=1 \
            --setopt="cachedir=$RPM_CACHE" \
            "${NEED[@]}" 2>&1 | tail -5 || true
        sudo ldconfig 2>/dev/null || true
        if ldconfig -p | grep -q libnss3.so 2>/dev/null; then
            ok "Libs installed + cached."
        else
            warn "Some libs missing -- Trae may still launch."
        fi
    fi
else
    ok "All libs present."
fi

# ============================================================================
# 8. Proxy -- VMware NAT (10.0.2.2 = Windows host, same as VirtualBox)
# ============================================================================
step "Proxy"
ok "Using host network via VMware NAT -- Windows VPN covers this VM automatically."

# ============================================================================
# 9. Project on RAM disk (tmpfs)
#    VMware vmhgfs-fuse is faster than vboxsf but still crosses layers.
#    rsync project once into tmpfs (RAM), background-sync back every 30s.
# ============================================================================
step "Project RAM disk"
PROJECT_RAM="$WORK_DIR/project"
mkdir -p "$PROJECT_RAM"

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
        || warn "rsync failed -- falling back to shared folder."

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
    ok "Background sync started (PID $SYNC_PID) -- saves to Windows every 30s."
    TRAE_PROJECT="$PROJECT_RAM"
else
    warn "rsync not available -- opening project directly from shared folder (slower)."
    TRAE_PROJECT="$MOUNT_DIR"
fi

# ============================================================================
# 10. Extract Trae RPM into tmpfs (skip if already done)
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
    (cd "$EXTRACT_DIR" && rpm2cpio "$RPM_FILE" | cpio -idm 2>/dev/null) \
        || fail "RPM extraction failed."
    TRAE_BIN=$(find "$EXTRACT_DIR" -type f -name "trae" | head -1)
    [[ -n "$TRAE_BIN" ]] || fail "Trae binary not found after extraction."
    chmod +x "$TRAE_BIN"
    ok "Extracted: $TRAE_BIN"
fi

# ============================================================================
# 11. Launch Trae
#     --ozone-platform: wayland (Fedora 44 default) or x11 fallback
#     --disable-dev-shm-usage: /dev/shm is tiny on Live
#     --ignore-gpu-blocklist: force GPU accel even if on blocklist
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
if mountpoint -q "$PERSIST_DIR" 2>/dev/null; then
    echo "  Persist: $PERSIST_DIR"
fi
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
