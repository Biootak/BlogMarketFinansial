#!/usr/bin/env bash
# guest-optimize.sh — optimize Fedora Live inside VirtualBox VM
# Run after every boot, before fedora-live-setup.sh
set -euo pipefail

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }

MOUNT_DIR="/mnt/FinancialMarket"

# Keep only the last log; remove all older ones before starting
find /tmp -maxdepth 1 -name 'guest-optimize-*.log' -delete 2>/dev/null || true
LOG_FILE="/tmp/guest-optimize-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1
info "Log: $LOG_FILE"

# ============================================================================
# 0. Large tmpfs — mount BEFORE anything else so every write goes to RAM,
#    not to the tiny Fedora Live overlay layer on disk.
#    /run/live-work gets: Trae extract, dnf cache, all big temp files.
# ============================================================================
step "Large tmpfs workspace"

WORK_DIR="/run/live-work"
WORK_SIZE="2G"

if mountpoint -q "$WORK_DIR" 2>/dev/null; then
    ok "tmpfs already mounted: $WORK_DIR"
else
    sudo mkdir -p "$WORK_DIR"
    if sudo mount -t tmpfs -o "size=${WORK_SIZE},uid=$(id -u),gid=$(id -g),mode=0755" tmpfs "$WORK_DIR"; then
        ok "tmpfs ${WORK_SIZE} mounted: $WORK_DIR"
    else
        warn "tmpfs mount failed — using /tmp as fallback (may fill overlay)"
        WORK_DIR="/tmp/live-work"
        mkdir -p "$WORK_DIR"
    fi
fi

# Redirect dnf cache into tmpfs so dnf never writes to the overlay
sudo mkdir -p "$WORK_DIR/dnf-cache"
export DNF_CACHE_DIR="$WORK_DIR/dnf-cache"

# Export for fedora-live-setup.sh
export LIVE_WORK_DIR="$WORK_DIR"

# ============================================================================
# 1. Free overlay disk space — journal + stale logs
# ============================================================================
step "Freeing overlay disk space"

find /tmp -maxdepth 1 -name 'trae-setup-*.log' -delete 2>/dev/null || true
sudo journalctl --vacuum-size=10M 2>/dev/null && ok "Journal trimmed." || true
sudo dnf clean all --setopt=cachedir="$WORK_DIR/dnf-cache" 2>/dev/null || true

# Remove any leftover Trae cache that landed on the overlay in a previous run
for cdir in \
    "$HOME/.cache/trae-live" \
    "$HOME/.cache/Trae/GPUCache" \
    "$HOME/.cache/Trae/Code Cache" \
    "$HOME/.cache/Trae/CachedData" \
    "$HOME/.config/Trae/Cache/Cache_Data"; do
    # Only remove if it is NOT on a tmpfs (i.e. it is on the overlay)
    if [[ -d "$cdir" ]] && ! mountpoint -q "$cdir" 2>/dev/null; then
        CDIR_FS=$(stat -f -c '%T' "$cdir" 2>/dev/null || echo "unknown")
        if [[ "$CDIR_FS" != "tmpfs" ]]; then
            rm -rf "$cdir" && ok "Cleared overlay cache: $cdir" || true
        fi
    fi
done

FREE_NOW=$(df -m / | awk 'NR==2{print $4}')
ok "Free on overlay / : ${FREE_NOW} MB"
if [[ "$FREE_NOW" -lt 80 ]]; then
    warn "Overlay still tight (${FREE_NOW} MB) — continuing anyway (Trae runs from tmpfs)."
fi

# ============================================================================
# 2. VirtualBox Guest Additions
# ============================================================================
step "VirtualBox Guest Additions"

if lsmod | grep -q vboxguest 2>/dev/null; then
    ok "Guest Additions already active."
