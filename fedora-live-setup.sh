#!/usr/bin/env bash
# fedora-live-setup.sh v3 — sets up Trae IDE + Node.js on Fedora Live
# Usage:
#   bash /mnt/FinancialMarket/fedora-live-setup.sh
set -euo pipefail

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
step()    { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

LOG_FILE="/tmp/trae-setup-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1
info "Log: $LOG_FILE"

MOUNT_DIR="/mnt/FinancialMarket"
CACHE_DIR="$MOUNT_DIR/offline-cache"
RPM_FILE="$MOUNT_DIR/Trae-linux-x64.rpm"
EXTRACT_DIR="$HOME/trae-extracted"
NODE_INSTALL_DIR="$HOME/.local/node"
LAUNCHER="$HOME/launch-trae.sh"
TRAE_BIN=""

# ============================================================================
# 1. Check mount
# ============================================================================
step "Checking mount"
[[ -d "$MOUNT_DIR" ]] || fail "$MOUNT_DIR not found. Mount it first."
[[ -f "$RPM_FILE"  ]] || fail "$RPM_FILE not found."
ok "Mount OK: $MOUNT_DIR"

# ============================================================================
# 2. Node.js
# ============================================================================
step "Node.js"

install_node_from_tarball() {
    local tarball="$1"
    local version
    version=$(basename "$tarball" | grep -oP 'v[\d.]+' | head -1)
    info "Installing Node.js $version from $tarball ..."
    mkdir -p "$NODE_INSTALL_DIR"
    tar -xf "$tarball" -C "$NODE_INSTALL_DIR" --strip-components=1
    ok "Node.js $version installed at $NODE_INSTALL_DIR"
}

export PATH="$NODE_INSTALL_DIR/bin:$PATH"

if command -v node >/dev/null 2>&1; then
    ok "Node.js already installed: $(node -v)"
else
    NODE_TARBALL_CACHED=""
    if [[ -d "$CACHE_DIR/node" ]]; then
        NODE_TARBALL_CACHED=$(find "$CACHE_DIR/node" -name "node-v*.tar.xz" | sort -V | tail -1)
    fi

    if [[ -n "$NODE_TARBALL_CACHED" && -f "$NODE_TARBALL_CACHED" ]]; then
        info "Installing Node.js from offline cache: $(basename "$NODE_TARBALL_CACHED")"
        install_node_from_tarball "$NODE_TARBALL_CACHED"
    else
        warn "No offline cache found. Downloading from internet..."
        if ! ping -c1 -W2 nodejs.org >/dev/null 2>&1; then
            fail "No internet and no cache. Run download-cache.sh on a machine with internet first."
        fi
        NODE_VERSION="20.19.2"
        NODE_TARBALL="node-v${NODE_VERSION}-linux-x64.tar.xz"
        mkdir -p "$CACHE_DIR/node"
        curl -fL --progress-bar \
            -o "$CACHE_DIR/node/$NODE_TARBALL" \
            "https://nodejs.org/dist/v${NODE_VERSION}/$NODE_TARBALL"
        install_node_from_tarball "$CACHE_DIR/node/$NODE_TARBALL"
    fi

    export PATH="$NODE_INSTALL_DIR/bin:$PATH"
    command -v node >/dev/null 2>&1 || fail "Node.js installed but not found in PATH: $NODE_INSTALL_DIR/bin"
    ok "Node.js $(node -v) ready."
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
    return 0
}

ensure_tool() {
    local tool="$1"
    local pkg="${2:-$1}"
    if command -v "$tool" >/dev/null 2>&1; then
        ok "$tool found."
        return 0
    fi
    info "Installing $tool ..."
    if install_rpms_from_cache 2>/dev/null; then
        command -v "$tool" >/dev/null 2>&1 && { ok "$tool installed from cache."; return 0; }
    fi
    if command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y "$pkg" || fail "Failed to install $tool"
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y "$pkg" || fail "Failed to install $tool"
    else
        fail "$tool not found and no package manager available."
    fi
    ok "$tool installed."
}

