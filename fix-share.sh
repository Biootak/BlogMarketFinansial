#!/usr/bin/env bash
# fix-share.sh -- repair "/mnt/hgfs/FinancialMarket: Permission denied" and then
# start Trae.
#
# IMPORTANT: if the share is ALREADY broken you cannot run this file from the
# share itself (bash has to read it, and the read is exactly what fails).
# In that case first paste the bootstrap one-liner from unstack-share.sh, or run:
#     sudo bash -c 'while awk -v d=/mnt/hgfs/FinancialMarket "\$2==d{f=1} END{exit !f}" \
#       /proc/self/mounts; do umount -l /mnt/hgfs/FinancialMarket; sleep 0.3; done'
# then re-run this script.
#
# Normal use in the Fedora guest:
#   sudo bash /mnt/hgfs/FinancialMarket/fix-share.sh
# After the first successful run:
#   sudo start-trae
#
# Why "Permission denied" happens even for root:
#   `umount -l` (lazy) only detaches when the last reference disappears.
#   Mounting again on the SAME directory in the same command stacks a new
#   vmhgfs-fuse mount on top of the dying one. Path lookups resolve into the
#   dead FUSE connection, which answers EACCES for everything, including root.
#   Repeating that one-liner stacks MORE layers, so `mountpoint` shows only the
#   newest one and a single unmount never fixes it: every layer must be popped.

set -uo pipefail

if [[ $EUID -ne 0 ]]; then
    exec sudo -- bash "$0" "$@"
fi

REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || who | awk 'NR==1{print $1}')}"
if [[ -z "$REAL_USER" || "$REAL_USER" == "root" ]]; then
    echo "ERROR: could not identify the desktop user. Run: sudo SUDO_USER=<you> bash $0"
    exit 1
fi
REAL_UID=$(id -u "$REAL_USER")
REAL_GID=$(id -g "$REAL_USER")

SHARE_NAME="FinancialMarket"
# /mnt/hgfs is the LEGACY location. When the HGFS parent mount dies, every
# lookup below it returns EACCES, so the child cannot be repaired in place.
# install-share-permanent.sh moves the share to /mnt/FinancialMarket; prefer it.
PERM_MOUNT="/mnt/$SHARE_NAME"
MOUNT_DIR="/mnt/hgfs/$SHARE_NAME"
LOCAL_LAUNCHER="/usr/local/bin/start-trae"