else
    info "Installing Guest Additions..."
    if sudo dnf install -y --setopt=keepcache=0 \
            --setopt="cachedir=$WORK_DIR/dnf-cache" \
            virtualbox-guest-additions 2>/dev/null; then
        ok "Guest Additions installed from dnf."
    else
        VBOX_RUN=$(find /run/media -name "VBoxLinuxAdditions.run" 2>/dev/null | head -1 || true)
        if [[ -n "$VBOX_RUN" ]]; then
            sudo bash "$VBOX_RUN" --nox11 2>/dev/null || warn "Guest Additions install failed -- continuing."
        else
            warn "Guest Additions not found. In VirtualBox: Devices > Insert Guest Additions CD"
        fi
    fi
fi

# ============================================================================
# 3. Shared Folder mount with fmode=0755 (fixes Permission denied on .sh files)
# ============================================================================
step "Shared Folder mount"

MOUNT_UID=$(id -u)
MOUNT_GID=$(id -g)
MOUNT_OPTS="uid=$MOUNT_UID,gid=$MOUNT_GID,fmode=0755,dmode=0755,exec,_netdev"

if mountpoint -q "$MOUNT_DIR" 2>/dev/null; then
    CURRENT_OPTS=$(findmnt -n -o OPTIONS "$MOUNT_DIR" 2>/dev/null || echo "")
    if echo "$CURRENT_OPTS" | grep -Eq "uid=$MOUNT_UID.*gid=$MOUNT_GID" && \
       echo "$CURRENT_OPTS" | grep -Eq 'fmode=0755|umask=022'; then
        ok "Already mounted with liveuser permissions: $MOUNT_DIR"
    else
        warn "Remounting with liveuser permissions..."
        sudo umount "$MOUNT_DIR" 2>/dev/null || true
        sudo mount -t vboxsf -o "$MOUNT_OPTS" FinancialMarket "$MOUNT_DIR" && \
            ok "Remount OK." || warn "Remount failed -- continuing."
    fi
else
    sudo mkdir -p "$MOUNT_DIR"
    if sudo mount -t vboxsf -o "$MOUNT_OPTS" FinancialMarket "$MOUNT_DIR" 2>/dev/null; then
        ok "Shared Folder mounted: $MOUNT_DIR"
    else
        warn "Trying without _netdev..."
        sudo mount -t vboxsf \
            -o "uid=$MOUNT_UID,gid=$MOUNT_GID,fmode=0755,dmode=0755,exec" \
            FinancialMarket "$MOUNT_DIR" || \
            warn "Mount failed. Run manually:
  sudo mount -t vboxsf -o uid=$MOUNT_UID,gid=$MOUNT_GID,fmode=0755,dmode=0755,exec FinancialMarket $MOUNT_DIR"
    fi
fi

# ============================================================================
# 4. Zram swap
# ============================================================================
step "Zram swap"

if swapon --show | grep -q zram 2>/dev/null; then
    ok "Zram swap already active."
else
    TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    ZRAM_SIZE_MB=$(( TOTAL_RAM_KB / 2 / 1024 ))
    [[ $ZRAM_SIZE_MB -gt 4096 ]] && ZRAM_SIZE_MB=4096

    if modprobe zram 2>/dev/null; then
        echo "${ZRAM_SIZE_MB}M" | sudo tee /sys/block/zram0/disksize >/dev/null
        sudo mkswap /dev/zram0 >/dev/null
        sudo swapon -p 100 /dev/zram0
        ok "Zram swap ${ZRAM_SIZE_MB}MB active."
    else
        warn "zram module not available."
    fi
fi

# ============================================================================
# 5. Kernel tuning
# ============================================================================
step "Kernel tuning"

sudo sysctl -w vm.swappiness=10            >/dev/null && ok "swappiness=10"
sudo sysctl -w vm.dirty_ratio=15           >/dev/null && ok "dirty_ratio=15"
sudo sysctl -w vm.dirty_background_ratio=5 >/dev/null && ok "dirty_background_ratio=5"
sudo sysctl -w kernel.nmi_watchdog=0       >/dev/null 2>&1 && ok "nmi_watchdog=0" \
    || warn "nmi_watchdog skipped (OK in VM)"

# ============================================================================
# 6. CPU governor
# ============================================================================
step "CPU governor"

