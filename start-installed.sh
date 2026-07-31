#!/usr/bin/env bash
# start-installed.sh -- launch Trae on a PERMANENTLY INSTALLED Fedora VM
# Run as normal user; script auto-escalates to root where needed.

set -euo pipefail

# ============================================================================
# 0. Auto-escalate to root (no env passing -- sudo policy may reject it).
#    GUI env vars are re-derived from the real user's session further below.
# ============================================================================
if [[ $EUID -ne 0 ]]; then
    exec sudo -- bash "$0" "$@"
fi

# Identify the real (non-root) user
REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || who | awk 'NR==1{print $1}')}"
[[ -z "$REAL_USER" || "$REAL_USER" == "root" ]] && \
    { echo "ERROR: Could not identify real user. Run: sudo SUDO_USER=<youruser> bash $0"; exit 1; }
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)
REAL_UID=$(id -u "$REAL_USER")
REAL_GID=$(id -g "$REAL_USER")

# ----------------------------------------------------------------------------
# Derive the graphical session env WITHOUT relying on sudo env forwarding.
# Reading /proc/<pid>/environ of the user's shell/session is authoritative.
# ----------------------------------------------------------------------------
RUNTIME_DIR="/run/user/$REAL_UID"
session_env() {
    local var="$1" pid val
    for pid in $(pgrep -u "$REAL_USER" -x gnome-shell 2>/dev/null) \
               $(pgrep -u "$REAL_USER" -x gnome-session-binary 2>/dev/null) \
               $(pgrep -u "$REAL_USER" -x plasmashell 2>/dev/null); do
        val=$(tr '\0' '\n' <"/proc/$pid/environ" 2>/dev/null | sed -n "s/^$var=//p" | head -1)
        [[ -n "$val" ]] && { printf '%s' "$val"; return 0; }
    done
    return 1
}

WAYLAND_DISPLAY_REAL=$(session_env WAYLAND_DISPLAY || true)
if [[ -z "$WAYLAND_DISPLAY_REAL" && -S "$RUNTIME_DIR/wayland-0" ]]; then
    WAYLAND_DISPLAY_REAL="wayland-0"
fi
DISPLAY_REAL=$(session_env DISPLAY || true)
if [[ -z "$DISPLAY_REAL" && -e /tmp/.X11-unix/X0 ]]; then
    DISPLAY_REAL=":0"
fi
DBUS_REAL="unix:path=$RUNTIME_DIR/bus"

as_user() { sudo -u "$REAL_USER" "$@"; }

SHARE_NAME="FinancialMarket"
# Preferred mountpoint is the permanent one created by install-share-permanent.sh.
# /mnt/hgfs is only a fallback: when the HGFS PARENT mount dies, every lookup
# below it returns EACCES, so the child directory can never be repaired in place.
PERM_MOUNT="/mnt/$SHARE_NAME"
LEGACY_MOUNT="/mnt/hgfs/$SHARE_NAME"
MOUNT_DIR="$PERM_MOUNT"
PROJECT_DIR="$REAL_HOME/FinancialMarket"
RPM_CACHE="$REAL_HOME/.cache/trae-install/Trae-linux-x64.rpm"
TRAE_DOWNLOAD_URL="https://download.trae.ai/application/Trae-linux-x64.rpm"

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

# ============================================================================
# 1. VMware tools + shared folder mount
# ============================================================================
step "Shared folder (vmhgfs-fuse)"

if ! rpm -q open-vm-tools &>/dev/null; then
    info "Installing open-vm-tools..."
    dnf install -y open-vm-tools || fail "open-vm-tools install failed"
fi

# Ensure vmtoolsd is running
systemctl enable --now vmtoolsd 2>/dev/null || true
# Give it time to register the HGFS channel
sleep 3