RED='\e[31m'; GREEN='\e[32m'; YELLOW='\e[33m'; BLUE='\e[34m'; BOLD='\e[1m'; NC='\e[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
step() { echo; echo -e "${BOLD}${BLUE}==> $*${NC}"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

# Count how many mounts are stacked on a directory. /proc/self/mounts lists one
# line per layer, while `mountpoint` only ever reports the topmost one.
layer_count() {
    awk -v d="$1" '$2 == d { n++ } END { print n+0 }' /proc/self/mounts
}

# Pop every stacked layer until the directory is a plain empty folder again.
unstack() {
    local dir="$1" layers i
    layers=$(layer_count "$dir")
    [[ "$layers" -eq 0 ]] && return 0

    info "$layers mount layer(s) stacked on $dir"
    fuser -km "$dir" 2>/dev/null || true

    for (( i = 0; i < layers * 4 + 12; i++ )); do
        [[ "$(layer_count "$dir")" -eq 0 ]] && break
        fusermount3 -u "$dir" 2>/dev/null \
            || fusermount -u "$dir" 2>/dev/null \
            || umount "$dir" 2>/dev/null \
            || umount -f "$dir" 2>/dev/null \
            || umount -l "$dir" 2>/dev/null \
            || true
        sleep 0.4
    done

    # Lazy unmounts complete asynchronously; wait for the table to settle.
    for (( i = 0; i < 20; i++ )); do
        [[ "$(layer_count "$dir")" -eq 0 ]] && break
        sleep 0.5
    done

    [[ "$(layer_count "$dir")" -eq 0 ]]
}

# ---------------------------------------------------------------------------
step "1. VMware tools"
if ! rpm -q open-vm-tools &>/dev/null; then
    info "installing open-vm-tools..."
    dnf install -y open-vm-tools || fail "open-vm-tools install failed"
fi
systemctl enable --now vmtoolsd &>/dev/null || true
sleep 2

if command -v vmware-hgfsclient &>/dev/null; then
    SHARES=$(vmware-hgfsclient 2>/dev/null | tr '\n' ' ')
    if [[ -z "${SHARES// /}" ]]; then
        fail "The host exports no shared folder.
  On Windows: VM > Settings > Options > Shared Folders > Always enabled,
  and make sure '$SHARE_NAME' points at E:\\$SHARE_NAME."
    fi
    ok "host shares: $SHARES"
fi

# ---------------------------------------------------------------------------
step "2. FUSE allow_other"
if ! grep -qs '^[[:space:]]*user_allow_other' /etc/fuse.conf 2>/dev/null; then
    echo 'user_allow_other' >> /etc/fuse.conf
    ok "added user_allow_other to /etc/fuse.conf"
else
    ok "user_allow_other already set"
fi

# ---------------------------------------------------------------------------
step "3. Unstack every mount layer"

# The permanent mount is already readable? Then nothing here needs repairing.
if timeout 5 ls -A "$PERM_MOUNT" >/dev/null 2>&1; then
    MOUNT_DIR="$PERM_MOUNT"
    ok "permanent share is already healthy: $MOUNT_DIR"
else
    mkdir -p "$MOUNT_DIR"
    chmod 755 "$MOUNT_DIR"

    # The HGFS PARENT mount must be unstacked first: a dead /mnt/hgfs makes every
    # child path return EACCES no matter how often the child is remounted.
    if [[ "$MOUNT_DIR" == /mnt/hgfs/* ]]; then
        unstack "/mnt/hgfs/$SHARE_NAME" || warn "child mount still has layers"
        unstack "/mnt/hgfs"             || warn "parent /mnt/hgfs still has layers"
    fi

    if unstack "$MOUNT_DIR"; then
        ok "mountpoint is free: $MOUNT_DIR"
    else
        MOUNT_DIR="$PERM_MOUNT"
        warn "/mnt/hgfs is unrecoverable; switching to $MOUNT_DIR"
        warn "For a permanent fix run once: sudo bash install-share-permanent.sh"
        unstack "$MOUNT_DIR" || true
        mkdir -p "$MOUNT_DIR"
        chmod 755 "$MOUNT_DIR"
    fi
fi

# ---------------------------------------------------------------------------
step "4. Mount with the desktop user as owner"
# uid/gid make every file readable by $REAL_USER, so Trae does not need root.
if timeout 5 ls -A "$MOUNT_DIR" >/dev/null 2>&1; then
    ok "already readable, no remount needed: $MOUNT_DIR"
else
    if ! /usr/bin/vmhgfs-fuse ".host:/$SHARE_NAME" "$MOUNT_DIR" \
            -o allow_other,uid="$REAL_UID",gid="$REAL_GID",umask=022 2>&1; then
        warn "uid/gid mount failed, retrying with allow_other only..."
        /usr/bin/vmhgfs-fuse ".host:/$SHARE_NAME" "$MOUNT_DIR" -o allow_other,umask=022 2>&1 \
            || fail "vmhgfs-fuse could not mount .host:/$SHARE_NAME"
    fi
    sleep 1

    timeout 5 ls -A "$MOUNT_DIR" >/dev/null 2>&1 || fail "mounted but unreadable at $MOUNT_DIR.
  Permanent fix (moves the share off the broken /mnt/hgfs tree):
    sudo bash install-share-permanent.sh
  Or diagnose: sudo diagnose-share"
    ok "readable: $MOUNT_DIR"
fi

if command -v getenforce &>/dev/null && [[ "$(getenforce)" == "Enforcing" ]]; then
    # Allow confined services to traverse the FUSE share; harmless if already on.
    setsebool -P use_fusefs_home_dirs on 2>/dev/null || true
    info "SELinux is Enforcing (fusefs boolean ensured)"
fi

# ---------------------------------------------------------------------------
step "5. Copy the launcher to local disk"
SRC="$MOUNT_DIR/start-installed.sh"
[[ -f "$SRC" ]] || fail "start-installed.sh not found on the share ($SRC)"

# cat + temp file: never execute straight off FUSE, and never leave a truncated
# launcher behind if the share drops mid-copy.
if ! timeout 20 cat "$SRC" > "${LOCAL_LAUNCHER}.tmp" 2>/dev/null || [[ ! -s "${LOCAL_LAUNCHER}.tmp" ]]; then
    rm -f "${LOCAL_LAUNCHER}.tmp"
    fail "could not read $SRC from the share"
fi
sed -i 's/\r$//' "${LOCAL_LAUNCHER}.tmp"     # strip Windows CRLF
mv "${LOCAL_LAUNCHER}.tmp" "$LOCAL_LAUNCHER"
chmod 0755 "$LOCAL_LAUNCHER"
restorecon "$LOCAL_LAUNCHER" 2>/dev/null || true
bash -n "$LOCAL_LAUNCHER" || fail "copied launcher has a syntax error"
ok "installed: $LOCAL_LAUNCHER  (run later with: sudo start-trae)"

# Keep a local copy of this repair script too, so the next breakage does not
# depend on reading anything from the share.
if [[ -f "$MOUNT_DIR/fix-share.sh" ]]; then
    if timeout 20 cat "$MOUNT_DIR/fix-share.sh" > /usr/local/bin/fix-share.tmp 2>/dev/null \
       && [[ -s /usr/local/bin/fix-share.tmp ]]; then
        sed -i 's/\r$//' /usr/local/bin/fix-share.tmp
        mv /usr/local/bin/fix-share.tmp /usr/local/bin/fix-share
        chmod 0755 /usr/local/bin/fix-share
        restorecon /usr/local/bin/fix-share 2>/dev/null || true
        ok "installed: /usr/local/bin/fix-share  (run later with: sudo fix-share)"
    else
        rm -f /usr/local/bin/fix-share.tmp
    fi
fi

# ---------------------------------------------------------------------------
step "6. Launch"
echo
echo -e "${BOLD}${GREEN}------------------------------------------------------"
echo "  Share : $MOUNT_DIR (owner $REAL_USER)"
echo "  Repair: sudo fix-share"
echo "  Start : sudo start-trae"
echo "  Make it permanent: sudo bash install-share-permanent.sh"
echo -e "------------------------------------------------------${NC}"
echo
exec bash "$LOCAL_LAUNCHER"
