#!/usr/bin/env bash
# start.sh — mount share + run Trae IDE on Fedora Live
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
# 2. tmpfs workspace (2 GB) — Trae extract goes here, NOT on the overlay
# ============================================================================
step "tmpfs workspace"
if ! mountpoint -q "$WORK_DIR" 2>/dev/null; then
    sudo mkdir -p "$WORK_DIR"
    sudo mount -t tmpfs -o size=2G,uid=$(id -u),gid=$(id -g),mode=0755 \
        tmpfs "$WORK_DIR" || fail "tmpfs mount failed"
fi
ok "Workspace: $WORK_DIR  (2 GB tmpfs)"

# ============================================================================
# 3. Zram swap (doubles effective RAM for Electron)
# ============================================================================
step "Zram swap"
if ! swapon --show | grep -q zram 2>/dev/null; then
    ZRAM_MB=$(( $(grep MemTotal /proc/meminfo | awk '{print $2}') / 2 / 1024 ))
    [[ $ZRAM_MB -gt 4096 ]] && ZRAM_MB=4096
    modprobe zram 2>/dev/null && \
        echo "${ZRAM_MB}M" | sudo tee /sys/block/zram0/disksize >/dev/null && \
        sudo mkswap /dev/zram0 >/dev/null && \
        sudo swapon -p 100 /dev/zram0 && \
        ok "Zram ${ZRAM_MB} MB active." || warn "Zram skipped."
else
    ok "Zram already active."
fi

# ============================================================================
# 4. Trae cache on tmpfs (keeps Electron writes off the overlay)
# ============================================================================
step "Trae cache tmpfs"
for d in "$HOME/.config/Trae/Cache" "$HOME/.cache/Trae"; do
    mkdir -p "$d"
    mountpoint -q "$d" 2>/dev/null && ok "Already tmpfs: $d" && continue
    sudo mount -t tmpfs -o size=512m,uid=$(id -u),gid=$(id -g) tmpfs "$d" \
        && ok "tmpfs: $d" || warn "tmpfs failed for $d"
done

# ============================================================================
# 5. Install missing Electron libs (only if needed)
# ============================================================================
step "Electron libs"
sudo ldconfig 2>/dev/null || true
NEED=()
ldconfig -p | grep -q libnss3.so    || NEED+=(nss)
ldconfig -p | grep -q libgbm.so.1   || NEED+=(mesa-libgbm)
ldconfig -p | grep -q libpango-1.0  || NEED+=(pango)
ldconfig -p | grep -q libasound.so.2 || NEED+=(alsa-lib)

if [[ ${#NEED[@]} -gt 0 ]]; then
    info "Installing: ${NEED[*]}"
    sudo dnf install -y --setopt=keepcache=0 \
        --setopt="cachedir=$WORK_DIR/dnf-cache" \
        "${NEED[@]}" && sudo ldconfig && ok "Libs installed." \
        || warn "Some libs failed — Trae may still work."
else
    ok "All libs present."
fi

# ============================================================================
# 6. Extract Trae RPM into tmpfs (skip if already done)
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
# 7. Launch Trae
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
    "$MOUNT_DIR"