# vmhgfs-fuse mounts as root and FUSE hides the mount from other users unless
# allow_other is honored, which requires user_allow_other in /etc/fuse.conf.
# Without it, a normal user gets "Permission denied" on every path in the share.
if ! grep -qs '^[[:space:]]*user_allow_other' /etc/fuse.conf 2>/dev/null; then
    echo 'user_allow_other' >> /etc/fuse.conf
    info "Added user_allow_other to /etc/fuse.conf"
fi

# ---------------------------------------------------------------------------
# Robust unmount.
#
# IMPORTANT: never use a bare `umount -l` immediately followed by a new mount
# on the SAME mountpoint. A lazy unmount only detaches the mount when the last
# reference goes away, so the fresh mount gets stacked on top of a dying FUSE
# mount and path lookups resolve into the dead one. The kernel then answers
# EACCES for every file -- even for root -- which shows up exactly as:
#     bash: /mnt/hgfs/FinancialMarket/start-installed.sh: Permission denied
# Clean order: fusermount3 -u  ->  umount  ->  umount -f  ->  umount -l,
# then WAIT until the mountpoint is really gone before mounting again.
# ---------------------------------------------------------------------------
unmount_share() {
    local dir="$1" layers i
    # /proc/self/mounts lists ONE LINE PER STACKED LAYER, while `mountpoint`
    # only reports the topmost mount. A repeated "umount -l ; mount" one-liner
    # stacks several dead FUSE mounts, so every layer must be popped.
    layers=$(awk -v d="$dir" '$2 == d { n++ } END { print n+0 }' /proc/self/mounts)
    [[ "$layers" -eq 0 ]] && return 0

    fuser -km "$dir" 2>/dev/null || true
    for (( i = 0; i < layers * 4 + 12; i++ )); do
        [[ "$(awk -v d="$dir" '$2 == d { n++ } END { print n+0 }' /proc/self/mounts)" -eq 0 ]] && return 0
        fusermount3 -u "$dir" 2>/dev/null \
            || fusermount -u "$dir" 2>/dev/null \
            || umount "$dir" 2>/dev/null \
            || umount -f "$dir" 2>/dev/null \
            || umount -l "$dir" 2>/dev/null \
            || true
        sleep 0.4
    done
    # Wait for asynchronous lazy detaches to settle (up to ~10s).
    for (( i = 0; i < 20; i++ )); do
        [[ "$(awk -v d="$dir" '$2 == d { n++ } END { print n+0 }' /proc/self/mounts)" -eq 0 ]] && return 0
        sleep 0.5
    done
    return 1
}

share_readable() {
    local dir="$1"
    timeout 3 ls -A "$dir" >/dev/null 2>&1 || return 1
    # ls can succeed on a wedged mount; prove a real file read works too.
    local probe
    probe=$(timeout 3 find "$dir" -maxdepth 1 -type f 2>/dev/null | head -1 || true)
    [[ -z "$probe" ]] && return 0
    timeout 3 head -c 1 "$probe" >/dev/null 2>&1
}

mount_share() {
    local dir="$1"
    /usr/bin/vmhgfs-fuse ".host:/$SHARE_NAME" "$dir" \
        -o allow_other,uid="$REAL_UID",gid="$REAL_GID",umask=022 2>/dev/null && return 0
    /usr/bin/vmhgfs-fuse ".host:/$SHARE_NAME" "$dir" -o allow_other,umask=022 2>/dev/null
}

SHARE_OK=false

# --- 1. Permanent mount installed by install-share-permanent.sh --------------
if share_readable "$PERM_MOUNT"; then
    MOUNT_DIR="$PERM_MOUNT"
    SHARE_OK=true
    ok "Using permanent share: $MOUNT_DIR"
fi

# --- 2. Ask the systemd unit to (re)mount it ---------------------------------
if [[ "$SHARE_OK" != true ]] \
   && systemctl list-unit-files financialmarket-share.service &>/dev/null; then
    info "Restarting financialmarket-share.service..."
    systemctl restart financialmarket-share.service 2>/dev/null || true
    sleep 1
    if share_readable "$PERM_MOUNT"; then
        MOUNT_DIR="$PERM_MOUNT"
        SHARE_OK=true
        ok "Permanent share remounted: $MOUNT_DIR"
    fi
