#!/usr/bin/env bash
# enable-bidirect-sync.sh
# ============================================================
#  Run INSIDE the Fedora guest to switch the sandbox from the old
#  one-way RAM-disk model to the new bidirectional on-disk model,
#  WITHOUT rebuilding the golden VM.
#
#  Usage (as the liveuser in the Fedora guest):
#     sudo bash /mnt/hgfs/FinancialMarket/enable-bidirect-sync.sh
#   or, if you already copied it somewhere:
#     sudo bash ./enable-bidirect-sync.sh
#
#  What it does:
#    1. Mounts the Windows SMB share (//192.168.66.1/FinancialMarket)
#       at /mnt/fin using anonymous/guest access.
#    2. Copies the project from the share to ~/FinancialMarket (on disk).
#    3. Starts a bidirectional rsync loop (every 30s, both directions)
#       so edits on either Windows or the VM appear on the other.
#    4. (Optional) Replaces /usr/local/bin/sandbox-boot.sh so the next
#       desktop launch uses the new model automatically.
# ============================================================
set -euo pipefail

MOUNT_DIR="/mnt/fin"
HOST_IP="192.168.66.1"
SHARE_NAME="FinancialMarket"
PROJECT_DIR="$HOME/FinancialMarket"

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

# --- 0. Must be root for mount/install, but keep the user identity ---
if [[ $EUID -ne 0 ]]; then
    exec sudo -- bash "$0" "$@"
fi
REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || who | awk 'NR==1{print $1}')}"
[[ -z "$REAL_USER" || "$REAL_USER" == "root" ]] && \
    { echo "ERROR: run via sudo as your user, not as root directly"; exit 1; }
REAL_UID=$(id -u "$REAL_USER")
REAL_GID=$(id -g "$REAL_USER")
as_user() { sudo -u "$REAL_USER" "$@"; }

step "1. Install cifs-utils + rsync"
if ! command -v mount.cifs &>/dev/null; then
    dnf install -y cifs-utils || fail "cifs-utils install failed"
fi
command -v rsync &>/dev/null || dnf install -y rsync || true
ok "deps ready"

step "2. Mount Windows share //${HOST_IP}/${SHARE_NAME} -> ${MOUNT_DIR}"
mkdir -p "$MOUNT_DIR"
if ! mountpoint -q "$MOUNT_DIR"; then
    mount -t cifs "//$HOST_IP/$SHARE_NAME" "$MOUNT_DIR" \
        -o guest,uid="$REAL_UID",gid="$REAL_GID",vers=3.0,iocharset=utf8,dir_mode=0755,file_mode=0644 \
        || fail "CIFS mount failed. Run setup-smb-share.ps1 on the Windows host first."
fi
ok "Mounted: $MOUNT_DIR"

step "3. Copy project to disk: $PROJECT_DIR"
mkdir -p "$PROJECT_DIR"
chown "$REAL_UID:$REAL_GID" "$PROJECT_DIR"
as_user rsync -a --update \
    --exclude='.git/' --exclude='node_modules/' --exclude='.next/' \
    --exclude='__pycache__/' --exclude='.cache/' --exclude='*.rpm' \
    "$MOUNT_DIR/" "$PROJECT_DIR/" \
    && ok "Initial pull done." \
    || warn "Initial rsync had errors -- continuing."

step "4. Start bidirectional sync loop (every 30s, both directions)"
# Kill any old sync loop from a previous run
pkill -f 'bidirect-sync' 2>/dev/null || true

# Launch the loop as the real user so it owns the files.
# NOTE: excludes are written directly in each rsync call (not via a variable)
# so there is no risk of unwanted glob expansion.
as_user bash -c '
set -euo pipefail
MOUNT_DIR="/mnt/fin"
PROJECT_DIR="'"$PROJECT_DIR"'"
while true; do
    sleep 30
    rsync -a --update \
        --exclude=.git/ --exclude=node_modules/ --exclude=.next/ \
        --exclude=__pycache__/ --exclude=.cache/ --exclude=*.rpm \
        "$PROJECT_DIR/" "$MOUNT_DIR/" 2>/dev/null || true
    rsync -a --update \
        --exclude=.git/ --exclude=node_modules/ --exclude=.next/ \
        --exclude=__pycache__/ --exclude=.cache/ --exclude=*.rpm \
        "$MOUNT_DIR/" "$PROJECT_DIR/" 2>/dev/null || true
done
' &>/dev/null &
disown
ok "Sync loop started (PID $!) -- bidirectional, every 30s."

step "5. Patch sandbox-boot.sh (so next launch uses the new model)"
if [[ -w /usr/local/bin/sandbox-boot.sh ]]; then
    cp -f /usr/local/bin/sandbox-boot.sh /usr/local/bin/sandbox-boot.sh.bak 2>/dev/null || true
fi

