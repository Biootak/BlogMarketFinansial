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
LOG_FILE="/tmp/guest-optimize-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1
info "Log: $LOG_FILE"

# ============================================================================
# 1. VirtualBox Guest Additions
# ============================================================================
step "VirtualBox Guest Additions"

if lsmod | grep -q vboxguest 2>/dev/null; then
    ok "Guest Additions already active."
else
    info "Installing Guest Additions..."
    if sudo dnf install -y virtualbox-guest-additions 2>/dev/null; then
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
# 2. Shared Folder mount with fmode=0755 (fixes Permission denied on .sh files)
# ============================================================================
step "Shared Folder mount"

MOUNT_OPTS="uid=1000,gid=1000,fmode=0755,dmode=0755,_netdev"

if mountpoint -q "$MOUNT_DIR" 2>/dev/null; then
    CURRENT_OPTS=$(findmnt -n -o OPTIONS "$MOUNT_DIR" 2>/dev/null || echo "")
    if echo "$CURRENT_OPTS" | grep -q "fmode=0755"; then
        ok "Already mounted with fmode=0755: $MOUNT_DIR"
    else
        warn "Remounting with fmode=0755..."
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
        sudo mount -t vboxsf -o "uid=1000,gid=1000,fmode=0755,dmode=0755" FinancialMarket "$MOUNT_DIR" || \
            warn "Mount failed. Run manually:
  sudo mount -t vboxsf -o uid=1000,gid=1000,fmode=0755 FinancialMarket $MOUNT_DIR"
    fi
fi

# ============================================================================
# 3. Zram swap
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
# 4. Kernel tuning
# ============================================================================
step "Kernel tuning"

sudo sysctl -w vm.swappiness=10            >/dev/null && ok "swappiness=10"
sudo sysctl -w vm.dirty_ratio=15           >/dev/null && ok "dirty_ratio=15"
sudo sysctl -w vm.dirty_background_ratio=5 >/dev/null && ok "dirty_background_ratio=5"
sudo sysctl -w kernel.nmi_watchdog=0       >/dev/null 2>&1 && ok "nmi_watchdog=0" || warn "nmi_watchdog skipped (OK in VM)"

# ============================================================================
# 5. CPU governor
# ============================================================================
step "CPU governor"

if command -v cpupower >/dev/null 2>&1; then
    sudo cpupower frequency-set -g performance 2>/dev/null && ok "CPU governor=performance" || \
        warn "cpupower failed -- skipping (OK in VM)"
else
    for gov in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
        echo performance | sudo tee "$gov" >/dev/null 2>/dev/null || true
    done
    CURRENT=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || echo "n/a")
    ok "CPU governor: $CURRENT"
fi

# ============================================================================
# 6. I/O scheduler
# ============================================================================
step "I/O scheduler"

for dev in /sys/block/sd* /sys/block/vd* /sys/block/nvme*; do
    [[ -f "$dev/queue/scheduler" ]] || continue
    DEVNAME=$(basename "$dev")
    echo none | sudo tee "$dev/queue/scheduler" >/dev/null 2>/dev/null || \
    echo mq-deadline | sudo tee "$dev/queue/scheduler" >/dev/null 2>/dev/null || true
    SCHED=$(cat "$dev/queue/scheduler" 2>/dev/null | grep -oP '\[.*?\]' | tr -d '[]' || echo "?")
    ok "I/O scheduler $DEVNAME: $SCHED"
done

# ============================================================================
# 7. Disable unnecessary services
# ============================================================================
step "Disabling unnecessary services"

for svc in bluetooth cups avahi-daemon ModemManager NetworkManager-wait-online; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
        sudo systemctl stop "$svc" 2>/dev/null && ok "Stopped: $svc" || warn "Could not stop: $svc"
    fi
done

# ============================================================================
# 8. tmpfs for Trae cache
# ============================================================================
step "Trae cache tmpfs"

TRAE_CACHE="$HOME/.config/Trae/Cache"
mkdir -p "$TRAE_CACHE"
if ! mountpoint -q "$TRAE_CACHE" 2>/dev/null; then
    sudo mount -t tmpfs -o size=512m,uid=1000,gid=1000 tmpfs "$TRAE_CACHE" && \
        ok "Trae cache -> tmpfs (512MB RAM)" || \
        warn "tmpfs for Trae cache failed -- continuing."
else
    ok "Trae cache tmpfs already mounted."
fi

# ============================================================================
# 9. Font cache
# ============================================================================
step "Font cache"
fc-cache -f 2>/dev/null && ok "Font cache updated." || warn "fc-cache failed."

# ============================================================================
# 10. Summary
# ============================================================================
echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  System optimized!"
echo -e "======================================================${NC}"
echo
FREE_MB=$(free -m | awk '/^Mem:/{print $7}')
SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
echo "  Free RAM : ${FREE_MB} MB"
echo "  Swap     : ${SWAP_MB} MB (zram)"
echo "  Share    : $MOUNT_DIR"
echo "  Log      : $LOG_FILE"
echo
echo "  Next step:"
echo "    bash $MOUNT_DIR/fedora-live-setup.sh"
echo
