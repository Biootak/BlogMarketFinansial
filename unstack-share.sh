#!/usr/bin/env bash
# unstack-share.sh -- emergency repair for a WEDGED /mnt/hgfs mount.
#
# Use this when even reading a file from the share fails:
#     bash: /mnt/hgfs/FinancialMarket/fix-share.sh: Permission denied
# At that point fix-share.sh cannot help, because bash has to READ it from the
# very mount that is broken. This script touches nothing on the share, so it
# must be typed/pasted into the guest terminal (see BOOTSTRAP below).
#
# Cause:
#   `umount -l` is a LAZY unmount: it detaches only when the last reference
#   goes away. Mounting again on the same directory in the same command line
#   stacks a fresh vmhgfs-fuse mount on top of the dying one; path lookups land
#   in the dead FUSE connection and the kernel answers EACCES for everyone,
#   root included. Each retry of that one-liner adds ANOTHER layer, and
#   `mountpoint` only ever shows the newest one, so one unmount is never enough.
#
# What this does: pops every stacked layer, then mounts once, cleanly.
#
# ---------------------------------------------------------------------------
# BOOTSTRAP (paste this in the guest when the share is unreadable).
# NOTE: it unmounts the PARENT /mnt/hgfs too. open-vm-tools mounts the whole
# HGFS tree on /mnt/hgfs, and when that parent mount is dead every lookup below
# it returns EACCES -- so remounting only the child can never fix it.
#
#   sudo bash -c 'U=alinovin; N=/mnt/FinancialMarket; \
#     for D in /mnt/hgfs/FinancialMarket /mnt/hgfs; do \
#       for i in $(seq 1 30); do \
#         c=$(awk -v d="$D" "\$2==d{n++} END{print n+0}" /proc/self/mounts); \
#         [ "$c" -eq 0 ] && break; \
#         fusermount3 -u "$D" 2>/dev/null || umount -l "$D" 2>/dev/null; sleep 0.3; \
#       done; \
#     done; \
#     grep -qs user_allow_other /etc/fuse.conf || echo user_allow_other >>/etc/fuse.conf; \
#     mkdir -p "$N"; \
#     /usr/bin/vmhgfs-fuse .host:/FinancialMarket "$N" \
#       -o allow_other,uid=$(id -u $U),gid=$(id -g $U),umask=022; \
#     ls "$N" | head'
#
# Then:  sudo bash /mnt/FinancialMarket/install-share-permanent.sh
# ---------------------------------------------------------------------------
#
# Normal use once the share works:  sudo bash unstack-share.sh

set -uo pipefail

if [[ $EUID -ne 0 ]]; then
    exec sudo -- bash "$0" "$@"
fi

SHARE_NAME="${SHARE_NAME:-FinancialMarket}"
# Default to the clean path OUTSIDE /mnt/hgfs. The HGFS parent mount is what
# breaks, and a dead parent poisons every child path with EACCES.
MOUNT_DIR="${MOUNT_DIR:-/mnt/$SHARE_NAME}"
LEGACY_PARENT="/mnt/hgfs"
LEGACY_MOUNT="$LEGACY_PARENT/$SHARE_NAME"

REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || who | awk 'NR==1{print $1}')}"
if [[ -z "$REAL_USER" || "$REAL_USER" == "root" ]]; then
    echo "ERROR: could not identify the desktop user. Run: sudo SUDO_USER=<you> bash $0"
    exit 1
fi
REAL_UID=$(id -u "$REAL_USER")
REAL_GID=$(id -g "$REAL_USER")

layers_of() { awk -v d="$1" '$2 == d { n++ } END { print n+0 }' /proc/self/mounts; }
layers() { layers_of "$MOUNT_DIR"; }