ensure_tool rpm2cpio
ensure_tool cpio

# ============================================================================
# 4. Extract Trae RPM
# ============================================================================
step "Extracting Trae IDE"

EXISTING_BIN=$(find "$EXTRACT_DIR" -type f -name "trae" 2>/dev/null | head -1 || true)
if [[ -n "$EXISTING_BIN" && -x "$EXISTING_BIN" ]]; then
    TRAE_BIN="$EXISTING_BIN"
    ok "Trae already extracted: $TRAE_BIN -- skipping"
else
    info "Extracting RPM to $EXTRACT_DIR ..."
    rm -rf "$EXTRACT_DIR"
    mkdir -p "$EXTRACT_DIR"
    cd "$EXTRACT_DIR"

    # cpio sometimes exits with code 2 (warnings only) — treat as success
    rpm2cpio "$RPM_FILE" | cpio -idm 2>/dev/null
    CPIO_EXIT="${PIPESTATUS[1]}"
    if [[ "$CPIO_EXIT" -gt 2 ]]; then
        fail "cpio failed with exit code $CPIO_EXIT"
    fi
    ok "Extract done."

    TRAE_BIN="$(find "$EXTRACT_DIR" -type f -name "trae" 2>/dev/null | head -1 || true)"

    if [[ -z "$TRAE_BIN" ]]; then
        warn "Binary 'trae' not found directly. Listing executables:"
        find "$EXTRACT_DIR" -maxdepth 5 -type f -perm /111 2>/dev/null | head -20
        fail "Trae binary not found. Check list above."
    fi
fi

chmod +x "$TRAE_BIN"
ok "Trae binary: $TRAE_BIN"

# ============================================================================
# 5. Electron dependencies
# ============================================================================
step "Checking Electron dependencies"

ELECTRON_PKGS=(
    alsa-lib mesa-libgbm nss libX11 libXcomposite libXdamage
    libXext libXfixes libXrandr libxcb libXScrnSaver at-spi2-atk
    cups-libs gtk3 pango
)

MISSING_PKGS=()
for lib in libasound.so.2 libgbm.so.1 libnss3.so libX11.so.6 libpango-1.0.so.0; do
    ldconfig -p 2>/dev/null | grep -q "$lib" || MISSING_PKGS+=("$lib")
done

if [[ ${#MISSING_PKGS[@]} -gt 0 ]]; then
    warn "Missing libs: ${MISSING_PKGS[*]}"
    if [[ -d "$CACHE_DIR/rpms" ]] && ls "$CACHE_DIR/rpms"/*.rpm >/dev/null 2>&1; then
        info "Installing deps from offline cache..."
        sudo rpm -Uvh --force --nodeps "$CACHE_DIR/rpms"/*.rpm 2>/dev/null || true
        ok "Offline deps installed."
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y "${ELECTRON_PKGS[@]}" 2>/dev/null || \
            warn "Some deps failed -- continuing anyway."
    fi
else
    ok "All dependencies present."
fi

# ============================================================================
# 6. Launcher
# ============================================================================
step "Creating launcher"

cat > "$LAUNCHER" <<LAUNCHSCRIPT
#!/usr/bin/env bash
export PATH="$NODE_INSTALL_DIR/bin:\$PATH"
exec "$TRAE_BIN" "$MOUNT_DIR" --no-sandbox "\$@"
LAUNCHSCRIPT
chmod +x "$LAUNCHER"
ok "Launcher: $LAUNCHER"

# ============================================================================
# 7. Summary
# ============================================================================
echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  Trae IDE is ready!"
echo -e "======================================================${NC}"
echo
echo "  Node.js  : $(node -v)"
echo "  Trae     : $TRAE_BIN"
echo "  Project  : $MOUNT_DIR"
echo "  Log      : $LOG_FILE"
echo
echo "  Next time (no setup needed):"
echo "    bash ~/launch-trae.sh"
echo

# ============================================================================
# 8. Launch Trae
# ============================================================================
step "Launching Trae IDE"
exec "$TRAE_BIN" "$MOUNT_DIR" --no-sandbox