cat > /tmp/sandbox-boot-new.sh <<'BOOTNEW'
#!/usr/bin/env bash
set -euo pipefail
MOUNT_DIR="/mnt/fin"
HOST_IP="192.168.66.1"
SHARE_NAME="FinancialMarket"
PROJECT_DIR="$HOME/FinancialMarket"
RPM_FILE="$MOUNT_DIR/Trae-linux-x64.rpm"
RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

[[ $EUID -ne 0 ]] && exec sudo -- bash "$0" "$@"
RU="${SUDO_USER:-$(logname 2>/dev/null || who | awk 'NR==1{print $1}')}"
[[ -z "$RU" || "$RU" == "root" ]] && fail "run via sudo as your user"
RU_UID=$(id -u "$RU"); RU_GID=$(id -g "$RU")
as_user() { sudo -u "$RU" "$@"; }

step "Shared folder (SMB/CIFS -> $HOST_IP)"
mkdir -p "$MOUNT_DIR"
command -v mount.cifs &>/dev/null || dnf install -y cifs-utils || fail "cifs-utils"
if ! mountpoint -q "$MOUNT_DIR"; then
    mount -t cifs "//$HOST_IP/$SHARE_NAME" "$MOUNT_DIR" \
        -o guest,uid="$RU_UID",gid="$RU_GID",vers=3.0,iocharset=utf8,dir_mode=0755,file_mode=0644 \
        || fail "CIFS mount failed"
fi
ok "Mounted: $MOUNT_DIR"

step "Project on disk: $PROJECT_DIR"
mkdir -p "$PROJECT_DIR"
chown "$RU_UID:$RU_GID" "$PROJECT_DIR"
command -v rsync &>/dev/null || dnf install -y rsync || true
as_user rsync -a --update \
    --exclude='.git/' --exclude='node_modules/' --exclude='.next/' \
    --exclude='__pycache__/' --exclude='.cache/' --exclude='*.rpm' \
    "$MOUNT_DIR/" "$PROJECT_DIR/" 2>/dev/null || true

# Bidirectional sync loop
pkill -f "bidirect-sync" 2>/dev/null || true
as_user bash -c "
set -euo pipefail
MOUNT_DIR='/mnt/fin'
while true; do
    sleep 30
    rsync -a --update --exclude=.git/ --exclude=node_modules/ --exclude=.next/ --exclude=__pycache__/ --exclude=.cache/ --exclude='*.rpm' \"\$PROJECT_DIR/\" \"\$MOUNT_DIR/\" 2>/dev/null || true
    rsync -a --update --exclude=.git/ --exclude=node_modules/ --exclude=.next/ --exclude=__pycache__/ --exclude=.cache/ --exclude='*.rpm' \"\$MOUNT_DIR/\" \"\$PROJECT_DIR/\" 2>/dev/null || true
done
" &>/dev/null &
disown
ok "Bidirectional sync started (PID $!) -- every 30s."

step "Trae IDE"
TRAE_BIN=$(find /opt/trae /usr/share/trae /usr/lib/trae -type f -name "trae" 2>/dev/null | head -1 || true)
if [[ -z "$TRAE_BIN" || ! -x "$TRAE_BIN" ]]; then
    [[ -f "$RPM_FILE" ]] || fail "Trae binary not found and RPM missing at $RPM_FILE"
    rpm -i "$RPM_FILE" 2>/dev/null || {
        mkdir -p /opt/trae
        (cd /opt/trae && rpm2cpio "$RPM_FILE" | cpio -idm 2>/dev/null) || true
    }
    TRAE_BIN=$(find /opt/trae /usr/share/trae /usr/lib/trae -type f -name "trae" 2>/dev/null | head -1 || true)
    chmod +x "$TRAE_BIN" 2>/dev/null || true
fi
[[ -n "$TRAE_BIN" ]] || fail "Trae binary not found"

if [[ -n "${WAYLAND_DISPLAY:-}" ]]; then OZONE="--ozone-platform=wayland"; else OZONE="--ozone-platform=x11"; fi
echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  Project: $PROJECT_DIR  (on disk, bidirectional sync w/ Windows)"
echo -e "======================================================${NC}"
echo
step "Launching Trae IDE"
exec as_user env HOME="$(getent passwd "$RU" | cut -d: -f6)" \
    DISPLAY="${DISPLAY:-}" WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" \
    "$TRAE_BIN" --no-sandbox --disable-gpu-sandbox $OZONE \
    --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist \
    --disable-dev-shm-usage "$PROJECT_DIR"
BOOTNEW

install -m 0755 /tmp/sandbox-boot-new.sh /usr/local/bin/sandbox-boot.sh
rm -f /tmp/sandbox-boot-new.sh
ok "sandbox-boot.sh updated (backup at /usr/local/bin/sandbox-boot.sh.bak)"

echo
echo -e "${BOLD}${GREEN}======================================================"
echo "  Done!  Project: $PROJECT_DIR (on disk)"
echo "  Sync: bidirectional every 30s with $HOST_IP"
echo -e "======================================================${NC}"
echo
echo "  Now open Trae normally (desktop icon) -- it will use the new model."
echo