# Pop every stacked layer from one directory.
unstack_dir() {
    local dir="$1" start i
    start=$(layers_of "$dir")
    [[ "$start" -eq 0 ]] && return 0
    echo "  $dir: $start layer(s) -> unstacking"
    fuser -km "$dir" 2>/dev/null || true
    for (( i = 0; i < start * 4 + 16; i++ )); do
        [[ "$(layers_of "$dir")" -eq 0 ]] && break
        fusermount3 -u "$dir" 2>/dev/null \
            || fusermount -u "$dir" 2>/dev/null \
            || umount "$dir" 2>/dev/null \
            || umount -f "$dir" 2>/dev/null \
            || umount -l "$dir" 2>/dev/null \
            || true
        sleep 0.4
    done
    for (( i = 0; i < 20; i++ )); do
        [[ "$(layers_of "$dir")" -eq 0 ]] && break
        sleep 0.5
    done
    [[ "$(layers_of "$dir")" -eq 0 ]]
}

echo "== unstack-share =="
echo "mountpoint : $MOUNT_DIR"
echo "owner      : $REAL_USER ($REAL_UID:$REAL_GID)"
echo "layers now : $(layers)"

# --- 1. pop every stacked layer -------------------------------------------
# Order matters: child before parent, and the legacy HGFS tree before the new
# mountpoint, because a half-detached /mnt/hgfs makes its children unreadable.
unstack_dir "$LEGACY_MOUNT"  || echo "  WARN: $LEGACY_MOUNT still has layers"
unstack_dir "$LEGACY_PARENT" || echo "  WARN: $LEGACY_PARENT still has layers"
unstack_dir "$MOUNT_DIR"     || true
echo "layers after unmount: $(layers)"

if [[ "$(layers)" -ne 0 ]]; then
    echo "FAIL: mounts are stuck (processes still hold them open)."
    echo "      Reboot the guest, then run: sudo bash $0"
    exit 3
fi

# --- 2. prerequisites ------------------------------------------------------
systemctl enable --now vmtoolsd &>/dev/null || true
grep -qs '^[[:space:]]*user_allow_other' /etc/fuse.conf 2>/dev/null \
    || echo 'user_allow_other' >> /etc/fuse.conf

mkdir -p "$MOUNT_DIR"
chmod 755 "$MOUNT_DIR"
# A leftover file inside the mountpoint hides after mounting and confuses rsync.
if [[ -n "$(ls -A "$MOUNT_DIR" 2>/dev/null)" ]]; then
    echo "WARN: $MOUNT_DIR is not empty; its contents will be hidden by the mount."
fi

# --- 3. mount once, cleanly ------------------------------------------------
if ! /usr/bin/vmhgfs-fuse ".host:/$SHARE_NAME" "$MOUNT_DIR" \
        -o allow_other,uid="$REAL_UID",gid="$REAL_GID",umask=022 2>&1; then
    echo "WARN: uid/gid mount failed; retrying with allow_other only..."
    /usr/bin/vmhgfs-fuse ".host:/$SHARE_NAME" "$MOUNT_DIR" -o allow_other,umask=022 2>&1 \
        || { echo "FAIL: vmhgfs-fuse could not mount .host:/$SHARE_NAME"; exit 4; }
fi
sleep 1

# --- 4. prove it works -----------------------------------------------------
if ! timeout 5 ls -A "$MOUNT_DIR" >/dev/null 2>&1; then
    echo "FAIL: mounted but unreadable."
    echo "      Check: VM > Settings > Options > Shared Folders > Always enabled"
    exit 5
fi
echo "layers final: $(layers)"
echo "OK: readable. First entries:"
timeout 5 ls -A "$MOUNT_DIR" | head -5

if [[ -f "$MOUNT_DIR/install-share-permanent.sh" ]]; then
    if timeout 10 head -c 32 "$MOUNT_DIR/install-share-permanent.sh" >/dev/null 2>&1; then
        echo "OK: file reads work."
        echo "Next (makes it survive reboots):"
        echo "  sudo bash $MOUNT_DIR/install-share-permanent.sh"
    else
        echo "WARN: directory lists but file reads still fail -- run diagnose-share.sh"
    fi
elif [[ -f "$MOUNT_DIR/fix-share.sh" ]]; then
    if timeout 10 head -c 32 "$MOUNT_DIR/fix-share.sh" >/dev/null 2>&1; then
        echo "OK: fix-share.sh is readable. Next: sudo bash $MOUNT_DIR/fix-share.sh"
    else
        echo "WARN: directory lists but file reads still fail -- run diagnose-share.sh"
    fi
fi
