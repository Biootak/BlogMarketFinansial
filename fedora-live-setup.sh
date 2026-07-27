#!/usr/bin/env bash
# fedora-live-setup.sh v5 — sets up Trae IDE on Fedora Live
# Usage:
#   bash /mnt/FinancialMarket/fedora-live-setup.sh
#
# Requires guest-optimize.sh to have run first (sets LIVE_WORK_DIR).
# If called standalone, it bootstraps its own tmpfs workspace.
set -euo pipefail

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
step()    { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

# Keep only the last log; remove older ones before starting
find /tmp -maxdepth 1 -name 'trae-setup-*.log' -delete 2>/dev/null || true
LOG_FILE="/tmp/trae-setup-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1
info "Log: $LOG_FILE"

MOUNT_DIR="/mnt/FinancialMarket"
CACHE_DIR="$MOUNT_DIR/offline-cache"
RPM_FILE="$MOUNT_DIR/Trae-linux-x64.rpm"

# ── Workspace: prefer LIVE_WORK_DIR set by guest-optimize.sh ────────────────
# CRITICAL: EXTRACT_DIR must NEVER be on the overlay (/ of Fedora Live).
# The RPM extraction is ~600 MB and would fill the overlay instantly.
# We keep it on /run/live-work (tmpfs 2 GB) which guest-optimize.sh creates.
if [[ -n "${LIVE_WORK_DIR:-}" ]] && mountpoint -q "$LIVE_WORK_DIR" 2>/dev/null; then
    WORK_DIR="$LIVE_WORK_DIR"
else
    # Standalone call: bootstrap our own tmpfs workspace
    WORK_DIR="/run/live-work"
    if ! mountpoint -q "$WORK_DIR" 2>/dev/null; then
        sudo mkdir -p "$WORK_DIR"
        sudo mount -t tmpfs -o "size=2G,uid=$(id -u),gid=$(id -g),mode=0755" \
            tmpfs "$WORK_DIR" 2>/dev/null \
            || { warn "tmpfs unavailable — falling back to /tmp (overlay risk!)"; WORK_DIR="/tmp/live-work"; mkdir -p "$WORK_DIR"; }
    fi
    info "Workspace: $WORK_DIR"
fi

# All big files live on the tmpfs workspace, NOT on the overlay
EXTRACT_DIR="$WORK_DIR/trae-app"
LAUNCHER_DIR="/run/user/$(id -u)"
LAUNCHER="$LAUNCHER_DIR/launch-trae.sh"
TRAE_BIN=""

# ============================================================================
# 1. Check mount
# ============================================================================
step "Checking mount"
[[ -d "$MOUNT_DIR" ]] || fail "$MOUNT_DIR not found. Mount it first."
[[ -f "$RPM_FILE"  ]] || fail "$RPM_FILE not found: $RPM_FILE"
ok "Mount OK: $MOUNT_DIR"

# ============================================================================
# 2. Disk space check — overlay must have at least 80 MB for small writes
# ============================================================================
step "Disk space check"

OVERLAY_FREE=$(df -m / | awk 'NR==2{print $4}')
WORK_FREE=$(df -m "$WORK_DIR" | awk 'NR==2{print $4}')
ok "Overlay / free : ${OVERLAY_FREE} MB"
ok "Work tmpfs free: ${WORK_FREE} MB  (${WORK_DIR})"

if [[ "$WORK_FREE" -lt 700 ]]; then
    # Not enough room even for the RPM extract — try to free space
    warn "Work tmpfs has only ${WORK_FREE} MB free. Need ~700 MB for Trae extract."
    # If a previous extraction is stale, remove it
    [[ -d "$EXTRACT_DIR" ]] && rm -rf "$EXTRACT_DIR" && ok "Removed old extract."
    WORK_FREE=$(df -m "$WORK_DIR" | awk 'NR==2{print $4}')
    [[ "$WORK_FREE" -lt 700 ]] && fail "Still only ${WORK_FREE} MB free in $WORK_DIR. Reboot the VM."
fi

if [[ "$OVERLAY_FREE" -lt 30 ]]; then
    warn "Overlay almost full (${OVERLAY_FREE} MB). Running emergency cleanup..."
    sudo journalctl --vacuum-size=5M 2>/dev/null || true
    sudo dnf clean all 2>/dev/null || true
    find /tmp -maxdepth 1 -name '*.log' \
        -not -name "$(basename "$LOG_FILE")" -delete 2>/dev/null || true
    OVERLAY_FREE=$(df -m / | awk 'NR==2{print $4}')
    ok "Overlay after cleanup: ${OVERLAY_FREE} MB"
    [[ "$OVERLAY_FREE" -lt 10 ]] && \
        fail "Critically low overlay (${OVERLAY_FREE} MB). Reboot the VM."
fi

# ============================================================================
# 3. rpm2cpio + cpio
# ============================================================================
step "Checking extract tools"

install_rpms_from_cache() {
    local pkg_dir="$CACHE_DIR/rpms"
    [[ -d "$pkg_dir" ]] || return 1
    ls "$pkg_dir"/*.rpm >/dev/null 2>&1 || return 1
    info "Installing RPMs from offline cache..."
    sudo rpm -Uvh --force "$pkg_dir"/*.rpm 2>/dev/null || true
}

ensure_tool() {
    local tool="$1" pkg="${2:-$1}"
    command -v "$tool" >/dev/null 2>&1 && { ok "$tool found."; return 0; }
    info "Installing $tool ..."
    install_rpms_from_cache 2>/dev/null || true
    command -v "$tool" >/dev/null 2>&1 && { ok "$tool installed from cache."; return 0; }
    if command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y --setopt=keepcache=0 \
            --setopt="cachedir=$WORK_DIR/dnf-cache" "$pkg" \
            || fail "Failed to install $tool"
    else
        fail "$tool not found and no package manager available."
    fi
    ok "$tool installed."
}

ensure_tool rpm2cpio
ensure_tool cpio

# ============================================================================
# 4. Extract Trae RPM — always into tmpfs WORK_DIR, never onto the overlay
# ============================================================================
step "Extracting Trae IDE (into tmpfs workspace)"

EXISTING_BIN=$(find "$EXTRACT_DIR" -type f -name "trae" 2>/dev/null | head -1 || true)
if [[ -n "$EXISTING_BIN" && -x "$EXISTING_BIN" ]]; then
    TRAE_BIN="$EXISTING_BIN"
    ok "Trae already in tmpfs: $TRAE_BIN -- skipping extract"
else
    info "Extracting RPM -> $EXTRACT_DIR (tmpfs) ..."
    rm -rf "$EXTRACT_DIR"
    mkdir -p "$EXTRACT_DIR"
    cd "$EXTRACT_DIR"

    rpm2cpio "$RPM_FILE" | cpio -idm 2>/dev/null
    CPIO_EXIT="${PIPESTATUS[1]}"
    [[ "$CPIO_EXIT" -le 2 ]] || fail "cpio failed (exit $CPIO_EXIT)"
    ok "Extract done."

    TRAE_BIN="$(find "$EXTRACT_DIR" -type f -name "trae" 2>/dev/null | head -1 || true)"
    [[ -n "$TRAE_BIN" ]] || fail "Trae binary not found after extraction."
fi

chmod +x "$TRAE_BIN"
ok "Trae binary: $TRAE_BIN"

# ============================================================================
# 5. Electron dependencies
# ============================================================================
step "Checking Electron dependencies"

# Map: soname -> dnf package name
declare -A LIB_PKG=(
    [libasound.so.2]=alsa-lib
    [libgbm.so.1]=mesa-libgbm
    [libnss3.so]=nss
    [libX11.so.6]=libX11
    [libpango-1.0.so.0]=pango
)

# Refresh ldconfig cache first so we get an accurate picture
sudo ldconfig 2>/dev/null || true

MISSING_PKGS=()
for lib in "${!LIB_PKG[@]}"; do
    ldconfig -p 2>/dev/null | grep -q "$lib" || MISSING_PKGS+=("${LIB_PKG[$lib]}")
done

if [[ ${#MISSING_PKGS[@]} -gt 0 ]]; then
    warn "Missing packages: ${MISSING_PKGS[*]}"
    if [[ -d "$CACHE_DIR/rpms" ]] && ls "$CACHE_DIR/rpms"/*.rpm >/dev/null 2>&1; then
        info "Installing deps from offline cache..."
        sudo rpm -Uvh --force --nodeps "$CACHE_DIR/rpms"/*.rpm 2>/dev/null || true
        sudo ldconfig 2>/dev/null || true
        ok "Offline deps installed."
    elif command -v dnf >/dev/null 2>&1; then
        info "Installing via dnf: ${MISSING_PKGS[*]}"
        # Show output so failures are visible; redirect only dnf progress noise
        sudo dnf install -y --setopt=keepcache=0 \
            --setopt="cachedir=$WORK_DIR/dnf-cache" \
            "${MISSING_PKGS[@]}" 2>&1 | grep -v '^\(Updating\|Installing\|  \)' || true
        # Refresh ldconfig so newly installed libs are found
        sudo ldconfig 2>/dev/null || true
        # Verify each lib is now present
        STILL_MISSING=()
        for lib in "${!LIB_PKG[@]}"; do
            ldconfig -p 2>/dev/null | grep -q "$lib" || STILL_MISSING+=("$lib")
        done
        if [[ ${#STILL_MISSING[@]} -gt 0 ]]; then
            warn "Still missing after install: ${STILL_MISSING[*]}"
            warn "Trae may crash. Try: sudo dnf install -y ${STILL_MISSING[*]}"
        else
            ok "All Electron dependencies installed."
        fi
    fi
else
    ok "All Electron dependencies present."
fi

# ============================================================================
# 6. Launcher — write to /run/user/<uid> (always tmpfs, always has space)
# ============================================================================
step "Creating launcher"

mkdir -p "$LAUNCHER_DIR" 2>/dev/null || true

# If /run/user/<uid> is not writable, fall back to WORK_DIR
if [[ ! -w "$LAUNCHER_DIR" ]]; then
    LAUNCHER_DIR="$WORK_DIR"
    LAUNCHER="$LAUNCHER_DIR/launch-trae.sh"
fi

cat > "$LAUNCHER" <<LAUNCHSCRIPT
#!/usr/bin/env bash
# Auto-generated by fedora-live-setup.sh
PROJECT_DIR="\${1:-$MOUNT_DIR}"
exec "$TRAE_BIN" \\
  --no-sandbox --disable-gpu-sandbox \\
  --enable-gpu-rasterization --enable-zero-copy \\
  "\$PROJECT_DIR" "\${@:2}"
LAUNCHSCRIPT
chmod +x "$LAUNCHER"

# Symlink ~/launch-trae.sh for convenience — write the symlink only,
# which is tiny (< 1 KB) and safe even on a nearly-full overlay
ln -sf "$LAUNCHER" "$HOME/launch-trae.sh" 2>/dev/null || true

ok "Launcher: $LAUNCHER  (symlink: ~/launch-trae.sh)"

# ============================================================================
# 7. Summary
# ============================================================================
echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  Trae IDE is ready!"
echo -e "======================================================${NC}"
echo
echo "  Trae     : $TRAE_BIN"
echo "  Launcher : $LAUNCHER"
echo "  Project  : $MOUNT_DIR"
echo "  Workspace: $WORK_DIR  (tmpfs — gone on reboot)"
echo "  Log      : $LOG_FILE"
echo
echo "  Launch Trae:"
echo "    bash ~/launch-trae.sh"
echo "    bash ~/launch-trae.sh /mnt/FinancialMarket   # explicit project"
echo

# ============================================================================
# 8. Launch Trae
# ============================================================================
step "Launching Trae IDE"
exec bash "$LAUNCHER" "$MOUNT_DIR"
