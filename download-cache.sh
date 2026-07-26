#!/usr/bin/env bash
# download-cache.sh — download Node.js + Fedora RPMs once for offline use
# Run this ONCE on any machine with internet access.
# After that, fedora-live-setup.sh works without internet.
# Usage: bash download-cache.sh
set -euo pipefail

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; NC='\e[0m'
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE_DIR="$SCRIPT_DIR/offline-cache"

NODE_VERSION="20.19.2"
NODE_ARCH="x64"
NODE_TARBALL="node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}"

FEDORA_PACKAGES=(
    alsa-lib mesa-libgbm nss libX11 libXcomposite libXdamage
    libXext libXfixes libXrandr libxcb libXScrnSaver at-spi2-atk
    cups-libs gtk3 pango rpm2cpio cpio
)

mkdir -p "$CACHE_DIR/rpms"
mkdir -p "$CACHE_DIR/node"

info "Downloading to $CACHE_DIR/"
echo

# ── Node.js ──────────────────────────────────────────────────────────────────
NODE_TARGET="$CACHE_DIR/node/$NODE_TARBALL"

if [[ -f "$NODE_TARGET" ]]; then
    ok "Node.js $NODE_VERSION already cached -- skip"
else
    info "Downloading Node.js $NODE_VERSION ($NODE_ARCH)..."
    curl -fL --progress-bar -o "$NODE_TARGET" "$NODE_URL"
    ok "Node.js downloaded: $NODE_TARGET"
fi

# checksum
if [[ ! -f "$NODE_TARGET.sha256" ]]; then
    curl -fsSL -o "$NODE_TARGET.sha256" "${NODE_URL}.sha256" 2>/dev/null || \
        warn "checksum download failed -- skipping verification."
fi

if [[ -f "$NODE_TARGET.sha256" ]]; then
    EXPECTED=$(awk '{print $1}' "$NODE_TARGET.sha256")
    ACTUAL=$(sha256sum "$NODE_TARGET" | awk '{print $1}')
    if [[ "$EXPECTED" == "$ACTUAL" ]]; then
        ok "Node.js checksum verified."
    else
        rm -f "$NODE_TARGET"
        fail "Checksum mismatch! Delete and re-run."
    fi
fi

echo "$NODE_VERSION" > "$CACHE_DIR/node/VERSION"
echo "$NODE_ARCH"    > "$CACHE_DIR/node/ARCH"

# ── Fedora RPMs ───────────────────────────────────────────────────────────────
if command -v dnf >/dev/null 2>&1; then
    info "Downloading Fedora RPMs..."
    sudo dnf download --resolve --destdir="$CACHE_DIR/rpms" \
        "${FEDORA_PACKAGES[@]}" 2>/dev/null || \
        warn "Some RPMs failed to download -- OK if not running on Fedora."
    RPM_COUNT=$(find "$CACHE_DIR/rpms" -name "*.rpm" | wc -l)
    ok "$RPM_COUNT RPM files downloaded to $CACHE_DIR/rpms/"
else
    warn "dnf not found -- RPM cache skipped. Run this on a Fedora machine for offline RPM support."
fi

# ── Manifest ─────────────────────────────────────────────────────────────────
cat > "$CACHE_DIR/MANIFEST.txt" <<MANIFEST
offline-cache manifest
Created   : $(date -u +"%Y-%m-%d %H:%M UTC")
Node.js   : $NODE_VERSION ($NODE_ARCH)
Tarball   : node/$NODE_TARBALL
RPMs      : $(find "$CACHE_DIR/rpms" -name "*.rpm" 2>/dev/null | wc -l) files
MANIFEST

echo
ok "=============================================="
ok "  Cache ready at: $CACHE_DIR"
ok "  Now copy the project to new machines and run:"
ok "    bash /mnt/FinancialMarket/start.sh"
ok "=============================================="