fi

# --- 3. Mount the permanent path ourselves -----------------------------------
if [[ "$SHARE_OK" != true ]]; then
    unmount_share "$PERM_MOUNT" || warn "$PERM_MOUNT still has stacked layers."
    mkdir -p "$PERM_MOUNT"
    chmod 755 "$PERM_MOUNT"
    if mount_share "$PERM_MOUNT"; then
        sleep 1
        if share_readable "$PERM_MOUNT"; then
            MOUNT_DIR="$PERM_MOUNT"
            SHARE_OK=true
            ok "Mounted and readable: $MOUNT_DIR"
        else
            warn "Mounted at $PERM_MOUNT but not readable."
            unmount_share "$PERM_MOUNT" || true
        fi
    fi
fi

# --- 4. Legacy /mnt/hgfs path, only if it still happens to work --------------
if [[ "$SHARE_OK" != true ]] && share_readable "$LEGACY_MOUNT"; then
    MOUNT_DIR="$LEGACY_MOUNT"
    SHARE_OK=true
    warn "Falling back to legacy mount: $MOUNT_DIR"
    warn "Run 'sudo bash install-share-permanent.sh' once to move off /mnt/hgfs."
fi

if [[ "$SHARE_OK" != true ]]; then
    warn "Shared folder unavailable."
    if command -v vmware-hgfsclient &>/dev/null; then
        info "Shares advertised by the host: $(vmware-hgfsclient 2>/dev/null | tr '\n' ' ')"
    fi
    warn "Permanent fix: sudo bash install-share-permanent.sh"
fi

# Self-install so future runs never read anything from the share:
#   sudo start-trae
# Copy through cat (not install/cp) so a partially wedged FUSE mount cannot
# leave a truncated launcher behind.
if [[ "$SHARE_OK" == true && -f "$MOUNT_DIR/start-installed.sh" ]]; then
    if timeout 10 cat "$MOUNT_DIR/start-installed.sh" > /usr/local/bin/start-trae.tmp 2>/dev/null \
       && [[ -s /usr/local/bin/start-trae.tmp ]]; then
        # Normalize CRLF: the file is authored on Windows and bash chokes on \r.
        sed -i 's/\r$//' /usr/local/bin/start-trae.tmp
        mv /usr/local/bin/start-trae.tmp /usr/local/bin/start-trae
        chmod 0755 /usr/local/bin/start-trae
        restorecon /usr/local/bin/start-trae 2>/dev/null || true
        ok "Installed launcher on local disk: sudo start-trae"
    else
        rm -f /usr/local/bin/start-trae.tmp
        warn "Could not copy launcher from the share."
    fi
fi

# ============================================================================
# 2. Sync project to disk
# ============================================================================
step "Project on disk: $PROJECT_DIR"
mkdir -p "$PROJECT_DIR"

if ! command -v rsync &>/dev/null; then
    info "Installing rsync..."
    dnf install -y rsync 2>/dev/null || true
fi

if [[ "$SHARE_OK" == true ]]; then
    if command -v rsync &>/dev/null; then
        info "Syncing project from shared folder to disk (as root, share is root-owned)..."
        rsync -a --delete \
            --exclude='.git/' \
            --exclude='node_modules/' \
            --exclude='.next/' \
            --exclude='__pycache__/' \
            --exclude='.cache/' \
            --exclude='*.rpm' \
            "$MOUNT_DIR/" "$PROJECT_DIR/" \
            && ok "Project synced to $PROJECT_DIR" \
            || warn "rsync had errors -- project may be incomplete."
        chown -R "$REAL_USER":"$REAL_USER" "$PROJECT_DIR"

        # Background sync back to Windows every 60s
        (
            while true; do
                sleep 60
                rsync -a --delete \
                    --exclude='.git/' \
                    --exclude='node_modules/' \
                    --exclude='.next/' \
                    --exclude='__pycache__/' \
                    --exclude='.cache/' \
                    "$PROJECT_DIR/" "$MOUNT_DIR/" 2>/dev/null || true
            done
        ) &
        ok "Background sync started (PID $!) -- saves to Windows every 60s."
    fi