if command -v cpupower >/dev/null 2>&1; then
    sudo cpupower frequency-set -g performance 2>/dev/null \
        && ok "CPU governor=performance" \
        || warn "cpupower failed -- skipping (OK in VM)"
else
    for gov in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
        echo performance | sudo tee "$gov" >/dev/null 2>/dev/null || true
    done
    CURRENT=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || echo "n/a")
    ok "CPU governor: $CURRENT"
fi

# ============================================================================
# 7. I/O scheduler
# ============================================================================
step "I/O scheduler"

for dev in /sys/block/sd* /sys/block/vd* /sys/block/nvme*; do
    [[ -f "$dev/queue/scheduler" ]] || continue
    DEVNAME=$(basename "$dev")
    echo none        | sudo tee "$dev/queue/scheduler" >/dev/null 2>/dev/null || \
    echo mq-deadline | sudo tee "$dev/queue/scheduler" >/dev/null 2>/dev/null || true
    SCHED=$(cat "$dev/queue/scheduler" 2>/dev/null | grep -oP '\[.*?\]' | tr -d '[]' || echo "?")
    ok "I/O scheduler $DEVNAME: $SCHED"
done

# ============================================================================
# 8. Disable unnecessary services
# ============================================================================
step "Disabling unnecessary services"

for svc in bluetooth cups avahi-daemon ModemManager NetworkManager-wait-online; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
        sudo systemctl stop "$svc" 2>/dev/null \
            && ok "Stopped: $svc" || warn "Could not stop: $svc"
    fi
done

# ============================================================================
# 9. tmpfs for Trae/Electron cache — point into WORK_DIR (already tmpfs)
# ============================================================================
step "Trae cache tmpfs"

for TRAE_CACHE in "$HOME/.config/Trae/Cache" "$HOME/.cache/Trae"; do
    mkdir -p "$TRAE_CACHE"
    if mountpoint -q "$TRAE_CACHE" 2>/dev/null; then
        ok "Cache tmpfs already mounted: $TRAE_CACHE"
    else
        # Try a dedicated 512 MB tmpfs first; fall back to binding into WORK_DIR
        if sudo mount -t tmpfs -o size=512m,uid=$(id -u),gid=$(id -g) \
                tmpfs "$TRAE_CACHE" 2>/dev/null; then
            ok "Cache -> tmpfs: $TRAE_CACHE"
        else
            BIND_TARGET="$WORK_DIR/$(basename "$TRAE_CACHE")"
            mkdir -p "$BIND_TARGET"
            sudo mount --bind "$BIND_TARGET" "$TRAE_CACHE" 2>/dev/null && \
                ok "Cache -> bind:$BIND_TARGET: $TRAE_CACHE" || \
                warn "tmpfs failed for $TRAE_CACHE -- continuing."
        fi
    fi
done

# ============================================================================
# 10. Font cache
# ============================================================================
step "Font cache"
fc-cache -f 2>/dev/null && ok "Font cache updated." || warn "fc-cache failed."

# ============================================================================
# 11. Summary
# ============================================================================
echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  System optimized!"
echo -e "======================================================${NC}"
echo
FREE_MB=$(free -m | awk '/^Mem:/{print $7}')
SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
OVERLAY_MB=$(df -m / | awk 'NR==2{print $4}')
WORK_MB=$(df -m "$WORK_DIR" | awk 'NR==2{print $4}')
echo "  Free RAM     : ${FREE_MB} MB"
echo "  Swap         : ${SWAP_MB} MB (zram)"
echo "  Overlay free : ${OVERLAY_MB} MB  ← must stay > 0"
echo "  Work tmpfs   : ${WORK_MB} MB free  (${WORK_SIZE} total)"
echo "  Share        : $MOUNT_DIR"
echo "  Work dir     : $WORK_DIR"
echo "  Log          : $LOG_FILE"
echo
echo "  Next step:"
echo "    bash $MOUNT_DIR/fedora-live-setup.sh"
echo