else
    if [[ -d "$PROJECT_DIR" && "$(ls -A "$PROJECT_DIR" 2>/dev/null)" ]]; then
        ok "Using existing project on disk (share unavailable): $PROJECT_DIR"
    else
        warn "Share unavailable and no local project found. Trae will open to an empty folder."
    fi
fi

# ============================================================================
# 3. GPU check
# ============================================================================
step "GPU"
if lsmod | grep -q vmwgfx 2>/dev/null; then
    ok "vmwgfx active -- hardware 3D ready."
else
    warn "vmwgfx not loaded -- software rendering."
fi

# ============================================================================
# 4. Zram swap
# ============================================================================
step "Zram swap"
if ! swapon --show | grep -q zram 2>/dev/null; then
    ZRAM_MB=$(awk '/MemTotal/{print int($2/4/1024)}' /proc/meminfo)
    [[ $ZRAM_MB -gt 4096 ]] && ZRAM_MB=4096
    modprobe zram 2>/dev/null || true
    echo zstd | tee /sys/block/zram0/comp_algorithm >/dev/null 2>/dev/null || true
    echo "${ZRAM_MB}M" | tee /sys/block/zram0/disksize >/dev/null 2>/dev/null || true
    mkswap /dev/zram0 >/dev/null 2>/dev/null || true
    swapon -p 100 /dev/zram0 2>/dev/null || true
    swapon --show | grep -q zram && ok "Zram ${ZRAM_MB}MB (zstd)." || warn "Zram skipped."
else
    ok "Zram already active."
fi

# ============================================================================
# 5. GNOME tweaks
# ============================================================================
step "GNOME tweaks"
if [[ -n "$DISPLAY_REAL" || -n "$WAYLAND_DISPLAY_REAL" ]]; then
    as_user env XDG_RUNTIME_DIR="$RUNTIME_DIR" DBUS_SESSION_BUS_ADDRESS="$DBUS_REAL" \
        gsettings set org.gnome.desktop.interface enable-animations false 2>/dev/null || true
    as_user env XDG_RUNTIME_DIR="$RUNTIME_DIR" DBUS_SESSION_BUS_ADDRESS="$DBUS_REAL" \
        systemctl --user mask tracker-miner-fs-3.service tracker-extract-3.service 2>/dev/null || true
    as_user env XDG_RUNTIME_DIR="$RUNTIME_DIR" DBUS_SESSION_BUS_ADDRESS="$DBUS_REAL" \
        systemctl --user stop tracker-miner-fs-3.service tracker-extract-3.service 2>/dev/null || true
    ok "Animations off, tracker disabled."
else
    warn "No graphical session detected for $REAL_USER -- skipping GNOME tweaks."
fi

# ============================================================================
# 6. Install Trae
#    Priority: 1) already installed  2) RPM on share  3) cached RPM  4) download
# ============================================================================
step "Trae IDE"
TRAE_BIN=$(command -v trae 2>/dev/null \
    || find /usr/bin /usr/local/bin /opt -name "trae" -type f 2>/dev/null | head -1 \
    || true)

if [[ -n "$TRAE_BIN" && -x "$TRAE_BIN" ]]; then
    ok "Trae already installed: $TRAE_BIN"
else
    # Find RPM: share first, then cache
    RPM_FILE=""
    if [[ "$SHARE_OK" == true && -f "$MOUNT_DIR/Trae-linux-x64.rpm" ]]; then
        RPM_FILE="$MOUNT_DIR/Trae-linux-x64.rpm"
        info "RPM found on share: $RPM_FILE"
    elif [[ -f "$RPM_CACHE" ]]; then
        RPM_FILE="$RPM_CACHE"
        info "RPM found in cache: $RPM_FILE"
    else
        info "RPM not found locally. Downloading Trae..."
        mkdir -p "$(dirname "$RPM_CACHE")"
        chown -R "$REAL_USER":"$REAL_USER" "$(dirname "$RPM_CACHE")"
        if command -v curl &>/dev/null; then
            curl -fL --progress-bar "$TRAE_DOWNLOAD_URL" -o "$RPM_CACHE" \
                && RPM_FILE="$RPM_CACHE" \
                || warn "Download failed."
        elif command -v wget &>/dev/null; then
            wget -q --show-progress "$TRAE_DOWNLOAD_URL" -O "$RPM_CACHE" \
                && RPM_FILE="$RPM_CACHE" \
                || warn "Download failed."
        else
            warn "curl and wget not available. Cannot download Trae."
        fi
    fi

    if [[ -n "$RPM_FILE" ]]; then
        info "Installing Trae from RPM..."
        rpm -i "$RPM_FILE" 2>/dev/null || dnf install -y "$RPM_FILE" 2>/dev/null \
            || fail "Trae install failed."
        TRAE_BIN=$(command -v trae 2>/dev/null \
            || find /usr/bin /usr/local/bin /opt -name "trae" -type f 2>/dev/null | head -1 \
            || true)
        [[ -n "$TRAE_BIN" && -x "$TRAE_BIN" ]] || fail "Trae binary not found after install."
        ok "Trae installed: $TRAE_BIN"
    else
        fail "Cannot install Trae: no RPM on share, no cache, and download failed.
  Fix options:
    1) Enable VMware Shared Folders: VM Settings -> Options -> Shared Folders -> Always Enabled
    2) Manually copy RPM: scp Trae-linux-x64.rpm $REAL_USER@<this-ip>:$RPM_CACHE"
    fi
fi

# ============================================================================
# 7. Launch Trae as the real user
# ============================================================================
if [[ -n "$WAYLAND_DISPLAY_REAL" ]]; then
    OZONE="--ozone-platform=wayland"
elif [[ -n "$DISPLAY_REAL" ]]; then
    OZONE="--ozone-platform=x11"
else
    fail "No graphical session found for $REAL_USER.
  Log in to the Fedora desktop (GNOME) first, open a Terminal there, and run:
    sudo start-trae
  Do NOT run this from a text console (tty) or over plain SSH without a desktop."
fi

echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  Ready!"
echo "  User    : $REAL_USER"
echo "  Project : $PROJECT_DIR"
echo "  Free RAM: $(free -m | awk '/^Mem:/{print $7}') MB"
echo "  Share   : $( [[ "$SHARE_OK" == true ]] && echo "OK" || echo "UNAVAILABLE (project from disk)")"
echo "  Display : ${WAYLAND_DISPLAY_REAL:-$DISPLAY_REAL}"
echo "  Trae    : $TRAE_BIN"
echo -e "======================================================${NC}"
echo

step "Launching Trae IDE as $REAL_USER"
exec sudo -u "$REAL_USER" env \
    HOME="$REAL_HOME" \
    DISPLAY="$DISPLAY_REAL" \
    WAYLAND_DISPLAY="$WAYLAND_DISPLAY_REAL" \
    DBUS_SESSION_BUS_ADDRESS="$DBUS_REAL" \
    XDG_RUNTIME_DIR="$RUNTIME_DIR" \
    "$TRAE_BIN" \
    --no-sandbox --disable-gpu-sandbox \
    $OZONE \
    --enable-gpu-rasterization --enable-zero-copy \
    --ignore-gpu-blocklist \
    --disable-dev-shm-usage \
    "$PROJECT_DIR"
